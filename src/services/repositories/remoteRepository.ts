import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import { CollectionName } from '../database';
import { IRepository } from './localRepository';

/**
 * RemoteRepository: All data operations use Firebase/Firestore (remote)
 * Used when online to fetch from or write to Firebase
 */
export class RemoteRepository implements IRepository {
  private currentUid: string | null = null;

  /**
   * Set current user uid for filtering queries (required for Firestore security rules)
   */
  setCurrentUid(uid: string): void {
    this.currentUid = uid;
  }

  async getCollection(collectionName: CollectionName): Promise<any[]> {
    try {
      const db = getFirebaseDb();
      
      // Special handling for users collection - document ID is the uid
      // Firestore rules: allow read: if request.auth.uid == userId
      if (collectionName === 'users') {
        if (!this.currentUid) return [];
        const userDoc = await this.getDocument('users', this.currentUid);
        return userDoc ? [userDoc] : [];
      }
      
      const collRef = collection(db, collectionName);

      // Filter by uid + non-deleted documents (required for Firestore security rules)
      const constraints = [where('uid', '==', this.currentUid), where('deletedAt', '==', null)];
      const q = query(collRef, ...constraints);
      const snapshot = await getDocs(q);

      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return docs;
    } catch (error) {
      // Collection might not exist yet or no permissions
      console.error(`RemoteRepository: Error fetching ${collectionName}:`, error);
      return [];
    }
  }

  async getDocument(collectionName: CollectionName, id: string): Promise<any | null> {
    try {
      const db = getFirebaseDb();
      const docRef = doc(db, collectionName, id);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data(),
        };
      }
      return null;
    } catch (error) {
      console.error(`RemoteRepository: Error fetching ${collectionName}/${id}:`, error);
      return null;
    }
  }

  async saveDocument(collectionName: CollectionName, id: string, data: any): Promise<void> {
    try {
      const db = getFirebaseDb();
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, {
        ...data,
        id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        deletedAt: null,
      });
    } catch (error) {
      console.error(`RemoteRepository: Error saving ${collectionName}/${id}:`, error);
      throw error;
    }
  }

  async updateDocument(collectionName: CollectionName, id: string, data: Partial<any>): Promise<void> {
    try {
      const db = getFirebaseDb();
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`RemoteRepository: Error updating ${collectionName}/${id}:`, error);
      throw error;
    }
  }

  async deleteDocument(collectionName: CollectionName, id: string): Promise<void> {
    try {
      const db = getFirebaseDb();
      const docRef = doc(db, collectionName, id);
      // Soft delete
      await updateDoc(docRef, {
        deletedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`RemoteRepository: Error deleting ${collectionName}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Clear all user data from a collection (soft delete all documents)
   * Used when user chooses "Push Local to Cloud" strategy
   */
  async clearUserData(collectionName: CollectionName): Promise<void> {
    if (!this.currentUid) {
      console.warn('RemoteRepository: Cannot clear user data, uid not set');
      return;
    }

    try {
      const db = getFirebaseDb();
      const collRef = collection(db, collectionName);
      const q = query(
        collRef,
        where('uid', '==', this.currentUid),
        where('deletedAt', '==', null)
      );
      const snapshot = await getDocs(q);

      // Soft delete all documents
      const deletePromises = snapshot.docs.map(docSnapshot =>
        updateDoc(doc(db, collectionName, docSnapshot.id), {
          deletedAt: Timestamp.now(),
        })
      );

      await Promise.all(deletePromises);
      console.log(`RemoteRepository: Cleared ${snapshot.docs.length} documents from ${collectionName}`);
    } catch (error) {
      console.error(`RemoteRepository: Error clearing user data from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Check if user has any data in a collection
   */
  async hasUserData(collectionName: CollectionName): Promise<boolean> {
    if (!this.currentUid) {
      return false;
    }

    try {
      const db = getFirebaseDb();
      const collRef = collection(db, collectionName);
      const q = query(
        collRef,
        where('uid', '==', this.currentUid),
        where('deletedAt', '==', null)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.length > 0;
    } catch (error) {
      console.error(`RemoteRepository: Error checking user data in ${collectionName}:`, error);
      return false;
    }
  }
}

export const remoteRepository = new RemoteRepository();

/**
 * Update remote repository with current user uid
 */
export function setRemoteRepositoryUid(uid: string): void {
  remoteRepository.setCurrentUid(uid);
}
