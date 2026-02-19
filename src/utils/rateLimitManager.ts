/**
 * Rate Limit Manager
 * 
 * Manages failed authentication attempts and account lockout logic
 * to protect against brute force attacks.
 */

import { secureStorage } from './secureStorage';
import { securityLogger, SecurityEventType } from './securityLogger';

export interface RateLimitStatus {
  isLocked: boolean;
  remainingTime?: number;
  attemptsRemaining?: number;
  canAttempt: boolean;
  progressiveDelay?: number;
}

export interface RateLimitConfig {
  maxAttempts: number;
  lockoutDuration: number; // in milliseconds
  progressiveDelay: boolean;
  storageKey: string;
  baseDelay?: number; // base delay in milliseconds for progressive delays
  maxDelay?: number; // maximum progressive delay
}

export interface SecurityState {
  failedAttempts: number;
  lockoutUntil?: number; // timestamp
  lastAttempt?: number; // timestamp
  progressiveDelay?: number;
  checksum?: string; // For additional integrity validation
}

export class RateLimitManager {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    progressiveDelay: true,
    storageKey: 'auth_security_state',
    baseDelay: 1000 // 1 second base delay
  };

  private config: RateLimitConfig;
  private listeners: Map<string, Set<(state: SecurityState) => void>> = new Map();
  private locks: Map<string, Promise<void>> = new Map();

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...RateLimitManager.DEFAULT_CONFIG, ...config };
    this.setupStorageListener();
  }

  /**
   * Set up listener for localStorage changes from other tabs
   */
  private setupStorageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', async (event) => {
        if (event.key && event.key.startsWith(this.config.storageKey)) {
          const identifier = event.key.replace(`${this.config.storageKey}_`, '');
          if (event.newValue) {
            try {
              // Use secureStorage to properly parse and validate the record
              const retrieved = await secureStorage.retrieve(event.key);
              if (retrieved) {
                const state: SecurityState = JSON.parse(retrieved);
                this.notifyStateChange(identifier, state);
              }
            } catch (e) {
              // Ignore parse or retrieval errors
            }
          }
        }
      });
    }
  }

  /**
   * Add a listener for state changes for a specific identifier
   */
  addStateChangeListener(identifier: string, callback: (state: SecurityState) => void): void {
    if (!this.listeners.has(identifier)) {
      this.listeners.set(identifier, new Set());
    }
    this.listeners.get(identifier)!.add(callback);
  }

  /**
   * Remove a state change listener
   */
  removeStateChangeListener(identifier: string, callback: (state: SecurityState) => void): void {
    this.listeners.get(identifier)?.delete(callback);
  }

  /**
   * Notify all listeners for a specific identifier
   */
  private notifyStateChange(identifier: string, state: SecurityState): void {
    this.listeners.get(identifier)?.forEach(callback => callback(state));
  }

  /**
   * Serialize operations for a given identifier to prevent race conditions
   */
  private async serialize<T>(identifier: string, task: () => Promise<T>): Promise<T> {
    const previousTask = this.locks.get(identifier) || Promise.resolve();
    
    const currentTask = (async () => {
      try {
        await previousTask;
      } catch {
        // Ignore previous errors to prevent chain breakage
      }
      return task();
    })();
    
    // Update lock with a promise that always resolves
    const nextSentinel = currentTask.then(() => {}, () => {});
    this.locks.set(identifier, nextSentinel);
    
    return currentTask;
  }

  /**
   * Generate a storage key for a given identifier
   */
  private getStorageKey(identifier: string): string {
    return `${this.config.storageKey}_${identifier}`;
  }

  /**
   * Check the current rate limit status for an identifier
   */
  async checkRateLimit(identifier: string): Promise<RateLimitStatus> {
    try {
      const state = await this.getSecurityState(identifier);
      const now = Date.now();

      // Check if account is currently locked
      if (state.lockoutUntil && now < state.lockoutUntil) {
        // Log lockout status check
        securityLogger.logEvent(SecurityEventType.ACCOUNT_LOCKED, {
          userAgent: typeof navigator !== 'undefined' ? navigator?.userAgent : undefined,
          timestamp: new Date(),
          additionalContext: {
            userIdentifier: securityLogger.hashIdentifier(identifier),
            component: 'RateLimitManager',
            action: 'checkRateLimit',
            lockoutActive: true,
            remainingTime: state.lockoutUntil - now,
            failedAttempts: state.failedAttempts
          }
        }, 'Rate limit check - account locked');

        return {
          isLocked: true,
          remainingTime: state.lockoutUntil - now,
          attemptsRemaining: 0,
          canAttempt: false,
          progressiveDelay: state.progressiveDelay
        };
      }

      // If lockout has expired, clean up the state
      if (state.lockoutUntil && now >= state.lockoutUntil) {
        await this.resetFailedAttempts(identifier);
        return {
          isLocked: false,
          attemptsRemaining: this.config.maxAttempts,
          canAttempt: true,
          progressiveDelay: 0
        };
      }

      // Calculate remaining attempts
      const attemptsRemaining = Math.max(0, this.config.maxAttempts - state.failedAttempts);
      const progressiveDelay = state.progressiveDelay ?? 0;

      // Log rate limit status check if there are failed attempts
      if (state.failedAttempts > 0) {
        securityLogger.logEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
          userAgent: typeof navigator !== 'undefined' ? navigator?.userAgent : undefined,
          timestamp: new Date(),
          attemptCount: state.failedAttempts,
          additionalContext: {
            userIdentifier: securityLogger.hashIdentifier(identifier),
            component: 'RateLimitManager',
            action: 'checkRateLimit',
            attemptsRemaining,
            progressiveDelay,
            canAttempt: attemptsRemaining > 0
          }
        }, `Rate limit status check - ${state.failedAttempts} failed attempts`);
      }

      return {
        isLocked: false,
        attemptsRemaining,
        canAttempt: attemptsRemaining > 0,
        progressiveDelay
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      
      // Return safe defaults on error
      return {
        isLocked: false,
        attemptsRemaining: this.config.maxAttempts,
        canAttempt: true,
        progressiveDelay: 0
      };
    }
  }

  /**
   * Increment failed attempts counter and check for lockout
   */
  async incrementFailedAttempts(identifier: string): Promise<void> {
    return this.serialize(identifier, async () => {
      try {
        const state = await this.getSecurityState(identifier);
        const now = Date.now();

        // If already locked and lockout hasn't expired, don't increment
        if (state.lockoutUntil && now < state.lockoutUntil) {
          securityLogger.logEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
            userAgent: typeof navigator !== 'undefined' ? navigator?.userAgent : undefined,
            timestamp: new Date(),
            additionalContext: {
              userIdentifier: securityLogger.hashIdentifier(identifier),
              component: 'RateLimitManager',
              action: 'incrementFailedAttempts',
              alreadyLocked: true,
              remainingLockoutTime: state.lockoutUntil - now
            }
          }, 'Attempt to increment failed attempts while account locked');
          return;
        }

        // Increment failed attempts
        const newFailedAttempts = state.failedAttempts + 1;
        const progressiveDelay = this.calculateProgressiveDelay(newFailedAttempts);

        const newState: SecurityState = {
          failedAttempts: newFailedAttempts,
          lastAttempt: now,
          progressiveDelay
        };

        // Check if we should activate lockout
        const shouldLockout = newFailedAttempts >= this.config.maxAttempts;
        if (shouldLockout) {
          newState.lockoutUntil = now + this.config.lockoutDuration;
          
          securityLogger.logAccountLocked(
            identifier,
            this.config.lockoutDuration,
            newFailedAttempts
          );
        } else {
          securityLogger.logEvent(SecurityEventType.FAILED_LOGIN, {
            userAgent: typeof navigator !== 'undefined' ? navigator?.userAgent : undefined,
            timestamp: new Date(),
            attemptCount: newFailedAttempts,
            additionalContext: {
              userIdentifier: securityLogger.hashIdentifier(identifier),
              component: 'RateLimitManager',
              action: 'incrementFailedAttempts',
              attemptsRemaining: this.config.maxAttempts - newFailedAttempts,
              progressiveDelay,
              lockoutPending: newFailedAttempts === this.config.maxAttempts - 1
            }
          }, `Failed attempt ${newFailedAttempts} of ${this.config.maxAttempts}`);
        }

        await this.setSecurityState(identifier, newState);
      } catch (error) {
        console.error('Error incrementing failed attempts:', error);
        
        securityLogger.logSecurityError(
          SecurityEventType.STORAGE_ERROR,
          error instanceof Error ? error : new Error(String(error)),
          {
            component: 'RateLimitManager',
            action: 'incrementFailedAttempts',
            userIdentifier: securityLogger.hashIdentifier(identifier)
          }
        );
        
        throw new Error('Failed to update security state');
      }
    });
  }

  /**
   * Reset failed attempts counter (called on successful authentication)
   */
  async resetFailedAttempts(identifier: string): Promise<void> {
    return this.serialize(identifier, async () => {
      try {
        await secureStorage.remove(this.getStorageKey(identifier));
        this.notifyStateChange(identifier, this.getDefaultSecurityState());
      } catch (error) {
        console.error('Error resetting failed attempts:', error);
        
        securityLogger.logSecurityError(
          SecurityEventType.STORAGE_ERROR,
          error instanceof Error ? error : new Error(String(error)),
          {
            component: 'RateLimitManager',
            action: 'resetFailedAttempts',
            userIdentifier: securityLogger.hashIdentifier(identifier)
          }
        );
        
        throw new Error('Failed to reset security state');
      }
    });
  }

  /**
   * Check if account is currently locked
   */
  async isAccountLocked(identifier: string): Promise<boolean> {
    try {
      const status = await this.checkRateLimit(identifier);
      return status.isLocked;
    } catch (error) {
      console.error('Error checking account lock status:', error);
      return false; // Fail open for availability
    }
  }

  /**
   * Get remaining lockout time in milliseconds
   */
  async getRemainingLockoutTime(identifier: string): Promise<number> {
    try {
      const status = await this.checkRateLimit(identifier);
      return status.remainingTime || 0;
    } catch (error) {
      console.error('Error getting remaining lockout time:', error);
      return 0;
    }
  }

  /**
   * Calculate progressive delay based on failed attempts
   */
  private calculateProgressiveDelay(failedAttempts: number): number {
    if (!this.config.progressiveDelay || failedAttempts <= 0) {
      return 0;
    }

    const baseDelay = this.config.baseDelay || 1000;
    const maxDelay = this.config.maxDelay || 30000; // Default 30 seconds max delay
    // Exponential backoff: baseDelay * 2^(attempts-1), capped at maxDelay
    const delay = baseDelay * Math.pow(2, Math.min(failedAttempts - 1, 5));
    return Math.min(delay, maxDelay);
  }

  /**
   * Validate lockout time calculation
   */
  validateLockoutTime(lockoutUntil: number): boolean {
    const now = Date.now();
    const maxValidLockout = now + (24 * 60 * 60 * 1000); // 24 hours max
    
    return lockoutUntil > now && lockoutUntil <= maxValidLockout;
  }

  /**
   * Get security state from secure storage
   */
  private async getSecurityState(identifier: string): Promise<SecurityState> {
    try {
      const key = this.getStorageKey(identifier);
      const stored = await secureStorage.retrieve(key);
      
      if (!stored) {
        return this.getDefaultSecurityState();
      }

      const state: SecurityState = JSON.parse(stored);
      
      // Validate state structure
      if (typeof state.failedAttempts !== 'number' || state.failedAttempts < 0) {
        secureStorage.remove(key);
        return this.getDefaultSecurityState();
      }

      return state;
    } catch (error) {
      console.error('Error retrieving security state:', error);
      return this.getDefaultSecurityState();
    }
  }

  /**
   * Set security state in secure storage
   */
  private async setSecurityState(identifier: string, state: SecurityState): Promise<void> {
    const key = this.getStorageKey(identifier);
    await secureStorage.store(key, JSON.stringify(state));
    this.notifyStateChange(identifier, state);
  }

  /**
   * Get default security state
   */
  private getDefaultSecurityState(): SecurityState {
    return {
      failedAttempts: 0,
      progressiveDelay: 0
    };
  }

  /**
   * Clean up expired lockout states
   */
  async cleanupExpiredStates(): Promise<void> {
    try {
      secureStorage.cleanupExpired(24 * 60 * 60 * 1000); // 24 hours
    } catch (error) {
      console.error('Error cleaning up expired states:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export a default instance for convenience
export const rateLimitManager = new RateLimitManager();