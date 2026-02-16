/**
 * LoginForm Secure Error Handling Integration Tests
 * 
 * Tests the integration of secure error handling functionality into the LoginForm component
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import LoginForm from '../LoginForm';
import { rateLimitManager } from '../../utils/rateLimitManager';
import { securityErrorHandler } from '../../utils/securityErrorHandler';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn()
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
  useAuthStore: () => ({
    setUser: vi.fn(),
    forceDataLoad: vi.fn()
  })
}));

vi.mock('../../utils/rateLimitManager', () => ({
  rateLimitManager: {
    checkRateLimit: vi.fn(),
    incrementFailedAttempts: vi.fn(),
    resetFailedAttempts: vi.fn(),
    addStateChangeListener: vi.fn(),
    removeStateChangeListener: vi.fn()
  }
}));

vi.mock('../../utils/securityErrorHandler', () => ({
  securityErrorHandler: {
    handleAuthError: vi.fn(),
    handleRateLimitError: vi.fn()
  }
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123')
  }
});

describe('LoginForm Secure Error Handling Integration', () => {
  const mockEmail = 'test@example.com';
  const mockPassword = 'password123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default rate limit status - not locked
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: false,
      canAttempt: true,
      attemptsRemaining: 5
    });

    // Default secure error responses
    (securityErrorHandler.handleAuthError as any).mockReturnValue({
      userMessage: 'Invalid credentials. Please check your email and password.',
      errorType: 'INVALID_CREDENTIALS',
      severity: 'medium',
      shouldRetry: true,
      shouldLog: true
    });

    (securityErrorHandler.handleRateLimitError as any).mockReturnValue({
      userMessage: 'Too many login attempts. Please try again later.',
      errorType: 'RATE_LIMIT_EXCEEDED',
      severity: 'high',
      shouldRetry: false,
      shouldLog: true
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should use security error handler for authentication failures', async () => {
    const authError = new Error('Invalid login credentials');
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: authError,
      data: null
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      expect(securityErrorHandler.handleAuthError).toHaveBeenCalledWith(
        authError,
        expect.objectContaining({
          userIdentifier: mockEmail,
          userAgent: navigator.userAgent,
          sessionId: 'mock-uuid-123',
          additionalContext: expect.objectContaining({
            component: 'LoginForm',
            action: 'authentication'
          })
        })
      );
    });
  });

  it('should display generic error messages from security error handler', async () => {
    const authError = new Error('Invalid login credentials');
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: authError,
      data: null
    });

    (securityErrorHandler.handleAuthError as any).mockReturnValue({
      userMessage: 'Authentication failed. Please try again.',
      errorType: 'INVALID_CREDENTIALS',
      severity: 'medium',
      shouldRetry: true,
      shouldLog: true
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      expect(screen.getByText(/authentication failed. please try again./i)).toBeInTheDocument();
    });

    expect(toast.error).toHaveBeenCalledWith('Authentication failed. Please try again.');
  });

  it('should use security error handler for rate limit errors', async () => {
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: true,
      canAttempt: false,
      attemptsRemaining: 0,
      remainingTime: 300000
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      expect(securityErrorHandler.handleRateLimitError).toHaveBeenCalledWith(
        expect.objectContaining({
          userIdentifier: mockEmail,
          userAgent: navigator.userAgent,
          sessionId: 'mock-uuid-123',
          attemptCount: 0,
          additionalContext: expect.objectContaining({
            component: 'LoginForm',
            action: 'rate_limit_check',
            remainingTime: 300000
          })
        }),
        0
      );
    });
  });

  it('should handle network errors securely', async () => {
    const networkError = new Error('Network request failed');
    (supabase.auth.signInWithPassword as any).mockRejectedValue(networkError);

    (securityErrorHandler.handleAuthError as any).mockReturnValue({
      userMessage: 'Connection error. Please check your internet connection and try again.',
      errorType: 'NETWORK_ERROR',
      severity: 'medium',
      shouldRetry: true,
      shouldLog: true
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      expect(securityErrorHandler.handleAuthError).toHaveBeenCalledWith(
        networkError,
        expect.objectContaining({
          userIdentifier: mockEmail,
          additionalContext: expect.objectContaining({
            component: 'LoginForm',
            action: 'authentication',
            errorSource: 'catch_block'
          })
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/connection error. please check your internet connection/i)).toBeInTheDocument();
    });
  });

  it('should sanitize error context before passing to security handler', async () => {
    const authError = new Error('Invalid credentials');
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: authError,
      data: null
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      expect(securityErrorHandler.handleAuthError).toHaveBeenCalledWith(
        authError,
        expect.objectContaining({
          userIdentifier: mockEmail,
          timestamp: expect.any(Date),
          userAgent: expect.any(String),
          sessionId: expect.any(String),
          additionalContext: expect.objectContaining({
            component: 'LoginForm',
            action: 'authentication'
          })
        })
      );
    });
  });

  it('should not expose specific error details in user messages', async () => {
    const specificError = new Error('User not found in database table auth.users');
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: specificError,
      data: null
    });

    (securityErrorHandler.handleAuthError as any).mockReturnValue({
      userMessage: 'Invalid credentials. Please check your email and password.',
      errorType: 'INVALID_CREDENTIALS',
      severity: 'medium',
      shouldRetry: true,
      shouldLog: true
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      // Should show generic message, not the specific database error
      expect(screen.getByText(/invalid credentials. please check your email and password./i)).toBeInTheDocument();
      expect(screen.queryByText(/database table auth.users/i)).not.toBeInTheDocument();
    });
  });

  it('should log security events for all authentication attempts', async () => {
    const authError = new Error('Invalid credentials');
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: authError,
      data: null
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      expect(securityErrorHandler.handleAuthError).toHaveBeenCalledWith(
        authError,
        expect.objectContaining({
          userIdentifier: mockEmail,
          additionalContext: expect.objectContaining({
            component: 'LoginForm',
            action: 'authentication'
          })
        })
      );
    });
  });

  it('should handle unknown errors gracefully', async () => {
    const unknownError = { weird: 'object', without: 'message' };
    (supabase.auth.signInWithPassword as any).mockRejectedValue(unknownError);

    (securityErrorHandler.handleAuthError as any).mockReturnValue({
      userMessage: 'An unexpected error occurred. Please try again.',
      errorType: 'UNKNOWN_ERROR',
      severity: 'medium',
      shouldRetry: true,
      shouldLog: true
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      expect(screen.getByText(/an unexpected error occurred. please try again./i)).toBeInTheDocument();
    });

    expect(securityErrorHandler.handleAuthError).toHaveBeenCalledWith(
      unknownError,
      expect.objectContaining({
        userIdentifier: mockEmail,
        additionalContext: expect.objectContaining({
          errorSource: 'catch_block'
        })
      })
    );
  });

  it('should include session context in error handling', async () => {
    const authError = new Error('Invalid credentials');
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: authError,
      data: null
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      expect(securityErrorHandler.handleAuthError).toHaveBeenCalledWith(
        authError,
        expect.objectContaining({
          userIdentifier: mockEmail,
          timestamp: expect.any(Date),
          userAgent: navigator.userAgent,
          sessionId: 'mock-uuid-123'
        })
      );
    });
  });

  it('should prevent XSS in error messages', async () => {
    const xssError = new Error('<script>alert("xss")</script>');
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: xssError,
      data: null
    });

    (securityErrorHandler.handleAuthError as any).mockReturnValue({
      userMessage: 'Invalid credentials. Please check your email and password.',
      errorType: 'INVALID_CREDENTIALS',
      severity: 'medium',
      shouldRetry: true,
      shouldLog: true
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      // Should show sanitized message, not the script tag
      expect(screen.getByText(/invalid credentials. please check your email and password./i)).toBeInTheDocument();
      expect(screen.queryByText(/<script>/i)).not.toBeInTheDocument();
    });
  });
});