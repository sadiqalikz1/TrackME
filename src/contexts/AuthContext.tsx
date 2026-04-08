import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthChange,
  signOut as firebaseSignOut,
  getUserDocument,
  createUserDocument,
  updateUserDocument,
} from '@/services/firebase';
import { User, Currency } from '@/types';
import { STORAGE_KEYS, DEFAULT_USER_SETTINGS } from '@/utils/constants';

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

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let retryCount = 0;
    const maxRetries = 5;
    
    const setupAuthListener = async () => {
      try {
        // Small delay to ensure React Native is ready
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        
        unsubscribe = await onAuthChange(async (fbUser) => {
          setFirebaseUser(fbUser);

          if (fbUser) {
            try {
              // Try to get existing user document
              let userData = await getUserDocument(fbUser.uid) as User | null;

              if (!userData) {
                // Create new user document
                const newUser: Omit<User, 'createdAt' | 'updatedAt'> = {
                  uid: fbUser.uid,
                  email: fbUser.email || '',
                  displayName: fbUser.displayName || 'User',
                  photoURL: fbUser.photoURL || undefined,
                  ...DEFAULT_USER_SETTINGS,
                };

                await createUserDocument(fbUser.uid, newUser);
                userData = {
                  ...newUser,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                } as User;
              }

              setUser(userData);
              await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData));
            } catch (error) {
              console.error('Error loading user data:', error);
              // Try to load from local storage as fallback
              const cachedUser = await AsyncStorage.getItem(STORAGE_KEYS.user);
              if (cachedUser) {
                setUser(JSON.parse(cachedUser));
              }
            }
          } else {
            setUser(null);
            await AsyncStorage.removeItem(STORAGE_KEYS.user);
          }

          setIsLoading(false);
        });
        
        console.log('Auth listener setup successfully');
      } catch (error) {
        console.error(`Error setting up auth listener (attempt ${retryCount + 1}):`, error);
        
        // Retry up to maxRetries times
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(setupAuthListener, 500);
        } else {
          console.error('Max retries reached for auth listener setup');
          setIsLoading(false);
        }
      }
    };

    setupAuthListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut();
      setUser(null);
      setFirebaseUser(null);
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.user,
        STORAGE_KEYS.theme,
        STORAGE_KEYS.currency,
      ]);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user || !firebaseUser) return;

    try {
      await updateUserDocument(firebaseUser.uid, data);
      const updatedUser = { ...user, ...data, updatedAt: new Date() };
      setUser(updatedUser);
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!firebaseUser) return;

    try {
      const userData = await getUserDocument(firebaseUser.uid) as User | null;
      if (userData) {
        setUser(userData);
        await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
