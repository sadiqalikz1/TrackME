import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { localRepository } from './localRepository';
import { remoteRepository, setRemoteRepositoryUid } from './remoteRepository';
import { database, CollectionName } from '../database';
import { IRepository } from './localRepository';

/**
 * HybridRepository: Smart routing between local and remote repositories
 * - Offline: Use LocalRepository only  
 * - Online: Syncs on explicit events (app startup, CRUD ops, network transitions)
 * - Conflict resolution: Last-write-wins on sync
 * - Event-driven: No periodic background syncing
 */
export class HybridRepository implements IRepository {
  private isOnline: boolean = false;
  private currentUid: string | null = null;
  private isGuestUser: boolean = false;
  private isUserActionInProgress: boolean = false; // Flag to prevent ALL sync during user actions
  private pausedCollections: Set<string> = new Set(); // Track collections with paused syncing

  constructor() {
    this.initNetworkListener();
  }

  setCurrentUid(uid: string): void {
    this.currentUid = uid;
    setRemoteRepositoryUid(uid); // Pass uid to remoteRepository for filtering
    console.log(`HybridRepository: Set uid for user ${uid}`);
  }

  setIsGuest(isGuest: boolean): void {
    this.isGuestUser = isGuest;
    console.log(`HybridRepository: Guest mode ${isGuest ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set user action in progress flag (legacy, no-op in event-driven mode)
   * Previously prevented background sync, now only kept for compatibility
   */
  setUserActionInProgress(inProgress: boolean): void {
    this.isUserActionInProgress = inProgress;
    // In event-driven mode, background sync doesn't exist, so this is a no-op
  }

  /**
   * Check if user action is in progress
   */
  isUserActionActive(): boolean {
    return this.isUserActionInProgress;
  }

  /**
   * Pause sync for a specific collection (legacy, no-op in event-driven mode)
   * Previously prevented background sync, now only kept for compatibility
   */
  pauseCollectionSync(collection: string): void {
    this.pausedCollections.add(collection);
    // In event-driven mode, background sync doesn't exist
  }

  /**
   * Resume sync for a specific collection (legacy, no-op in event-driven mode)
   */
  resumeCollectionSync(collection: string): void {
    this.pausedCollections.delete(collection);
    // In event-driven mode, background sync doesn't exist
  }

  /**
   * Check if a collection is paused (legacy, always false in event-driven mode)
   */
  private isCollectionPaused(collection: string): boolean {
    return false; // Event-driven mode doesn't do background sync
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

  isGuestMode(): boolean {
    return this.isGuestUser;
  }

  async clearGuestData(): Promise<void> {
    if (!this.isGuestUser) return; // Only clear if currently in guest mode
    
    try {
      console.log('HybridRepository: Clearing guest data from local database');
      await database.clearAllData();
      console.log('HybridRepository: Guest data cleared successfully');
    } catch (error) {
      console.error('HybridRepository: Error clearing guest data:', error);
    }
  }

  /**
   * Clear all local data (for "Use Cloud Only" strategy)
   * Used when user wants to discard local data and use cloud data
   */
  async clearLocalData(): Promise<void> {
    try {
      console.log('HybridRepository: Clearing all local data');
      await database.clearAllData();
      console.log('HybridRepository: Local data cleared successfully');
    } catch (error) {
      console.error('HybridRepository: Error clearing local data:', error);
      throw error;
    }
  }

  /**
   * Pull cloud data only (for "Use Cloud Only" strategy)
   * Clears local data first, then pulls all data from cloud
   */
  async pullCloudOnly(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot pull cloud data while offline');
    }

    if (!this.currentUid) {
      throw new Error('User uid not set');
    }

    try {
      console.log('HybridRepository: Starting pullCloudOnly sync');
      
      // Step 1: Clear all local data
      await this.clearLocalData();

      // Step 2: Pull all collections from cloud (users managed separately)
      const collections = ['transactions', 'budgets', 'goals', 'work', 'quotations', 'billReminders'] as const;

      for (const collection of collections) {
        try {
          const remoteDocs = await remoteRepository.getCollection(collection);
          console.log(`HybridRepository: Pulled ${remoteDocs.length} documents from ${collection}`);
          
          for (const doc of remoteDocs) {
            await localRepository.saveDocument(collection, doc.id, doc);
            await database.markDocumentSynced(collection, doc.id);
          }
        } catch (error) {
          console.error(`HybridRepository: Failed to pull ${collection}:`, error);
        }
      }

      console.log('HybridRepository: pullCloudOnly completed');
    } catch (error) {
      console.error('HybridRepository: Error in pullCloudOnly:', error);
      throw error;
    }
  }

  /**
   * Push local data to cloud (for "Push Local to Cloud" strategy)
   * Clears cloud data first, then pushes all local data
   */
  async pushLocalToCloud(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot push to cloud while offline');
    }

    if (!this.currentUid) {
      throw new Error('User uid not set');
    }

    try {
      console.log('HybridRepository: Starting pushLocalToCloud sync');

      const collections = ['transactions', 'budgets', 'goals', 'work', 'quotations', 'billReminders'] as const;

      for (const collection of collections) {
        try {
          // Step 1: Clear cloud data for this collection
          await remoteRepository.clearUserData(collection);

          // Step 2: Get all local documents
          const localDocs = await localRepository.getCollection(collection);
          console.log(`HybridRepository: Pushing ${localDocs.length} documents to ${collection}`);

          // Step 3: Push each local document to cloud
          for (const doc of localDocs) {
            // Add uid to document if not present
            const docWithUid = { ...doc, uid: this.currentUid };
            await remoteRepository.saveDocument(collection, doc.id, docWithUid);
            await database.markDocumentSynced(collection, doc.id);
          }
        } catch (error) {
          console.error(`HybridRepository: Failed to push ${collection}:`, error);
        }
      }

      console.log('HybridRepository: pushLocalToCloud completed');
    } catch (error) {
      console.error('HybridRepository: Error in pushLocalToCloud:', error);
      throw error;
    }
  }

  /**
   * Merge local and cloud data (for "Merge Data" strategy)
   * Uses last-write-wins conflict resolution
   */
  async mergeData(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot merge data while offline');
    }

    if (!this.currentUid) {
      throw new Error('User uid not set');
    }

    try {
      console.log('HybridRepository: Starting mergeData sync');

      // Use existing syncAll which performs last-write-wins merge
      await this.syncAll();

      console.log('HybridRepository: mergeData completed');
    } catch (error) {
      console.error('HybridRepository: Error in mergeData:', error);
      throw error;
    }
  }

  /**
   * Check if there is any local data
   */
  async hasLocalData(): Promise<boolean> {
    return await database.hasLocalData();
  }

  /**
   * Check if cloud has any user data
   */
  async hasCloudData(): Promise<boolean> {
    if (!this.isOnline || !this.currentUid) {
      return false;
    }

    try {
      // Check primary collections
      const collections = ['transactions', 'budgets', 'goals', 'work'] as const;
      for (const collection of collections) {
        const hasData = await remoteRepository.hasUserData(collection);
        if (hasData) return true;
      }
      return false;
    } catch (error) {
      console.error('HybridRepository: Error checking cloud data:', error);
      return false;
    }
  }

  async getCollection(collection: CollectionName): Promise<any[]> {
    try {
      // Always read from local first (faster, works offline)
      const localDocs = await localRepository.getCollection(collection);

      // NOTE: Event-driven sync only - sync happens on app startup, CRUD ops, or network transitions
      // Not on reads to prevent constant syncing

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

      // If online and not guest user, sync immediately to Firebase (event-driven)
      if (this.isOnline && !this.isGuestUser) {
        try {
          await remoteRepository.saveDocument(collection, id, data);
          await database.markDocumentSynced(collection, id);
          console.log(`HybridRepository: Event-driven sync - created ${collection}/${id}`);
        } catch (error) {
          console.warn(`HybridRepository: Failed to sync create to Firebase, will sync on app startup:`, error);
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

      // If online and not guest user, sync immediately to Firebase (event-driven)
      if (this.isOnline && !this.isGuestUser) {
        try {
          await remoteRepository.updateDocument(collection, id, data);
          await database.markDocumentSynced(collection, id);
          console.log(`HybridRepository: Event-driven sync - updated ${collection}/${id}`);
        } catch (error) {
          console.warn(`HybridRepository: Failed to sync update to Firebase, will sync on app startup:`, error);
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

      // If online and not guest user, sync immediately to Firebase (event-driven)
      if (this.isOnline && !this.isGuestUser) {
        try {
          await remoteRepository.deleteDocument(collection, id);
          await database.markDocumentSynced(collection, id);
          console.log(`HybridRepository: Event-driven sync - deleted ${collection}/${id}`);
        } catch (error) {
          console.warn(`HybridRepository: Failed to sync delete to Firebase, will sync on app startup:`, error);
        }
      }
    } catch (error) {
      console.error(`HybridRepository: Error deleting ${collection}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Full sync: Push unsynced changes to Firebase, then pull and merge latest from Firebase
   * Called on events: app startup, CRUD ops, network transitions (event-driven)
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
      console.log(`Starting event-driven full sync for ${collection}`);

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

      // Phase 2: Pull and merge from Firebase (last-write-wins conflict resolution)
      console.log(`Syncing collection: ${collection}`);

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
   * Note: 'users' collection is managed separately in AuthContext
   */
  async syncAll(): Promise<void> {
    const collections = ['transactions', 'budgets', 'goals', 'work', 'quotations', 'billReminders'] as const;

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

/**
 * Helper function to set guest mode (local-only, no Firebase sync)
 * Call this from AuthContext when guest user is detected
 */
export function setHybridRepositoryGuest(isGuest: boolean): void {
  hybridRepository.setIsGuest(isGuest);
}

/**
 * Helper function to clear guest data when transitioning to authenticated user
 * Call this from AuthContext before logging in an authenticated user after guest mode
 */
export async function clearGuestData(): Promise<void> {
  await hybridRepository.clearGuestData();
}

/**
 * Helper function to check if local data exists
 */
export async function checkHasLocalData(): Promise<boolean> {
  return await hybridRepository.hasLocalData();
}

/**
 * Helper function to check if cloud data exists
 */
export async function checkHasCloudData(): Promise<boolean> {
  return await hybridRepository.hasCloudData();
}

/**
 * Sync strategy type
 */
export type SyncStrategy = 'cloud_only' | 'merge' | 'push_local';

/**
 * Execute sync with specified strategy
 */
export async function syncWithStrategy(strategy: SyncStrategy): Promise<void> {
  switch (strategy) {
    case 'cloud_only':
      await hybridRepository.pullCloudOnly();
      break;
    case 'merge':
      await hybridRepository.mergeData();
      break;
    case 'push_local':
      await hybridRepository.pushLocalToCloud();
      break;
  }
}

/**
 * Helper function to pause/resume background sync during user actions
 * Call with true when user starts filling a form, false when done
 * This prevents sync from interrupting user input
 */
export function setUserActionInProgress(inProgress: boolean): void {
  hybridRepository.setUserActionInProgress(inProgress);
}

/**
 * Pause background sync for a specific collection
 * Use this when user is editing documents in that collection
 * Example: When QuotationModal opens, pause 'quotations' collection
 */
export function pauseCollectionSync(collection: string): void {
  hybridRepository.pauseCollectionSync(collection);
}

/**
 * Resume background sync for a specific collection
 * Call this when user closes the edit modal
 */
export function resumeCollectionSync(collection: string): void {
  hybridRepository.resumeCollectionSync(collection);
}
