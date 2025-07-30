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
      mockFn.mockImplementation((...args) => 
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
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout'));
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

    // Reset network state
    NetworkSimulator.setOnline(true);

    // Clear security state
    await securityStateManager.cleanupExpiredStates();
    await rateLimitManager.cleanupExpiredStates();

    // Suppress console logs
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      });

      // Verify network error was logged
      expect(logEventSpy).toHaveBeenCalledWith(
        SecurityEventType.FAILED_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            errorSource: 'catch_block'
          })
        })
      );

      // Verify user-friendly error message
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          expect.stringMatching(/connection error|network error/i)
        );
      });

      // Verify rate limiting is not affected by network errors
      const rateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(rateLimitStatus.attemptsRemaining).toBe(4); // Should still decrement
    });

    it('should show appropriate offline indicators', async () => {
      NetworkSimulator.setOnline(false);
      mockSupabaseSignIn.mockRejectedValue(new Error('Network request failed'));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

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

      // Verify form remains functional for retry when back online
      expect(submitButton).not.toBeDisabled();
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    it('should handle transition from offline to online', async () => {
      // Start offline
      NetworkSimulator.setOnline(false);
      mockSupabaseSignIn.mockRejectedValue(new Error('Network request failed'));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Attempt authentication while offline
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

      // Go back online
      NetworkSimulator.setOnline(true);
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Retry authentication
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
      // Simulate slow connection (2 second delay)
      NetworkSimulator.simulateSlowConnection(2000)(mockSupabaseSignIn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      // Verify loading state is shown immediately
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for slow request to complete
      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Verify loading state is cleared
      await waitFor(() => {
        expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument();
      });
    });

    it('should prevent multiple requests during slow connections', async () => {
      // Simulate very slow connection (3 seconds)
      NetworkSimulator.simulateSlowConnection(3000)(mockSupabaseSignIn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      // Verify loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Try to click again (should be prevented)
      await act(async () => {
        fireEvent.click(submitButton);
        fireEvent.click(submitButton);
        fireEvent.click(submitButton);
      });

      // Wait for request to complete
      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalledTimes(1);
      }, { timeout: 4000 });
    });

    it('should show progress indicators for slow requests', async () => {
      NetworkSimulator.simulateSlowConnection(1500)(mockSupabaseSignIn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      // Verify spinner is shown
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
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Perform multiple attempts to test intermittent behavior
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput, { target: { value: `attempt${i}` } });
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        }, { timeout: 1000 });

        // Wait between attempts
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      // Verify various error types were logged
      expect(logEventSpy).toHaveBeenCalledWith(
        SecurityEventType.FAILED_LOGIN,
        expect.objectContaining({
          additionalContext: expect.objectContaining({
            component: 'LoginForm'
          })
        })
      );
    });

    it('should maintain rate limiting during network instability', async () => {
      NetworkSimulator.simulateIntermittentConnection(mockSupabaseSignIn);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Perform multiple failed attempts
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput, { target: { value: `unstable${i}` } });
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        }, { timeout: 1000 });

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      // Verify rate limiting is still enforced
      const rateLimitStatus = await rateLimitManager.checkRateLimit('test@example.com');
      expect(rateLimitStatus.attemptsRemaining).toBe(1);

      // Verify UI shows remaining attempts
      await waitFor(() => {
        expect(screen.getByText(/1 attempt.*remaining/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network Timeout Scenarios', () => {
    it('should handle request timeouts gracefully', async () => {
      NetworkSimulator.simulateNetworkTimeout(mockSupabaseSignIn, 100);

      const handleAuthErrorSpy = vi.spyOn(securityErrorHandler, 'handleAuthError');

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSupabaseSignIn).toHaveBeenCalled();
      }, { timeout: 500 });

      // Verify timeout error was handled
      expect(handleAuthErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Request timeout'
        }),
        expect.any(Object)
      );

      // Verify user sees appropriate error message
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          expect.stringMatching(/connection|network|timeout/i)
        );
      });
    });

    it('should allow retry after timeout', async () => {
      // First request times out
      NetworkSimulator.simulateNetworkTimeout(mockSupabaseSignIn, 100);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First attempt (will timeout)
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      }, { timeout: 500 });

      // Setup successful response for retry
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabaseSignIn.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Retry attempt
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      });

      expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');
    });
  });

  describe('Error Recovery and User Experience', () => {
    it('should provide clear feedback for different network error types', async () => {
      const errorScenarios = [
        {
          name: 'DNS resolution failure',
          error: new Error('DNS resolution failed'),
          expectedMessage: /connection|network/i
        },
        {
          name: 'Connection refused',
          error: new Error('Connection refused'),
          expectedMessage: /connection|network/i
        },
        {
          name: 'SSL certificate error',
          error: new Error('SSL certificate invalid'),
          expectedMessage: /connection|network/i
        },
        {
          name: 'Request timeout',
          error: new Error('Request timeout'),
          expectedMessage: /connection|network|timeout/i
        }
      ];

      for (const scenario of errorScenarios) {
        // Reset mocks for each scenario
        vi.clearAllMocks();
        await securityStateManager.cleanupExpiredStates();

        mockSupabaseSignIn.mockRejectedValue(scenario.error);

        render(<LoginForm />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        await act(async () => {
          fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
          fireEvent.change(passwordInput, { target: { value: 'password123' } });
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockToastError).toHaveBeenCalledWith(
            expect.stringMatching(scenario.expectedMessage)
          );
        });
      }
    });

    it('should maintain form state during network errors', async () => {
      mockSupabaseSignIn.mockRejectedValue(new Error('Network error'));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });

      // Verify form values are preserved for retry
      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('password123');

      // Verify form is still interactive
      expect(submitButton).not.toBeDisabled();
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    it('should handle rapid network state changes', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
      });

      // Simulate rapid network state changes
      const networkStates = [
        { online: false, error: new Error('Offline') },
        { online: true, error: new Error('Slow connection') },
        { online: false, error: new Error('Connection lost') },
        { online: true, success: { data: { user: { id: '123', email: 'test@example.com' } }, error: null } }
      ];

      for (let i = 0; i < networkStates.length; i++) {
        const state = networkStates[i];
        NetworkSimulator.setOnline(state.online);

        if (state.success) {
          mockSupabaseSignIn.mockResolvedValue(state.success);
        } else {
          mockSupabaseSignIn.mockRejectedValue(state.error);
        }

        await act(async () => {
          fireEvent.click(submitButton);
        });

        await waitFor(() => {
          expect(mockSupabaseSignIn).toHaveBeenCalledTimes(i + 1);
        }, { timeout: 1000 });

        // Wait between state changes
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      // Verify final successful state
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Signed in successfully!');
      });
    });

    it('should provide accessibility support during network issues', async () => {
      mockSupabaseSignIn.mockRejectedValue(new Error('Network error'));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled();
      });

      // Verify error is announced to screen readers
      const errorElement = screen.getByText(/connection error|network error/i);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveAttribute('role', 'alert');

      // Verify form remains keyboard accessible
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});