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

// Firebase configuration from environment variables
// Using require to access process.env in React Native context
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
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  } else {
    app = getApps()[0];
    db = getFirestore(app);
  }
  return { app, db };
};

// Lazy initialization - don't call immediately
let isInitialized = false;
let initPromise: Promise<void> | null = null;

const ensureInitialized = async () => {
  if (initPromise) {
    return initPromise;
  }
  
  if (!isInitialized) {
    initPromise = new Promise((resolve) => {
      try {
        initializeFirebase();
        isInitialized = true;
        resolve();
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        resolve(); // Resolve anyway to not block startup
      }
    });
    
    return initPromise;
  }
};

// Lazy auth initialization - only initialize when actually needed
const getAuthInstanceInternal = (): Auth => {
  if (!auth) {
    try {
      auth = initializeAuth(app!);
    } catch (error: any) {
      // Auth might already be initialized, try getAuth to retrieve it
      try {
        auth = getAuth(app!);
      } catch (getAuthError) {
        console.error('Failed to get auth instance:', error, getAuthError);
        throw error;
      }
    }
  }
  return auth;
};

// Export for use in AuthContext
export const getAuthInstance = (): Auth => {
  return getAuthInstanceInternal();
};

export const getDbInstance = (): Firestore => {
  ensureInitialized();
  return db!;
};

// For backward compatibility
export { auth, db, ensureInitialized };

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Auth helpers
export const signInWithGoogle = async (idToken: string) => {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(getAuthInstance(), credential);
};

export const signOut = async () => {
  return firebaseSignOut(getAuthInstance());
};

export const onAuthChange = async (callback: (user: FirebaseUser | null) => void) => {
  // Retry logic for auth initialization
  let retries = 0;
  const maxRetries = 10;
  
  const trySetupListener = (): Promise<(() => void)> => {
    return new Promise((resolve, reject) => {
      try {
        const authInstance = getAuthInstance();
        const unsubscribe = onAuthStateChanged(authInstance, callback);
        resolve(unsubscribe);
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          setTimeout(() => {
            trySetupListener()
              .then(resolve)
              .catch(reject);
          }, 100 * Math.pow(2, retries - 1));
        } else {
          reject(error);
        }
      }
    });
  };
  
  return trySetupListener();
};

// Firestore helpers
export const timestampToDate = (timestamp: Timestamp | Date): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

export const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Generic CRUD operations
export const createDocument = async <T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> => {
  const docRef = await addDoc(collection(getDbInstance(), collectionName), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateDocument = async <T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> => {
  const docRef = doc(getDbInstance(), collectionName, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteDocument = async (
  collectionName: string,
  docId: string
): Promise<void> => {
  const docRef = doc(getDbInstance(), collectionName, docId);
  await deleteDoc(docRef);
};

export const getDocument = async <T>(
  collectionName: string,
  docId: string
): Promise<T | null> => {
  const docRef = doc(getDbInstance(), collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
};

export const queryDocuments = async <T>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> => {
  const q = query(collection(getDbInstance(), collectionName), ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
};

export const subscribeToCollection = <T>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void
) => {
  const q = query(collection(getDbInstance(), collectionName), ...constraints);
  return onSnapshot(q, (snapshot: any) => {
    const data = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
    callback(data);
  });
};

// User-specific helpers
export const getUserDocument = async (uid: string) => {
  return getDocument(COLLECTIONS.users, uid);
};

export const createUserDocument = async (uid: string, data: DocumentData) => {
  const docRef = doc(getDbInstance(), COLLECTIONS.users, uid);
  await setDoc(docRef, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

export const updateUserDocument = async (uid: string, data: DocumentData) => {
  const docRef = doc(getDbInstance(), COLLECTIONS.users, uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

// Transaction queries
export const getUserTransactions = (uid: string) => {
  return query(
    collection(getDbInstance(), COLLECTIONS.transactions),
    where('uid', '==', uid),
    orderBy('date', 'desc')
  );
};

// Budget queries
export const getUserBudgets = (uid: string, month: string) => {
  return query(
    collection(getDbInstance(), COLLECTIONS.budgets),
    where('uid', '==', uid),
    where('month', '==', month)
  );
};

// Work queries
export const getUserWorks = (uid: string) => {
  return query(
    collection(getDbInstance(), COLLECTIONS.works),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
};

// Goal queries
export const getUserGoals = (uid: string) => {
  return query(
    collection(getDbInstance(), COLLECTIONS.goals),
    where('uid', '==', uid),
    orderBy('deadline', 'asc')
  );
};

// Bill Reminder queries
export const getUserBillReminders = (uid: string) => {
  return query(
    collection(getDbInstance(), COLLECTIONS.billReminders),
    where('uid', '==', uid),
    orderBy('dueDate', 'asc')
  );
};

// Recurring transaction queries
export const getActiveRecurringTransactions = (uid: string) => {
  return query(
    collection(getDbInstance(), COLLECTIONS.recurring),
    where('uid', '==', uid),
    where('active', '==', true)
  );
};

export { where, orderBy, Timestamp };
