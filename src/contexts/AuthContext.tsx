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
} from '@/services/firebase';
import { User } from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
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
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;

  const loadCachedUser = async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (cached) {
        const parsedUser = JSON.parse(cached);
        // Convert date strings back to Date objects
        parsedUser.createdAt = new Date(parsedUser.createdAt);
        parsedUser.updatedAt = new Date(parsedUser.updatedAt);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error loading cached user:', error);
    }
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

  useEffect(() => {
    initializeFirebase();
    loadCachedUser();

    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        try {
          const userData = await setupUser(fbUser);
          setUser(userData);
          await cacheUser(userData);
        } catch (error) {
          console.error('Error in auth change handler:', error);
          // Fall back to cached user if available
          await loadCachedUser();
        }
      } else {
        setUser(null);
        await cacheUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut();
      setUser(null);
      setFirebaseUser(null);
      await cacheUser(null);
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
    isAuthenticated: !!user && !!firebaseUser,
    signOut,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
