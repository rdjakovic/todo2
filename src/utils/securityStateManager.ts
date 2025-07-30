/**
 * Security State Manager
 * 
 * Manages client-side security state persistence with secure storage,
 * state validation, automatic cleanup, and cross-tab synchronization.
 */

import { secureStorage } from './secureStorage';

export interface SecurityStateRecord {
  identifier: string;
  failedAttempts: number;
  lockoutUntil?: number;
  lastAttempt?: number;
  progressiveDelay?: number;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface SecurityStateManagerConfig {
  storagePrefix: string;
  maxAge: number; // Maximum age in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  syncInterval: number; // Cross-tab sync interval in milliseconds
  version: number;
}

export interface StateValidationResult {
  isValid: boolean;
  errors: string[];
  correctedState?: SecurityStateRecord;
}

export class SecurityStateManager {
  private static readonly DEFAULT_CONFIG: SecurityStateManagerConfig = {
    storagePrefix: 'security_state',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    syncInterval: 5 * 1000, // 5 seconds
    version: 1
  };

  private config: SecurityStateManagerConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<(state: SecurityStateRecord | null) => void>> = new Map();
  private lastSyncTimestamp: number = 0;

  constructor(config: Partial<SecurityStateManagerConfig> = {}) {
    this.config = { ...SecurityStateManager.DEFAULT_CONFIG, ...config };
    this.initializeManager();
  }

  /**
   * Initialize the security state manager
   */
  private initializeManager(): void {
    // Start automatic cleanup
    this.startAutomaticCleanup();
    
    // Start cross-tab synchronization
    this.startCrossTabSync();
    
    // Listen for storage events for cross-tab synchronization
    this.setupStorageEventListener();
    
    // Cleanup on page unload
    this.setupUnloadHandler();
  }

  /**
   * Get security state for an identifier
   */
  async getSecurityState(identifier: string): Promise<SecurityStateRecord | null> {
    try {
      const storageKey = this.getStorageKey(identifier);
      const storedData = await secureStorage.retrieve(storageKey);

      if (!storedData) {
        return null;
      }

      const state: SecurityStateRecord = JSON.parse(storedData);
      
      // Validate state
      const validation = this.validateState(state);
      if (!validation.isValid) {
        console.warn('Invalid security state found, removing:', validation.errors);
        await this.clearSecurityState(identifier);
        return validation.correctedState || null;
      }

      // Check if state has expired
      if (this.isStateExpired(state)) {
        await this.clearSecurityState(identifier);
        return null;
      }

      return state;
    } catch (error) {
      console.error('Error retrieving security state:', error);
      return null;
    }
  }

  /**
   * Set security state for an identifier
   */
  async setSecurityState(identifier: string, state: Partial<SecurityStateRecord>): Promise<void> {
    try {
      const now = Date.now();
      const existingState = await this.getSecurityState(identifier);
      
      const newState: SecurityStateRecord = {
        identifier,
        failedAttempts: state.failedAttempts ?? 0,
        lockoutUntil: state.lockoutUntil,
        lastAttempt: state.lastAttempt ?? now,
        progressiveDelay: state.progressiveDelay ?? 0,
        createdAt: existingState?.createdAt ?? now,
        updatedAt: now,
        version: this.config.version
      };

      // Validate the new state
      const validation = this.validateState(newState);
      if (!validation.isValid) {
        throw new Error(`Invalid security state: ${validation.errors.join(', ')}`);
      }

      const storageKey = this.getStorageKey(identifier);
      const stateData = JSON.stringify(newState);
      await secureStorage.store(storageKey, stateData);

      // Notify listeners
      this.notifyStateChange(identifier, newState);
    } catch (error) {
      console.error('Error storing security state:', error);
      throw new Error('Failed to store security state');
    }
  }

  /**
   * Clear security state for an identifier
   */
  async clearSecurityState(identifier: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey(identifier);
      secureStorage.remove(storageKey);
      
      // Notify listeners
      this.notifyStateChange(identifier, null);
    } catch (error) {
      console.error('Error clearing security state:', error);
      throw new Error('Failed to clear security state');
    }
  }

  /**
   * Get all security states (for cleanup and management)
   */
  async getAllSecurityStates(): Promise<SecurityStateRecord[]> {
    const states: SecurityStateRecord[] = [];
    
    try {
      // Iterate through localStorage to find our security state keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(this.config.storagePrefix)) {
          continue;
        }

        try {
          const storedData = await secureStorage.retrieve(key);
          if (storedData) {
            const state: SecurityStateRecord = JSON.parse(storedData);
            const validation = this.validateState(state);
            
            if (validation.isValid && !this.isStateExpired(state)) {
              states.push(state);
            } else {
              // Remove invalid or expired state
              secureStorage.remove(key);
            }
          }
        } catch (error) {
          console.warn('Error processing security state:', key, error);
          // Remove corrupted state
          secureStorage.remove(key);
        }
      }
    } catch (error) {
      console.error('Error retrieving all security states:', error);
    }

    return states;
  }

  /**
   * Validate security state structure and data
   */
  validateState(state: any): StateValidationResult {
    const errors: string[] = [];
    let correctedState: SecurityStateRecord | undefined;

    // Check basic structure
    if (!state || typeof state !== 'object') {
      errors.push('State must be an object');
      return { isValid: false, errors };
    }

    // Validate required fields
    if (typeof state.identifier !== 'string' || !state.identifier.trim()) {
      errors.push('Identifier must be a non-empty string');
    }

    if (typeof state.failedAttempts !== 'number' || state.failedAttempts < 0) {
      errors.push('Failed attempts must be a non-negative number');
    }

    if (typeof state.createdAt !== 'number' || state.createdAt <= 0) {
      errors.push('Created timestamp must be a positive number');
    }

    if (typeof state.updatedAt !== 'number' || state.updatedAt <= 0) {
      errors.push('Updated timestamp must be a positive number');
    }

    if (typeof state.version !== 'number' || state.version <= 0) {
      errors.push('Version must be a positive number');
    }

    // Validate optional fields
    if (state.lockoutUntil !== undefined) {
      if (typeof state.lockoutUntil !== 'number' || state.lockoutUntil <= 0) {
        errors.push('Lockout timestamp must be a positive number');
      } else {
        // Check if lockout time is reasonable (not more than 24 hours in the future)
        const maxLockout = Date.now() + 24 * 60 * 60 * 1000;
        if (state.lockoutUntil > maxLockout) {
          errors.push('Lockout time is too far in the future');
        }
      }
    }

    if (state.lastAttempt !== undefined && (typeof state.lastAttempt !== 'number' || state.lastAttempt <= 0)) {
      errors.push('Last attempt timestamp must be a positive number');
    }

    if (state.progressiveDelay !== undefined && (typeof state.progressiveDelay !== 'number' || state.progressiveDelay < 0)) {
      errors.push('Progressive delay must be a non-negative number');
    }

    // Check timestamp consistency
    if (state.updatedAt < state.createdAt) {
      errors.push('Updated timestamp cannot be before created timestamp');
    }

    // If there are validation errors but the state is partially recoverable, create a corrected version
    if (errors.length > 0 && state.identifier && typeof state.failedAttempts === 'number') {
      const now = Date.now();
      correctedState = {
        identifier: state.identifier,
        failedAttempts: Math.max(0, state.failedAttempts),
        lockoutUntil: (typeof state.lockoutUntil === 'number' && state.lockoutUntil > now) ? state.lockoutUntil : undefined,
        lastAttempt: (typeof state.lastAttempt === 'number' && state.lastAttempt > 0) ? state.lastAttempt : now,
        progressiveDelay: Math.max(0, state.progressiveDelay || 0),
        createdAt: (typeof state.createdAt === 'number' && state.createdAt > 0) ? state.createdAt : now,
        updatedAt: now,
        version: this.config.version
      };
    }

    return {
      isValid: errors.length === 0,
      errors,
      correctedState
    };
  }

  /**
   * Check if a state has expired
   */
  private isStateExpired(state: SecurityStateRecord): boolean {
    const now = Date.now();
    return (now - state.updatedAt) > this.config.maxAge;
  }

  /**
   * Clean up expired security states
   */
  async cleanupExpiredStates(): Promise<number> {
    let cleanedCount = 0;
    
    try {
      // Iterate through localStorage directly to find expired states
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(this.config.storagePrefix)) {
          continue;
        }

        try {
          const storedData = await secureStorage.retrieve(key);
          if (storedData) {
            const state: SecurityStateRecord = JSON.parse(storedData);
            const validation = this.validateState(state);
            
            if (validation.isValid && this.isStateExpired(state)) {
              await this.clearSecurityState(state.identifier);
              cleanedCount++;
            } else if (!validation.isValid) {
              // Also clean up invalid states
              secureStorage.remove(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          console.warn('Error processing security state during cleanup:', key, error);
          // Remove corrupted state
          secureStorage.remove(key);
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired security states`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }

    return cleanedCount;
  }

  /**
   * Start automatic cleanup timer
   */
  private startAutomaticCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredStates().catch(error => {
        console.error('Automatic cleanup failed:', error);
      });
    }, this.config.cleanupInterval);
  }

  /**
   * Start cross-tab synchronization
   */
  private startCrossTabSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.syncAcrossTabs().catch(error => {
        console.error('Cross-tab sync failed:', error);
      });
    }, this.config.syncInterval);
  }

  /**
   * Synchronize state across browser tabs
   */
  private async syncAcrossTabs(): Promise<void> {
    try {
      // Check if there have been any storage changes since last sync
      const currentTimestamp = Date.now();
      if (currentTimestamp - this.lastSyncTimestamp < this.config.syncInterval) {
        return;
      }

      // Get all current states and notify listeners of any changes
      const allStates = await this.getAllSecurityStates();
      
      for (const state of allStates) {
        if (state.updatedAt > this.lastSyncTimestamp) {
          this.notifyStateChange(state.identifier, state);
        }
      }

      this.lastSyncTimestamp = currentTimestamp;
    } catch (error) {
      console.error('Error during cross-tab sync:', error);
    }
  }

  /**
   * Setup storage event listener for cross-tab synchronization
   */
  private setupStorageEventListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith(this.config.storagePrefix)) {
          // Extract identifier from storage key
          const identifier = this.extractIdentifierFromKey(event.key);
          if (identifier) {
            // Notify listeners of the change
            this.handleStorageChange(identifier, event.newValue);
          }
        }
      });
    }
  }

  /**
   * Handle storage change events
   */
  private async handleStorageChange(identifier: string, newValue: string | null): Promise<void> {
    try {
      if (newValue) {
        const state: SecurityStateRecord = JSON.parse(newValue);
        const validation = this.validateState(state);
        
        if (validation.isValid) {
          this.notifyStateChange(identifier, state);
        }
      } else {
        this.notifyStateChange(identifier, null);
      }
    } catch (error) {
      console.error('Error handling storage change:', error);
    }
  }

  /**
   * Setup cleanup on page unload
   */
  private setupUnloadHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }

  /**
   * Add state change listener
   */
  addStateChangeListener(identifier: string, callback: (state: SecurityStateRecord | null) => void): void {
    if (!this.eventListeners.has(identifier)) {
      this.eventListeners.set(identifier, new Set());
    }
    this.eventListeners.get(identifier)!.add(callback);
  }

  /**
   * Remove state change listener
   */
  removeStateChangeListener(identifier: string, callback: (state: SecurityStateRecord | null) => void): void {
    const listeners = this.eventListeners.get(identifier);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(identifier);
      }
    }
  }

  /**
   * Notify listeners of state changes
   */
  private notifyStateChange(identifier: string, state: SecurityStateRecord | null): void {
    const listeners = this.eventListeners.get(identifier);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error('Error in state change listener:', error);
        }
      });
    }
  }

  /**
   * Generate storage key for identifier
   */
  private getStorageKey(identifier: string): string {
    // Hash the identifier for privacy and consistent key length
    const hash = btoa(identifier).replace(/[^a-zA-Z0-9]/g, '');
    return `${this.config.storagePrefix}_${hash}`;
  }

  /**
   * Extract identifier from storage key
   */
  private extractIdentifierFromKey(storageKey: string): string | null {
    const prefix = `${this.config.storagePrefix}_`;
    if (!storageKey.startsWith(prefix)) {
      return null;
    }
    
    try {
      const hash = storageKey.substring(prefix.length);
      return atob(hash);
    } catch (error) {
      console.error('Error extracting identifier from key:', error);
      return null;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityStateManagerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SecurityStateManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart timers with new configuration
    this.startAutomaticCleanup();
    this.startCrossTabSync();
  }

  /**
   * Get statistics about stored security states
   */
  async getStatistics(): Promise<{
    totalStates: number;
    expiredStates: number;
    lockedStates: number;
    oldestState?: Date;
    newestState?: Date;
  }> {
    try {
      const allStates = await this.getAllSecurityStates();
      const now = Date.now();
      
      let expiredCount = 0;
      let lockedCount = 0;
      let oldestTimestamp = Infinity;
      let newestTimestamp = 0;

      for (const state of allStates) {
        if (this.isStateExpired(state)) {
          expiredCount++;
        }
        
        if (state.lockoutUntil && state.lockoutUntil > now) {
          lockedCount++;
        }
        
        oldestTimestamp = Math.min(oldestTimestamp, state.createdAt);
        newestTimestamp = Math.max(newestTimestamp, state.updatedAt);
      }

      return {
        totalStates: allStates.length,
        expiredStates: expiredCount,
        lockedStates: lockedCount,
        oldestState: oldestTimestamp !== Infinity ? new Date(oldestTimestamp) : undefined,
        newestState: newestTimestamp > 0 ? new Date(newestTimestamp) : undefined
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalStates: 0,
        expiredStates: 0,
        lockedStates: 0
      };
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    this.eventListeners.clear();
  }
}

// Export a default instance for convenience
export const securityStateManager = new SecurityStateManager();

// Export types for external use
export type { SecurityStateRecord, SecurityStateManagerConfig, StateValidationResult };