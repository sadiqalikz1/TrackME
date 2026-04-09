import { AppState, AppStateStatus, Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { hybridRepository } from './repositories/hybridRepository';
import { database } from './database';

const BACKGROUND_SYNC_TASK = 'background-sync-task';

/**
 * SyncEngine: Orchestrates background syncing of offline changes
 * - Syncs on app focus
 * - Syncs periodically (every 60 seconds when online)
 * - Syncs when network state changes from offline to online
 * - Retries failed syncs with exponential backoff
 */
export class SyncEngine {
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private appState: AppStateStatus | null = null;
  private lastSyncTime: number = 0;
  private syncInProgress: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private lastNetworkState: boolean = false;
  private isSyncingAllowed: boolean = true;
  private isSyncEnabled: boolean = false; // Don't start syncing until user is authenticated

  constructor() {
    this.lastNetworkState = hybridRepository.getNetworkStatus();
  }

  /**
   * Initialize sync engine: Set up app state listener and periodic sync
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing SyncEngine...');

      // Initialize database first
      await database.initialize();

      // Set up app state listener for foreground state changes
      this.setupAppStateListener();

      // Set up periodic sync when app is in foreground
      this.setupPeriodicSync();

      // Register background fetch task
      if (Platform.OS !== 'web') {
        await this.registerBackgroundSyncTask();
      }

      console.log('SyncEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SyncEngine:', error);
    }
  }

  /**
   * Set up listener for app state changes (foreground/background)
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(state: AppStateStatus): void {
    this.appState = state;

    // Skip sync logging for guest users (silent operation)
    if (hybridRepository.isGuestMode()) {
      return;
    }

    if (state === 'active') {
      console.log('App came to foreground, triggering sync...');
      this.syncIfOnline();
    } else if (state === 'inactive' || state === 'background') {
      console.log('App went to background');
    }
  }

  /**
   * Set up periodic sync every 60 seconds
   * (Skipped silently for guest users)
   */
  private setupPeriodicSync(): void {
    this.syncTimer = setInterval(() => {
      // Skip silent for guest mode
      if (hybridRepository.isGuestMode()) {
        return;
      }

      if (this.isSyncingAllowed && this.appState === 'active') {
        this.syncIfOnline();
      }
    }, 60000); // Sync every 60 seconds
  }

  /**
   * Sync if device is online
   */
  async syncIfOnline(): Promise<void> {
    if (!hybridRepository.getNetworkStatus()) {
      console.log('Device is offline, skipping sync');
      return;
    }

    await this.performSync();
  }

  /**
   * Monitor network state changes
   * (Skipped for guest users)
   */
  monitorNetworkState(): void {
    // Skip network monitoring for guest users - no logging
    if (hybridRepository.isGuestMode()) {
      return;
    }

    // Check network status periodically (every 5 seconds)
    setInterval(async () => {
      const isCurrentlyOnline = hybridRepository.getNetworkStatus();

      // Transition from offline to online
      if (!this.lastNetworkState && isCurrentlyOnline) {
        // Silent skip for guest mode
        if (!hybridRepository.isGuestMode()) {
          console.log('Device went online, triggering full sync...');
          await this.performSync();
        }
      }

      this.lastNetworkState = isCurrentlyOnline;
    }, 5000);
  }

  /**
   * Perform sync operation with retry logic
   * (Silently skipped for guest users)
   */
  private async performSync(retryCount: number = 0): Promise<void> {
    // Silent skip for guest users - no logging
    if (hybridRepository.isGuestMode()) {
      return;
    }

    if (!this.isSyncEnabled) {
      console.log('Sync not yet enabled (user not authenticated), skipping...');
      return;
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;

    try {
      const now = Date.now();

      // Check if enough time has passed since last sync (avoid too frequent syncs)
      if (now - this.lastSyncTime < 30000) {
        console.log('Last sync was recent, skipping...');
        this.syncInProgress = false;
        return;
      }

      this.lastSyncTime = now;

      console.log(`Starting sync operation (attempt ${retryCount + 1})...`);

      // Sync all collections
      await hybridRepository.syncAll();

      console.log('Sync operation completed successfully');
    } catch (error) {
      console.error('Sync operation failed:', error);

      // Retry with exponential backoff
      if (retryCount < 3) {
        const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying sync in ${delayMs}ms...`);

        setTimeout(() => {
          this.syncInProgress = false;
          this.performSync(retryCount + 1);
        }, delayMs);

        return;
      }
    } finally {
      if (retryCount >= 3) {
        this.syncInProgress = false;
      }
    }
  }

  /**
   * Register background fetch task (for iOS/Android background sync)
   */
  private async registerBackgroundSyncTask(): Promise<void> {
    try {
      // Define the background task
      TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
        try {
          console.log('Running background sync task...');
          await hybridRepository.syncAll();
          console.log('Background sync task completed');
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('Background sync task failed:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register the background fetch task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 900, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background sync task registered');
    } catch (error) {
      console.error('Failed to register background sync task:', error);
    }
  }

  /**
   * Manual sync trigger (can be called from UI)
   */
  async manualSync(): Promise<void> {
    console.log('Manual sync triggered');
    await this.performSync();
  }

  /**
   * Enable syncing (call after user authentication)
   */
  enableSync(): void {
    this.isSyncEnabled = true;
    console.log('Sync enabled for authenticated user');
  }

  /**
   * Disable syncing (call on logout)
   */
  disableSync(): void {
    this.isSyncEnabled = false;
    console.log('Sync disabled');
  }

  /**
   * Pause syncing
   */
  pauseSync(): void {
    this.isSyncingAllowed = false;
    console.log('Sync paused');
  }

  /**
   * Resume syncing
   */
  resumeSync(): void {
    this.isSyncingAllowed = true;
    console.log('Sync resumed');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    console.log('SyncEngine destroyed');
  }
}

// Export singleton
export const syncEngine = new SyncEngine();
