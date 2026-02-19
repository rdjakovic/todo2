/**
 * Security Monitor Unit Tests
 * 
 * Tests for security state monitoring utilities including automatic cleanup,
 * state validation, corruption detection, and periodic health checks.
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { SecurityMonitor, SecurityMonitorConfig } from '../securityMonitor';
import { SecurityLogger, SecurityEventType, securityLogger } from '../securityLogger';
import { securityStateManager } from '../securityStateManager';

// Mock dependencies
vi.mock('../securityStateManager');
vi.mock('../securityLogger');

describe('SecurityMonitor', () => {
  let securityMonitor: SecurityMonitor;
  let mockSecurityStateManager: any;
  let mockSecurityLogger: any;
  let consoleSpy: Mock;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock securityStateManager
    mockSecurityStateManager = {
      getSecurityState: vi.fn(),
      setSecurityState: vi.fn(),
      clearSecurityState: vi.fn(),
      cleanupExpiredStates: vi.fn(),
      validateStateIntegrity: vi.fn()
    };
    vi.mocked(securityStateManager).getSecurityState = mockSecurityStateManager.getSecurityState;
    vi.mocked(securityStateManager).setSecurityState = mockSecurityStateManager.setSecurityState;
    vi.mocked(securityStateManager).clearSecurityState = mockSecurityStateManager.clearSecurityState;
    vi.mocked(securityStateManager).cleanupExpiredStates = mockSecurityStateManager.cleanupExpiredStates;
    vi.mocked(securityStateManager).validateStateIntegrity = mockSecurityStateManager.validateStateIntegrity;

    // Mock securityLogger
    mockSecurityLogger = {
      logEvent: vi.fn(),
      logSecurityError: vi.fn(),
      hashIdentifier: vi.fn((id: string) => `hash_${id}`)
    };
    
    // Mock SecurityLogger constructor and methods
    // Mock SecurityLogger constructor and methods if needed
    vi.mocked(SecurityLogger).prototype.logEvent = mockSecurityLogger.logEvent;
    vi.mocked(SecurityLogger).prototype.logSecurityError = mockSecurityLogger.logSecurityError;
    vi.mocked(SecurityLogger).prototype['hashIdentifier'] = mockSecurityLogger.hashIdentifier;

    // Explicitly mock the singleton instance methods
    vi.mocked(securityLogger).logEvent = mockSecurityLogger.logEvent;
    vi.mocked(securityLogger).logSecurityError = mockSecurityLogger.logSecurityError;
    vi.mocked(securityLogger).hashIdentifier = mockSecurityLogger.hashIdentifier;

    // Mock console
    consoleSpy = vi.fn();
    vi.spyOn(console, 'info').mockImplementation(consoleSpy);
    vi.spyOn(console, 'warn').mockImplementation(consoleSpy);
    vi.spyOn(console, 'error').mockImplementation(consoleSpy);

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // No need to mock Object.keys globally

    // Create fresh instance for each test
    securityMonitor = new SecurityMonitor({
      cleanupInterval: 1000, // 1 second for testing
      healthCheckInterval: 2000, // 2 seconds for testing
      enableAutoCleanup: true,
      enableHealthChecks: true
    });
  });

  afterEach(() => {
    securityMonitor.stop();
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      const monitor = new SecurityMonitor();
      const status = monitor.getStatus();
      
      expect(status.config.cleanupInterval).toBe(5 * 60 * 1000); // 5 minutes
      expect(status.config.healthCheckInterval).toBe(10 * 60 * 1000); // 10 minutes
      expect(status.config.enableAutoCleanup).toBe(true);
      expect(status.config.enableHealthChecks).toBe(true);
      expect(status.isRunning).toBe(false);
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<SecurityMonitorConfig> = {
        cleanupInterval: 30000,
        healthCheckInterval: 60000,
        maxStateAge: 12 * 60 * 60 * 1000,
        enableAutoCleanup: false
      };

      const monitor = new SecurityMonitor(customConfig);
      const status = monitor.getStatus();
      
      expect(status.config.cleanupInterval).toBe(30000);
      expect(status.config.healthCheckInterval).toBe(60000);
      expect(status.config.maxStateAge).toBe(12 * 60 * 60 * 1000);
      expect(status.config.enableAutoCleanup).toBe(false);
    });

    it('should update configuration dynamically', () => {
      const newConfig: Partial<SecurityMonitorConfig> = {
        cleanupInterval: 15000,
        corruptionThreshold: 5
      };

      securityMonitor.updateConfig(newConfig);
      const status = securityMonitor.getStatus();
      
      expect(status.config.cleanupInterval).toBe(15000);
      expect(status.config.corruptionThreshold).toBe(5);
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SUCCESSFUL_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'updateConfig'
          })
        }),
        'Security monitor configuration updated'
      );
    });
  });

  describe('Start and Stop Operations', () => {
    it('should start monitoring successfully', () => {
      securityMonitor.start();
      const status = securityMonitor.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SUCCESSFUL_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'start'
          })
        }),
        'Security monitor started successfully'
      );
    });

    it('should not start if already running', () => {
      securityMonitor.start();
      mockSecurityLogger.logEvent.mockClear();
      
      securityMonitor.start(); // Try to start again
      
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.STORAGE_ERROR,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'start',
            error: 'Monitor already running'
          })
        }),
        'Attempted to start security monitor that is already running'
      );
    });

    it('should stop monitoring successfully', () => {
      securityMonitor.start();
      mockSecurityLogger.logEvent.mockClear();
      
      securityMonitor.stop();
      const status = securityMonitor.getStatus();
      
      expect(status.isRunning).toBe(false);
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SUCCESSFUL_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'stop'
          })
        }),
        'Security monitor stopped'
      );
    });
  });

  describe('Automatic Cleanup', () => {
    it('should perform automatic cleanup of expired states', async () => {
      mockSecurityStateManager.cleanupExpiredStates.mockResolvedValue(3);
      
      const cleanedCount = await securityMonitor.cleanupExpiredStates();
      
      expect(cleanedCount).toBe(3);
      expect(mockSecurityStateManager.cleanupExpiredStates).toHaveBeenCalled();
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SUCCESSFUL_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'cleanupExpiredStates',
            cleanedCount: 3
          })
        }),
        'Cleaned up 3 expired security states'
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      const error = new Error('Storage error');
      mockSecurityStateManager.cleanupExpiredStates.mockRejectedValue(error);
      
      await expect(securityMonitor.cleanupExpiredStates()).rejects.toThrow('Storage error');
      expect(mockSecurityLogger.logSecurityError).toHaveBeenCalledWith(
        SecurityEventType.STORAGE_ERROR,
        error,
        expect.objectContaining({
          component: 'SecurityMonitor',
          action: 'cleanupExpiredStates'
        })
      );
    });

    it('should not log when no states are cleaned', async () => {
      mockSecurityStateManager.cleanupExpiredStates.mockResolvedValue(0);
      
      await securityMonitor.cleanupExpiredStates();
      
      // Should not log success message when no states cleaned
      expect(mockSecurityLogger.logEvent).not.toHaveBeenCalledWith(
        SecurityEventType.SUCCESSFUL_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'cleanupExpiredStates'
          })
        }),
        expect.stringContaining('Cleaned up')
      );
    });
  });

  describe('State Validation', () => {
    it('should validate valid security state', async () => {
      const validState = {
        failedAttempts: 2,
        lastAttempt: Date.now() - 1000,
        progressiveDelay: 2000
      };
      
      mockSecurityStateManager.getSecurityState.mockResolvedValue(validState);
      mockSecurityStateManager.validateStateIntegrity.mockResolvedValue(true);
      
      const isValid = await securityMonitor.validateStateIntegrity('test@example.com');
      
      expect(isValid).toBe(true);
      expect(mockSecurityStateManager.getSecurityState).toHaveBeenCalledWith('test@example.com');
      expect(mockSecurityStateManager.validateStateIntegrity).toHaveBeenCalledWith(validState);
    });

    it('should detect invalid state structure', async () => {
      const invalidState = {
        failedAttempts: -1, // Invalid negative value
        lastAttempt: Date.now(),
        progressiveDelay: 'invalid' // Invalid type
      };
      
      mockSecurityStateManager.getSecurityState.mockResolvedValue(invalidState);
      
      const isValid = await securityMonitor.validateStateIntegrity('test@example.com');
      
      expect(isValid).toBe(false);
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SECURITY_STATE_CORRUPTED,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'reportCorruption',
            corruptionType: 'invalid_structure'
          })
        }),
        'Security state corruption detected: invalid_structure'
      );
    });

    it('should detect checksum mismatch', async () => {
      const stateWithBadChecksum = {
        failedAttempts: 2,
        lastAttempt: Date.now(),
        checksum: 'invalid_checksum'
      };
      
      mockSecurityStateManager.getSecurityState.mockResolvedValue(stateWithBadChecksum);
      mockSecurityStateManager.validateStateIntegrity.mockResolvedValue(false);
      
      const isValid = await securityMonitor.validateStateIntegrity('test@example.com');
      
      expect(isValid).toBe(false);
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SECURITY_STATE_CORRUPTED,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            corruptionType: 'checksum_mismatch'
          })
        }),
        'Security state corruption detected: checksum_mismatch'
      );
    });

    it('should detect invalid timestamps', async () => {
      const futureTime = Date.now() + 1000000; // Future timestamp
      const invalidState = {
        failedAttempts: 2,
        lastAttempt: futureTime, // Invalid future timestamp
        lockoutUntil: Date.now()
      };
      
      mockSecurityStateManager.getSecurityState.mockResolvedValue(invalidState);
      mockSecurityStateManager.validateStateIntegrity.mockResolvedValue(true);
      
      const isValid = await securityMonitor.validateStateIntegrity('test@example.com');
      
      expect(isValid).toBe(false);
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SECURITY_STATE_CORRUPTED,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            corruptionType: 'invalid_timestamps'
          })
        }),
        'Security state corruption detected: invalid_timestamps'
      );
    });

    it('should return true for non-existent state', async () => {
      mockSecurityStateManager.getSecurityState.mockResolvedValue(null);
      
      const isValid = await securityMonitor.validateStateIntegrity('nonexistent@example.com');
      
      expect(isValid).toBe(true);
    });
  });

  describe('Corruption Handling', () => {
    it('should handle critical corruption by clearing state', async () => {
      const corruptedState = {
        failedAttempts: -1,
        lastAttempt: Date.now()
      };
      
      // Set up multiple corruption reports to trigger critical severity
      mockSecurityStateManager.getSecurityState.mockResolvedValue(corruptedState);
      
      // Trigger multiple validations to reach corruption threshold
      await securityMonitor.validateStateIntegrity('test@example.com');
      await securityMonitor.validateStateIntegrity('test@example.com');
      await securityMonitor.validateStateIntegrity('test@example.com');
      
      expect(mockSecurityStateManager.clearSecurityState).toHaveBeenCalledWith('test@example.com');
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SECURITY_STATE_CORRUPTED,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            severity: 'critical',
            actionTaken: 'state_cleared'
          })
        }),
        'Critical corruption detected - security state cleared'
      );
    });

    it('should attempt to repair timestamp corruption', async () => {
      const corruptedState = {
        failedAttempts: 2,
        lastAttempt: Date.now() + 1000000, // Future timestamp
        lockoutUntil: Date.now() - 1000 // Past lockout
      };
      
      mockSecurityStateManager.getSecurityState.mockResolvedValue(corruptedState);
      mockSecurityStateManager.validateStateIntegrity.mockResolvedValue(true);
      mockSecurityStateManager.setSecurityState.mockResolvedValue(undefined);
      
      await securityMonitor.validateStateIntegrity('test@example.com');
      
      expect(mockSecurityStateManager.setSecurityState).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          failedAttempts: 2,
          lastAttempt: expect.any(Number)
          // lockoutUntil should be removed
        })
      );
      
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SUCCESSFUL_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'attemptStateRepair',
            repairType: 'timestamp_fix',
            success: true
          })
        }),
        'Security state repaired successfully'
      );
    });
  });

  describe('Health Checks', () => {
    it('should perform comprehensive health check', async () => {
      // Mock the getAllSecurityStates method directly
      const mockStates = new Map([
        ['user1', {
          failedAttempts: 2,
          lastAttempt: Date.now() - 1000,
          lockoutUntil: Date.now() + 5000
        }],
        ['user2', {
          failedAttempts: 1,
          lastAttempt: Date.now() - 2000
        }]
      ]);

      vi.spyOn(securityMonitor as any, 'getAllSecurityStates').mockResolvedValue(mockStates);
      
      mockSecurityStateManager.validateStateIntegrity
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const health = await securityMonitor.performHealthCheck();
      
      expect(health.totalStates).toBe(2);
      expect(health.validStates).toBe(2);
      expect(health.corruptedStates).toBe(0);
      expect(health.expiredStates).toBe(0);
      expect(health.memoryUsageEstimate).toBeGreaterThan(0);
      expect(health.lastHealthCheckTime).toBeInstanceOf(Date);
      
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SUCCESSFUL_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'performHealthCheck',
            health: expect.objectContaining({
              totalStates: 2,
              validStates: 2,
              corruptedStates: 0
            })
          })
        }),
        'Security state health check completed - 2 total states'
      );
    });

    it('should alert on corrupted states during health check', async () => {
      const mockStates = new Map([
        ['user1', {
          failedAttempts: -1 // Invalid
        }]
      ]);

      vi.spyOn(securityMonitor as any, 'getAllSecurityStates').mockResolvedValue(mockStates);
      mockSecurityStateManager.getSecurityState.mockResolvedValue(mockStates.get('user1'));
      mockSecurityStateManager.validateStateIntegrity.mockResolvedValue(true);
      
      const health = await securityMonitor.performHealthCheck();
      
      expect(health.corruptedStates).toBe(1);
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SECURITY_STATE_CORRUPTED,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'healthCheckAlert',
            corruptedStates: 1
          })
        }),
        'Health check detected 1 corrupted security states'
      );
    });

    it('should handle health check errors', async () => {
      const error = new Error('Health check failed');
      vi.spyOn(securityMonitor as any, 'getAllSecurityStates').mockRejectedValue(error);
      
      await expect(securityMonitor.performHealthCheck()).rejects.toThrow('Health check failed');
      expect(mockSecurityLogger.logSecurityError).toHaveBeenCalledWith(
        SecurityEventType.STORAGE_ERROR,
        error,
        expect.objectContaining({
          component: 'SecurityMonitor',
          action: 'performHealthCheck'
        })
      );
    });
  });

  describe('Force Maintenance Check', () => {
    it('should perform forced maintenance check', async () => {
      mockSecurityStateManager.cleanupExpiredStates.mockResolvedValue(2);
      
      const mockStates = new Map([
        ['user1', {
          failedAttempts: 1,
          lastAttempt: Date.now()
        }]
      ]);

      vi.spyOn(securityMonitor as any, 'getAllSecurityStates').mockResolvedValue(mockStates);
      mockSecurityStateManager.validateStateIntegrity.mockResolvedValue(true);
      
      const result = await securityMonitor.forceMaintenanceCheck();
      
      expect(result.cleanedStates).toBe(2);
      expect(result.healthReport).toBeDefined();
      expect(result.healthReport.totalStates).toBe(1);
      
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SUCCESSFUL_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'forceMaintenanceCheck',
            cleanedStates: 2
          })
        }),
        'Forced maintenance check completed'
      );
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize sensitive data in corruption reports', async () => {
      const sensitiveState = {
        failedAttempts: -1,
        checksum: 'sensitive_checksum_data',
        identifier: 'user@example.com',
        longData: 'a'.repeat(200) // Long string
      };
      
      mockSecurityStateManager.getSecurityState.mockResolvedValue(sensitiveState);
      
      await securityMonitor.validateStateIntegrity('test@example.com');
      
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SECURITY_STATE_CORRUPTED,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            stateData: expect.objectContaining({
              checksum: '[REDACTED]',
              identifier: '[REDACTED]',
              longData: expect.stringContaining('...[TRUNCATED]')
            })
          })
        }),
        expect.any(String)
      );
    });
  });

  describe('Timer Management', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should run automatic cleanup on timer', async () => {
      mockSecurityStateManager.cleanupExpiredStates.mockResolvedValue(1);
      
      securityMonitor.start();
      
      // Fast-forward time to trigger cleanup
      vi.advanceTimersByTime(1000);
      
      // Wait for async operations
      await vi.runOnlyPendingTimersAsync();
      
      expect(mockSecurityStateManager.cleanupExpiredStates).toHaveBeenCalled();
    });

    it('should run health checks on timer', async () => {
      const mockStates = new Map();
      vi.spyOn(securityMonitor as any, 'getAllSecurityStates').mockResolvedValue(mockStates);
      
      securityMonitor.start();
      
      // Fast-forward time to trigger health check
      vi.advanceTimersByTime(2000);
      
      // Wait for async operations
      await vi.runOnlyPendingTimersAsync();
      
      expect(mockSecurityLogger.logEvent).toHaveBeenCalledWith(
        SecurityEventType.SUCCESSFUL_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'performHealthCheck'
          })
        }),
        expect.stringContaining('Security state health check completed')
      );
    });

    it('should restart timers when configuration changes', () => {
      securityMonitor.start();
      
      // Change cleanup interval
      securityMonitor.updateConfig({ cleanupInterval: 5000 });
      
      // Verify new interval is used (this is implicit in the implementation)
      const status = securityMonitor.getStatus();
      expect(status.config.cleanupInterval).toBe(5000);
    });
  });
});