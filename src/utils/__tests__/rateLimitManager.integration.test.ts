/**
 * Rate Limiting Security Integration Tests
 * 
 * Comprehensive integration tests for brute force attack scenarios,
 * lockout activation, persistence, automatic expiration, cross-tab
 * synchronization, edge cases, and performance testing.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RateLimitManager, RateLimitConfig } from '../rateLimitManager';
import { securityLogger } from '../securityLogger';

// Mock dependencies
vi.mock('../securityLogger', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    securityLogger: {
      logEvent: vi.fn(),
      logAccountLocked: vi.fn(),
      logSecurityError: vi.fn(),
      hashIdentifier: vi.fn((id: string) => `hash_${id}`)
    }
  };
});

// Mock security state manager with a simple in-memory store
vi.mock('../securityStateManager', () => {
  const stateStore = new Map();
  
  return {
    securityStateManager: {
      getSecurityState: vi.fn(async (identifier) => {
        return stateStore.get(identifier) || null;
      }),
      setSecurityState: vi.fn(async (identifier, state) => {
        const now = Date.now();
        const newState = {
          identifier,
          failedAttempts: state.failedAttempts || 0,
          lockoutUntil: state.lockoutUntil,
          lastAttempt: state.lastAttempt || now,
          progressiveDelay: state.progressiveDelay || 0,
          createdAt: stateStore.get(identifier)?.createdAt || now,
          updatedAt: now,
          version: 1
        };
        stateStore.set(identifier, newState);
      }),
      clearSecurityState: vi.fn(async (identifier) => {
        stateStore.delete(identifier);
      }),
      addStateChangeListener: vi.fn(),
      removeStateChangeListener: vi.fn(),
      cleanupExpiredStates: vi.fn(async () => {
        let cleaned = 0;
        const now = Date.now();
        for (const [key, state] of stateStore.entries()) {
          if (state.lockoutUntil && state.lockoutUntil < now) {
            stateStore.delete(key);
            cleaned++;
          }
        }
        return cleaned;
      }),
      // Expose store for testing
      _getStore: () => stateStore,
      _clearStore: () => stateStore.clear()
    }
  };
});

// Import after mocking
const { securityStateManager } = await import('../securityStateManager');
const mockSecurityStateManager = securityStateManager as any;

describe('Rate Limiting Security Integration Tests', () => {
  let rateLimitManager: RateLimitManager;
  const testIdentifier = 'test@example.com';
  const testIdentifier2 = 'test2@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Clear localStorage and mock store before each test
    localStorage.clear();
    mockSecurityStateManager._clearStore();
    
    // Configure for fast testing
    const config: Partial<RateLimitConfig> = {
      maxAttempts: 3,
      lockoutDuration: 5000, // 5 seconds for fast testing
      progressiveDelay: true,
      baseDelay: 100, // 100ms for fast testing
      storageKey: 'test_auth_security_state'
    };
    
    rateLimitManager = new RateLimitManager(config);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('Brute Force Attack Scenarios', () => {
    it('should handle sequential failed attempts and trigger lockout', async () => {
      // Make sequential failed attempts
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Check final state - should be locked after 3 attempts
      const status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
      expect(status.canAttempt).toBe(false);
      expect(status.attemptsRemaining).toBe(0);
    });

    it('should handle rapid successive failed attempts correctly', async () => {
      // Simulate rapid brute force attack with sequential processing
      for (let i = 0; i < 5; i++) {
        await rateLimitManager.incrementFailedAttempts(testIdentifier);
      }
      
      // Check final state - should be locked after 3 attempts
      const status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
      expect(status.canAttempt).toBe(false);
      expect(status.attemptsRemaining).toBe(0);
    });

    it('should prevent authentication attempts during lockout', async () => {
      // Trigger lockout
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Verify locked
      let status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
      
      // Try to increment again - should not change state
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
      expect(status.remainingTime).toBeGreaterThan(0);
    });

    it('should handle multiple concurrent users independently', async () => {
      // User 1: trigger lockout
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // User 2: only 1 failed attempt
      await rateLimitManager.incrementFailedAttempts(testIdentifier2);
      
      // Check states
      const status1 = await rateLimitManager.checkRateLimit(testIdentifier);
      const status2 = await rateLimitManager.checkRateLimit(testIdentifier2);
      
      expect(status1.isLocked).toBe(true);
      expect(status1.attemptsRemaining).toBe(0);
      
      expect(status2.isLocked).toBe(false);
      expect(status2.attemptsRemaining).toBe(2);
    });

    it('should implement progressive delay correctly during attack', async () => {
      const delays: number[] = [];
      
      // Record progressive delays
      for (let i = 0; i < 3; i++) {
        await rateLimitManager.incrementFailedAttempts(testIdentifier);
        const status = await rateLimitManager.checkRateLimit(testIdentifier);
        delays.push(status.progressiveDelay || 0);
      }
      
      // Verify exponential backoff: 100ms, 200ms, 400ms
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
      expect(delays[2]).toBe(400);
    });

    it('should cap progressive delay at maximum value', async () => {
      // Create manager with low max delay for testing
      const configWithLowMax: Partial<RateLimitConfig> = {
        maxAttempts: 10,
        lockoutDuration: 5000,
        progressiveDelay: true,
        baseDelay: 1000,
        maxDelay: 3000 // Cap at 3 seconds
      };
      
      const manager = new RateLimitManager(configWithLowMax);
      
      // Make multiple attempts to exceed max delay
      for (let i = 0; i < 5; i++) {
        await manager.incrementFailedAttempts(testIdentifier);
      }
      
      const status = await manager.checkRateLimit(testIdentifier);
      expect(status.progressiveDelay).toBeLessThanOrEqual(3000);
    });
  });

  describe('Lockout Activation and Persistence', () => {
    it('should activate lockout exactly at max attempts threshold', async () => {
      // Make 2 failed attempts (below threshold)
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      let status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(1);
      
      // Make 3rd attempt (at threshold)
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
      expect(status.attemptsRemaining).toBe(0);
    });

    it('should persist lockout state across manager instances', async () => {
      // Trigger lockout with first manager
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Create new manager instance (simulating page reload)
      const newManager = new RateLimitManager({
        maxAttempts: 3,
        lockoutDuration: 5000,
        progressiveDelay: true,
        baseDelay: 100,
        storageKey: 'test_auth_security_state'
      });
      
      // Check lockout persists
      const status = await newManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
      expect(status.remainingTime).toBeGreaterThan(0);
    });

    it('should maintain accurate remaining lockout time', async () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      // Trigger lockout
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Check initial remaining time
      let status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.remainingTime).toBeCloseTo(5000, -2);
      
      // Advance time by 2 seconds
      vi.setSystemTime(startTime + 2000);
      
      // Check updated remaining time
      status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.remainingTime).toBeCloseTo(3000, -2);
    });

    it('should validate lockout time bounds', () => {
      const now = Date.now();
      
      // Valid lockout time (15 minutes from now)
      const validLockout = now + 15 * 60 * 1000;
      expect(rateLimitManager.validateLockoutTime(validLockout)).toBe(true);
      
      // Invalid: past time
      const pastLockout = now - 1000;
      expect(rateLimitManager.validateLockoutTime(pastLockout)).toBe(false);
      
      // Invalid: too far in future (25 hours)
      const excessiveLockout = now + 25 * 60 * 60 * 1000;
      expect(rateLimitManager.validateLockoutTime(excessiveLockout)).toBe(false);
    });
  });

  describe('Automatic Lockout Expiration', () => {
    it('should automatically unlock account when lockout expires', async () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      // Trigger lockout
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Verify locked
      let status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
      
      // Advance time past lockout duration
      vi.setSystemTime(startTime + 6000); // 6 seconds (lockout is 5 seconds)
      
      // Check status - should be unlocked and reset
      status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(3);
      expect(status.canAttempt).toBe(true);
      expect(status.progressiveDelay).toBe(0);
    });

    it('should clean up expired state from storage', async () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      // Trigger lockout
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Verify state exists in storage
      const state = await securityStateManager.getSecurityState(testIdentifier);
      expect(state).not.toBeNull();
      expect(state?.lockoutUntil).toBeDefined();
      
      // Advance time past lockout
      vi.setSystemTime(startTime + 6000);
      
      // Check rate limit (triggers cleanup)
      await rateLimitManager.checkRateLimit(testIdentifier);
      
      // Verify state is cleaned up
      const cleanedState = await securityStateManager.getSecurityState(testIdentifier);
      expect(cleanedState).toBeNull();
    });

    it('should handle edge case of lockout expiring exactly at check time', async () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      // Trigger lockout
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Advance time to exactly when lockout expires
      vi.setSystemTime(startTime + 5000); // Exactly 5 seconds
      
      const status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(false);
      expect(status.canAttempt).toBe(true);
    });
  });

  describe('Cross-Tab and Session Synchronization', () => {
    it('should synchronize lockout state across browser tabs', async () => {
      // Simulate tab 1: trigger lockout
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Simulate tab 2: create new manager instance
      const tab2Manager = new RateLimitManager({
        maxAttempts: 3,
        lockoutDuration: 5000,
        progressiveDelay: true,
        baseDelay: 100,
        storageKey: 'test_auth_security_state'
      });
      
      // Tab 2 should see the lockout
      const status = await tab2Manager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
      expect(status.canAttempt).toBe(false);
    });

    it('should handle state changes from other tabs via storage events', async () => {
      const stateChangeCallback = vi.fn();
      
      // Add listener for state changes
      rateLimitManager.addStateChangeListener(testIdentifier, stateChangeCallback);
      
      // Simulate storage event from another tab
      const mockStorageEvent = new StorageEvent('storage', {
        key: 'security_state_dGVzdEBleGFtcGxlLmNvbQ==', // base64 encoded identifier
        newValue: JSON.stringify({
          identifier: testIdentifier,
          failedAttempts: 2,
          lastAttempt: Date.now(),
          progressiveDelay: 200,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1
        }),
        oldValue: null
      });
      
      // Dispatch the event
      window.dispatchEvent(mockStorageEvent);
      
      // Allow event processing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify callback was called
      expect(stateChangeCallback).toHaveBeenCalled();
    });

    it('should maintain consistent state across multiple tabs during concurrent operations', async () => {
      // Simulate concurrent operations from multiple tabs
      const tab1Manager = rateLimitManager;
      const tab2Manager = new RateLimitManager({
        maxAttempts: 3,
        lockoutDuration: 5000,
        progressiveDelay: true,
        baseDelay: 100,
        storageKey: 'test_auth_security_state'
      });
      
      // Concurrent failed attempts from both tabs
      const promises = [
        tab1Manager.incrementFailedAttempts(testIdentifier),
        tab2Manager.incrementFailedAttempts(testIdentifier),
        tab1Manager.incrementFailedAttempts(testIdentifier)
      ];
      
      await Promise.all(promises);
      
      // Both tabs should see consistent final state
      const status1 = await tab1Manager.checkRateLimit(testIdentifier);
      const status2 = await tab2Manager.checkRateLimit(testIdentifier);
      
      expect(status1.isLocked).toBe(status2.isLocked);
      expect(status1.attemptsRemaining).toBe(status2.attemptsRemaining);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle storage corruption gracefully', async () => {
      // Manually corrupt storage data
      const storageKey = 'security_state_dGVzdEBleGFtcGxlLmNvbQ==';
      localStorage.setItem(storageKey, 'corrupted-json-data');
      
      // Should handle corruption and return default state
      const status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(3);
      expect(status.canAttempt).toBe(true);
    });

    it('should handle missing storage gracefully', async () => {
      // Clear all storage
      localStorage.clear();
      
      // Should return default state
      const status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(3);
      expect(status.canAttempt).toBe(true);
    });

    it('should handle invalid state structure', async () => {
      // Store invalid state structure
      const invalidState = {
        invalid: 'structure',
        failedAttempts: 'not-a-number',
        lockoutUntil: 'not-a-timestamp'
      };
      
      await securityStateManager.setSecurityState(testIdentifier, invalidState as any);
      
      // Should handle invalid state and return default
      const status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(3);
    });

    it('should handle extremely rapid successive calls', async () => {
      // Fire 100 rapid calls
      const promises = Array.from({ length: 100 }, () => 
        rateLimitManager.incrementFailedAttempts(testIdentifier)
      );
      
      // Should not throw errors
      await expect(Promise.all(promises)).resolves.not.toThrow();
      
      // Final state should be consistent
      const status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
    });

    it('should handle system clock changes', async () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      // Trigger lockout
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Simulate system clock going backwards (edge case)
      vi.setSystemTime(startTime - 10000); // 10 seconds in the past
      
      // Should still handle gracefully
      const status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
      
      // Restore normal time and verify expiration works
      vi.setSystemTime(startTime + 6000);
      const statusAfter = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(statusAfter.isLocked).toBe(false);
    });

    it('should handle quota exceeded storage errors', async () => {
      // Mock localStorage to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });
      
      // Should handle storage error gracefully
      await expect(rateLimitManager.incrementFailedAttempts(testIdentifier))
        .rejects.toThrow('Failed to update security state');
      
      // Restore original method
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-frequency rate limit checks efficiently', async () => {
      const startTime = performance.now();
      
      // Perform 1000 rate limit checks
      const promises = Array.from({ length: 1000 }, () => 
        rateLimitManager.checkRateLimit(testIdentifier)
      );
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle multiple concurrent users efficiently', async () => {
      const userCount = 100;
      const users = Array.from({ length: userCount }, (_, i) => `user${i}@example.com`);
      
      const startTime = performance.now();
      
      // Each user makes 2 failed attempts
      const promises = users.flatMap(user => [
        rateLimitManager.incrementFailedAttempts(user),
        rateLimitManager.incrementFailedAttempts(user)
      ]);
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle 200 operations efficiently
      expect(duration).toBeLessThan(2000);
      
      // Verify all users have correct state
      const statusChecks = await Promise.all(
        users.map(user => rateLimitManager.checkRateLimit(user))
      );
      
      statusChecks.forEach(status => {
        expect(status.isLocked).toBe(false);
        expect(status.attemptsRemaining).toBe(1);
      });
    });

    it('should maintain performance with large amounts of stored state', async () => {
      // Create many security states
      const stateCount = 500;
      const promises = Array.from({ length: stateCount }, async (_, i) => {
        const user = `user${i}@example.com`;
        await rateLimitManager.incrementFailedAttempts(user);
        return user;
      });
      
      const users = await Promise.all(promises);
      
      // Measure performance of operations with large state
      const startTime = performance.now();
      
      // Perform operations on random users
      const testPromises = Array.from({ length: 100 }, () => {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        return rateLimitManager.checkRateLimit(randomUser);
      });
      
      await Promise.all(testPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should maintain reasonable performance even with large state
      expect(duration).toBeLessThan(1000);
    });

    it('should handle cleanup operations efficiently', async () => {
      // Create many expired states
      const expiredCount = 200;
      const oldTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      vi.setSystemTime(oldTime);
      
      // Create expired states
      const promises = Array.from({ length: expiredCount }, async (_, i) => {
        const user = `expired${i}@example.com`;
        await rateLimitManager.incrementFailedAttempts(user);
        await rateLimitManager.incrementFailedAttempts(user);
        await rateLimitManager.incrementFailedAttempts(user);
      });
      
      await Promise.all(promises);
      
      // Return to current time
      vi.setSystemTime(Date.now());
      
      // Measure cleanup performance
      const startTime = performance.now();
      await rateLimitManager.cleanupExpiredStates();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      // Cleanup should be efficient
      expect(duration).toBeLessThan(500);
    });

    it('should handle memory usage efficiently during extended operation', async () => {
      // Simulate extended operation with many state changes
      const operationCount = 1000;
      const users = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      
      // Perform many operations
      for (let i = 0; i < operationCount; i++) {
        const user = users[i % users.length];
        
        if (i % 10 === 0) {
          // Reset user state occasionally
          await rateLimitManager.resetFailedAttempts(user);
        } else {
          // Increment failed attempts
          await rateLimitManager.incrementFailedAttempts(user);
        }
        
        // Check rate limit
        await rateLimitManager.checkRateLimit(user);
      }
      
      // Verify final states are reasonable
      const finalStates = await Promise.all(
        users.map(user => rateLimitManager.checkRateLimit(user))
      );
      
      finalStates.forEach(state => {
        expect(typeof state.isLocked).toBe('boolean');
        expect(typeof state.canAttempt).toBe('boolean');
        expect(typeof state.attemptsRemaining).toBe('number');
      });
    });
  });

  describe('Security Event Logging Integration', () => {
    it('should log security events during brute force attack', async () => {
      // Clear previous calls
      vi.clearAllMocks();
      
      // Simulate brute force attack
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier); // This should trigger lockout
      
      // Verify security events were logged
      expect(securityLogger.logEvent).toHaveBeenCalled();
      
      expect(securityLogger.logAccountLocked).toHaveBeenCalledWith(
        testIdentifier,
        5000, // lockout duration
        3 // attempt count
      );
    });

    it('should log lockout expiration events', async () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);
      
      // Trigger lockout
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Clear previous calls
      vi.clearAllMocks();
      
      // Advance time past lockout
      vi.setSystemTime(startTime + 6000);
      
      // Check rate limit (should trigger expiration logging)
      await rateLimitManager.checkRateLimit(testIdentifier);
      
      // Verify expiration was logged
      expect(securityLogger.logEvent).toHaveBeenCalled();
    });

    it('should log storage errors appropriately', async () => {
      // Mock storage to throw error
      const originalRetrieve = securityStateManager.getSecurityState;
      securityStateManager.getSecurityState = vi.fn().mockRejectedValue(new Error('Storage error'));
      
      // Clear previous calls
      vi.clearAllMocks();
      
      // This should trigger error logging
      await rateLimitManager.checkRateLimit(testIdentifier);
      
      // Verify error was logged
      expect(securityLogger.logSecurityError).toHaveBeenCalled();
      
      // Restore original method
      securityStateManager.getSecurityState = originalRetrieve;
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect custom configuration parameters', async () => {
      const customConfig: Partial<RateLimitConfig> = {
        maxAttempts: 2, // Lower threshold
        lockoutDuration: 10000, // 10 seconds
        progressiveDelay: false, // Disabled
        baseDelay: 500
      };
      
      const customManager = new RateLimitManager(customConfig);
      
      // Should lock after 2 attempts instead of 3
      await customManager.incrementFailedAttempts(testIdentifier);
      let status = await customManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(false);
      
      await customManager.incrementFailedAttempts(testIdentifier);
      status = await customManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(true);
      
      // Should have 10 second lockout
      expect(status.remainingTime).toBeCloseTo(10000, -2);
      
      // Progressive delay should be disabled
      expect(status.progressiveDelay).toBe(0);
    });

    it('should allow runtime configuration updates', async () => {
      // Initial config
      let config = rateLimitManager.getConfig();
      expect(config.maxAttempts).toBe(3);
      
      // Update config
      rateLimitManager.updateConfig({ maxAttempts: 5 });
      
      config = rateLimitManager.getConfig();
      expect(config.maxAttempts).toBe(5);
      
      // Should use new config for operations
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      await rateLimitManager.incrementFailedAttempts(testIdentifier);
      
      // Should not be locked yet (5 attempts allowed)
      const status = await rateLimitManager.checkRateLimit(testIdentifier);
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(1);
    });
  });
});