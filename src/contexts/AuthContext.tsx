import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeFirebase,
  onAuthChange,
  signOut as firebaseSignOut,
  getUserDocument,
  createUserDocument,
  updateUserDocument,
  signInWithEmail,
  signUpWithEmail,
} from '@/services/firebase';
import { syncEngine } from '@/services/syncEngine';
import { setHybridRepositoryUid, setHybridRepositoryGuest } from '@/services/repositories/hybridRepository';
import { User } from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  isOfflineMode: boolean;
  signOut: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;
  const CACHE_VALIDITY_DAYS = 7;

  // ========== GUEST MODE ==========
  
  /**
   * Create a guest user for offline-only mode
   * Guest users have uid starting with 'guest_' and local-only data
   */
  const createGuestUser = async (): Promise<User> => {
    const guestUid = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const guestUser: User = {
      uid: guestUid,
      email: `guest_${Date.now()}@local`,
      displayName: 'Guest User',
      photoURL: null,
      currency: 'USD',
      theme: 'dark',
      budgetAlertThreshold: 80,
      biometricEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await cacheUser(guestUser);
    setHybridRepositoryGuest(true); // Enable guest mode (local-only)
    console.log(`Created guest user: ${guestUid}`);
    return guestUser;
  };

  const loadCachedUser = async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (cached) {
        const parsedUser = JSON.parse(cached);
        // Convert date strings back to Date objects
        parsedUser.createdAt = new Date(parsedUser.createdAt);
        parsedUser.updatedAt = new Date(parsedUser.updatedAt);
        setUser(parsedUser);
        return parsedUser;
      }
    } catch (error) {
      console.error('Error loading cached user:', error);
    }
    return null;
  };

  const isCachedUserStale = (user: User | null): boolean => {
    if (!user?.updatedAt) return true;
    const daysSinceUpdate = (Date.now() - new Date(user.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > CACHE_VALIDITY_DAYS;
  };

  const cacheUser = async (userData: User | null) => {
    try {
      if (userData) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (error) {
      console.error('Error caching user:', error);
    }
  };

  const setupUser = async (fbUser: FirebaseUser): Promise<User | null> => {
    try {
      let userDoc = await getUserDocument(fbUser.uid);
      
      if (!userDoc) {
        // Create new user document
        const newUser: Partial<User> & { uid: string } = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          photoURL: fbUser.photoURL,
          currency: 'USD',
          theme: 'dark',
          budgetAlertThreshold: 80,
          biometricEnabled: false,
        };
        
        await createUserDocument(newUser);
        userDoc = await getUserDocument(fbUser.uid);
      }
      
      return userDoc;
    } catch (error) {
      console.error('Error setting up user:', error);
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        // Retry after a delay
        await new Promise<void>(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return setupUser(fbUser);
      }
      throw error;
    }
  };

  // ========== AUTHENTICATION FUNCTIONS ==========

  const loginWithEmail = async (email: string, password: string): Promise<void> => {
    try {
      console.log(`Attempting login with email: ${email}`);
      await signInWithEmail(email, password);
      // onAuthChange listener will handle the rest
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const signupWithEmail = async (email: string, password: string, displayName: string = 'User'): Promise<void> => {
    try {
      console.log(`Attempting signup with email: ${email}`);
      await signUpWithEmail(email, password);
      // onAuthChange listener will create user document and handle the rest
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    initializeFirebase();
    let unsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      // Initialize SyncEngine (database, network monitoring, background tasks)
      try {
        await syncEngine.initialize();
        syncEngine.monitorNetworkState();
      } catch (error) {
        console.error('Failed to initialize SyncEngine:', error);
      }

      // Step 1: Load cached user immediately (don't wait for Firebase)
      const cachedUser = await loadCachedUser();
      
      // Step 2: Subscribe to Firebase auth changes
      unsubscribe = onAuthChange(async (fbUser) => {
        setFirebaseUser(fbUser);
        
        if (fbUser) {
          try {
            // Firebase auth succeeded, try to sync user document
            const userData = await setupUser(fbUser);
            setUser(userData);
            await cacheUser(userData);
            setHybridRepositoryUid(fbUser.uid); // Enable uid filtering in repositories
            syncEngine.enableSync(); // Enable background sync now that user is authenticated
            setIsOfflineMode(false); // Exit offline mode
            setIsGuest(false); // User is authenticated, not a guest
            setHybridRepositoryGuest(false); // Ensure guest mode is disabled in repository
            setRetryCount(0);

            // ========== FETCH FIREBASE DATA AFTER LOGIN ==========
            // Pull all user collections from Firebase into local SQLite
            try {
              console.log('Fetching user data from Firebase...');
              await syncEngine.manualSync();
              console.log('User data synced successfully from Firebase');
            } catch (error) {
              console.warn('Initial sync after login failed, will retry in background:', error);
            }
          } catch (error) {
            console.error('Error syncing with Firebase:', error);
            // Firebase sync failed, but keep using cached user
            if (cachedUser && !isCachedUserStale(cachedUser)) {
              setIsOfflineMode(true); // Enter offline mode
              setUser(cachedUser);
              const isGuest = cachedUser.uid.startsWith('guest_');
              setIsGuest(isGuest);
              setHybridRepositoryGuest(isGuest); // Sync guest flag with repository
              console.log('Switched to offline mode with cached user');
            } else {
              // Cached user is stale/missing, must re-login
              setUser(null);
              setIsOfflineMode(false);
              setIsGuest(false);
              setHybridRepositoryGuest(false); // Ensure guest mode is disabled
            }
          }
        } else {
          // Firebase logged out
          console.log('Firebase user logged out');
          setFirebaseUser(null);
          syncEngine.disableSync();
          
          // Check if we have a valid cached REAL Firebase user (not a guest)
          if (cachedUser && !isCachedUserStale(cachedUser) && !cachedUser.uid.startsWith('guest_')) {
            // Keep using the cached real user in offline mode
            setUser(cachedUser);
            setIsOfflineMode(true);
            setIsGuest(false);
            setHybridRepositoryGuest(false); // Ensure guest mode is disabled
            // Set uid for future sync when user comes back online
            setHybridRepositoryUid(cachedUser.uid);
            console.log('Switched to offline mode with cached Firebase user');
          } else {
            // No valid cached real user, create new guest user for continued offline use
            const guestUser = await createGuestUser();
            setUser(guestUser);
            setIsGuest(true);
            setIsOfflineMode(true);
            console.log('Created new guest user for offline mode');
          }
        }
        
        setIsLoading(false);
      });
      
      // Step 3: If we have a cached user, show app immediately (don't wait for Firebase)
      if (cachedUser && !isCachedUserStale(cachedUser)) {
        setIsOfflineMode(true);
        const isGuestUser = cachedUser.uid.startsWith('guest_');
        setIsGuest(isGuestUser);
        setHybridRepositoryGuest(isGuestUser); // Sync guest flag with repository
        // If it's a real Firebase user, set uid for future syncs
        if (!isGuestUser) {
          setHybridRepositoryUid(cachedUser.uid);
        }
        setIsLoading(false);
        console.log(`Loaded cached user: ${cachedUser.displayName}`);
      } else {
        // No cached user, create guest user and start app immediately
        const guestUser = await createGuestUser();
        setUser(guestUser);
        setIsGuest(true);
        setIsOfflineMode(true);
        setIsLoading(false);
        console.log('Started in guest mode');
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) unsubscribe();
      syncEngine.destroy();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      // Clear cache FIRST so onAuthChange doesn't reload the old user
      await cacheUser(null);
      await firebaseSignOut();
      setUser(null);
      setFirebaseUser(null);
      syncEngine.disableSync();
      
      // Create new guest user for continued offline use
      const guestUser = await createGuestUser();
      setUser(guestUser);
      setIsGuest(true);
      setIsOfflineMode(true);
      console.log('Logged out, switched to guest mode');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    
    try {
      await updateUserDocument(user.uid, data);
      const updatedUser = { ...user, ...data, updatedAt: new Date() };
      setUser(updatedUser);
      await cacheUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return;
    
    try {
      const userData = await getUserDocument(firebaseUser.uid);
      if (userData) {
        setUser(userData);
        await cacheUser(userData);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, [firebaseUser]);

  const value: AuthContextType = {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!user && !isGuest, // Only true if logged in (not a guest)
    isGuest,
    isOfflineMode,
    signOut,
    updateUser,
    refreshUser,
    loginWithEmail,
    signupWithEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
