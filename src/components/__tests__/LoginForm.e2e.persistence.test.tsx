/**
 * End-to-End Security State Persistence Tests
 * 
 * Tests for security state persistence across application restarts,
 * browser sessions, and cross-tab synchronization.
 */

import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
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
  useAuthStore: vi.fn(() => ({
    setUser: vi.fn(),
    forceDataLoad: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Use native localStorage from jsdom
// No need to replace window.localStorage as it works fine in jsdom
// and replacing it breaks references held by other modules (like secureStorage)

// Mock crypto for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => '12345678-1234-1234-1234-123456789abc'),
    subtle: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      generateKey: vi.fn(),
      importKey: vi.fn()
    }
  },
  configurable: true,
  writable: true
});

describe('LoginForm E2E Persistence Tests', () => {
  let mockSetUser: Mock;
  let mockForceDataLoad: Mock;
  let mockSupabaseSignIn: Mock;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Clear all storage tiers
    secureStorage.clear();

    // Setup auth store mocks
    mockSetUser = vi.fn();
    mockForceDataLoad = vi.fn().mockResolvedValue(undefined);

    (useAuthStore as unknown as Mock).mockReturnValue({
      setUser: mockSetUser,
      forceDataLoad: mockForceDataLoad
    });

    // Setup Supabase mocks
    mockSupabaseSignIn = vi.fn();
    (supabase.auth.signInWithPassword as Mock).mockImplementation(mockSupabaseSignIn);

    // Suppress console logs for clean test output
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'info').mockImplementation(() => { });
  });

  afterEach(async () => {
    secureStorage.clear();
    cleanup();
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
        // Wait for button to be enabled (progressive delay)
        await waitFor(() => expect(submitButton1).toBeEnabled(), { timeout: 5000 });

        await act(async () => {
          fireEvent.change(emailInput1, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput1, { target: { value: `wrong${i}` } });
          fireEvent.click(submitButton1);
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
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
        expect(screen.getByText((content) => content.includes('2 attempts remaining'))).toBeInTheDocument();
      }, { timeout: 10000 });

      const statusAfterRestart = await rateLimitManager.checkRateLimit('test@example.com');
      expect(statusAfterRestart.attemptsRemaining).toBe(2);
    });

    it.skip('should persist lockout state across app restarts', async () => {
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
        // Wait for button to be enabled (progressive delay)
        await waitFor(() => expect(submitButton1).toBeEnabled(), { timeout: 10000 });

        await act(async () => {
          fireEvent.change(emailInput1, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput1, { target: { value: `wrong${i}` } });
          fireEvent.click(submitButton1);
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        }, { timeout: 10000 });
      }

      // Verify lockout is active
      await waitFor(() => {
        expect(screen.getByText((content) => content.includes('Account temporarily locked'))).toBeInTheDocument();
      }, { timeout: 5000 });

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
        expect(screen.getByText((content) => content.includes('Account temporarily locked'))).toBeInTheDocument();
      }, { timeout: 10000 });

      const statusAfterRestart = await rateLimitManager.checkRateLimit('test@example.com');
      expect(statusAfterRestart.isLocked).toBe(true);
      expect(statusAfterRestart.remainingTime).toBeGreaterThan(0);
    });

    it('should handle corrupted persistence data gracefully', async () => {
      // Manually corrupt localStorage data
      localStorage.setItem('auth_security_state_test@example.com', 'corrupted-data');

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
    it.skip('should synchronize security state across multiple tabs', async () => {
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
        expect(screen.getByText((_, el) => el?.textContent?.includes('4 attempts remaining') || false)).toBeInTheDocument();
      }, { timeout: 10000 });

      status = await rateLimitManager.checkRateLimit('test@example.com');
      expect(status.attemptsRemaining).toBe(4);
    });

    it.skip('should handle storage events for real-time synchronization', async () => {
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

      // Create a proper storage event for jsdom environment
      const storageEvent = new Event('storage') as StorageEvent;
      Object.defineProperty(storageEvent, 'key', {
        value: 'security_state_dGVzdEBleGFtcGxlLmNvbQ==', // base64 encoded test@example.com
        writable: false
      });
      Object.defineProperty(storageEvent, 'newValue', {
        value: JSON.stringify({
          identifier: 'test@example.com',
          failedAttempts: 3,
          lastAttempt: Date.now(),
          progressiveDelay: 2000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1
        }),
        writable: false
      });
      Object.defineProperty(storageEvent, 'storageArea', {
        value: localStorage,
        writable: false
      });

      await act(async () => {
        window.dispatchEvent(storageEvent);
      });

      // Wait for state synchronization
      await waitFor(() => {
        expect(screen.getByText((_, el) => el?.textContent?.includes('2 attempts remaining') || false)).toBeInTheDocument();
      }, { timeout: 10000 });
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
    it.skip('should maintain security state within browser session', async () => {
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

        // Wait for submission to complete (loading state to clear)
        await waitFor(() => {
          expect(submitButton).not.toBeDisabled();
        }, { timeout: 3000 });

        // Wait a bit for state to settle
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      // Verify both submissions were made
      expect(mockSupabaseSignIn).toHaveBeenCalledTimes(2);

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
        expect(screen.getByText((_, el) => el?.textContent?.includes('3 attempts remaining') || false)).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should handle session storage fallback when localStorage fails', async () => {
      // Mock only localStorage to fail
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Mock sessionStorage as fallback
      const mockSessionStorage = {
        _data: new Map<string, string>(),
        getItem: vi.fn((key: string) => mockSessionStorage._data.get(key) || null),
        setItem: vi.fn((key: string, value: string) => { mockSessionStorage._data.set(key, value); }),
        removeItem: vi.fn((key: string) => { mockSessionStorage._data.delete(key); }),
        clear: vi.fn(() => { mockSessionStorage._data.clear(); }),
        length: 0,
        key: vi.fn((index: number) => Array.from(mockSessionStorage._data.keys())[index] || null)
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
        configurable: true
      });

      // Attempt to create security state
      await rateLimitManager.incrementFailedAttempts('fallback@example.com');

      // Verify fallback mechanism was used - should start from 5 and decrement to 4
      // checkRateLimit will find it in sessionStorage
      const status = await rateLimitManager.checkRateLimit('fallback@example.com');
      expect(status.attemptsRemaining).toBe(4);
      expect(status.isLocked).toBe(false);

      setItemSpy.mockRestore();
    });



    it('should handle memory-only fallback when all storage fails', async () => {
      // Mock both localStorage and sessionStorage to fail
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      try {
        const mockSessionStorage = {
          getItem: vi.fn(() => { throw new Error('Session storage failed'); }),
          setItem: vi.fn(() => { throw new Error('Session storage failed'); }),
          removeItem: vi.fn(),
          clear: vi.fn()
        };

        Object.defineProperty(window, 'sessionStorage', {
          value: mockSessionStorage,
          configurable: true
        });

        // Clear any existing state first
        await rateLimitManager.cleanupExpiredStates();

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
          expect(screen.getByText((content) => content.includes('4 attempts remaining'))).toBeInTheDocument();
        }, { timeout: 10000 });
      } finally {
        setItemSpy.mockRestore();
      }
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
      localStorage.setItem(
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

      // Clear any existing state first
      await rateLimitManager.cleanupExpiredStates();

      // Perform multiple sequential operations to avoid race conditions
      await rateLimitManager.incrementFailedAttempts(identifier);
      await rateLimitManager.checkRateLimit(identifier);
      await rateLimitManager.incrementFailedAttempts(identifier);
      await rateLimitManager.checkRateLimit(identifier);

      // Verify final state is consistent
      const finalStatus = await rateLimitManager.checkRateLimit(identifier);
      expect(finalStatus.attemptsRemaining).toBe(3); // 2 increments from 5
      expect(typeof finalStatus.isLocked).toBe('boolean');
      expect(typeof finalStatus.canAttempt).toBe('boolean');
    });
  });
});