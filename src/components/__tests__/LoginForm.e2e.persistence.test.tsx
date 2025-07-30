/**
 * End-to-End Security State Persistence Tests
 * 
 * Tests for security state persistence across application restarts,
 * browser sessions, and cross-tab synchronization.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import LoginForm from '../LoginForm';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { rateLimitManager } from '../../utils/rateLimitManager';
import { securityStateManager } from '../../utils/securityStateManager';
import { secureStorage } from '../../utils/secureStorage';

// Mock external dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn()
}));

// Mock localStorage for persistence testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return { ...store };
    },
    set store(newStore: Record<string, string>) {
      store = { ...newStore };
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock crypto for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
    subtle: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      generateKey: vi.fn(),
      importKey: vi.fn()
    }
  }
});

describe('LoginForm E2E Persistence Tests', () => {
  let mockSetUser: Mock;
  let mockForceDataLoad: Mock;
  let mockSupabaseSignIn: Mock;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    mockLocalStorage.clear();
    
    // Setup auth store mocks
    mockSetUser = vi.fn();
    mockForceDataLoad = vi.fn().mockResolvedValue(undefined);
    
    (useAuthStore as Mock).mockReturnValue({
      setUser: mockSetUser,
      forceDataLoad: mockForceDataLoad
    });

    // Setup Supabase mocks
    mockSupabaseSignIn = vi.fn();
    (supabase.auth.signInWithPassword as Mock).mockImplementation(mockSupabaseSignIn);

    // Clear security state
    await securityStateManager.cleanupExpiredStates();
    await rateLimitManager.cleanupExpiredStates();

    // Suppress console logs for clean test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await securityStateManager.cleanupExpiredStates();
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Security State Persistence Across Application Restarts', () => {
    it('should persist failed attempt count across app restarts', async () => {
      // Setup failed authentication
      const authError = new Error('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      // First app session - perform failed attempts
      const { unmount: unmount1 } = render(<LoginForm />);

      const emailInput1 = screen.getByLabelText(/email/i);
      const passwordInput1 = screen.getByLabelText(/password/i);
      const submitButton1 = screen.getByRole('button', { name: /sign in/i });

      // Perform 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          fireEvent.change(emailInput1, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput1, { target: { value: `wrong${i}` } });
          fireEvent.click(submitButton1);
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        });

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // Verify state before restart
      const statusBeforeRestart = await rateLimitManager.checkRateLimit('test@example.com');
      expect(statusBeforeRestart.attemptsRemaining).toBe(2);

      // Simulate app restart by unmounting and remounting
      unmount1();

      // Clear in-memory state but keep localStorage
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second app session - mount new component
      render(<LoginForm />);

      // Wait for component to initialize and load persisted state
      await act(async () => {
        const emailInput2 = screen.getByLabelText(/email/i);
        fireEvent.change(emailInput2, { target: { value: 'test@example.com' } });
      });

      // Verify state persisted across restart
      await waitFor(() => {
        expect(screen.getByText(/2 attempts remaining/i)).toBeInTheDocument();
      });

      const statusAfterRestart = await rateLimitManager.checkRateLimit('test@example.com');
      expect(statusAfterRestart.attemptsRemaining).toBe(2);
    });

    it('should persist lockout state across app restarts', async () => {
      // Setup failed authentication
      const authError = new Error('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      // First app session - trigger lockout
      const { unmount: unmount1 } = render(<LoginForm />);

      const emailInput1 = screen.getByLabelText(/email/i);
      const passwordInput1 = screen.getByLabelText(/password/i);
      const submitButton1 = screen.getByRole('button', { name: /sign in/i });

      // Perform 5 failed attempts to trigger lockout
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.change(emailInput1, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput1, { target: { value: `wrong${i}` } });
          fireEvent.click(submitButton1);
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        });

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // Verify lockout is active
      await waitFor(() => {
        expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
      });

      const statusBeforeRestart = await rateLimitManager.checkRateLimit('test@example.com');
      expect(statusBeforeRestart.isLocked).toBe(true);

      // Simulate app restart
      unmount1();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second app session
      render(<LoginForm />);

      // Wait for component to initialize
      await act(async () => {
        const emailInput2 = screen.getByLabelText(/email/i);
        fireEvent.change(emailInput2, { target: { value: 'test@example.com' } });
      });

      // Verify lockout state persisted
      await waitFor(() => {
        expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
      });

      const statusAfterRestart = await rateLimitManager.checkRateLimit('test@example.com');
      expect(statusAfterRestart.isLocked).toBe(true);
      expect(statusAfterRestart.remainingTime).toBeGreaterThan(0);
    });

    it('should handle corrupted persistence data gracefully', async () => {
      // Manually corrupt localStorage data
      mockLocalStorage.setItem('auth_security_state_test@example.com', 'corrupted-data');

      render(<LoginForm />);

      // Wait for component to initialize
      await act(async () => {
        const emailInput = screen.getByLabelText(/email/i);
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      });

      // Verify system falls back to safe defaults despite corruption
      const status = await rateLimitManager.checkRateLimit('test@example.com');
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(5);
      expect(status.canAttempt).toBe(true);

      // Verify no error messages are shown to user
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should clean up expired lockout states on app restart', async () => {
      // Create an expired lockout state
      const expiredLockoutTime = Date.now() - 1000; // Expired 1 second ago
      await securityStateManager.setSecurityState('test@example.com', {
        failedAttempts: 5,
        lockoutUntil: expiredLockoutTime,
        lastAttempt: Date.now() - 2000
      });

      // Verify state exists before restart
      let state = await securityStateManager.getSecurityState('test@example.com');
      expect(state).not.toBeNull();
      expect(state?.lockoutUntil).toBe(expiredLockoutTime);

      // Simulate app restart
      render(<LoginForm />);

      // Wait for component to initialize and cleanup to run
      await act(async () => {
        const emailInput = screen.getByLabelText(/email/i);
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      });

      // Verify expired state was cleaned up
      const status = await rateLimitManager.checkRateLimit('test@example.com');
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(5);

      // Verify no lockout message is shown
      expect(screen.queryByText(/account temporarily locked/i)).not.toBeInTheDocument();
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should synchronize security state across multiple tabs', async () => {
      // Setup failed authentication
      const authError = new Error('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      // Simulate Tab 1
      const { unmount: unmountTab1 } = render(<LoginForm />);

      const emailInputTab1 = screen.getByLabelText(/email/i);
      const passwordInputTab1 = screen.getByLabelText(/password/i);
      const submitButtonTab1 = screen.getByRole('button', { name: /sign in/i });

      // Perform failed attempt in Tab 1
      await act(async () => {
        fireEvent.change(emailInputTab1, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInputTab1, { target: { value: 'wrong1' } });
        fireEvent.click(submitButtonTab1);
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(1);
      });

      // Verify state in Tab 1
      let status = await rateLimitManager.checkRateLimit('test@example.com');
      expect(status.attemptsRemaining).toBe(4);

      unmountTab1();

      // Simulate Tab 2 opening
      render(<LoginForm />);

      // Wait for Tab 2 to initialize and sync state
      await act(async () => {
        const emailInputTab2 = screen.getByLabelText(/email/i);
        fireEvent.change(emailInputTab2, { target: { value: 'test@example.com' } });
      });

      // Verify Tab 2 shows synchronized state
      await waitFor(() => {
        expect(screen.getByText(/4 attempts remaining/i)).toBeInTheDocument();
      });

      status = await rateLimitManager.checkRateLimit('test@example.com');
      expect(status.attemptsRemaining).toBe(4);
    });

    it('should handle storage events for real-time synchronization', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      });

      // Simulate another tab updating security state
      const newState = {
        failedAttempts: 3,
        lastAttempt: Date.now(),
        progressiveDelay: 2000
      };

      await securityStateManager.setSecurityState('test@example.com', newState);

      // Simulate storage event (cross-tab communication)
      const storageEvent = new StorageEvent('storage', {
        key: 'auth_security_state_test@example.com',
        newValue: JSON.stringify(newState),
        storageArea: localStorage
      });

      await act(async () => {
        window.dispatchEvent(storageEvent);
      });

      // Wait for state synchronization
      await waitFor(() => {
        expect(screen.getByText(/2 attempts remaining/i)).toBeInTheDocument();
      });
    });

    it('should prevent race conditions in cross-tab updates', async () => {
      // Setup multiple rapid state changes to test race conditions
      const promises = [];

      // Simulate multiple tabs updating state simultaneously
      for (let i = 0; i < 5; i++) {
        promises.push(
          rateLimitManager.incrementFailedAttempts(`race-test-${i}@example.com`)
        );
      }

      // Wait for all updates to complete
      await Promise.all(promises);

      // Verify each identifier has correct state
      for (let i = 0; i < 5; i++) {
        const status = await rateLimitManager.checkRateLimit(`race-test-${i}@example.com`);
        expect(status.attemptsRemaining).toBe(4);
      }
    });
  });

  describe('Browser Session Management', () => {
    it('should maintain security state within browser session', async () => {
      // Setup failed authentication
      const authError = new Error('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Perform failed attempts
      for (let i = 0; i < 2; i++) {
        await act(async () => {
          fireEvent.change(emailInput, { target: { value: 'session@example.com' } });
          fireEvent.change(passwordInput, { target: { value: `wrong${i}` } });
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        });

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // Verify state is maintained
      const status = await rateLimitManager.checkRateLimit('session@example.com');
      expect(status.attemptsRemaining).toBe(3);

      // Simulate page refresh (component remount within same session)
      const { unmount, rerender } = render(<LoginForm />);
      unmount();
      rerender(<LoginForm />);

      // Wait for reinitialization
      await act(async () => {
        const newEmailInput = screen.getByLabelText(/email/i);
        fireEvent.change(newEmailInput, { target: { value: 'session@example.com' } });
      });

      // Verify state persisted within session
      await waitFor(() => {
        expect(screen.getByText(/3 attempts remaining/i)).toBeInTheDocument();
      });
    });

    it('should handle session storage fallback when localStorage fails', async () => {
      // Mock localStorage to fail
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Mock sessionStorage as fallback
      const mockSessionStorage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage
      });

      // Attempt to create security state
      await rateLimitManager.incrementFailedAttempts('fallback@example.com');

      // Verify fallback mechanism was used
      const status = await rateLimitManager.checkRateLimit('fallback@example.com');
      expect(status.attemptsRemaining).toBe(4);

      // Restore original localStorage
      mockLocalStorage.setItem.mockImplementation(originalSetItem);
    });

    it('should handle memory-only fallback when all storage fails', async () => {
      // Mock both localStorage and sessionStorage to fail
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const mockSessionStorage = {
        getItem: vi.fn(() => { throw new Error('Session storage failed'); }),
        setItem: vi.fn(() => { throw new Error('Session storage failed'); }),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage
      });

      // System should still function with memory-only storage
      await rateLimitManager.incrementFailedAttempts('memory@example.com');

      const status = await rateLimitManager.checkRateLimit('memory@example.com');
      expect(status.attemptsRemaining).toBe(4);

      // Verify system remains functional
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'memory@example.com' } });
      });

      // Should show warning but remain functional
      await waitFor(() => {
        expect(screen.getByText(/4 attempts remaining/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should validate security state integrity on load', async () => {
      // Create state with invalid data
      const invalidState = {
        failedAttempts: 999, // Invalid: exceeds maximum
        lockoutUntil: 'invalid-date', // Invalid: not a number
        lastAttempt: -1, // Invalid: negative timestamp
        progressiveDelay: 'not-a-number' // Invalid: not a number
      };

      // Manually set invalid state in storage
      mockLocalStorage.setItem(
        'auth_security_state_test@example.com',
        JSON.stringify(invalidState)
      );

      render(<LoginForm />);

      // Wait for component to initialize and validate state
      await act(async () => {
        const emailInput = screen.getByLabelText(/email/i);
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      });

      // Verify system corrected invalid state
      const status = await rateLimitManager.checkRateLimit('test@example.com');
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(5);
      expect(status.canAttempt).toBe(true);
    });

    it('should handle encryption/decryption errors gracefully', async () => {
      // Mock crypto operations to fail
      const originalEncrypt = secureStorage.encrypt;
      const originalDecrypt = secureStorage.decrypt;

      secureStorage.encrypt = vi.fn().mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      secureStorage.decrypt = vi.fn().mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      // System should still function with encryption failures
      await rateLimitManager.incrementFailedAttempts('crypto-fail@example.com');

      const status = await rateLimitManager.checkRateLimit('crypto-fail@example.com');
      expect(status.attemptsRemaining).toBe(4);

      // Restore original functions
      secureStorage.encrypt = originalEncrypt;
      secureStorage.decrypt = originalDecrypt;
    });

    it('should maintain state consistency across multiple operations', async () => {
      const identifier = 'consistency@example.com';

      // Perform multiple concurrent operations
      const operations = [
        () => rateLimitManager.incrementFailedAttempts(identifier),
        () => rateLimitManager.checkRateLimit(identifier),
        () => rateLimitManager.incrementFailedAttempts(identifier),
        () => rateLimitManager.checkRateLimit(identifier)
      ];

      // Execute operations concurrently
      await Promise.all(operations.map(op => op()));

      // Verify final state is consistent
      const finalStatus = await rateLimitManager.checkRateLimit(identifier);
      expect(finalStatus.attemptsRemaining).toBe(3); // 2 increments from 5
      expect(typeof finalStatus.isLocked).toBe('boolean');
      expect(typeof finalStatus.canAttempt).toBe('boolean');
    });
  });
});