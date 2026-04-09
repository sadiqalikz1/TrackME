import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DB_NAME = 'trackme.db';
const DB_VERSION = 1;

export interface DatabaseDocument {
  id: string;
  data: string; // JSON serialized document
  lastModified: number; // timestamp
  isSynced: boolean;
  operation: 'create' | 'update' | 'delete';
  createdAt: number;
  syncedAt?: number;
}

export interface SyncMetadata {
  collectionName: string;
  lastSyncTime: number;
  pendingChangesCount: number;
  lastError?: string;
  lastErrorTime?: number;
}

// Collections to sync
export const COLLECTIONS = [
  'users',
  'transactions',
  'budgets',
  'goals',
  'work',
  'quotations',
  'billReminders',
] as const;

export type CollectionName = typeof COLLECTIONS[number];

class Database {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === 'web') {
        // Web platform may not fully support SQLite, use fallback
        console.warn('SQLite may have limited support on web platform');
      }

      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Create documents table for storing collection data
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          collection TEXT NOT NULL,
          data TEXT NOT NULL,
          lastModified INTEGER NOT NULL,
          isSynced BOOLEAN DEFAULT 0,
          operation TEXT DEFAULT 'update',
          createdAt INTEGER NOT NULL,
          syncedAt INTEGER,
          updatedAt INTEGER DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create index for efficient querying
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_collection ON documents(collection);
        CREATE INDEX IF NOT EXISTS idx_isSynced ON documents(isSynced);
        CREATE INDEX IF NOT EXISTS idx_collection_isSynced ON documents(collection, isSynced);
      `);

      // Create sync metadata table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          collectionName TEXT PRIMARY KEY,
          lastSyncTime INTEGER DEFAULT 0,
          pendingChangesCount INTEGER DEFAULT 0,
          lastError TEXT,
          lastErrorTime INTEGER,
          createdAt INTEGER DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Initialize sync metadata for all collections
      for (const collection of COLLECTIONS) {
        await this.db.execAsync(`
          INSERT OR IGNORE INTO sync_metadata (collectionName, lastSyncTime, pendingChangesCount)
          VALUES ('${collection}', 0, 0);
        `);
      }

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw error;
    }
  }

  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) throw new Error('Failed to get database');
    return this.db;
  }

  // Document operations
  async saveDocument(
    collection: CollectionName,
    id: string,
    data: any,
    isSynced: boolean = false
  ): Promise<void> {
    const db = await this.getDatabase();
    const now = Date.now();

    try {
      await db.runAsync(
        `INSERT INTO documents (id, collection, data, lastModified, isSynced, operation, createdAt)
         VALUES (?, ?, ?, ?, ?, 'create', ?)
         ON CONFLICT(id) DO UPDATE SET
          data = excluded.data,
          lastModified = excluded.lastModified,
          isSynced = excluded.isSynced,
          operation = 'update'`,
        [
          id,
          collection,
          JSON.stringify(data),
          now,
          isSynced ? 1 : 0,
          now,
        ]
      );

      // Update sync metadata
      if (!isSynced) {
        await this.incrementPendingChanges(collection);
      }
    } catch (error) {
      console.error(`Error saving document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async getDocument(collection: CollectionName, id: string): Promise<any | null> {
    const db = await this.getDatabase();

    try {
      const result = await db.getFirstAsync(
        'SELECT data FROM documents WHERE id = ? AND collection = ?',
        [id, collection]
      );

      if (result) {
        const row = result as any;
        return JSON.parse(row.data);
      }
      return null;
    } catch (error) {
      console.error(`Error getting document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async getCollection(collection: CollectionName, onlyUnsynced: boolean = false): Promise<any[]> {
    const db = await this.getDatabase();

    try {
      const query = onlyUnsynced
        ? 'SELECT data FROM documents WHERE collection = ? AND isSynced = 0 ORDER BY lastModified DESC'
        : 'SELECT data FROM documents WHERE collection = ? AND operation != \'delete\' ORDER BY lastModified DESC';

      const results = await db.getAllAsync(query, [collection]);

      return results.map((row: any) => JSON.parse(row.data));
    } catch (error) {
      console.error(`Error getting collection ${collection}:`, error);
      throw error;
    }
  }

  async deleteDocument(collection: CollectionName, id: string): Promise<void> {
    const db = await this.getDatabase();

    try {
      // Soft delete - mark as deleted instead of actually removing
      await db.runAsync(
        'UPDATE documents SET operation = ?, isSynced = 0, lastModified = ? WHERE id = ? AND collection = ?',
        ['delete', Date.now(), id, collection]
      );

      await this.incrementPendingChanges(collection);
    } catch (error) {
      console.error(`Error deleting document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async getUnsyncedDocuments(collection: CollectionName): Promise<DatabaseDocument[]> {
    const db = await this.getDatabase();

    try {
      const results = await db.getAllAsync(
        `SELECT id, data, lastModified, isSynced, operation, createdAt, syncedAt
         FROM documents
         WHERE collection = ? AND isSynced = 0
         ORDER BY lastModified ASC`,
        [collection]
      );

      return results.map((row: any) => ({
        id: row.id,
        data: row.data,
        lastModified: row.lastModified,
        isSynced: row.isSynced === 1,
        operation: row.operation,
        createdAt: row.createdAt,
        syncedAt: row.syncedAt,
      }));
    } catch (error) {
      console.error(`Error getting unsynced documents from ${collection}:`, error);
      throw error;
    }
  }

  async markDocumentSynced(collection: CollectionName, id: string): Promise<void> {
    const db = await this.getDatabase();

    try {
      await db.runAsync(
        'UPDATE documents SET isSynced = 1, syncedAt = ? WHERE id = ? AND collection = ?',
        [Date.now(), id, collection]
      );

      await this.decrementPendingChanges(collection);
    } catch (error) {
      console.error(`Error marking document ${id} as synced:`, error);
      throw error;
    }
  }

  async markAllCollectionSynced(collection: CollectionName): Promise<void> {
    const db = await this.getDatabase();

    try {
      await db.runAsync(
        'UPDATE documents SET isSynced = 1, syncedAt = ? WHERE collection = ?',
        [Date.now(), collection]
      );

      await db.runAsync(
        'UPDATE sync_metadata SET pendingChangesCount = 0 WHERE collectionName = ?',
        [collection]
      );
    } catch (error) {
      console.error(`Error marking collection ${collection} as synced:`, error);
      throw error;
    }
  }

  // Sync metadata operations
  async getSyncMetadata(collection: CollectionName): Promise<SyncMetadata> {
    const db = await this.getDatabase();

    try {
      const result = await db.getFirstAsync(
        'SELECT * FROM sync_metadata WHERE collectionName = ?',
        [collection]
      );

      if (result) {
        const row = result as any;
        return {
          collectionName: row.collectionName,
          lastSyncTime: row.lastSyncTime || 0,
          pendingChangesCount: row.pendingChangesCount || 0,
          lastError: row.lastError,
          lastErrorTime: row.lastErrorTime,
        };
      }

      throw new Error(`Sync metadata not found for ${collection}`);
    } catch (error) {
      console.error(`Error getting sync metadata for ${collection}:`, error);
      throw error;
    }
  }

  async updateSyncMetadata(
    collection: CollectionName,
    metadata: Partial<SyncMetadata>
  ): Promise<void> {
    const db = await this.getDatabase();

    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (metadata.lastSyncTime !== undefined) {
        updates.push('lastSyncTime = ?');
        values.push(metadata.lastSyncTime);
      }
      if (metadata.pendingChangesCount !== undefined) {
        updates.push('pendingChangesCount = ?');
        values.push(metadata.pendingChangesCount);
      }
      if (metadata.lastError !== undefined) {
        updates.push('lastError = ?');
        values.push(metadata.lastError);
      }
      if (metadata.lastErrorTime !== undefined) {
        updates.push('lastErrorTime = ?');
        values.push(metadata.lastErrorTime);
      }

      if (updates.length === 0) return;

      values.push(collection);

      await db.runAsync(
        `UPDATE sync_metadata SET ${updates.join(', ')} WHERE collectionName = ?`,
        values
      );
    } catch (error) {
      console.error(`Error updating sync metadata for ${collection}:`, error);
      throw error;
    }
  }

  private async incrementPendingChanges(collection: CollectionName): Promise<void> {
    const db = await this.getDatabase();

    try {
      await db.runAsync(
        'UPDATE sync_metadata SET pendingChangesCount = pendingChangesCount + 1 WHERE collectionName = ?',
        [collection]
      );
    } catch (error) {
      console.error(`Error incrementing pending changes for ${collection}:`, error);
    }
  }

  private async decrementPendingChanges(collection: CollectionName): Promise<void> {
    const db = await this.getDatabase();

    try {
      await db.runAsync(
        'UPDATE sync_metadata SET pendingChangesCount = MAX(0, pendingChangesCount - 1) WHERE collectionName = ?',
        [collection]
      );
    } catch (error) {
      console.error(`Error decrementing pending changes for ${collection}:`, error);
    }
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDatabase();

    try {
      await db.execAsync(`
        DELETE FROM documents;
        DELETE FROM sync_metadata;
      `);

      // Reinitialize sync metadata
      for (const collection of COLLECTIONS) {
        await db.runAsync(
          'INSERT INTO sync_metadata (collectionName, lastSyncTime, pendingChangesCount) VALUES (?, 0, 0)',
          [collection]
        );
      }

      console.log('All database data cleared');
    } catch (error) {
      console.error('Error clearing database:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const database = new Database();
