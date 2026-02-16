/**
 * Rate Limit Manager Tests
 * 
 * Comprehensive unit tests for rate limiting and account lockout functionality
 */

import { vi } from 'vitest';
import { RateLimitManager, RateLimitConfig, SecurityState } from '../rateLimitManager';

// Mock secure storage
vi.mock('../secureStorage', () => ({
  secureStorage: {
    store: vi.fn(),
    retrieve: vi.fn(),
    remove: vi.fn(),
    cleanupExpired: vi.fn()
  }
}));

// Import after mocking
const { secureStorage } = await import('../secureStorage');
const mockSecureStorage = secureStorage as any;

describe('RateLimitManager', () => {
  let rateLimitManager: RateLimitManager;
  const testIdentifier = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default config for testing
    const config: Partial<RateLimitConfig> = {
      maxAttempts: 3,
      lockoutDuration: 5 * 60 * 1000, // 5 minutes for testing
      progressiveDelay: true,
      baseDelay: 1000
    };
    
    rateLimitManager = new RateLimitManager(config);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should return default state for new identifier', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);

      const status = await rateLimitManager.checkRateLimit(testIdentifier);

      expect(status).toEqual({
        isLocked: false,
        attemptsRemaining: 3,
        canAttempt: true,
        progressiveDelay: 0
      });
    });

    it('should return correct status for identifier with failed attempts', async () => {
      const mockState: SecurityState = {
        failedAttempts: 2,
        lastAttempt: Date.now(),
        progressiveDelay: 2000
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(mockState));

      const status = await rateLimitManager.checkRateLimit(testIdentifier);

      expect(status).toEqual({
        isLocked: false,
        attemptsRemaining: 1,
        canAttempt: true,
        progressiveDelay: 2000
      });
    });

    it('should return locked status when account is locked', async () => {
      const lockoutUntil = Date.now() + 300000; // 5 minutes from now
      const mockState: SecurityState = {
        failedAttempts: 3,
        lockoutUntil,
        lastAttempt: Date.now() - 1000,
        progressiveDelay: 4000
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(mockState));

      const status = await rateLimitManager.checkRateLimit(testIdentifier);

      expect(status.isLocked).toBe(true);
      expect(status.remainingTime).toBeCloseTo(300000, -3);
      expect(status.attemptsRemaining).toBe(0);
      expect(status.canAttempt).toBe(false);
    });

    it('should reset state when lockout has expired', async () => {
      const lockoutUntil = Date.now() - 1000; // 1 second ago (expired)
      const mockState: SecurityState = {
        failedAttempts: 3,
        lockoutUntil,
        lastAttempt: Date.now() - 60000,
        progressiveDelay: 4000
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(mockState));

      const status = await rateLimitManager.checkRateLimit(testIdentifier);

      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(3);
      expect(status.canAttempt).toBe(true);
      expect(mockSecureStorage.remove).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      mockSecureStorage.retrieve.mockRejectedValue(new Error('Storage error'));

      const status = await rateLimitManager.checkRateLimit(testIdentifier);

      expect(status).toEqual({
        isLocked: false,
        attemptsRemaining: 3,
        canAttempt: true,
        progressiveDelay: 0
      });
    });
  });

  describe('incrementFailedAttempts', () => {
    it('should increment failed attempts counter', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await rateLimitManager.incrementFailedAttempts(testIdentifier);

      expect(mockSecureStorage.store).toHaveBeenCalledWith(
        expect.stringContaining('auth_security_state_'),
        expect.stringContaining('"failedAttempts":1')
      );
    });

    it('should activate lockout when max attempts reached', async () => {
      const mockState: SecurityState = {
        failedAttempts: 2,
        lastAttempt: Date.now() - 1000,
        progressiveDelay: 2000
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(mockState));
      mockSecureStorage.store.mockResolvedValue();

      const now = Date.now();
      vi.setSystemTime(now);

      await rateLimitManager.incrementFailedAttempts(testIdentifier);

      const expectedLockoutUntil = now + 5 * 60 * 1000; // 5 minutes
      expect(mockSecureStorage.store).toHaveBeenCalledWith(
        expect.stringContaining('auth_security_state_'),
        expect.stringContaining(`"lockoutUntil":${expectedLockoutUntil}`)
      );
    });

    it('should not increment if already locked and lockout not expired', async () => {
      const lockoutUntil = Date.now() + 300000; // 5 minutes from now
      const mockState: SecurityState = {
        failedAttempts: 3,
        lockoutUntil,
        lastAttempt: Date.now() - 1000,
        progressiveDelay: 4000
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(mockState));

      await rateLimitManager.incrementFailedAttempts(testIdentifier);

      expect(mockSecureStorage.store).not.toHaveBeenCalled();
    });

    it('should calculate progressive delay correctly', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await rateLimitManager.incrementFailedAttempts(testIdentifier);

      // First attempt should have 1000ms delay (base delay)
      expect(mockSecureStorage.store).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"progressiveDelay":1000')
      );
    });

    it('should handle storage errors', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockRejectedValue(new Error('Storage error'));

      await expect(rateLimitManager.incrementFailedAttempts(testIdentifier))
        .rejects.toThrow('Failed to update security state');
    });
  });

  describe('resetFailedAttempts', () => {
    it('should clear security state', async () => {
      mockSecureStorage.remove.mockImplementation(() => {});

      await rateLimitManager.resetFailedAttempts(testIdentifier);

      expect(mockSecureStorage.remove).toHaveBeenCalledWith(
        expect.stringContaining('auth_security_state_')
      );
    });

    it('should handle storage errors', async () => {
      mockSecureStorage.remove.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(rateLimitManager.resetFailedAttempts(testIdentifier))
        .rejects.toThrow('Failed to reset security state');
    });
  });

  describe('isAccountLocked', () => {
    it('should return true when account is locked', async () => {
      const lockoutUntil = Date.now() + 300000;
      const mockState: SecurityState = {
        failedAttempts: 3,
        lockoutUntil,
        lastAttempt: Date.now() - 1000,
        progressiveDelay: 4000
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(mockState));

      const isLocked = await rateLimitManager.isAccountLocked(testIdentifier);

      expect(isLocked).toBe(true);
    });

    it('should return false when account is not locked', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);

      const isLocked = await rateLimitManager.isAccountLocked(testIdentifier);

      expect(isLocked).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockSecureStorage.retrieve.mockRejectedValue(new Error('Storage error'));

      const isLocked = await rateLimitManager.isAccountLocked(testIdentifier);

      expect(isLocked).toBe(false); // Fail open
    });
  });

  describe('getRemainingLockoutTime', () => {
    it('should return remaining time when locked', async () => {
      const lockoutUntil = Date.now() + 300000; // 5 minutes
      const mockState: SecurityState = {
        failedAttempts: 3,
        lockoutUntil,
        lastAttempt: Date.now() - 1000,
        progressiveDelay: 4000
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(mockState));

      const remainingTime = await rateLimitManager.getRemainingLockoutTime(testIdentifier);

      expect(remainingTime).toBeCloseTo(300000, -3);
    });

    it('should return 0 when not locked', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);

      const remainingTime = await rateLimitManager.getRemainingLockoutTime(testIdentifier);

      expect(remainingTime).toBe(0);
    });
  });

  describe('progressive delay calculation', () => {
    it('should calculate exponential backoff correctly', async () => {
      const testCases = [
        { attempts: 1, expectedDelay: 1000 },
        { attempts: 2, expectedDelay: 2000 },
        { attempts: 3, expectedDelay: 4000 },
        { attempts: 4, expectedDelay: 8000 },
        { attempts: 5, expectedDelay: 16000 },
        { attempts: 6, expectedDelay: 30000 }, // Capped at 30 seconds
        { attempts: 10, expectedDelay: 30000 } // Still capped
      ];

      for (const testCase of testCases) {
        mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify({
          failedAttempts: testCase.attempts - 1,
          lastAttempt: Date.now() - 1000,
          progressiveDelay: 0
        }));
        mockSecureStorage.store.mockResolvedValue();

        await rateLimitManager.incrementFailedAttempts(testIdentifier);

        expect(mockSecureStorage.store).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining(`"progressiveDelay":${testCase.expectedDelay}`)
        );
      }
    });

    it('should return 0 delay when progressive delay is disabled', async () => {
      const configWithoutProgressive: Partial<RateLimitConfig> = {
        maxAttempts: 3,
        lockoutDuration: 5 * 60 * 1000,
        progressiveDelay: false
      };
      
      const manager = new RateLimitManager(configWithoutProgressive);
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await manager.incrementFailedAttempts(testIdentifier);

      expect(mockSecureStorage.store).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"progressiveDelay":0')
      );
    });
  });

  describe('validateLockoutTime', () => {
    it('should validate reasonable lockout times', () => {
      const now = Date.now();
      const validLockout = now + 15 * 60 * 1000; // 15 minutes from now
      
      expect(rateLimitManager.validateLockoutTime(validLockout)).toBe(true);
    });

    it('should reject past lockout times', () => {
      const pastLockout = Date.now() - 1000; // 1 second ago
      
      expect(rateLimitManager.validateLockoutTime(pastLockout)).toBe(false);
    });

    it('should reject excessively long lockout times', () => {
      const excessiveLockout = Date.now() + 25 * 60 * 60 * 1000; // 25 hours
      
      expect(rateLimitManager.validateLockoutTime(excessiveLockout)).toBe(false);
    });
  });

  describe('cleanupExpiredStates', () => {
    it('should call secure storage cleanup', async () => {
      mockSecureStorage.cleanupExpired.mockImplementation(() => {});

      await rateLimitManager.cleanupExpiredStates();

      expect(mockSecureStorage.cleanupExpired).toHaveBeenCalledWith(24 * 60 * 60 * 1000);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockSecureStorage.cleanupExpired.mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      // Should not throw
      await expect(rateLimitManager.cleanupExpiredStates()).resolves.toBeUndefined();
    });
  });

  describe('configuration management', () => {
    it('should return current configuration', () => {
      const config = rateLimitManager.getConfig();

      expect(config).toEqual({
        maxAttempts: 3,
        lockoutDuration: 5 * 60 * 1000,
        progressiveDelay: true,
        storageKey: 'auth_security_state',
        baseDelay: 1000
      });
    });

    it('should update configuration', () => {
      const newConfig = { maxAttempts: 5, lockoutDuration: 10 * 60 * 1000 };
      
      rateLimitManager.updateConfig(newConfig);
      const updatedConfig = rateLimitManager.getConfig();

      expect(updatedConfig.maxAttempts).toBe(5);
      expect(updatedConfig.lockoutDuration).toBe(10 * 60 * 1000);
      expect(updatedConfig.progressiveDelay).toBe(true); // Should preserve other settings
    });
  });

  describe('state validation', () => {
    it('should handle invalid state structure', async () => {
      const invalidState = { invalid: 'structure' };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(invalidState));
      mockSecureStorage.remove.mockImplementation(() => {});

      const status = await rateLimitManager.checkRateLimit(testIdentifier);

      expect(mockSecureStorage.remove).toHaveBeenCalled();
      expect(status).toEqual({
        isLocked: false,
        attemptsRemaining: 3,
        canAttempt: true,
        progressiveDelay: 0
      });
    });

    it('should handle corrupted JSON data', async () => {
      mockSecureStorage.retrieve.mockResolvedValue('invalid json');

      const status = await rateLimitManager.checkRateLimit(testIdentifier);

      expect(status).toEqual({
        isLocked: false,
        attemptsRemaining: 3,
        canAttempt: true,
        progressiveDelay: 0
      });
    });
  });

  describe('storage key generation', () => {
    it('should generate consistent storage keys for same identifier', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      const firstCall = mockSecureStorage.store.mock.calls[0][0];

      vi.clearAllMocks();
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      const secondCall = mockSecureStorage.store.mock.calls[0][0];

      expect(firstCall).toBe(secondCall);
    });

    it('should generate different storage keys for different identifiers', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await rateLimitManager.incrementFailedAttempts('user1@example.com');
      const firstKey = mockSecureStorage.store.mock.calls[0][0];

      await rateLimitManager.incrementFailedAttempts('user2@example.com');
      const secondKey = mockSecureStorage.store.mock.calls[1][0];

      expect(firstKey).not.toBe(secondKey);
    });
  });
});