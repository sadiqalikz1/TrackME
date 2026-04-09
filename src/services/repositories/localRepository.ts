import { database, CollectionName } from '../database';

export interface IRepository {
  getCollection(collection: CollectionName): Promise<any[]>;
  getDocument(collection: CollectionName, id: string): Promise<any | null>;
  saveDocument(collection: CollectionName, id: string, data: any): Promise<void>;
  updateDocument(collection: CollectionName, id: string, data: Partial<any>): Promise<void>;
  deleteDocument(collection: CollectionName, id: string): Promise<void>;
}

/**
 * LocalRepository: All data operations use SQLite (local)
 * Used when offline or for syncing with local cache
 */
export class LocalRepository implements IRepository {
  async getCollection(collection: CollectionName): Promise<any[]> {
    try {
      const docs = await database.getCollection(collection);
      return docs;
    } catch (error) {
      console.error(`LocalRepository: Error fetching ${collection}:`, error);
      return [];
    }
  }

  async getDocument(collection: CollectionName, id: string): Promise<any | null> {
    try {
      const doc = await database.getDocument(collection, id);
      return doc;
    } catch (error) {
      console.error(`LocalRepository: Error fetching ${collection}/${id}:`, error);
      return null;
    }
  }

  async saveDocument(collection: CollectionName, id: string, data: any): Promise<void> {
    try {
      // Mark as unsynced - will sync to Firebase later
      await database.saveDocument(collection, id, { id, ...data }, false);
    } catch (error) {
      console.error(`LocalRepository: Error saving ${collection}/${id}:`, error);
      throw error;
    }
  }

  async updateDocument(collection: CollectionName, id: string, data: Partial<any>): Promise<void> {
    try {
      // Get existing document
      const existing = await this.getDocument(collection, id);
      if (!existing) {
        await this.saveDocument(collection, id, data);
        return;
      }

      // Merge and save
      const merged = { ...existing, ...data, id };
      await database.saveDocument(collection, id, merged, false);
    } catch (error) {
      console.error(`LocalRepository: Error updating ${collection}/${id}:`, error);
      throw error;
    }
  }

  async deleteDocument(collection: CollectionName, id: string): Promise<void> {
    try {
      await database.deleteDocument(collection, id);
    } catch (error) {
      console.error(`LocalRepository: Error deleting ${collection}/${id}:`, error);
      throw error;
    }
  }
}

export const localRepository = new LocalRepository();
