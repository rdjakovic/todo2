/**
 * Security State Monitoring Utilities
 * 
 * Provides automatic cleanup of expired security states, state validation,
 * corruption detection, and periodic health checks for security monitoring.
 */

import { securityStateManager, SecurityStateRecord } from './securityStateManager';
import { securityLogger, SecurityEventType } from './securityLogger';

export interface SecurityMonitorConfig {
  cleanupInterval: number; // in milliseconds
  healthCheckInterval: number; // in milliseconds
  maxStateAge: number; // in milliseconds
  corruptionThreshold: number; // number of corruption events before alert
  enableAutoCleanup: boolean;
  enableHealthChecks: boolean;
  enableCorruptionDetection: boolean;
}

export interface SecurityStateHealth {
  totalStates: number;
  expiredStates: number;
  corruptedStates: number;
  validStates: number;
  oldestStateAge: number;
  newestStateAge: number;
  memoryUsageEstimate: number;
  lastCleanupTime: Date;
  lastHealthCheckTime: Date;
}

export interface CorruptionReport {
  identifier: string;
  corruptionType: string;
  detectedAt: Date;
  expectedChecksum?: string;
  actualChecksum?: string;
  stateData?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityMonitor {
  private static readonly DEFAULT_CONFIG: SecurityMonitorConfig = {
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    healthCheckInterval: 10 * 60 * 1000, // 10 minutes
    maxStateAge: 24 * 60 * 60 * 1000, // 24 hours
    corruptionThreshold: 3,
    enableAutoCleanup: true,
    enableHealthChecks: true,
    enableCorruptionDetection: true
  };

  private config: SecurityMonitorConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private corruptionCount: Map<string, number> = new Map();
  private lastCleanupTime: Date = new Date();
  private lastHealthCheckTime: Date = new Date();
  private isRunning: boolean = false;

  constructor(config: Partial<SecurityMonitorConfig> = {}) {
    this.config = { ...SecurityMonitor.DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the security monitoring system
   */
  start(): void {
    if (this.isRunning) {
      securityLogger.logEvent(SecurityEventType.STORAGE_ERROR, {
        timestamp: new Date(),
        additionalContext: {
          component: 'SecurityMonitor',
          action: 'start',
          error: 'Monitor already running'
        }
      }, 'Attempted to start security monitor that is already running');
      return;
    }

    this.isRunning = true;

    // Start automatic cleanup if enabled
    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }

    // Start health checks if enabled
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }

    securityLogger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN, {
      timestamp: new Date(),
      additionalContext: {
        component: 'SecurityMonitor',
        action: 'start',
        config: {
          cleanupInterval: this.config.cleanupInterval,
          healthCheckInterval: this.config.healthCheckInterval,
          maxStateAge: this.config.maxStateAge
        }
      }
    }, 'Security monitor started successfully');
  }

  /**
   * Stop the security monitoring system
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    securityLogger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN, {
      timestamp: new Date(),
      additionalContext: {
        component: 'SecurityMonitor',
        action: 'stop'
      }
    }, 'Security monitor stopped');
  }

  /**
   * Start automatic cleanup timer
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpiredStates();
      } catch (error) {
        securityLogger.logSecurityError(
          SecurityEventType.STORAGE_ERROR,
          error instanceof Error ? error : new Error(String(error)),
          {
            component: 'SecurityMonitor',
            action: 'autoCleanup'
          }
        );
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Start health check timer
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        securityLogger.logSecurityError(
          SecurityEventType.STORAGE_ERROR,
          error instanceof Error ? error : new Error(String(error)),
          {
            component: 'SecurityMonitor',
            action: 'healthCheck'
          }
        );
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Clean up expired security states
   */
  async cleanupExpiredStates(): Promise<number> {
    try {
      const cleanedCount = await securityStateManager.cleanupExpiredStates();
      this.lastCleanupTime = new Date();

      if (cleanedCount > 0) {
        securityLogger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN, {
          timestamp: new Date(),
          additionalContext: {
            component: 'SecurityMonitor',
            action: 'cleanupExpiredStates',
            cleanedCount,
            cleanupTime: this.lastCleanupTime
          }
        }, `Cleaned up ${cleanedCount} expired security states`);
      }

      return cleanedCount;
    } catch (error) {
      securityLogger.logSecurityError(
        SecurityEventType.STORAGE_ERROR,
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'SecurityMonitor',
          action: 'cleanupExpiredStates'
        }
      );
      throw error;
    }
  }

  /**
   * Validate security state integrity
   */
  async validateStateIntegrity(identifier: string): Promise<boolean> {
    try {
      const state = await securityStateManager.getSecurityState(identifier);
      
      if (!state) {
        return true; // No state to validate
      }

      // Validate state structure
      const isValidStructure = this.validateStateStructure(state);
      if (!isValidStructure) {
        await this.reportCorruption(identifier, 'invalid_structure', state);
        return false;
      }

      // Validate checksum if present
      const isValidChecksum = await securityStateManager.validateStateIntegrity(state);
      if (!isValidChecksum) {
        await this.reportCorruption(identifier, 'checksum_mismatch', state);
        return false;
      }

      // Validate timestamps
      const isValidTimestamps = this.validateTimestamps(state);
      if (!isValidTimestamps) {
        await this.reportCorruption(identifier, 'invalid_timestamps', state);
        return false;
      }

      return true;
    } catch (error) {
      securityLogger.logSecurityError(
        SecurityEventType.SECURITY_STATE_CORRUPTED,
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'SecurityMonitor',
          action: 'validateStateIntegrity',
          identifier: securityLogger['hashIdentifier'](identifier)
        }
      );
      return false;
    }
  }

  /**
   * Validate security state structure
   */
  private validateStateStructure(state: SecurityStateRecord): boolean {
    // Check required fields
    if (typeof state.failedAttempts !== 'number' || state.failedAttempts < 0) {
      return false;
    }

    // Check optional fields if present
    if (state.lockoutUntil !== undefined && 
        (typeof state.lockoutUntil !== 'number' || state.lockoutUntil <= 0)) {
      return false;
    }

    if (state.lastAttempt !== undefined && 
        (typeof state.lastAttempt !== 'number' || state.lastAttempt <= 0)) {
      return false;
    }

    if (state.progressiveDelay !== undefined && 
        (typeof state.progressiveDelay !== 'number' || state.progressiveDelay < 0)) {
      return false;
    }

    return true;
  }

  /**
   * Validate timestamps in security state
   */
  private validateTimestamps(state: SecurityStateRecord): boolean {
    const now = Date.now();
    const maxAge = this.config.maxStateAge;

    // Check if timestamps are reasonable
    if (state.lastAttempt && (state.lastAttempt > now || (now - state.lastAttempt) > maxAge)) {
      return false;
    }

    if (state.lockoutUntil && state.lockoutUntil < 0) {
      return false;
    }

    // Check logical consistency
    if (state.lastAttempt && state.lockoutUntil && state.lastAttempt > state.lockoutUntil) {
      return false;
    }

    return true;
  }

  /**
   * Report state corruption
   */
  private async reportCorruption(
    identifier: string, 
    corruptionType: string, 
    stateData: any
  ): Promise<void> {
    const hashedIdentifier = securityLogger['hashIdentifier'](identifier);
    
    // Increment corruption count
    const currentCount = this.corruptionCount.get(hashedIdentifier) || 0;
    this.corruptionCount.set(hashedIdentifier, currentCount + 1);

    const report: CorruptionReport = {
      identifier: hashedIdentifier,
      corruptionType,
      detectedAt: new Date(),
      stateData: this.sanitizeStateData(stateData),
      severity: this.determineSeverity(corruptionType, currentCount + 1)
    };

    // Log corruption event
    securityLogger.logEvent(SecurityEventType.SECURITY_STATE_CORRUPTED, {
      timestamp: new Date(),
      additionalContext: {
        component: 'SecurityMonitor',
        action: 'reportCorruption',
        identifier: hashedIdentifier,
        corruptionType,
        corruptionCount: currentCount + 1,
        severity: report.severity,
        stateData: report.stateData
      }
    }, `Security state corruption detected: ${corruptionType}`);

    // Take action based on severity
    await this.handleCorruption(identifier, report);
  }

  /**
   * Determine corruption severity
   */
  private determineSeverity(corruptionType: string, count: number): 'low' | 'medium' | 'high' | 'critical' {
    if (count >= this.config.corruptionThreshold) {
      return 'critical';
    }

    switch (corruptionType) {
      case 'checksum_mismatch':
        return count > 1 ? 'high' : 'medium';
      case 'invalid_structure':
        return 'high';
      case 'invalid_timestamps':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Handle corruption based on severity
   */
  private async handleCorruption(identifier: string, report: CorruptionReport): Promise<void> {
    try {
      switch (report.severity) {
        case 'critical':
          // Clear corrupted state and log critical event
          await securityStateManager.clearSecurityState(identifier);
          securityLogger.logEvent(SecurityEventType.SECURITY_STATE_CORRUPTED, {
            timestamp: new Date(),
            additionalContext: {
              component: 'SecurityMonitor',
              action: 'handleCorruption',
              severity: 'critical',
              identifier: report.identifier,
              actionTaken: 'state_cleared'
            }
          }, 'Critical corruption detected - security state cleared');
          break;

        case 'high':
          // Clear corrupted state
          await securityStateManager.clearSecurityState(identifier);
          break;

        case 'medium':
          // Attempt to repair or clear state
          await this.attemptStateRepair(identifier, report);
          break;

        case 'low':
          // Log for monitoring but don't take action
          break;
      }
    } catch (error) {
      securityLogger.logSecurityError(
        SecurityEventType.STORAGE_ERROR,
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'SecurityMonitor',
          action: 'handleCorruption',
          identifier: report.identifier
        }
      );
    }
  }

  /**
   * Attempt to repair corrupted state
   */
  private async attemptStateRepair(identifier: string, report: CorruptionReport): Promise<boolean> {
    try {
      if (report.corruptionType === 'invalid_timestamps') {
        // Try to repair timestamp issues
        const state = await securityStateManager.getSecurityState(identifier);
        if (state) {
          const repairedState = { ...state };
          const now = Date.now();

          // Fix invalid timestamps
          if (state.lastAttempt && (state.lastAttempt > now || state.lastAttempt < 0)) {
            repairedState.lastAttempt = now;
          }

          if (state.lockoutUntil && state.lockoutUntil < now) {
            delete repairedState.lockoutUntil;
          }

          await securityStateManager.setSecurityState(identifier, repairedState);
          
          securityLogger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN, {
            timestamp: new Date(),
            additionalContext: {
              component: 'SecurityMonitor',
              action: 'attemptStateRepair',
              identifier: report.identifier,
              repairType: 'timestamp_fix',
              success: true
            }
          }, 'Security state repaired successfully');

          return true;
        }
      }

      return false;
    } catch (error) {
      securityLogger.logSecurityError(
        SecurityEventType.STORAGE_ERROR,
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'SecurityMonitor',
          action: 'attemptStateRepair',
          identifier: report.identifier
        }
      );
      return false;
    }
  }

  /**
   * Sanitize state data for logging
   */
  private sanitizeStateData(stateData: any): any {
    if (!stateData || typeof stateData !== 'object') {
      return stateData;
    }

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(stateData)) {
      if (key === 'checksum' || key === 'identifier') {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...[TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SecurityStateHealth> {
    try {
      const allStates = await this.getAllSecurityStates();
      const now = Date.now();
      
      let expiredCount = 0;
      let corruptedCount = 0;
      let validCount = 0;
      let oldestAge = 0;
      let newestAge = Number.MAX_SAFE_INTEGER;
      let memoryUsage = 0;

      for (const [identifier, state] of allStates) {
        // Check if expired
        if (state.lockoutUntil && state.lockoutUntil < now) {
          expiredCount++;
        }

        // Check if corrupted
        const isValid = await this.validateStateIntegrity(identifier);
        if (isValid) {
          validCount++;
        } else {
          corruptedCount++;
        }

        // Calculate age
        if (state.lastAttempt) {
          const age = now - state.lastAttempt;
          oldestAge = Math.max(oldestAge, age);
          newestAge = Math.min(newestAge, age);
        }

        // Estimate memory usage
        memoryUsage += JSON.stringify(state).length;
      }

      this.lastHealthCheckTime = new Date();

      const health: SecurityStateHealth = {
        totalStates: allStates.size,
        expiredStates: expiredCount,
        corruptedStates: corruptedCount,
        validStates: validCount,
        oldestStateAge: oldestAge,
        newestStateAge: newestAge === Number.MAX_SAFE_INTEGER ? 0 : newestAge,
        memoryUsageEstimate: memoryUsage,
        lastCleanupTime: this.lastCleanupTime,
        lastHealthCheckTime: this.lastHealthCheckTime
      };

      // Log health check results
      securityLogger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN, {
        timestamp: new Date(),
        additionalContext: {
          component: 'SecurityMonitor',
          action: 'performHealthCheck',
          health: {
            totalStates: health.totalStates,
            expiredStates: health.expiredStates,
            corruptedStates: health.corruptedStates,
            validStates: health.validStates,
            memoryUsageKB: Math.round(health.memoryUsageEstimate / 1024)
          }
        }
      }, `Security state health check completed - ${health.totalStates} total states`);

      // Alert on concerning health metrics
      if (health.corruptedStates > 0) {
        securityLogger.logEvent(SecurityEventType.SECURITY_STATE_CORRUPTED, {
          timestamp: new Date(),
          additionalContext: {
            component: 'SecurityMonitor',
            action: 'healthCheckAlert',
            corruptedStates: health.corruptedStates,
            totalStates: health.totalStates,
            corruptionRate: (health.corruptedStates / health.totalStates) * 100
          }
        }, `Health check detected ${health.corruptedStates} corrupted security states`);
      }

      return health;
    } catch (error) {
      securityLogger.logSecurityError(
        SecurityEventType.STORAGE_ERROR,
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'SecurityMonitor',
          action: 'performHealthCheck'
        }
      );
      throw error;
    }
  }

  /**
   * Get all security states (helper method)
   */
  protected async getAllSecurityStates(): Promise<Map<string, SecurityStateRecord>> {
    // This is a simplified implementation
    // In a real scenario, you'd need to iterate through all stored states
    const states = new Map<string, SecurityStateRecord>();
    
    try {
      // Get all keys from localStorage that match our pattern
      const storageKeys = this.getStorageKeys().filter(key => 
        key.startsWith('auth_security_state_')
      );

      for (const key of storageKeys) {
        const identifier = key.replace('auth_security_state_', '');
        const state = await securityStateManager.getSecurityState(identifier);
        if (state) {
          states.set(identifier, state);
        }
      }
    } catch (error) {
      // Handle storage access errors
      securityLogger.logSecurityError(
        SecurityEventType.STORAGE_ERROR,
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'SecurityMonitor',
          action: 'getAllSecurityStates'
        }
      );
    }

    return states;
  }

  /**
   * Get storage keys (separated for easier testing)
   */
  protected getStorageKeys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get current monitoring status
   */
  getStatus(): {
    isRunning: boolean;
    config: SecurityMonitorConfig;
    lastCleanupTime: Date;
    lastHealthCheckTime: Date;
    corruptionCounts: Map<string, number>;
  } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
      lastCleanupTime: this.lastCleanupTime,
      lastHealthCheckTime: this.lastHealthCheckTime,
      corruptionCounts: new Map(this.corruptionCount)
    };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<SecurityMonitorConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Restart timers if intervals changed
    if (this.isRunning) {
      if (newConfig.cleanupInterval && newConfig.cleanupInterval !== oldConfig.cleanupInterval) {
        if (this.cleanupTimer) {
          clearInterval(this.cleanupTimer);
          this.startAutoCleanup();
        }
      }

      if (newConfig.healthCheckInterval && newConfig.healthCheckInterval !== oldConfig.healthCheckInterval) {
        if (this.healthCheckTimer) {
          clearInterval(this.healthCheckTimer);
          this.startHealthChecks();
        }
      }
    }

    securityLogger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN, {
      timestamp: new Date(),
      additionalContext: {
        component: 'SecurityMonitor',
        action: 'updateConfig',
        oldConfig: oldConfig,
        newConfig: this.config
      }
    }, 'Security monitor configuration updated');
  }

  /**
   * Force immediate cleanup and health check
   */
  async forceMaintenanceCheck(): Promise<{
    cleanedStates: number;
    healthReport: SecurityStateHealth;
  }> {
    const cleanedStates = await this.cleanupExpiredStates();
    const healthReport = await this.performHealthCheck();

    securityLogger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN, {
      timestamp: new Date(),
      additionalContext: {
        component: 'SecurityMonitor',
        action: 'forceMaintenanceCheck',
        cleanedStates,
        healthSummary: {
          totalStates: healthReport.totalStates,
          corruptedStates: healthReport.corruptedStates,
          expiredStates: healthReport.expiredStates
        }
      }
    }, 'Forced maintenance check completed');

    return { cleanedStates, healthReport };
  }
}

// Export a default instance for convenience
export const securityMonitor = new SecurityMonitor();

// Export types for external use
export type { SecurityMonitorConfig, SecurityStateHealth, CorruptionReport };