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
import { setHybridRepositoryUid, setHybridRepositoryGuest, clearGuestData, SyncStrategy, checkHasLocalData, checkHasCloudData } from '@/services/repositories/hybridRepository';
import { database } from '@/services/database';
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
  // Sync strategy modal
  showSyncModal: boolean;
  localDataCount: number;
  cloudDataExists: boolean;
  handleSyncStrategy: (strategy: SyncStrategy) => Promise<void>;
  dismissSyncModal: () => void;
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
  
  // Sync strategy modal state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [pendingLoginUser, setPendingLoginUser] = useState<{ fbUser: FirebaseUser; userData: User } | null>(null);
  const [localDataCount, setLocalDataCount] = useState(0);
  const [cloudDataExists, setCloudDataExists] = useState(false);
  const [isNewSignup, setIsNewSignup] = useState(false);
  
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
      setIsNewSignup(true); // Mark as new signup to skip sync modal
      await signUpWithEmail(email, password);
      // onAuthChange listener will create user document and handle the rest
    } catch (error) {
      setIsNewSignup(false); // Reset on error
      console.error('Signup failed:', error);
      throw error;
    }
  };
  
  /**
   * Complete the login process after sync strategy is selected (or skipped)
   */
  const completeLogin = async (fbUser: FirebaseUser, userData: User): Promise<void> => {
    setUser(userData);
    await cacheUser(userData);
    syncEngine.enableSync(); // Enable background sync now that user is authenticated
    setIsOfflineMode(false); // Exit offline mode
    setIsGuest(false); // User is authenticated, not a guest
    setRetryCount(0);

    // Pull all user collections from Firebase into local SQLite
    try {
      console.log('Fetching user data from Firebase...');
      await syncEngine.manualSync();
      console.log('User data synced successfully from Firebase');
    } catch (error) {
      console.warn('Initial sync after login failed, will retry in background:', error);
    }
    
    setIsLoading(false);
  };

  /**
   * Handle sync strategy selection from modal
   */
  const handleSyncStrategy = async (strategy: SyncStrategy): Promise<void> => {
    if (!pendingLoginUser) {
      console.error('No pending login user');
      return;
    }
    
    const { fbUser, userData } = pendingLoginUser;
    
    try {
      console.log(`Applying sync strategy: ${strategy}`);
      
      // Execute the selected sync strategy
      await syncEngine.syncWithStrategy(strategy);
      
      // Save that user has chosen sync strategy (don't ask again)
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_STRATEGY_CHOSEN, 'true');
      
      // Hide modal and complete login
      setShowSyncModal(false);
      setPendingLoginUser(null);
      await completeLogin(fbUser, userData);
      
    } catch (error) {
      console.error('Error applying sync strategy:', error);
      // Still complete login, just with normal sync fallback
      setShowSyncModal(false);
      setPendingLoginUser(null);
      await completeLogin(fbUser, userData);
    }
  };
  
  /**
   * Dismiss sync modal without selecting a strategy (uses default merge)
   */
  const dismissSyncModal = () => {
    if (pendingLoginUser) {
      // Use merge as default when dismissing
      handleSyncStrategy('merge');
    } else {
      setShowSyncModal(false);
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
            // If user was previously in guest mode, clear guest data before switching to authenticated
            if (isGuest) {
              console.log('Clearing guest data before authenticating user...');
              await clearGuestData();
            }

            // Firebase auth succeeded, try to sync user document
            const userData = await setupUser(fbUser);
            if (!userData) {
              throw new Error('Failed to setup user document');
            }
            
            // Set uid first so we can check cloud data
            setHybridRepositoryUid(fbUser.uid);
            setHybridRepositoryGuest(false);
            
            // Check if this is a returning user who needs sync strategy selection
            // (skip for new signups - they have no cloud data yet)
            const hasLocal = await checkHasLocalData();
            const hasCloud = await checkHasCloudData();
            
            console.log(`Login check - Local data: ${hasLocal}, Cloud data: ${hasCloud}, New signup: ${isNewSignup}`);
            
            // Show sync modal for returning users with local data
            // NEW SIGNUPS: Skip modal (no cloud data to compare)
            // RETURNING USERS: Skip modal if already chosen strategy in the past
            // RETURNING USERS: Show modal if local data exists and haven't chosen strategy yet
            if (!isNewSignup && hasLocal) {
              // Check if user already chose sync strategy before
              const alreadyChosen = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STRATEGY_CHOSEN);
              
              if (!alreadyChosen) {
                console.log('Returning user with local data - showing sync strategy modal');
                
                // Get local data count for display
                const count = await database.getLocalDataCount('transactions') +
                             await database.getLocalDataCount('budgets') +
                             await database.getLocalDataCount('work');
                
                setLocalDataCount(count);
                setCloudDataExists(hasCloud);
                setPendingLoginUser({ fbUser, userData });
                setShowSyncModal(true);
                setIsLoading(false); // Allow UI to render modal
                return; // Wait for user to select sync strategy
              } else {
                console.log('Returning user - previously chose sync strategy, skipping modal');
              }
            }
            
            // No sync modal needed - complete login immediately
            await completeLogin(fbUser, userData);
            
          } catch (error) {
            console.error('Error syncing with Firebase:', error);
            // Firebase sync failed, but keep using cached user
            if (cachedUser && !isCachedUserStale(cachedUser)) {
              setIsOfflineMode(true); // Enter offline mode
              setUser(cachedUser);
              const isGuestUser = cachedUser.uid.startsWith('guest_');
              setIsGuest(isGuestUser);
              setHybridRepositoryGuest(isGuestUser); // Sync guest flag with repository
              console.log('Switched to offline mode with cached user');
            } else {
              // Cached user is stale/missing, must re-login
              setUser(null);
              setIsOfflineMode(false);
              setIsGuest(false);
              setHybridRepositoryGuest(false); // Ensure guest mode is disabled
            }
          } finally {
            setIsNewSignup(false); // Reset flag after processing
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
      // Clear sync strategy flag so next login can ask again if needed
      await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_STRATEGY_CHOSEN);
      await firebaseSignOut();
      setUser(null);
      setFirebaseUser(null);
      syncEngine.disableSync();
      
      // SECURITY: Clear ALL local data on logout
      // This prevents next user from accessing previous user's data
      console.log('Clearing local database data...');
      await database.clearAllData();
      console.log('Local data cleared successfully');
      
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
      // For guest users, only update local state and cache (no Firebase)
      if (user.uid.startsWith('guest_')) {
        const updatedUser = { ...user, ...data, updatedAt: new Date() };
        setUser(updatedUser);
        await cacheUser(updatedUser);
      } else {
        // For authenticated users, update both Firebase and local cache
        await updateUserDocument(user.uid, data);
        const updatedUser = { ...user, ...data, updatedAt: new Date() };
        setUser(updatedUser);
        await cacheUser(updatedUser);
      }
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
    // Sync strategy modal
    showSyncModal,
    localDataCount,
    cloudDataExists,
    handleSyncStrategy,
    dismissSyncModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
