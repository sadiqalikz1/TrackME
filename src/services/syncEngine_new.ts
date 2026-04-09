import { AppState, AppStateStatus, Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { hybridRepository, syncWithStrategy as executeSyncStrategy, SyncStrategy } from './repositories/hybridRepository';
import { database } from './database';

const BACKGROUND_SYNC_TASK = 'background-sync-task';

/**
 * SyncEngine: Orchestrates event-driven syncing of offline changes
 * - Syncs on app startup (initial full sync)
 * - Syncs when user performs CRUD operations (create, update, delete)
 * - Syncs when network transitions from offline to online
 * - NO periodic or scheduled syncing
 */
export class SyncEngine {
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private appState: AppStateStatus | null = null;
  private syncInProgress: boolean = false;
  private lastNetworkState: boolean = false;
  private isSyncingAllowed: boolean = true;
  private isSyncEnabled: boolean = false; // Don't start syncing until user is authenticated
  private hasPerformedInitialSync: boolean = false; // Track if initial sync done on app startup

  constructor() {
    this.lastNetworkState = hybridRepository.getNetworkStatus();
  }

  /**
   * Initialize sync engine: Set up app state listener and network monitoring
   * NO periodic sync - sync only on events (app startup, CRUD ops, network change)
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing SyncEngine (event-driven mode)...');

      // Initialize database first
      await database.initialize();

      // Set up app state listener for foreground/background changes
      this.setupAppStateListener();

      // Monitor network state transitions (offline -> online)
      this.monitorNetworkState();

      // Register background fetch task (optional backup for when app is terminated)
      if (Platform.OS !== 'web') {
        await this.registerBackgroundSyncTask();
      }

      console.log('SyncEngine initialized (event-driven mode) - syncs only on app startup, CRUD ops, and network transitions');
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
   * Handle app state changes - trigger initial sync when app becomes active
   */
  private handleAppStateChange(state: AppStateStatus): void {
    this.appState = state;

    // Skip for guest users
    if (hybridRepository.isGuestMode()) {
      return;
    }

    if (state === 'active') {
      // First time app opened - perform initial full sync
      if (!this.hasPerformedInitialSync && this.isSyncEnabled) {
        console.log('App startup detected, performing initial full sync...');
        this.hasPerformedInitialSync = true;
        this.syncIfOnline();
      }
    } else if (state === 'inactive' || state === 'background') {
      // App backgrounded - no action needed (event-driven sync will handle any pending changes)
    }
  }

  /**
   * Sync if device is online
   * Called on: app startup, CRUD operations, network transitions
   */
  async syncIfOnline(): Promise<void> {
    if (!hybridRepository.getNetworkStatus()) {
      console.log('Device is offline, sync deferred until online');
      return;
    }

    await this.performSync();
  }

  /**
   * Monitor network state transitions (offline -> online)
   * Triggers sync when device comes online
   */
  monitorNetworkState(): void {
    // Skip for guest users
    if (hybridRepository.isGuestMode()) {
      return;
    }

    // Check network status every 5 seconds
    setInterval(async () => {
      const isCurrentlyOnline = hybridRepository.getNetworkStatus();

      // Transition from offline to online detected
      if (!this.lastNetworkState && isCurrentlyOnline) {
        if (!hybridRepository.isGuestMode() && this.isSyncEnabled) {
          console.log('Device came online, triggering event-driven sync...');
          await this.performSync();
        }
      }

      this.lastNetworkState = isCurrentlyOnline;
    }, 5000);
  }

  /**
   * Perform sync operation with retry logic
   * Only called on explicit events, never periodically
   */
  private async performSync(retryCount: number = 0): Promise<void> {
    // Skip for guest users
    if (hybridRepository.isGuestMode()) {
      return;
    }

    if (!this.isSyncEnabled) {
      console.log('Sync not enabled (user not authenticated)');
      return;
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;

    try {
      console.log(`Starting event-driven sync (attempt ${retryCount + 1})...`);

      // Sync all collections
      await hybridRepository.syncAll();

      console.log('Event-driven sync completed successfully');
    } catch (error) {
      console.error('Sync operation failed:', error);

      // Retry with exponential backoff (1s, 2s, 4s)
      if (retryCount < 3) {
        const delayMs = Math.pow(2, retryCount) * 1000;
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
   * Runs when app is terminated, as fallback to event-driven sync
   */
  private async registerBackgroundSyncTask(): Promise<void> {
    try {
      // Define the background task
      TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
        try {
          console.log('Running background sync task (app terminated fallback)...');
          await hybridRepository.syncAll();
          console.log('Background sync task completed');
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('Background sync task failed:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register the background fetch task (15 minutes minimum interval)
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 900, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background sync task registered as fallback');
    } catch (error) {
      console.error('Failed to register background sync task:', error);
    }
  }

  /**
   * Manually trigger sync from UI (e.g., pull-to-refresh)
   */
  async manualSync(): Promise<void> {
    console.log('Manual sync triggered by user');
    await this.performSync();
  }

  /**
   * Enable syncing (call after user authentication)
   */
  enableSync(): void {
    this.isSyncEnabled = true;
    console.log('Sync enabled for authenticated user');
    // Perform initial sync immediately after enabling
    if (hybridRepository.getNetworkStatus()) {
      console.log('Network available, performing initial sync now...');
      this.syncIfOnline();
    }
  }

  /**
   * Disable syncing (call on logout)
   */
  disableSync(): void {
    this.isSyncEnabled = false;
    this.hasPerformedInitialSync = false;
    console.log('Sync disabled');
  }

  /**
   * Pause syncing temporarily
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
   * Execute sync with specified strategy
   * Called after user selects a sync strategy on login
   */
  async syncWithStrategy(strategy: SyncStrategy): Promise<void> {
    if (!hybridRepository.getNetworkStatus()) {
      throw new Error('Cannot sync while offline');
    }

    this.syncInProgress = true;
    console.log(`Executing sync with strategy: ${strategy}`);

    try {
      await executeSyncStrategy(strategy);
      this.hasPerformedInitialSync = true;
      console.log(`Sync with strategy ${strategy} completed successfully`);
    } catch (error) {
      console.error(`Sync with strategy ${strategy} failed:`, error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Check if local data exists (for showing sync modal)
   */
  async hasLocalData(): Promise<boolean> {
    return await hybridRepository.hasLocalData();
  }

  /**
   * Check if cloud data exists (for showing sync modal)
   */
  async hasCloudData(): Promise<boolean> {
    return await hybridRepository.hasCloudData();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    console.log('SyncEngine destroyed (event-driven mode)');
  }
}

// Export singleton
export const syncEngine = new SyncEngine();
