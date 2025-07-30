/**
 * Security State Manager Tests
 * 
 * Comprehensive unit tests for security state persistence, validation,
 * cleanup, and cross-tab synchronization functionality.
 */

import { vi } from 'vitest';
import { SecurityStateManager, SecurityStateRecord, SecurityStateManagerConfig } from '../securityStateManager';

// Mock secure storage
vi.mock('../secureStorage', () => ({
  secureStorage: {
    store: vi.fn(),
    retrieve: vi.fn(),
    remove: vi.fn(),
    cleanupExpired: vi.fn()
  }
}));

// Mock localStorage
const mockLocalStorage = {
  length: 0,
  key: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock window events
const mockAddEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true
});

// Import after mocking
const { secureStorage } = await import('../secureStorage');
const mockSecureStorage = secureStorage as any;

describe('SecurityStateManager', () => {
  let securityStateManager: SecurityStateManager;
  const testIdentifier = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock setInterval and clearInterval
    vi.spyOn(global, 'setInterval');
    vi.spyOn(global, 'clearInterval');
    
    // Reset localStorage mock
    mockLocalStorage.length = 0;
    mockLocalStorage.key.mockReturnValue(null);
    
    const config: Partial<SecurityStateManagerConfig> = {
      storagePrefix: 'test_security_state',
      maxAge: 60 * 60 * 1000, // 1 hour for testing
      cleanupInterval: 10 * 1000, // 10 seconds for testing
      syncInterval: 1000, // 1 second for testing
      version: 1
    };
    
    securityStateManager = new SecurityStateManager(config);
  });

  afterEach(() => {
    securityStateManager.cleanup();
    vi.useRealTimers();
  });

  describe('getSecurityState', () => {
    it('should return null for non-existent state', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);

      const state = await securityStateManager.getSecurityState(testIdentifier);

      expect(state).toBeNull();
    });

    it('should return valid security state', async () => {
      const mockState: SecurityStateRecord = {
        identifier: testIdentifier,
        failedAttempts: 2,
        lockoutUntil: Date.now() + 300000,
        lastAttempt: Date.now() - 1000,
        progressiveDelay: 2000,
        createdAt: Date.now() - 60000,
        updatedAt: Date.now() - 1000,
        version: 1
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(mockState));

      const state = await securityStateManager.getSecurityState(testIdentifier);

      expect(state).toEqual(mockState);
    });

    it('should remove and return null for invalid state', async () => {
      const invalidState = { invalid: 'structure' };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(invalidState));
      mockSecureStorage.remove.mockImplementation(() => {});

      const state = await securityStateManager.getSecurityState(testIdentifier);

      expect(mockSecureStorage.remove).toHaveBeenCalled();
      expect(state).toBeNull();
    });

    it('should remove and return null for expired state', async () => {
      const expiredState: SecurityStateRecord = {
        identifier: testIdentifier,
        failedAttempts: 1,
        createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        updatedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago (expired)
        version: 1
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(expiredState));
      mockSecureStorage.remove.mockImplementation(() => {});

      const state = await securityStateManager.getSecurityState(testIdentifier);

      expect(mockSecureStorage.remove).toHaveBeenCalled();
      expect(state).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      mockSecureStorage.retrieve.mockRejectedValue(new Error('Storage error'));

      const state = await securityStateManager.getSecurityState(testIdentifier);

      expect(state).toBeNull();
    });
  });

  describe('setSecurityState', () => {
    it('should store new security state', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      const now = Date.now();
      vi.setSystemTime(now);

      await securityStateManager.setSecurityState(testIdentifier, {
        failedAttempts: 1,
        progressiveDelay: 1000
      });

      expect(mockSecureStorage.store).toHaveBeenCalledWith(
        expect.stringContaining('test_security_state_'),
        expect.stringContaining('"failedAttempts":1')
      );
    });

    it('should update existing security state', async () => {
      const existingState: SecurityStateRecord = {
        identifier: testIdentifier,
        failedAttempts: 1,
        createdAt: Date.now() - 60000,
        updatedAt: Date.now() - 60000,
        version: 1
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(existingState));
      mockSecureStorage.store.mockResolvedValue();

      await securityStateManager.setSecurityState(testIdentifier, {
        failedAttempts: 2,
        lockoutUntil: Date.now() + 300000
      });

      expect(mockSecureStorage.store).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"failedAttempts":2')
      );
    });

    it('should preserve createdAt timestamp when updating', async () => {
      const createdAt = Date.now() - 60000;
      const existingState: SecurityStateRecord = {
        identifier: testIdentifier,
        failedAttempts: 1,
        createdAt,
        updatedAt: Date.now() - 30000,
        version: 1
      };
      mockSecureStorage.retrieve.mockResolvedValue(JSON.stringify(existingState));
      mockSecureStorage.store.mockResolvedValue();

      await securityStateManager.setSecurityState(testIdentifier, {
        failedAttempts: 2
      });

      expect(mockSecureStorage.store).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(`"createdAt":${createdAt}`)
      );
    });

    it('should reject invalid state data', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);

      await expect(securityStateManager.setSecurityState(testIdentifier, {
        failedAttempts: -1 // Invalid negative value
      })).rejects.toThrow('Failed to store security state');
    });

    it('should handle storage errors', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockRejectedValue(new Error('Storage error'));

      await expect(securityStateManager.setSecurityState(testIdentifier, {
        failedAttempts: 1
      })).rejects.toThrow('Failed to store security state');
    });
  });

  describe('clearSecurityState', () => {
    it('should remove security state from storage', async () => {
      mockSecureStorage.remove.mockImplementation(() => {});

      await securityStateManager.clearSecurityState(testIdentifier);

      expect(mockSecureStorage.remove).toHaveBeenCalledWith(
        expect.stringContaining('test_security_state_')
      );
    });

    it('should handle storage errors', async () => {
      mockSecureStorage.remove.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(securityStateManager.clearSecurityState(testIdentifier))
        .rejects.toThrow('Failed to clear security state');
    });
  });

  describe('getAllSecurityStates', () => {
    it('should return all valid security states', async () => {
      const mockStates = [
        {
          identifier: 'user1@example.com',
          failedAttempts: 1,
          createdAt: Date.now() - 30000,
          updatedAt: Date.now() - 30000,
          version: 1
        },
        {
          identifier: 'user2@example.com',
          failedAttempts: 2,
          createdAt: Date.now() - 60000,
          updatedAt: Date.now() - 60000,
          version: 1
        }
      ];

      mockLocalStorage.length = 2;
      mockLocalStorage.key
        .mockReturnValueOnce('test_security_state_user1')
        .mockReturnValueOnce('test_security_state_user2');
      
      mockSecureStorage.retrieve
        .mockResolvedValueOnce(JSON.stringify(mockStates[0]))
        .mockResolvedValueOnce(JSON.stringify(mockStates[1]));

      const states = await securityStateManager.getAllSecurityStates();

      expect(states).toHaveLength(2);
      expect(states[0].identifier).toBe('user1@example.com');
      expect(states[1].identifier).toBe('user2@example.com');
    });

    it('should filter out invalid and expired states', async () => {
      const validState = {
        identifier: 'valid@example.com',
        failedAttempts: 1,
        createdAt: Date.now() - 30000,
        updatedAt: Date.now() - 30000,
        version: 1
      };
      
      const expiredState = {
        identifier: 'expired@example.com',
        failedAttempts: 1,
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 60 * 1000, // Expired
        version: 1
      };

      mockLocalStorage.length = 3;
      mockLocalStorage.key
        .mockReturnValueOnce('test_security_state_valid')
        .mockReturnValueOnce('test_security_state_invalid')
        .mockReturnValueOnce('test_security_state_expired');
      
      mockSecureStorage.retrieve
        .mockResolvedValueOnce(JSON.stringify(validState))
        .mockResolvedValueOnce(JSON.stringify({ invalid: 'structure' }))
        .mockResolvedValueOnce(JSON.stringify(expiredState));
      
      mockSecureStorage.remove.mockImplementation(() => {});

      const states = await securityStateManager.getAllSecurityStates();

      expect(states).toHaveLength(1);
      expect(states[0].identifier).toBe('valid@example.com');
      expect(mockSecureStorage.remove).toHaveBeenCalledTimes(2); // Remove invalid and expired
    });

    it('should handle storage errors gracefully', async () => {
      mockLocalStorage.length = 1;
      mockLocalStorage.key.mockReturnValueOnce('test_security_state_error');
      mockSecureStorage.retrieve.mockRejectedValue(new Error('Storage error'));
      mockSecureStorage.remove.mockImplementation(() => {});

      const states = await securityStateManager.getAllSecurityStates();

      expect(states).toHaveLength(0);
      expect(mockSecureStorage.remove).toHaveBeenCalled();
    });
  });

  describe('validateState', () => {
    it('should validate correct state structure', () => {
      const validState: SecurityStateRecord = {
        identifier: testIdentifier,
        failedAttempts: 2,
        lockoutUntil: Date.now() + 300000,
        lastAttempt: Date.now() - 1000,
        progressiveDelay: 2000,
        createdAt: Date.now() - 60000,
        updatedAt: Date.now() - 1000,
        version: 1
      };

      const result = securityStateManager.validateState(validState);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid state structure', () => {
      const invalidState = { invalid: 'structure' };

      const result = securityStateManager.validateState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject negative failed attempts', () => {
      const invalidState = {
        identifier: testIdentifier,
        failedAttempts: -1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      };

      const result = securityStateManager.validateState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed attempts must be a non-negative number');
    });

    it('should reject excessive lockout times', () => {
      const invalidState = {
        identifier: testIdentifier,
        failedAttempts: 3,
        lockoutUntil: Date.now() + 25 * 60 * 60 * 1000, // 25 hours
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      };

      const result = securityStateManager.validateState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Lockout time is too far in the future');
    });

    it('should reject inconsistent timestamps', () => {
      const now = Date.now();
      const invalidState = {
        identifier: testIdentifier,
        failedAttempts: 1,
        createdAt: now,
        updatedAt: now - 1000, // Updated before created
        version: 1
      };

      const result = securityStateManager.validateState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Updated timestamp cannot be before created timestamp');
    });

    it('should provide corrected state for partially valid data', () => {
      const partiallyValidState = {
        identifier: testIdentifier,
        failedAttempts: 2,
        progressiveDelay: -100, // Invalid negative value
        createdAt: 'invalid', // Invalid type
        updatedAt: Date.now(),
        version: 1
      };

      const result = securityStateManager.validateState(partiallyValidState);

      expect(result.isValid).toBe(false);
      expect(result.correctedState).toBeDefined();
      expect(result.correctedState!.progressiveDelay).toBe(0); // Corrected to 0
      expect(typeof result.correctedState!.createdAt).toBe('number'); // Corrected to number
    });
  });

  describe('cleanupExpiredStates', () => {
    it('should remove expired states', async () => {
      const validState = {
        identifier: 'valid@example.com',
        failedAttempts: 1,
        createdAt: Date.now() - 30000,
        updatedAt: Date.now() - 30000,
        version: 1
      };
      
      const expiredState = {
        identifier: 'expired@example.com',
        failedAttempts: 1,
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 60 * 1000, // Expired
        version: 1
      };

      mockLocalStorage.length = 2;
      mockLocalStorage.key
        .mockReturnValueOnce('test_security_state_valid')
        .mockReturnValueOnce('test_security_state_expired');
      
      mockSecureStorage.retrieve
        .mockResolvedValueOnce(JSON.stringify(validState))
        .mockResolvedValueOnce(JSON.stringify(expiredState));
      
      mockSecureStorage.remove.mockImplementation(() => {});

      const cleanedCount = await securityStateManager.cleanupExpiredStates();

      expect(cleanedCount).toBe(1);
      expect(mockSecureStorage.remove).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockLocalStorage.length = 0;

      const cleanedCount = await securityStateManager.cleanupExpiredStates();

      expect(cleanedCount).toBe(0);
    });
  });

  describe('state change listeners', () => {
    it('should add and notify state change listeners', async () => {
      const listener = vi.fn();
      const mockState: SecurityStateRecord = {
        identifier: testIdentifier,
        failedAttempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      };

      securityStateManager.addStateChangeListener(testIdentifier, listener);
      
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await securityStateManager.setSecurityState(testIdentifier, {
        failedAttempts: 1
      });

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        identifier: testIdentifier,
        failedAttempts: 1
      }));
    });

    it('should remove state change listeners', async () => {
      const listener = vi.fn();

      securityStateManager.addStateChangeListener(testIdentifier, listener);
      securityStateManager.removeStateChangeListener(testIdentifier, listener);
      
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await securityStateManager.setSecurityState(testIdentifier, {
        failedAttempts: 1
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      securityStateManager.addStateChangeListener(testIdentifier, errorListener);
      
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      // Should not throw despite listener error
      await expect(securityStateManager.setSecurityState(testIdentifier, {
        failedAttempts: 1
      })).resolves.toBeUndefined();
    });
  });

  describe('configuration management', () => {
    it('should return current configuration', () => {
      const config = securityStateManager.getConfig();

      expect(config.storagePrefix).toBe('test_security_state');
      expect(config.maxAge).toBe(60 * 60 * 1000);
      expect(config.version).toBe(1);
    });

    it('should update configuration', () => {
      const newConfig = {
        maxAge: 2 * 60 * 60 * 1000, // 2 hours
        cleanupInterval: 30 * 1000 // 30 seconds
      };

      securityStateManager.updateConfig(newConfig);
      const updatedConfig = securityStateManager.getConfig();

      expect(updatedConfig.maxAge).toBe(2 * 60 * 60 * 1000);
      expect(updatedConfig.cleanupInterval).toBe(30 * 1000);
      expect(updatedConfig.storagePrefix).toBe('test_security_state'); // Should preserve other settings
    });
  });

  describe('statistics', () => {
    it('should return correct statistics', async () => {
      const now = Date.now();
      const states = [
        {
          identifier: 'user1@example.com',
          failedAttempts: 1,
          createdAt: now - 60000,
          updatedAt: now - 30000,
          version: 1
        },
        {
          identifier: 'user2@example.com',
          failedAttempts: 3,
          lockoutUntil: now + 300000, // Locked
          createdAt: now - 120000,
          updatedAt: now - 60000,
          version: 1
        },
        {
          identifier: 'user3@example.com',
          failedAttempts: 1,
          createdAt: now - 2 * 60 * 60 * 1000,
          updatedAt: now - 2 * 60 * 60 * 1000, // Expired
          version: 1
        }
      ];

      mockLocalStorage.length = 3;
      mockLocalStorage.key
        .mockReturnValueOnce('test_security_state_user1')
        .mockReturnValueOnce('test_security_state_user2')
        .mockReturnValueOnce('test_security_state_user3');
      
      mockSecureStorage.retrieve
        .mockResolvedValueOnce(JSON.stringify(states[0]))
        .mockResolvedValueOnce(JSON.stringify(states[1]))
        .mockResolvedValueOnce(JSON.stringify(states[2]));
      
      mockSecureStorage.remove.mockImplementation(() => {});

      const stats = await securityStateManager.getStatistics();

      expect(stats.totalStates).toBe(2); // Only non-expired states
      expect(stats.expiredStates).toBe(0); // Expired states are filtered out
      expect(stats.lockedStates).toBe(1);
      expect(stats.oldestState).toBeInstanceOf(Date);
      expect(stats.newestState).toBeInstanceOf(Date);
    });

    it('should handle statistics errors gracefully', async () => {
      mockLocalStorage.length = 0;

      const stats = await securityStateManager.getStatistics();

      expect(stats).toEqual({
        totalStates: 0,
        expiredStates: 0,
        lockedStates: 0
      });
    });
  });

  describe('automatic cleanup and sync', () => {
    it('should start automatic cleanup timer', () => {
      // Timer should be started in constructor
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        10 * 1000 // cleanupInterval
      );
    });

    it('should start cross-tab sync timer', () => {
      // Timer should be started in constructor
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        1000 // syncInterval
      );
    });

    it('should setup storage event listener', () => {
      // Event listener should be set up in constructor
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );
    });

    it('should setup beforeunload handler', () => {
      // Beforeunload listener should be set up in constructor
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });

    it('should cleanup timers on cleanup', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      securityStateManager.cleanup();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('storage key management', () => {
    it('should generate consistent storage keys', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await securityStateManager.setSecurityState(testIdentifier, { failedAttempts: 1 });
      const firstKey = mockSecureStorage.store.mock.calls[0][0];

      vi.clearAllMocks();
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await securityStateManager.setSecurityState(testIdentifier, { failedAttempts: 2 });
      const secondKey = mockSecureStorage.store.mock.calls[0][0];

      expect(firstKey).toBe(secondKey);
    });

    it('should generate different keys for different identifiers', async () => {
      mockSecureStorage.retrieve.mockResolvedValue(null);
      mockSecureStorage.store.mockResolvedValue();

      await securityStateManager.setSecurityState('user1@example.com', { failedAttempts: 1 });
      const firstKey = mockSecureStorage.store.mock.calls[0][0];

      await securityStateManager.setSecurityState('user2@example.com', { failedAttempts: 1 });
      const secondKey = mockSecureStorage.store.mock.calls[1][0];

      expect(firstKey).not.toBe(secondKey);
    });
  });
});