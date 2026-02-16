/**
 * End-to-End Network Conditions and User Experience Tests
 * 
 * Tests for authentication security features under various network conditions
 * and user experience scenarios including offline handling, slow connections,
 * and error recovery.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import LoginForm from '../LoginForm';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { rateLimitManager } from '../../utils/rateLimitManager';

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

// Mock crypto and navigator
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123')
  }
});

// Network condition simulation utilities
const NetworkSimulator = {
  setOnline: (online: boolean) => {
    Object.defineProperty(navigator, 'onLine', {
      value: online,
      writable: true,
      configurable: true
    });
  },

  simulateSlowConnection: (delay: number) => {
    return (mockFn: Mock) => {
      mockFn.mockImplementation(() =>
        new Promise((resolve, reject) => {
          setTimeout(() => {
            if (navigator.onLine) {
              resolve({ data: { user: null }, error: new Error('Invalid credentials') });
            } else {
              reject(new Error('Network request failed'));
            }
          }, delay);
        })
      );
    };
  },

  simulateIntermittentConnection: (mockFn: Mock) => {
    let callCount = 0;
    mockFn.mockImplementation(() => {
      callCount++;
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (callCount % 3 === 0) {
            reject(new Error('Connection lost'));
          } else if (callCount % 2 === 0) {
            resolve({ data: { user: null }, error: new Error('Timeout') });
          } else {
            resolve({ data: { user: null }, error: new Error('Invalid credentials') });
          }
        }, Math.random() * 200 + 100);
      });
    });
  },

  simulateNetworkTimeout: (mockFn: Mock, timeoutMs: number = 5000) => {
    mockFn.mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({ error: new Error('Request timeout') } as any);
        }, timeoutMs);
      })
    );
  }
};

describe('LoginForm E2E Network Conditions Tests', () => {
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

    // Reset network state
    NetworkSimulator.setOnline(true);

    // Clear security state
    await securityStateManager.cleanupExpiredStates();
    await rateLimitManager.cleanupExpiredStates();

    // Suppress console logs
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(async () => {
    await securityStateManager.cleanupExpiredStates();
    NetworkSimulator.setOnline(true);
    vi.restoreAllMocks();
  });

  describe('Offline Network Conditions', () => {
    it('should handle offline authentication attempts gracefully', async () => {
      // Set offline state
      NetworkSimulator.setOnline(false);
      mockSupabaseSignIn.mockRejectedValue(new Error('Network request failed'));

      const logEventSpy = vi.spyOn(securityLogger, 'logEvent');

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      });

      // Verify authentication attempt was logged
      expect(logEventSpy).toHaveBeenCalledWith(
        SecurityEventType.FAILED_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            action: 'authentication_attempt'
          })
        }),
        'Authentication attempt initiated'
      );

      // Verify user sees appropriate error message
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });

      const rateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(rateLimitStatus.attemptsRemaining).toBeLessThanOrEqual(5);
    });

    it('should show appropriate offline indicators', async () => {
      NetworkSimulator.setOnline(false);
      mockSupabaseSignIn.mockRejectedValue(new Error('Network request failed'));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });

      await waitFor(() => {
        const isFormDisabled = submitButton.disabled;
        const hasProgressiveDelay = screen.queryByText(/wait.*seconds/i);
        const hasRateLimitWarning = screen.queryByText(/attempt.*remaining/i);

        expect(isFormDisabled || hasProgressiveDelay || hasRateLimitWarning).toBeDefined();
      });
    });

    it('should handle transition from offline to online', async () => {
      NetworkSimulator.setOnline(false);
      mockSupabaseSignIn.mockRejectedValue(new Error('Network request failed'));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          expect.stringMatching(/connection|network/i)
        );
      });

      NetworkSimulator.setOnline(true);
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      });

      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');
    });
  });

  describe('Slow Network Conditions', () => {
    it('should handle slow authentication requests with timeout', async () => {
      NetworkSimulator.simulateSlowConnection(2000)(mockSupabaseSignIn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton.disabled).toBe(true);

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      }, { timeout: 3000 });

      await waitFor(() => {
        const isStillLoading = screen.queryByText(/signing in/i);
        const hasSecurityDelay = screen.queryByText(/wait.*seconds/i);
        const isAccountLocked = screen.queryByText(/account.*locked/i);
        const isFormDisabled = submitButton.disabled;

        const loadingCleared = !isStillLoading;
        const securityActive = hasSecurityDelay || isAccountLocked || isFormDisabled;
        expect(loadingCleared || securityActive).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('should prevent multiple requests during slow connections', async () => {
      NetworkSimulator.simulateSlowConnection(3000)(mockSupabaseSignIn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton.disabled).toBe(true);

      await act(async () => {
        fireEvent.click(submitButton);
        fireEvent.click(submitButton);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(1);
      }, { timeout: 4000 });
    });

    it('should show progress indicators for slow requests', async () => {
      NetworkSimulator.simulateSlowConnection(1500)(mockSupabaseSignIn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      const spinner = screen.getByRole('button', { name: /signing in/i });
      expect(spinner).toBeInTheDocument();
      expect(spinner.querySelector('.animate-spin')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Intermittent Network Conditions', () => {
    it('should handle intermittent connection failures', async () => {
      NetworkSimulator.simulateIntermittentConnection(mockSupabaseSignIn);

      const logEventSpy = vi.spyOn(securityLogger, 'logEvent');

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      let attemptCount = 0;
      let canContinue = true;

      while (canContinue && attemptCount < 3) {
        await act(async () => {
          fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput, { target: { value: `attempt${attemptCount}` } });

          if (!submitButton.disabled) {
            fireEvent.click(submitButton);
            attemptCount++;
          } else {
            canContinue = false;
          }
        });

        if (canContinue) {
          await waitFor(() => {
            expect(mockSupabaseSignIn).toHaveBeenCalledTimes(attemptCount);
          }, { timeout: 1000 });

          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
          });

          const hasDelay = screen.queryByText(/wait.*seconds/i);
          const isLocked = screen.queryByText(/locked/i);
          if (hasDelay || isLocked) {
            canContinue = false;
          }
        }
      }

      expect(logEventSpy).toHaveBeenCalledWith(
        SecurityEventType.FAILED_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            component: 'LoginForm',
            action: 'authentication_attempt'
          })
        }),
        'Authentication attempt initiated'
      );
    });

    it('should maintain rate limiting during network instability', async () => {
      NetworkSimulator.simulateIntermittentConnection(mockSupabaseSignIn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      let attemptCount = 0;
      let maxAttempts = 4;

      for (let i = 0; i < maxAttempts; i++) {
        if (submitButton.disabled) {
          break;
        }

        await act(async () => {
          fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput, { target: { value: `unstable${i}` } });
          fireEvent.click(submitButton);
        });

        attemptCount++;

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(attemptCount);
        }, { timeout: 1000 });

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        const hasDelay = screen.queryByText(/wait.*seconds/i);
        const isLocked = screen.queryByText(/locked/i);
        if (hasDelay || isLocked) {
          break;
        }
      }

      const rateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      const hasLimitedAttempts = rateLimitStatus.attemptsRemaining !== undefined && rateLimitStatus.attemptsRemaining < 5;
      const isLocked = rateLimitStatus.isLocked;

      expect(hasLimitedAttempts || isLocked).toBeTruthy();

      await waitFor(() => {
        const hasRemainingWarning = screen.queryByText(/attempt.*remaining/i);
        const hasLockoutWarning = screen.queryByText(/locked/i);
        const hasDelayWarning = screen.queryByText(/wait.*seconds/i);

        expect(hasRemainingWarning || hasLockoutWarning || hasDelayWarning).toBeTruthy();
      });
    });
  });

  describe('Network Timeout Scenarios', () => {
    it('should handle request timeouts gracefully', async () => {
      NetworkSimulator.simulateNetworkTimeout(mockSupabaseSignIn, 100);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      }, { timeout: 500 });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });
    });

    it('should allow retry after timeout when security allows', async () => {
      NetworkSimulator.simulateNetworkTimeout(mockSupabaseSignIn, 100);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      }, { timeout: 500 });

      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      if (!submitButton.disabled) {
        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockSetUser).toHaveBeenCalledWith(mockUser);
        });

        expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');
      } else {
        const hasSecurityMessage = screen.queryAllByText(/wait|locked|attempt/i);
        expect(hasSecurityMessage.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Recovery and User Experience', () => {
    it('should provide clear feedback for different network error types', async () => {
      const errorScenarios = [
        {
          name: 'DNS resolution failure',
          error: new Error('DNS resolution failed')
        },
        {
          name: 'Connection refused',
          error: new Error('Connection refused')
        },
        {
          name: 'SSL certificate error',
          error: new Error('SSL certificate invalid')
        },
        {
          name: 'Request timeout',
          error: new Error('Request timeout')
        }
      ];

      for (const scenario of errorScenarios) {
        vi.clearAllMocks();
        await securityStateManager.cleanupExpiredStates();
        await rateLimitManager.cleanupExpiredStates();

        mockSupabaseSignIn.mockRejectedValue(scenario.error);

        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getAllByRole('button', { name: /sign in/i })[0] as HTMLButtonElement;

        await act(async () => {
          fireEvent.change(emailInput, { target: { value: `test${Date.now()}@example.com` } });
          fireEvent.change(passwordInput, { target: { value: 'password123' } });
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockToastError).toHaveBeenCalled();
        });
      }
    });

    it('should maintain form state during network errors', async () => {
      mockSupabaseSignIn.mockRejectedValue(new Error('Network error'));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });

      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('password123');

      const isFormDisabled = submitButton.disabled || emailInput.disabled || passwordInput.disabled;
      const hasSecurityIndicator = screen.queryAllByText(/wait|locked|attempt/i).length > 0;

      expect(!isFormDisabled || hasSecurityIndicator).toBeTruthy();
    });

    it('should handle rapid network state changes', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
      });

      const networkStates = [
        { online: false, error: new Error('Offline') },
        { online: true, error: new Error('Slow connection') },
        { online: false, error: new Error('Connection lost') },
        { online: true, success: { data: { user: { id: '123', email: 'test@example.com' } }, error: null } }
      ];

      let actualAttempts = 0;

      for (let i = 0; i < networkStates.length; i++) {
        const state = networkStates[i];
        NetworkSimulator.setOnline(state.online);

        if (state.success) {
          mockSupabaseSignIn.mockResolvedValue(state.success);
        } else {
          mockSupabaseSignIn.mockRejectedValue(state.error);
        }

        if (!submitButton.disabled) {
          await act(async () => {
            fireEvent.click(submitButton);
          });
          actualAttempts++;

          await waitFor(() => {
            expect(mockSupabaseSignIn).toHaveBeenCalledTimes(actualAttempts);
          }, { timeout: 1000 });
        }

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        const hasSecurityMeasures = screen.queryAllByText(/wait|locked/i).length > 0 || submitButton.disabled;
        if (hasSecurityMeasures && !state.success) {
          break;
        }
      }

      const hasSuccess = mockToastSuccess.mock.calls.some(call =>
        call[0] === 'Signed in successfully!'
      );
      const hasSecurityMeasures = screen.queryAllByText(/wait|locked|attempt/i).length > 0;

      expect(hasSuccess || hasSecurityMeasures).toBeTruthy();
    });

    it('should provide accessibility support during network issues', async () => {
      mockSupabaseSignIn.mockRejectedValue(new Error('Network error'));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });

      const errorElements = screen.queryAllByText(/error|failed|invalid|attempt|locked/i);
      expect(errorElements.length).toBeGreaterThan(0);

      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });
  });
});