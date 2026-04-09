import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { localRepository } from './localRepository';
import { remoteRepository, setRemoteRepositoryUid } from './remoteRepository';
import { database, CollectionName } from '../database';
import { IRepository } from './localRepository';

/**
 * HybridRepository: Smart routing between local and remote repositories
 * - Offline: Use LocalRepository only
 * - Online: Read from local cache, sync with Firebase in background
 * - Conflict resolution: Last-write-wins
 */
export class HybridRepository implements IRepository {
  private isOnline: boolean = false;
  private currentUid: string | null = null;

  constructor() {
    this.initNetworkListener();
  }

  setCurrentUid(uid: string): void {
    this.currentUid = uid;
    setRemoteRepositoryUid(uid); // Pass uid to remoteRepository for filtering
    console.log(`HybridRepository: Set uid for user ${uid}`);
  }

  private initNetworkListener(): void {
    NetInfo.addEventListener((state: NetInfoState) => {
      this.isOnline = state.isConnected ?? false;
      console.log(`Network status changed: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
    });

    // Check initial status
    NetInfo.fetch().then((state) => {
      this.isOnline = state.isConnected ?? false;
      console.log(`Initial network status: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
    });
  }

  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  async getCollection(collection: CollectionName): Promise<any[]> {
    try {
      // Always read from local first (faster, works offline)
      const localDocs = await localRepository.getCollection(collection);

      if (this.isOnline) {
        // Fetch from Firebase in background for sync
        // (don't wait for it, return local data immediately)
        this.syncCollectionInBackground(collection);
      }

      return localDocs;
    } catch (error) {
      console.error(`HybridRepository: Error getting ${collection}:`, error);
      return [];
    }
  }

  async getDocument(collection: CollectionName, id: string): Promise<any | null> {
    try {
      // Read from local first
      let doc = await localRepository.getDocument(collection, id);

      if (this.isOnline && !doc) {
        // Document not in local cache, try Firebase
        doc = await remoteRepository.getDocument(collection, id);
        if (doc) {
          // Cache it locally
          await localRepository.saveDocument(collection, id, doc);
        }
      }

      return doc;
    } catch (error) {
      console.error(`HybridRepository: Error getting ${collection}/${id}:`, error);
      return null;
    }
  }

  async saveDocument(collection: CollectionName, id: string, data: any): Promise<void> {
    try {
      // Always save to local first
      await localRepository.saveDocument(collection, id, data);

      // If online, also sync to Firebase immediately
      if (this.isOnline) {
        try {
          await remoteRepository.saveDocument(collection, id, data);
          // Mark as synced
          await database.markDocumentSynced(collection, id);
        } catch (error) {
          console.warn(`HybridRepository: Failed to sync save to Firebase, will retry later:`, error);
        }
      }
    } catch (error) {
      console.error(`HybridRepository: Error saving ${collection}/${id}:`, error);
      throw error;
    }
  }

  async updateDocument(collection: CollectionName, id: string, data: Partial<any>): Promise<void> {
    try {
      // Always update local first
      await localRepository.updateDocument(collection, id, data);

      // If online, also sync to Firebase immediately
      if (this.isOnline) {
        try {
          await remoteRepository.updateDocument(collection, id, data);
          // Mark as synced
          await database.markDocumentSynced(collection, id);
        } catch (error) {
          console.warn(`HybridRepository: Failed to sync update to Firebase, will retry later:`, error);
        }
      }
    } catch (error) {
      console.error(`HybridRepository: Error updating ${collection}/${id}:`, error);
      throw error;
    }
  }

  async deleteDocument(collection: CollectionName, id: string): Promise<void> {
    try {
      // Always delete local first
      await localRepository.deleteDocument(collection, id);

      // If online, also sync to Firebase immediately
      if (this.isOnline) {
        try {
          await remoteRepository.deleteDocument(collection, id);
          // Mark as synced
          await database.markDocumentSynced(collection, id);
        } catch (error) {
          console.warn(`HybridRepository: Failed to sync delete to Firebase, will retry later:`, error);
        }
      }
    } catch (error) {
      console.error(`HybridRepository: Error deleting ${collection}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Sync a collection: Pull latest from Firebase and apply last-write-wins conflict resolution
   * Called in background, doesn't block UI
   */
  private async syncCollectionInBackground(collection: CollectionName): Promise<void> {
    try {
      console.log(`Syncing collection: ${collection}`);

      // Skip remote sync if uid not set yet
      if (!this.currentUid) {
        console.log(`HybridRepository: Skipping remote sync for ${collection}, uid not set yet`);
        return;
      }

      // Fetch all docs from Firebase
      const remoteDocs = await remoteRepository.getCollection(collection);

      // Apply last-write-wins conflict resolution
      for (const remoteDoc of remoteDocs) {
        const localDoc = await localRepository.getDocument(collection, remoteDoc.id);

        if (!localDoc) {
          // Document only in Firebase, add to local
          await localRepository.saveDocument(collection, remoteDoc.id, remoteDoc);
        } else {
          // Document exists in both, use last-write-wins
          const localTime = localDoc.updatedAt?.getTime?.() || localDoc.updatedAt || 0;
          const remoteTime = remoteDoc.updatedAt?.seconds ? remoteDoc.updatedAt.seconds * 1000 : 0;

          if (remoteTime > localTime) {
            // Firebase version is newer, update local
            await localRepository.updateDocument(collection, remoteDoc.id, remoteDoc);
          }
          // else: Local version is newer, keep it
        }
      }

      // Update sync metadata
      await database.updateSyncMetadata(collection, {
        lastSyncTime: Date.now(),
      });

      console.log(`Sync completed for ${collection}`);
    } catch (error) {
      console.error(`HybridRepository: Error syncing ${collection}:`, error);
      // Update error in metadata
      await database.updateSyncMetadata(collection, {
        lastError: String(error),
        lastErrorTime: Date.now(),
      });
    }
  }

  /**
   * Full sync: Push unsynced changes to Firebase, then pull latest from Firebase
   * Called when app goes online or periodically
   */
  async fullSync(collection: CollectionName): Promise<void> {
    if (!this.isOnline) {
      console.warn(`HybridRepository: Cannot sync ${collection}, device is offline`);
      return;
    }

    if (!this.currentUid) {
      console.warn(`HybridRepository: Cannot sync ${collection}, user uid not set yet`);
      return;
    }

    try {
      console.log(`Starting full sync for ${collection}`);

      // Phase 1: Push unsynced local documents to Firebase
      const unsyncedDocs = await database.getUnsyncedDocuments(collection);

      for (const doc of unsyncedDocs) {
        try {
          const data = JSON.parse(doc.data);

          if (doc.operation === 'delete') {
            await remoteRepository.deleteDocument(collection, doc.id);
          } else {
            // create or update
            const existing = await remoteRepository.getDocument(collection, doc.id);
            if (existing) {
              await remoteRepository.updateDocument(collection, doc.id, data);
            } else {
              await remoteRepository.saveDocument(collection, doc.id, data);
            }
          }

          // Mark as synced
          await database.markDocumentSynced(collection, doc.id);
        } catch (error) {
          console.error(`HybridRepository: Failed to push document ${doc.id}:`, error);
        }
      }

      // Phase 2: Pull and merge from Firebase
      await this.syncCollectionInBackground(collection);

      console.log(`Full sync completed for ${collection}`);
    } catch (error) {
      console.error(`HybridRepository: Error in full sync for ${collection}:`, error);
      await database.updateSyncMetadata(collection, {
        lastError: String(error),
        lastErrorTime: Date.now(),
      });
    }
  }

  /**
   * Sync all collections
   */
  async syncAll(): Promise<void> {
    const collections = ['users', 'transactions', 'budgets', 'goals', 'work', 'quotations', 'billReminders'] as const;

    for (const collection of collections) {
      try {
        await this.fullSync(collection);
      } catch (error) {
        console.error(`HybridRepository: Failed to sync ${collection}:`, error);
      }
    }
  }
}

export const hybridRepository = new HybridRepository();

/**
 * Helper function to set the current user's uid in both repositories
 * Call this from AuthContext after successful login
 */
export function setHybridRepositoryUid(uid: string): void {
  hybridRepository.setCurrentUid(uid);
}
