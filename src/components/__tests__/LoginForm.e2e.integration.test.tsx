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
import { securityLogger } from '../../utils/securityLogger';
import { secureStorage } from '../../utils/secureStorage';
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

    // Setup toast mocks
    mockToastSuccess = vi.fn();
    mockToastError = vi.fn();
    (toast.success as Mock).mockImplementation(mockToastSuccess);
    (toast.error as Mock).mockImplementation(mockToastError);

    // Suppress console logs for clean test output
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'info').mockImplementation(() => { });

    // Disable progressive delay for faster tests unless specifically needed
    rateLimitManager.updateConfig({
      progressiveDelay: false,
      baseDelay: 0
    });
  });

  afterEach(async () => {
    secureStorage.clear();
    rateLimitManager.updateConfig({
      progressiveDelay: true,
      baseDelay: 1000
    });
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
      // checkRateLimitSpy removed as it was unused

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
      await waitFor(() => {
        expect(mockSetUser).toHaveBeenCalledWith(mockUser);
        expect(mockForceDataLoad).toHaveBeenCalled();
      }, { timeout: 10000 });
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

    it('should handle failed authentication attempts with security measures', async () => {
      const authError = TestScenarios.createAuthError('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      // Spy on security components
      const incrementFailedAttemptsSpy = vi.spyOn(rateLimitManager, 'incrementFailedAttempts');
      const handleAuthErrorSpy = vi.spyOn(securityErrorHandler, 'handleAuthError');

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Simulate a failed authentication attempt
      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'test@example.com', password: 'wrongpassword' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      });

      // Wait for security processing
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Verify security components were called
      expect(incrementFailedAttemptsSpy).toHaveBeenCalledWith('test@example.com');
      expect(handleAuthErrorSpy).toHaveBeenCalledWith(
        authError,
        expect.objectContaining({
          userIdentifier: 'test@example.com',
          sessionId: 'test-session-uuid-123'
        })
      );

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Verify remaining attempts warning appears
      await waitFor(() => {
        expect(screen.getByText(/4 attempts remaining/i)).toBeInTheDocument();
      });
    });

    it('should handle successful authentication after failed attempt', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First: Failed attempt
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

      // Wait for state update and verify failed attempt UI
      await waitFor(() => {
        expect(screen.getByText(/4 attempts remaining/i)).toBeInTheDocument();
      });

      // Second: Successful authentication
      const mockUser = TestScenarios.createMockUser({ email: 'mixed@example.com' });
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Wait for button to be enabled (progressive delay from previous failed attempt)
      await waitFor(() => expect(submitButton).toBeEnabled(), { timeout: 10000 });

      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'mixed@example.com', password: 'correctpassword' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(2);
      }, { timeout: 10000 });

      // Verify successful authentication
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');

      // Verify UI no longer shows warnings
      await waitFor(() => {
        expect(screen.queryByText(/attempts remaining/i)).not.toBeInTheDocument();
      });
    });

    it('should handle basic rate limiting behavior', async () => {
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
        { email: 'ratelimit@example.com', password: 'wrong1' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(1);
      });

      // Verify error message and remaining attempts
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        expect(screen.getByText(/4 attempts remaining/i)).toBeInTheDocument();
      });

      // Verify form is still functional
      expect(submitButton).not.toBeDisabled();
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
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

      // Mock navigator.onLine to be true for successful authentication
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
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

      // Wait for async operations to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
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

      // Mock navigator.onLine to be true for successful authentication
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

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

      // Wait for async operations to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Verify user was still set despite data loading failure
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);

      // Verify success toast was still shown (auth succeeded)
      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');
    });
  });

  describe('Security Configuration Integration', () => {
    it('should respect security configuration settings', async () => {
      // Test with custom security configuration by updating the existing manager
      const originalConfig = rateLimitManager.getConfig();

      // Update configuration temporarily
      rateLimitManager.updateConfig({
        maxAttempts: 3, // Lower than default
        lockoutDuration: 5 * 60 * 1000, // 5 minutes instead of 15
        progressiveDelay: false // Disable progressive delays
      });

      const authError = TestScenarios.createAuthError('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      render(<LoginForm />);

      // Variables removed as they were unused

      // Perform failed attempts up to custom limit
      for (let attempt = 1; attempt <= 3; attempt++) {
        // Wait for button enablement if not first attempt
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });
        
        await waitFor(() => expect(submitButton).toBeEnabled(), { timeout: 10000 });

        await TestScenarios.simulateUserBehavior(
          emailInput,
          passwordInput,
          submitButton,
          { email: 'config@example.com', password: `wrong${attempt}` }
        );

        if (attempt < 3) {
          const status = await rateLimitManager.checkRateLimit('config@example.com');
          expect(status.attemptsRemaining).toBe(3 - attempt);
        }
      }

      // Verify lockout with custom settings
      const finalStatus = await rateLimitManager.checkRateLimit('config@example.com');
      expect(finalStatus.isLocked).toBe(true);
      expect(finalStatus.remainingTime).toBeLessThanOrEqual(5 * 60 * 1000);

      // Restore original configuration
      rateLimitManager.updateConfig(originalConfig);
    });

    it('should handle multiple failed attempts without lockout when configured', async () => {
      // Mock security config to allow more attempts
      vi.spyOn(securityConfig, 'getRateLimitConfig').mockReturnValue({
        maxAttempts: 999, // Effectively disabled
        lockoutDuration: 0,
        progressiveDelay: false,
        baseDelay: 0,
        maxDelay: 0,
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

      // Perform a few failed attempts
      await TestScenarios.simulateUserBehavior(
        emailInput,
        passwordInput,
        submitButton,
        { email: 'disabled@example.com', password: 'attempt1' }
      );

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(1);
      });

      // Verify no lockout occurred and form is still functional
      expect(screen.queryByText(/account temporarily locked/i)).not.toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  describe('Error Boundary and Resilience', () => {
    it('should handle security component failures gracefully', async () => {
      // Mock security components to fail gracefully
      vi.spyOn(securityLogger, 'logEvent').mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const mockUser = TestScenarios.createMockUser();
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock navigator.onLine to be true for successful authentication
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
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

      // Wait for async operations to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Verify authentication succeeded despite
      await waitFor(() => {
        expect(mockSetUser).toHaveBeenCalledWith(mockUser);
        expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');
      }, { timeout: 10000 });
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

      // Mock navigator.onLine to be true for successful authentication
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
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

      // Wait for async operations to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
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