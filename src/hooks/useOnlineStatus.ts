import { useAuth } from '../contexts/AuthContext';

/**
 * useOfflineStatus: Check if app is in offline mode
 */
export function useOfflineStatus() {
  const { isOfflineMode, isLoading } = useAuth();
  return {
    isOffline: isOfflineMode,
    isLoading,
  };
}

/**
 * useOnlineStatus: Check if device is online (inverse of offline)
 */
export function useOnlineStatus() {
  const { isOfflineMode } = useAuth();
  return !isOfflineMode;
}
