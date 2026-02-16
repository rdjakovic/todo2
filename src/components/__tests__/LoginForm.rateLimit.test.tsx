/**
 * LoginForm Rate Limiting Integration Tests
 * 
 * Tests the integration of rate limiting functionality into the LoginForm component
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import LoginForm from '../LoginForm';
import { rateLimitManager } from '../../utils/rateLimitManager';
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

describe('LoginForm Rate Limiting Integration', () => {
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
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should check rate limit status when email changes', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(rateLimitManager.checkRateLimit).toHaveBeenCalledWith(mockEmail);
    });
  });

  it('should display lockout countdown when account is locked', async () => {
    const lockoutTime = 300000; // 5 minutes in milliseconds
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: true,
      canAttempt: false,
      attemptsRemaining: 0,
      remainingTime: lockoutTime
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
      expect(screen.getByText(/try again in 5:00/i)).toBeInTheDocument();
    });
  });

  it('should disable form inputs and submit button when account is locked', async () => {
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: true,
      canAttempt: false,
      attemptsRemaining: 0,
      remainingTime: 300000
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(emailInput).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /account locked/i })).toBeDisabled();
    });
  });

  it('should show remaining attempts warning when attempts are low', async () => {
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: false,
      canAttempt: true,
      attemptsRemaining: 2
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(screen.getByText(/2 attempts remaining/i)).toBeInTheDocument();
    });
  });

  it('should prevent form submission when account is locked', async () => {
    // Mock checkRateLimit to return locked status for both initial check and form submission
    (rateLimitManager.checkRateLimit as any)
      .mockResolvedValueOnce({
        isLocked: true,
        canAttempt: false,
        attemptsRemaining: 0,
        remainingTime: 300000
      })
      .mockResolvedValueOnce({
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

    // Wait for the lockout status to be displayed
    await waitFor(() => {
      expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button');

    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    
    await waitFor(() => {
      expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
    });
  });

  it('should increment failed attempts on authentication failure', async () => {
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

    // Submit the form
    await act(async () => {
      fireEvent.submit(screen.getByRole('form'));
    });

    // Wait for the error to be displayed first
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    // Then check that incrementFailedAttempts was called
    expect(rateLimitManager.incrementFailedAttempts).toHaveBeenCalledWith(mockEmail);
  });

  it('should reset failed attempts on successful authentication', async () => {
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
    const submitButton = screen.getByRole('button');

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
      fireEvent.change(passwordInput, { target: { value: mockPassword } });
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(rateLimitManager.resetFailedAttempts).toHaveBeenCalledWith(mockEmail);
    });
  });

  it('should display countdown timer when account is locked', async () => {
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: true,
      canAttempt: false,
      attemptsRemaining: 0,
      remainingTime: 65000 // 1 minute 5 seconds
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    // Wait for countdown to appear
    await waitFor(() => {
      expect(screen.getByText(/try again in 1:05/i)).toBeInTheDocument();
    });
  });

  it('should call checkRateLimit when email changes', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(rateLimitManager.checkRateLimit).toHaveBeenCalledWith(mockEmail);
    });
  });

  it('should add state change listeners when email is set', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    // Wait for the effect to run
    await waitFor(() => {
      expect(rateLimitManager.addStateChangeListener).toHaveBeenCalledWith(
        mockEmail,
        expect.any(Function)
      );
    });
  });

  it('should handle rate limit check errors gracefully', async () => {
    (rateLimitManager.checkRateLimit as any).mockRejectedValue(new Error('Storage error'));

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    // Should not crash and should show sign in button
    const submitButton = screen.getByRole('button');
    expect(submitButton).toHaveTextContent(/sign in/i);
    expect(submitButton).not.toBeDisabled();
  });

  it('should display correct button text based on lock status', async () => {
    // Mock locked state
    (rateLimitManager.checkRateLimit as any).mockResolvedValue({
      isLocked: true,
      canAttempt: false,
      attemptsRemaining: 0,
      remainingTime: 300000
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: mockEmail } });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /account locked/i })).toBeInTheDocument();
    });
  });
});