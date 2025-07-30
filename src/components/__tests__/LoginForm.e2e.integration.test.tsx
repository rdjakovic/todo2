/**
 * End-to-End Authentication Security Integration Tests
 * 
 * Comprehensive integration tests that verify the complete authentication flow
 * with all security enhancements working together including rate limiting,
 * error handling, security logging, state persistence, and auth store integration.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import LoginForm from '../LoginForm';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { rateLimitManager } from '../../utils/rateLimitManager';
import { securityErrorHandler } from '../../utils/securityErrorHandler';
import { securityLogger, SecurityEventType } from '../../utils/securityLogger';
import { securityStateManager } from '../../utils/securityStateManager';
import { securityConfig } from '../../config/securityConfig';

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

// Mock crypto and navigator
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-session-uuid-123')
  }
});

Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Browser) E2E-TestRunner/1.0',
    onLine: true
  }
});

// Test utilities for comprehensive scenarios
const TestScenarios = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-123',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  createAuthError: (message: string, code?: string) => {
    const error = new Error(message);
    if (code) {
      (error as any).code = code;
    }
    return error;
  },

  simulateUserBehavior: async (
    emailInput: HTMLElement,
    passwordInput: HTMLElement,
    submitButton: HTMLElement,
    credentials: { email: string; password: string }
  ) => {
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: credentials.email } });
    });
    
    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: credentials.password } });
    });
    
    await act(async () => {
      fireEvent.click(submitButton);
    });
  }
};

describe('LoginForm E2E Integration Tests', () => {
  let mockSetUser: Mock;
  let mockForceDataLoad: Mock;
  let mockSupabaseSignIn: Mock;
  let mockToastSuccess: Mock;
  let mockToastError: Mock;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
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

    // Setup toast mocks
    mockToastSuccess = vi.fn();
    mockToastError = vi.fn();
    (toast.success as Mock).mockImplementation(mockToastSuccess);
    (toast.error as Mock).mockImplementation(mockToastError);

    // Clear security state
    await securityStateManager.cleanupExpiredStates();
    await rateLimitManager.cleanupExpiredStates();

    // Suppress console logs for clean test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(async () => {
    await securityStateManager.cleanupExpiredStates();
    vi.restoreAllMocks();
  });

  describe('Complete Authentication Security Flow', () => {
    it('should handle complete successful authentication with all security features', async () => {
      const mockUser = TestScenarios.createMockUser();
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Spy on all security components
      const logSuccessfulLoginSpy = vi.spyOn(securityLogger, 'logSuccessfulLogin');
      const resetFailedAttemptsSpy = vi.spyOn(rateLimitManager, 'resetFailedAttempts');
      const checkRateLimitSpy = vi.spyOn(rateLimitManager, 'checkRateLimit');

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Perform authentication
      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'test@example.com', password: 'validpassword123' }
      );

      // Wait for authentication to complete
      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'validpassword123'
        });
      });

      // Verify complete authentication flow
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockForceDataLoad).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');

      // Verify security logging
      expect(logSuccessfulLoginSpy).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          component: 'LoginForm',
          action: 'authentication_success',
          sessionId: 'test-session-uuid-123',
          userId: mockUser.id,
          userEmail: mockUser.email
        })
      );

      // Verify rate limit reset
      expect(resetFailedAttemptsSpy).toHaveBeenCalledWith('test@example.com');

      // Verify final security state
      const finalRateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(finalRateLimitStatus.isLocked).toBe(false);
      expect(finalRateLimitStatus.attemptsRemaining).toBe(5);
      expect(finalRateLimitStatus.canAttempt).toBe(true);

      // Verify form data was cleared securely
      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });

    it('should handle complete brute force attack scenario with all security measures', async () => {
      const authError = TestScenarios.createAuthError('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      // Spy on security components
      const logFailedLoginSpy = vi.spyOn(securityLogger, 'logFailedLogin');
      const logAccountLockedSpy = vi.spyOn(securityLogger, 'logAccountLocked');
      const handleAuthErrorSpy = vi.spyOn(securityErrorHandler, 'handleAuthError');
      const incrementFailedAttemptsSpy = vi.spyOn(rateLimitManager, 'incrementFailedAttempts');

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Simulate brute force attack (5 failed attempts)
      for (let attempt = 1; attempt <= 5; attempt++) {
        await TestScenarios.simulateUserBehavior(
          emailInput,
          passwordInput,
          submitButton,
          { email: 'attacker@example.com', password: `bruteforce${attempt}` }
        );

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(attempt);
        });

        // Wait for security processing
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        // Verify progressive security measures
        if (attempt < 5) {
          // Before lockout
          expect(logFailedLoginSpy).toHaveBeenCalledWith(
            'attacker@example.com',
            attempt,
            expect.objectContaining({
              component: 'LoginForm',
              action: 'authentication_failed',
              sessionId: 'test-session-uuid-123',
              supabaseError: 'Invalid credentials',
              lockoutTriggered: false
            })
          );

          // Verify remaining attempts warning
          await waitFor(() => {
            const remainingAttempts = 5 - attempt;
            expect(screen.getByText(new RegExp(`${remainingAttempts} attempt.*remaining`, 'i'))).toBeInTheDocument();
          });
        } else {
          // After lockout triggered
          expect(logAccountLockedSpy).toHaveBeenCalledWith(
            'attacker@example.com',
            15 * 60 * 1000, // 15 minutes
            5
          );

          // Verify lockout UI
          await waitFor(() => {
            expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
          });

          expect(submitButton).toBeDisabled();
        }

        // Verify error handling for each attempt
        expect(handleAuthErrorSpy).toHaveBeenCalledWith(
          authError,
          expect.objectContaining({
            userIdentifier: 'attacker@example.com',
            sessionId: 'test-session-uuid-123'
          })
        );

        // Verify rate limiting increment
        expect(incrementFailedAttemptsSpy).toHaveBeenCalledWith('attacker@example.com');
      }

      // Verify final lockout state
      const finalStatus = await rateLimitManager.checkRateLimit('attacker@example.com');
      expect(finalStatus.isLocked).toBe(true);
      expect(finalStatus.canAttempt).toBe(false);
      expect(finalStatus.remainingTime).toBeGreaterThan(0);

      // Verify lockout countdown is displayed
      await waitFor(() => {
        const countdownPattern = /\d{1,2}:\d{2}/;
        expect(screen.getByText(countdownPattern)).toBeInTheDocument();
      });
    });

    it('should handle mixed success and failure scenarios with proper state management', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Scenario 1: Failed attempt
      const authError = TestScenarios.createAuthError('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'mixed@example.com', password: 'wrongpassword' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(1);
      });

      // Verify failed attempt state
      let status = await rateLimitManager.checkRateLimit('mixed@example.com');
      expect(status.attemptsRemaining).toBe(4);

      await waitFor(() => {
        expect(screen.getByText(/4 attempts remaining/i)).toBeInTheDocument();
      });

      // Scenario 2: Another failed attempt
      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'mixed@example.com', password: 'stillwrong' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(2);
      });

      status = await rateLimitManager.checkRateLimit('mixed@example.com');
      expect(status.attemptsRemaining).toBe(3);

      // Scenario 3: Successful authentication
      const mockUser = TestScenarios.createMockUser({ email: 'mixed@example.com' });
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'mixed@example.com', password: 'correctpassword' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(3);
      });

      // Verify successful authentication and state reset
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');

      // Verify security state was reset
      status = await rateLimitManager.checkRateLimit('mixed@example.com');
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(5);

      // Verify UI no longer shows warnings
      expect(screen.queryByText(/attempts remaining/i)).not.toBeInTheDocument();
    });

    it('should handle progressive delays and concurrent request prevention', async () => {
      const authError = TestScenarios.createAuthError('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First failed attempt
      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'progressive@example.com', password: 'wrong1' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(1);
      });

      // Second failed attempt (should trigger progressive delay)
      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'progressive@example.com', password: 'wrong2' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(2);
      });

      // Verify progressive delay is active
      const status = await rateLimitManager.checkRateLimit('progressive@example.com');
      expect(status.progressiveDelay).toBeGreaterThan(0);

      // Verify UI shows delay message
      await waitFor(() => {
        expect(screen.getByText(/please wait.*seconds before trying again/i)).toBeInTheDocument();
      });

      // Verify submit button is disabled during delay
      expect(submitButton).toBeDisabled();

      // Try to submit during delay (should be prevented)
      await act(async () => {
        fireEvent.click(submitButton);
        fireEvent.click(submitButton);
      });

      // Verify no additional requests were made
      expect(mockSupabaseSignIn).toHaveBeenCalledTimes(2);
    });

    it('should integrate properly with auth store and data loading', async () => {
      const mockUser = TestScenarios.createMockUser();
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock forceDataLoad to simulate realistic behavior
      mockForceDataLoad.mockImplementation(async () => {
        // Simulate data loading delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return Promise.resolve();
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'integration@example.com', password: 'validpassword' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      });

      // Verify auth store integration
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockForceDataLoad).toHaveBeenCalled();

      // Verify success feedback
      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');

      // Verify security state was properly managed
      const status = await rateLimitManager.checkRateLimit('integration@example.com');
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(5);
    });

    it('should handle auth store errors gracefully', async () => {
      const mockUser = TestScenarios.createMockUser();
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock forceDataLoad to fail
      mockForceDataLoad.mockRejectedValue(new Error('Data loading failed'));

      const logSecurityErrorSpy = vi.spyOn(securityLogger, 'logSecurityError');

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'authstore@example.com', password: 'validpassword' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      });

      // Verify user was still set despite data loading failure
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);

      // Verify success toast was still shown (auth succeeded)
      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');

      // Verify security state was still reset
      const status = await rateLimitManager.checkRateLimit('authstore@example.com');
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(5);
    });
  });

  describe('Security Configuration Integration', () => {
    it('should respect security configuration settings', async () => {
      // Test with custom security configuration
      const customConfig = {
        maxAttempts: 3, // Lower than default
        lockoutDuration: 5 * 60 * 1000, // 5 minutes instead of 15
        progressiveDelay: false // Disable progressive delays
      };

      // Create custom rate limit manager with test config
      const customRateLimitManager = new (rateLimitManager.constructor as any)(customConfig);

      const authError = TestScenarios.createAuthError('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Perform failed attempts up to custom limit
      for (let attempt = 1; attempt <= 3; attempt++) {
        await customRateLimitManager.incrementFailedAttempts('config@example.com');
        
        if (attempt < 3) {
          const status = await customRateLimitManager.checkRateLimit('config@example.com');
          expect(status.attemptsRemaining).toBe(3 - attempt);
        }
      }

      // Verify lockout with custom settings
      const finalStatus = await customRateLimitManager.checkRateLimit('config@example.com');
      expect(finalStatus.isLocked).toBe(true);
      expect(finalStatus.remainingTime).toBeLessThanOrEqual(5 * 60 * 1000);
    });

    it('should handle security feature toggles', async () => {
      // Test with security features disabled
      const disabledConfig = {
        enableRateLimit: false,
        enableProgressiveDelay: false,
        enableSecurityLogging: false
      };

      // Mock security config
      vi.spyOn(securityConfig, 'getRateLimitConfig').mockReturnValue({
        maxAttempts: 999, // Effectively disabled
        lockoutDuration: 0,
        progressiveDelay: false,
        storageKey: 'test'
      });

      const authError = TestScenarios.createAuthError('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Perform many failed attempts (should not trigger lockout)
      for (let i = 0; i < 10; i++) {
        await TestScenarios.simulateUserBehavior(
          emailInput,
          passwordInput,
          submitButton,
          { email: 'disabled@example.com', password: `attempt${i}` }
        );

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        });

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // Verify no lockout occurred
      expect(screen.queryByText(/account temporarily locked/i)).not.toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Error Boundary and Resilience', () => {
    it('should handle security component failures gracefully', async () => {
      // Mock security components to fail
      vi.spyOn(rateLimitManager, 'checkRateLimit').mockRejectedValue(new Error('Rate limit check failed'));
      vi.spyOn(securityLogger, 'logEvent').mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const mockUser = TestScenarios.createMockUser();
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Authentication should still work despite security component failures
      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'resilient@example.com', password: 'validpassword' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      });

      // Verify authentication succeeded despite security failures
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');
    });

    it('should maintain functionality when storage is unavailable', async () => {
      // Mock storage to fail
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('Storage unavailable'); }),
          setItem: vi.fn(() => { throw new Error('Storage unavailable'); }),
          removeItem: vi.fn(() => { throw new Error('Storage unavailable'); }),
          clear: vi.fn(() => { throw new Error('Storage unavailable'); })
        }
      });

      const mockUser = TestScenarios.createMockUser();
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Authentication should still work with storage failures
      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'nostorage@example.com', password: 'validpassword' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      });

      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should cleanup resources properly on unmount', async () => {
      const cleanupSpy = vi.spyOn(rateLimitManager, 'removeStateChangeListener');

      const { unmount } = render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);

      // Trigger state change listener setup
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'cleanup@example.com' } });
      });

      // Unmount component
      unmount();

      // Verify cleanup was attempted (implementation may vary)
      // This test ensures the cleanup code path is exercised
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle rapid user interactions without memory leaks', async () => {
      const authError = TestScenarios.createAuthError('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Simulate rapid user interactions
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          fireEvent.change(emailInput, { target: { value: `rapid${i}@example.com` } });
          fireEvent.change(passwordInput, { target: { value: `password${i}` } });
          
          // Only submit every few iterations to avoid overwhelming
          if (i % 5 === 0) {
            fireEvent.click(submitButton);
          }
        });

        // Small delay to prevent overwhelming the system
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      // Verify system remains responsive
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });
  });
});