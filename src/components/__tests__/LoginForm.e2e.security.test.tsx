/**
 * End-to-End Authentication Security Tests
 * 
 * Comprehensive integration tests for the complete authentication flow
 * with security enhancements including rate limiting, error handling,
 * security logging, and state persistence.
 */

import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import LoginForm from '../LoginForm';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { rateLimitManager } from '../../utils/rateLimitManager';
import { securityErrorHandler } from '../../utils/securityErrorHandler';
import { securityLogger, SecurityEventType } from '../../utils/securityLogger';
import { securityStateManager } from '../../utils/securityStateManager';

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

// Mock navigator for user agent
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Browser) TestRunner/1.0',
    onLine: true
  }
});

describe('LoginForm E2E Security Tests', { timeout: 30000 }, () => {
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

    // Clear security state
    await securityStateManager.cleanupExpiredStates();
    
    // Reset rate limit manager
    await rateLimitManager.cleanupExpiredStates();
    localStorage.clear();

    rateLimitManager.updateConfig({
      maxAttempts: 5,
      storageKey: 'auth_security_state',
      baseDelay: 10
    });

    // Clear console logs for clean test output
    // vi.spyOn(console, 'log').mockImplementation(() => {});
    // vi.spyOn(console, 'error').mockImplementation(() => {});
    // vi.spyOn(console, 'warn').mockImplementation(() => {});
    // vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Cleanup security state after each test
    await securityStateManager.cleanupExpiredStates();
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Complete Authentication Flow with Security Features', () => {
    it('should handle successful authentication with security logging', async () => {
      // Setup successful authentication
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Spy on security logger
      const logSuccessfulLoginSpy = vi.spyOn(securityLogger, 'logSuccessfulLogin');

      render(<LoginForm />);

      // Fill in credentials
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const getSubmitBtn = () => screen.getByRole('button');

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
      });

      // Submit form
      await act(async () => {
        fireEvent.click(getSubmitBtn());
      });

      // Wait for authentication to complete
      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      // Verify successful authentication flow
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      expect(mockForceDataLoad).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');

      // Verify security logging
      await waitFor(() => {
        expect(logSuccessfulLoginSpy).toHaveBeenCalledWith(
          'test@example.com',
          expect.objectContaining({
            component: 'LoginForm',
            action: 'authentication_success',
            sessionId: expect.any(String),
            userId: 'user-123',
            userEmail: 'test@example.com'
          })
        );
      });

      // Verify rate limit reset
      const rateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(rateLimitStatus.isLocked).toBe(false);
      expect(rateLimitStatus.attemptsRemaining).toBe(5);
    });

    it('should handle failed authentication with rate limiting', async () => {
      // Setup failed authentication
      const authError = new Error('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      // Spy on security components
      const logFailedLoginSpy = vi.spyOn(securityLogger, 'logFailedLogin');
      const handleAuthErrorSpy = vi.spyOn(securityErrorHandler, 'handleAuthError');

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const getSubmitBtn = () => screen.getByRole('button');

      // Perform failed authentication attempt
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(getSubmitBtn());
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      });

      // Verify failed attempt was logged
      expect(logFailedLoginSpy).toHaveBeenCalledWith(
        'test@example.com',
        1,
        expect.objectContaining({
          component: 'LoginForm',
          action: 'authentication_failed',
          sessionId: expect.any(String),
          supabaseError: 'Invalid credentials',
          lockoutTriggered: false
        })
      );

      // Verify error handling
      expect(handleAuthErrorSpy).toHaveBeenCalledWith(
        authError,
        expect.objectContaining({
          userIdentifier: 'test@example.com',
          sessionId: expect.any(String)
        })
      );

      // Verify rate limit status updated
      const rateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(rateLimitStatus.attemptsRemaining).toBe(4);
    });

    it('should trigger account lockout after maximum failed attempts', async () => {
      const authError = new Error('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      const logAccountLockedSpy = vi.spyOn(securityLogger, 'logAccountLocked');

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const getSubmitBtn = () => screen.getByRole('button');

      // Perform 5 failed attempts to trigger lockout
      for (let i = 0; i < 5; i++) {
        // Wait for button to be enabled (bypassing progressive delay/loading)
        await waitFor(() => {
          const btn = screen.getByRole('button');
          expect(btn).not.toBeDisabled();
          expect(btn.textContent).toMatch(/sign in/i);
        }, { timeout: 10000 });

        const currentBtn = screen.getByRole('button');
        await act(async () => {
          fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput, { target: { value: `wrongpassword${i}` } });
          fireEvent.click(currentBtn);
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        });
      }

      // Verify account lockout was triggered
      expect(logAccountLockedSpy).toHaveBeenCalledWith(
        'test@example.com',
        15 * 60 * 1000, // 15 minutes
        5
      );

      // Verify lockout status
      const rateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(rateLimitStatus.isLocked).toBe(true);
      expect(rateLimitStatus.canAttempt).toBe(false);
      expect(rateLimitStatus.remainingTime).toBeGreaterThan(0);

      // Verify UI shows lockout message
      await waitFor(() => {
        expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
      });

      // Verify submit button is disabled
      expect((getSubmitBtn() as HTMLButtonElement).disabled).toBe(true);
    });

    it('should persist security state across component remounts', async () => {
      // First, trigger a failed attempt
      const authError = new Error('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      const { unmount } = render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const getSubmitBtn = () => screen.getByRole('button');

      // Perform failed attempt
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(getSubmitBtn());
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      });

      // Verify initial state
      let rateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(rateLimitStatus.attemptsRemaining).toBe(4);

      // Unmount and remount component
      unmount();
      render(<LoginForm />);

      // Wait for component to initialize
      await act(async () => {
        const newEmailInput = screen.getByLabelText(/email/i);
        fireEvent.change(newEmailInput, { target: { value: 'test@example.com' } });
      });

      // Verify state persisted
      await waitFor(() => {
        expect(screen.getByText(/4 attempt.*remaining/i)).toBeInTheDocument();
      });

      rateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(rateLimitStatus.attemptsRemaining).toBe(4);
    });

    it('should handle progressive delays between attempts', async () => {
      const authError = new Error('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const getSubmitBtn = () => screen.getByRole('button');

      // Perform first failed attempt
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword1' } });
        fireEvent.click(getSubmitBtn());
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(1);
      });

      // Wait for button to be enabled before second attempt
      await waitFor(() => {
        const b = screen.getByRole('button');
        expect(b).not.toBeDisabled();
        expect(b.textContent).toMatch(/sign in/i);
      }, { timeout: 10000 });

      // Perform second failed attempt
      const btn2 = screen.getByRole('button');
      await act(async () => {
        const passwordInp2 = screen.getByLabelText(/password/i);
        fireEvent.change(passwordInp2, { target: { value: 'wrongpassword2' } });
        fireEvent.click(btn2);
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(2);
      });

      // Check for progressive delay
      const rateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(rateLimitStatus.progressiveDelay).toBeGreaterThan(0);

      // Verify UI shows delay message
      await waitFor(() => {
        expect(screen.getByText(/please wait.*seconds before trying again/i)).toBeInTheDocument();
      });

      // Verify submit button is disabled during delay
      expect((getSubmitBtn() as HTMLButtonElement).disabled).toBe(true);
    });

    it('should prevent concurrent authentication requests', async () => {
      // Setup slow authentication response
      mockSupabaseSignIn.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: { user: null }, error: new Error('Invalid') }), 1000)
        )
      );

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const getSubmitBtn = () => screen.getByRole('button');

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
      });

      // Start first request
      await act(async () => {
        fireEvent.click(getSubmitBtn());
      });

      // Verify button is disabled and shows loading state
      expect((getSubmitBtn() as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();

      // Try to submit again (should be prevented)
      await act(async () => {
        fireEvent.click(getSubmitBtn());
      });

      // Verify only one request was made
      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
    });

    it('should handle network errors gracefully', async () => {
      // Setup network error
      const networkError = new Error('Network request failed');
      (networkError as any).name = 'NetworkError';
      mockSupabaseSignIn.mockRejectedValue(networkError);

      const handleAuthErrorSpy = vi.spyOn(securityErrorHandler, 'handleAuthError');

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const getSubmitBtn = () => screen.getByRole('button');

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(getSubmitBtn());
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      });

      // Verify error was handled securely
      expect(handleAuthErrorSpy).toHaveBeenCalledWith(
        networkError,
        expect.objectContaining({
          userIdentifier: 'test@example.com'
        })
      );

      // Verify generic error message is shown
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          expect.stringMatching(/connection error|network error/i)
        );
      });
    });

    it('should validate input before submission', async () => {
      const logEventSpy = vi.spyOn(securityLogger, 'logEvent');

      render(<LoginForm />);

      const getSubmitBtn = () => screen.getByRole('button');
      const getForm = () => screen.getByRole('form');

      // Wait for component to initialize
      await waitFor(() => {
        expect(getSubmitBtn()).not.toBeDisabled();
      }, { timeout: 2000 });

      // Try to submit with empty fields
      await act(async () => {
        fireEvent.submit(getForm());
      });

      // Verify validation error was logged
      await waitFor(() => {
        expect(logEventSpy).toHaveBeenCalledWith(
          SecurityEventType.VALIDATION_ERROR,
          expect.objectContaining({
            additionalContext: expect.objectContaining({
              component: 'LoginForm',
              action: 'input_validation',
              validationFailure: 'missing_required_fields'
            })
          })
        );
      });

      // Verify no authentication attempt was made
      expect(mockSupabaseSignIn).not.toHaveBeenCalled();

      // Test invalid email format
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(getSubmitBtn());
      });

      // Verify email validation error was logged
      await waitFor(() => {
        expect(logEventSpy).toHaveBeenCalledWith(
          SecurityEventType.VALIDATION_ERROR,
          expect.objectContaining({
            additionalContext: expect.objectContaining({
              validationFailure: 'invalid_email_format'
            })
          })
        );
      });

      // Verify still no authentication attempt
      expect(mockSupabaseSignIn).not.toHaveBeenCalled();
    });

    it('should clear sensitive form data after submission', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      const getSubmitBtn = () => screen.getByRole('button');

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(getSubmitBtn());
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      });

      // Verify password field is cleared after successful authentication
      await waitFor(() => {
        expect(passwordInput.value).toBe('');
      });

      // Email should remain for user experience
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should handle lockout expiration correctly', async () => {
      // Create a lockout state that expires quickly for testing
      const shortLockoutManager = new (rateLimitManager as any).constructor({
        maxAttempts: 2,
        lockoutDuration: 100, // 100ms for quick testing
        progressiveDelay: false
      });

      // Trigger lockout
      await shortLockoutManager.incrementFailedAttempts('test@example.com');
      await shortLockoutManager.incrementFailedAttempts('test@example.com');

      // Verify lockout is active
      let status = await shortLockoutManager.checkRateLimit('test@example.com');
      expect(status.isLocked).toBe(true);

      // Wait for lockout to expire
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      // Verify lockout has expired
      status = await shortLockoutManager.checkRateLimit('test@example.com');
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(2);
    });
  });

  describe('Security State Management Integration', () => {
    it('should maintain security state across browser tabs', async () => {
      // Simulate first tab creating security state
      await rateLimitManager.incrementFailedAttempts('test@example.com');
      
      // Simulate second tab checking state
      const status = await rateLimitManager.checkRateLimit('test@example.com');
      expect(status.attemptsRemaining).toBe(4);

      const callback = vi.fn();
      rateLimitManager.addStateChangeListener('test@example.com', callback);

      // Trigger state change
      await rateLimitManager.incrementFailedAttempts('test@example.com');

      // Wait for state change propagation
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Verify state was synchronized
      const finalStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(finalStatus.attemptsRemaining).toBe(3);
    });

    it('should handle corrupted security state gracefully', async () => {
      // Manually corrupt security state
      const corruptedState = {
        failedAttempts: -1,
        lockoutUntil: 'invalid-date',
        progressiveDelay: 'not-a-number'
      };

      // Try to set corrupted state manually in localStorage
      const storageKey = 'security_state_' + btoa('test@example.com').replace(/[^a-zA-Z0-9]/g, '');
      localStorage.setItem(storageKey, JSON.stringify(corruptedState));

      // Verify system falls back to safe defaults
      const status = await rateLimitManager.checkRateLimit('test@example.com');
      expect(status.isLocked).toBe(false);
      expect(status.attemptsRemaining).toBe(5);
      expect(status.canAttempt).toBe(true);
    });

    it('should cleanup expired security states', async () => {
      // Create multiple security states with different expiration times
      const now = Date.now();
      
      // Create expired state manually with old updatedAt
      const expiredKey = 'security_state_' + btoa('expired@example.com').replace(/[^a-zA-Z0-9]/g, '');
      const expiredStateData = {
        identifier: 'expired@example.com',
        failedAttempts: 3,
        lockoutUntil: now - 1000,
        lastAttempt: now - 2000,
        createdAt: now - 10000,
        updatedAt: now - (25 * 60 * 60 * 1000), // 25 hours ago
        version: 1
      };
      localStorage.setItem(expiredKey, JSON.stringify(expiredStateData));

      // Active state
      await securityStateManager.setSecurityState('active@example.com', {
        failedAttempts: 2,
        lockoutUntil: now + 60000, // Expires in 1 minute
        lastAttempt: now - 1000
      });

      // Run cleanup
      await securityStateManager.cleanupExpiredStates();

      // Verify expired state was cleaned up
      const expiredState = await securityStateManager.getSecurityState('expired@example.com');
      expect(expiredState).toBeNull();

      // Verify active state remains
      const activeState = await securityStateManager.getSecurityState('active@example.com');
      expect(activeState).not.toBeNull();
      expect(activeState?.failedAttempts).toBe(2);
    });
  });

  describe('Error Handling and User Experience', () => {
    it('should display appropriate lockout countdown', { timeout: 30000 }, async () => {
      // Setup lockout state
      const authError = new Error('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const getSubmitBtn = () => screen.getByRole('button');

      const getForm = () => screen.getByRole('form');

      const testEmail = 'countdown-test@example.com';

      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        // Wait for potential progressive delay to clear and button to be re-enabled
        await waitFor(() => {
          const btn = getSubmitBtn();
          expect(btn).toBeEnabled();
          expect(btn.textContent).toMatch(/Sign In/i);
        }, { timeout: 15000 });

        await act(async () => {
          fireEvent.change(emailInput, { target: { value: testEmail } });
          fireEvent.change(passwordInput, { target: { value: `wrong${i}` } });
          fireEvent.submit(getForm());
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        });
      }

      // Verify lockout countdown is displayed
      await waitFor(() => {
        const lockoutMessage = screen.getByText(/account temporarily locked.*try again in/i);
        expect(lockoutMessage).toBeInTheDocument();
      });

      // Verify countdown format (MM:SS)
      await waitFor(() => {
        const countdownPattern = /\d{1,2}:\d{2}/;
        expect(screen.getByText(countdownPattern)).toBeInTheDocument();
      });
    });

    it('should show remaining attempts warning', async () => {
      // Disable progressive delay for this test
      const originalConfig = rateLimitManager.getConfig();
      rateLimitManager.updateConfig({ progressiveDelay: false });

      const authError = new Error('Invalid credentials');
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: null },
        error: authError
      });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const getSubmitBtn = () => screen.getByRole('button');

      const getForm = () => screen.getByRole('form');

      // Perform 2 failed attempts
      for (let i = 0; i < 2; i++) {
        // Wait for button to be enabled
        await waitFor(() => {
          expect(getSubmitBtn()).not.toBeDisabled();
        }, { timeout: 10000 });

        await act(async () => {
          fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput, { target: { value: `wrong${i}` } });
          fireEvent.submit(getForm());
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        });
      }

      // Verify remaining attempts warning is shown
      await waitFor(() => {
        expect(screen.getByText(/3 attempts remaining/i)).toBeInTheDocument();
      });

      // Restore configuration
      rateLimitManager.updateConfig(originalConfig);
    });

    it('should handle different network conditions', async () => {
      // Disable progressive delay to avoid interference
      const originalConfig = rateLimitManager.getConfig();
      rateLimitManager.updateConfig({ progressiveDelay: false });

      const scenarios = [
        {
          name: 'offline',
          setup: () => {
            Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
            mockSupabaseSignIn.mockRejectedValue(new Error('Network request failed'));
          }
        },
        {
          name: 'slow connection',
          setup: () => {
            Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
            mockSupabaseSignIn.mockImplementation(() => 
              new Promise((_resolve, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 100)
              )
            );
          }
        },
        {
          name: 'intermittent connection',
          setup: () => {
             Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
             let callCount = 0;
             mockSupabaseSignIn.mockImplementation(() => {
               callCount++;
               if (callCount % 2 === 0) {
                 return Promise.resolve({ data: { user: null }, error: new Error('Network error') });
               } else {
                 return Promise.reject(new Error('Connection lost'));
               }
             });
          }
        }
      ];

      for (const scenario of scenarios) {
        // Reset for each scenario
        vi.clearAllMocks();
        await securityStateManager.cleanupExpiredStates();
        await rateLimitManager.cleanupExpiredStates();
        localStorage.clear();
        
        scenario.setup();

        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const getForm = () => screen.getByRole('form');

        const scenarioEmail = `${scenario.name.replace(/\s+/g, '-')}@example.com`;

        await waitFor(() => {
          const b = screen.getByRole('button');
          expect(b).not.toBeDisabled();
        }, { timeout: 10000 });

        await act(async () => {
          fireEvent.change(emailInput, { target: { value: scenarioEmail } });
          fireEvent.change(passwordInput, { target: { value: 'password123' } });
          fireEvent.submit(getForm());
        });

        // Verify error handling for network conditions
        await waitFor(() => {
          expect(mockToastError).toHaveBeenCalledWith(
            expect.stringMatching(/connection|network|error/i)
          );
        }, { timeout: 10000 });

        // Cleanup after each scenario to prevent DOM pollution
        cleanup();
      }

      // Restore configuration
      rateLimitManager.updateConfig(originalConfig);
    });
  });
});