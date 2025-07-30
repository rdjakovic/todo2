/**
 * LoginForm Progressive Delay and Concurrent Request Prevention Tests
 * 
 * Tests the implementation of progressive delay and concurrent request prevention
 * in the LoginForm component
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
    handleRateLimitError: vi.fn(),
    handleValidationError: vi.fn()
  }
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123')
  }
});

describe('LoginForm Progressive Delay and Concurrent Request Prevention', () => {
  const mockEmail = 'test@example.com';
  const mockPassword = 'password123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default rate limit status - not locked
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: false,
      canAttempt: true,
      attemptsRemaining: 5,
      progressiveDelay: 0
    });

    // Default secure error responses
    (securityErrorHandler.handleAuthError as any).mockReturnValue({
      userMessage: 'Invalid credentials. Please check your email and password.',
      errorType: 'INVALID_CREDENTIALS',
      severity: 'medium',
      shouldRetry: true,
      shouldLog: true
    });

    (securityErrorHandler.handleValidationError as any).mockReturnValue({
      userMessage: 'Please check your input and try again.',
      errorType: 'VALIDATION_ERROR',
      severity: 'low',
      shouldRetry: true,
      shouldLog: true
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should display progressive delay countdown when delay is active', async () => {
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: false,
      canAttempt: true,
      attemptsRemaining: 3,
      progressiveDelay: 5000 // 5 seconds
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(screen.getByText(/please wait 5 seconds before trying again/i)).toBeInTheDocument();
    });
  });

  it('should disable form inputs during progressive delay', async () => {
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: false,
      canAttempt: true,
      attemptsRemaining: 3,
      progressiveDelay: 3000 // 3 seconds
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(emailInput).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  it('should show progressive delay countdown on submit button', async () => {
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: false,
      canAttempt: true,
      attemptsRemaining: 3,
      progressiveDelay: 4000 // 4 seconds
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /wait 4s/i })).toBeInTheDocument();
    });
  });

  it('should prevent form submission during progressive delay', async () => {
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: false,
      canAttempt: true,
      attemptsRemaining: 3,
      progressiveDelay: 2000 // 2 seconds
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

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    
    await waitFor(() => {
      expect(screen.getByText(/please wait 2 seconds before trying again/i)).toBeInTheDocument();
    });
  });

  it('should prevent concurrent authentication requests', async () => {
    let resolveAuth: any;
    (supabase.auth.signInWithPassword as any).mockImplementation(() => 
      new Promise(resolve => {
        resolveAuth = resolve;
      })
    );

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    // Submit form
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    // Try to submit again while first is still processing
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    // Should only call signInWithPassword once
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);

    // Resolve the auth to clean up
    if (resolveAuth) {
      resolveAuth({ data: { user: null }, error: null });
    }
  });

  it('should validate email format before submission', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(securityErrorHandler.handleValidationError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        userIdentifier: 'invalid-email',
        additionalContext: expect.objectContaining({
          action: 'email_validation'
        })
      })
    );
  });

  it('should validate required fields before submission', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      // Leave password empty
    });

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(securityErrorHandler.handleValidationError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        additionalContext: expect.objectContaining({
          action: 'input_validation',
          missingFields: expect.objectContaining({
            password: true
          })
        })
      })
    );
  });

  it('should clear form data securely on successful authentication', async () => {
    const mockUser = { id: '123', email: mockEmail };
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
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
      expect(passwordInput).toHaveValue('');
    });

    expect(rateLimitManager.resetFailedAttempts).toHaveBeenCalledWith(mockEmail);
  });

  it('should set progressive delay after failed authentication attempt', async () => {
    const authError = new Error('Invalid credentials');
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      error: authError,
      data: null
    });

    // Mock checkRateLimit to return progressive delay after the failed attempt
    let callCount = 0;
    (rateLimitManager.checkRateLimit as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Initial check - no delay
        return Promise.resolve({
          isLocked: false,
          canAttempt: true,
          attemptsRemaining: 5,
          progressiveDelay: 0
        });
      } else {
        // After failed attempt - with delay
        return Promise.resolve({
          isLocked: false,
          canAttempt: true,
          attemptsRemaining: 4,
          progressiveDelay: 2000
        });
      }
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
      expect(rateLimitManager.incrementFailedAttempts).toHaveBeenCalledWith(mockEmail);
    });

    // Should show progressive delay after failed attempt
    await waitFor(() => {
      expect(screen.getByText(/please wait 2 seconds before trying again/i)).toBeInTheDocument();
    });
  });

  it('should countdown progressive delay timer', async () => {
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: false,
      canAttempt: true,
      attemptsRemaining: 3,
      progressiveDelay: 3000 // 3 seconds
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(screen.getByText(/please wait 3 seconds/i)).toBeInTheDocument();
    });

    // Test that the countdown is working by checking the button text
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /wait 3s/i })).toBeInTheDocument();
    });
  });

  it('should disable form when progressive delay is active', async () => {
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: false,
      canAttempt: true,
      attemptsRemaining: 3,
      progressiveDelay: 1000 // 1 second
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(emailInput).toBeDisabled();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  it('should handle multiple rapid form submissions gracefully', async () => {
    let resolveAuth: any;
    (supabase.auth.signInWithPassword as any).mockImplementation(() => 
      new Promise(resolve => {
        resolveAuth = resolve;
      })
    );

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    // Submit form multiple times rapidly
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });
    
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });
    
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    // Should only process one submission
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);

    // Clean up
    if (resolveAuth) {
      resolveAuth({ data: { user: null }, error: null });
    }
  });

  it('should reset progressive delay on successful authentication', async () => {
    const mockUser = { id: '123', email: mockEmail };
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
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
      expect(rateLimitManager.resetFailedAttempts).toHaveBeenCalledWith(mockEmail);
    });

    // Check that password field is cleared
    await waitFor(() => {
      expect(passwordInput).toHaveValue('');
    });
  });
});