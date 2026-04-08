import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  Firestore,
  QueryConstraint,
  DocumentData,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/utils/constants';
import { User, Transaction, Budget, Work, Goal, BillReminder, RecurringTransaction } from '@/types';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: 'AIzaSyDlZMjO_HxeD79X_UghdllYNEerhy4nyDo',
  authDomain: 'trackme-fb2d4.firebaseapp.com',
  projectId: 'trackme-fb2d4',
  storageBucket: 'trackme-fb2d4.firebasestorage.app',
  messagingSenderId: '739292313003',
  appId: '1:739292313003:android:2f790a5120efbfd4c14eee',
  measurementId: 'G-L6KCNH4N5J',
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

export const initializeFirebase = () => {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app);
    db = getFirestore(app);
  } else {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth, db };
};

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    initializeFirebase();
  }
  return auth!;
};

export const getFirebaseDb = (): Firestore => {
  if (!db) {
    initializeFirebase();
  }
  return db!;
};

// Auth Functions
export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
};

export const signInWithEmail = async (email: string, password: string) => {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = async (email: string, password: string) => {
  const auth = getFirebaseAuth();
  return createUserWithEmailAndPassword(auth, email, password);
};

export const resetPassword = async (email: string) => {
  const auth = getFirebaseAuth();
  return sendPasswordResetEmail(auth, email);
};

export const signOut = async () => {
  const auth = getFirebaseAuth();
  return firebaseSignOut(auth);
};

// User Document Functions
export const getUserDocument = async (uid: string): Promise<User | null> => {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.USERS, uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as User;
  }
  return null;
};

export const createUserDocument = async (user: Partial<User> & { uid: string }): Promise<void> => {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.USERS, user.uid);
  
  const userData = {
    ...user,
    currency: user.currency || 'USD',
    theme: user.theme || 'dark',
    budgetAlertThreshold: user.budgetAlertThreshold || 80,
    biometricEnabled: user.biometricEnabled || false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  await setDoc(docRef, userData);
};

export const updateUserDocument = async (uid: string, data: Partial<User>): Promise<void> => {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

// Generic CRUD Functions
const convertTimestamp = (data: DocumentData): any => {
  const converted: any = { ...data };
  for (const key in converted) {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
  }
  return converted;
};

export const subscribeToCollection = <T>(
  collectionName: string,
  uid: string,
  callback: (data: T[]) => void,
  constraints: QueryConstraint[] = []
) => {
  const db = getFirebaseDb();
  const collectionRef = collection(db, collectionName);
  // Only use uid filter, sort client-side to avoid composite indexes
  const q = query(collectionRef, where('uid', '==', uid));
  
  return onSnapshot(
    q,
    (snapshot) => {
      let data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestamp(doc.data()),
      })) as T[];
      
      // Apply sorting client-side
      data = data.sort((a: any, b: any) => {
        // Look for date or deadline fields
        const aVal = a.date || a.deadline || a.createdAt || 0;
        const bVal = b.date || b.deadline || b.createdAt || 0;
        
        if (aVal instanceof Date && bVal instanceof Date) {
          return bVal.getTime() - aVal.getTime(); // descending
        }
        return 0;
      });
      
      callback(data);
    },
    (error) => {
      console.error(`Error fetching ${collectionName}:`, error);
      callback([]);
    }
  );
};

export const createDocument = async <T extends { uid: string }>(
  collectionName: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const db = getFirebaseDb();
    if (!db) {
      throw new Error('Firestore not initialized');
    }
    
    const collectionRef = collection(db, collectionName);
    
    const docData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    console.log(`Creating ${collectionName} document:`, docData);
    
    const docRef = await addDoc(collectionRef, docData);
    console.log(`Successfully created ${collectionName} with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`Create document error (${collectionName}):`, error);
    throw error;
  }
};

export const updateDocument = async <T>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<void> => {
  const db = getFirebaseDb();
  const docRef = doc(db, collectionName, id);
  
  // Convert Date objects to Timestamps
  const convertedData: any = { ...data };
  for (const key in convertedData) {
    if (convertedData[key] instanceof Date) {
      convertedData[key] = Timestamp.fromDate(convertedData[key]);
    }
  }
  
  await updateDoc(docRef, {
    ...convertedData,
    updatedAt: Timestamp.now(),
  });
};

export const deleteDocument = async (collectionName: string, id: string): Promise<void> => {
  const db = getFirebaseDb();
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};

// Collection Specific Functions
export const getUserTransactions = (uid: string, callback: (transactions: Transaction[]) => void) => {
  return subscribeToCollection<Transaction>(
    COLLECTIONS.TRANSACTIONS,
    uid,
    callback
  );
};

export const getUserBudgets = (uid: string, callback: (budgets: Budget[]) => void) => {
  return subscribeToCollection<Budget>(
    COLLECTIONS.BUDGETS,
    uid,
    callback
  );
};

export const getUserWorks = (uid: string, callback: (works: Work[]) => void) => {
  return subscribeToCollection<Work>(
    COLLECTIONS.WORKS,
    uid,
    callback
  );
};

export const getUserGoals = (uid: string, callback: (goals: Goal[]) => void) => {
  return subscribeToCollection<Goal>(
    COLLECTIONS.GOALS,
    uid,
    callback
  );
};

export const getUserBillReminders = (uid: string, callback: (reminders: BillReminder[]) => void) => {
  return subscribeToCollection<BillReminder>(
    COLLECTIONS.BILL_REMINDERS,
    uid,
    callback
  );
};

// Single Document Getters
export const getWorkById = async (id: string): Promise<Work | null> => {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.WORKS, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...convertTimestamp(docSnap.data()),
    } as Work;
  }
  return null;
};

export const getQuotationById = async (id: string): Promise<any | null> => {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.QUOTATIONS, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...convertTimestamp(docSnap.data()),
    };
  }
  return null;
};
