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
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
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
  const q = query(collectionRef, where('uid', '==', uid), ...constraints);
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    })) as T[];
    callback(data);
  });
};

export const createDocument = async <T extends { uid: string }>(
  collectionName: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const db = getFirebaseDb();
  const collectionRef = collection(db, collectionName);
  
  const docData = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collectionRef, docData);
  return docRef.id;
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
    callback,
    [orderBy('date', 'desc')]
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
    callback,
    [orderBy('createdAt', 'desc')]
  );
};

export const getUserGoals = (uid: string, callback: (goals: Goal[]) => void) => {
  return subscribeToCollection<Goal>(
    COLLECTIONS.GOALS,
    uid,
    callback,
    [orderBy('deadline', 'asc')]
  );
};

export const getUserBillReminders = (uid: string, callback: (reminders: BillReminder[]) => void) => {
  return subscribeToCollection<BillReminder>(
    COLLECTIONS.BILL_REMINDERS,
    uid,
    callback,
    [orderBy('dueDate', 'asc')]
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
