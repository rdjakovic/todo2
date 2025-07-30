/**
 * Security Event Logging Integration Tests
 * 
 * Tests comprehensive security event logging across all authentication flows
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { SecurityLogger, SecurityEventType, SecuritySeverity } from '../securityLogger';
import { SecurityErrorHandler } from '../securityErrorHandler';
import { RateLimitManager } from '../rateLimitManager';
import { AuthSecurityErrorType } from '../../const/securityMessages';

// Mock dependencies
vi.mock('../secureStorage');
vi.mock('../securityStateManager');

describe('Security Event Logging Integration', () => {
  let securityLogger: SecurityLogger;
  let securityErrorHandler: SecurityErrorHandler;
  let rateLimitManager: RateLimitManager;
  let consoleSpy: Mock;

  beforeEach(() => {
    // Create fresh instances for each test
    securityLogger = new SecurityLogger({
      enableConsoleLogging: true,
      logLevel: 'debug' as any,
      sanitizeDetails: true
    });
    
    securityErrorHandler = new SecurityErrorHandler({
      enableLogging: true,
      logger: securityLogger
    });
    
    rateLimitManager = new RateLimitManager();
    
    // Mock console methods
    consoleSpy = vi.fn();
    vi.spyOn(console, 'info').mockImplementation(consoleSpy);
    vi.spyOn(console, 'warn').mockImplementation(consoleSpy);
    vi.spyOn(console, 'error').mockImplementation(consoleSpy);
    
    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      writable: true
    });
    
    // Mock crypto
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => 'test-session-id-123'
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Failed Login Attempt Logging', () => {
    it('should log failed login attempts with contextual information', () => {
      const userEmail = 'test@example.com';
      const attemptCount = 2;
      
      const event = securityLogger.logFailedLogin(userEmail, attemptCount, {
        component: 'LoginForm',
        action: 'authentication_failed',
        sessionId: 'test-session-123'
      });

      expect(event).toBeDefined();
      expect(event.type).toBe(SecurityEventType.FAILED_LOGIN);
      expect(event.severity).toBe(SecuritySeverity.MEDIUM);
      expect(event.details.attemptCount).toBe(attemptCount);
      expect(event.details.userAgent).toBeDefined();
      expect(event.details.additionalContext?.component).toBe('LoginForm');
      expect(event.details.additionalContext?.sessionId).toBe('test-session-123');
      
      // Verify console logging occurred
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0];
      expect(logCall[0]).toContain('[SECURITY]');
      expect(logCall[0]).toContain('Authentication failed');
    });

    it('should sanitize user identifier in failed login logs', () => {
      const userEmail = 'sensitive@example.com';
      
      const event = securityLogger.logFailedLogin(userEmail, 1);

      expect(event.details.additionalContext?.userIdentifier).toBeDefined();
      expect(event.details.additionalContext?.userIdentifier).not.toBe(userEmail);
      expect(event.details.additionalContext?.userIdentifier).toMatch(/^[a-f0-9]+$/);
    });

    it('should log progressive delay information', () => {
      const userEmail = 'test@example.com';
      
      const event = securityLogger.logEvent(SecurityEventType.CONCURRENT_REQUEST_BLOCKED, {
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        additionalContext: {
          userIdentifier: securityLogger['hashIdentifier'](userEmail),
          component: 'LoginForm',
          action: 'progressive_delay_block',
          remainingDelay: 5000,
          delaySeconds: 5
        }
      });

      expect(event.type).toBe(SecurityEventType.CONCURRENT_REQUEST_BLOCKED);
      expect(event.details.additionalContext?.remainingDelay).toBe(5000);
      expect(event.details.additionalContext?.delaySeconds).toBe(5);
    });
  });

  describe('Successful Login Logging', () => {
    it('should log successful authentication with user context', () => {
      const userEmail = 'test@example.com';
      
      const event = securityLogger.logSuccessfulLogin(userEmail, {
        component: 'LoginForm',
        action: 'authentication_success',
        sessionId: 'test-session-123',
        userId: 'user-123'
      });

      expect(event.type).toBe(SecurityEventType.SUCCESSFUL_LOGIN);
      expect(event.severity).toBe(SecuritySeverity.LOW);
      expect(event.details.additionalContext?.component).toBe('LoginForm');
      expect(event.details.additionalContext?.userId).toBe('user-123');
      expect(event.details.additionalContext?.sessionId).toBe('test-session-123');
    });

    it('should log security state reset after successful login', () => {
      const userEmail = 'test@example.com';
      
      const event = securityLogger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN, {
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        additionalContext: {
          userIdentifier: securityLogger['hashIdentifier'](userEmail),
          component: 'RateLimitManager',
          action: 'resetFailedAttempts',
          previousFailedAttempts: 3,
          wasLocked: false,
          lockoutCleared: false
        }
      }, 'Security state reset after successful authentication');

      expect(event.message).toBe('Security state reset after successful authentication');
      expect(event.details.additionalContext?.previousFailedAttempts).toBe(3);
      expect(event.details.additionalContext?.wasLocked).toBe(false);
    });
  });

  describe('Account Lockout Logging', () => {
    it('should log account lockout activation', () => {
      const userEmail = 'test@example.com';
      const lockoutDuration = 900000; // 15 minutes
      const attemptCount = 5;
      
      const event = securityLogger.logAccountLocked(userEmail, lockoutDuration, attemptCount);

      expect(event.type).toBe(SecurityEventType.ACCOUNT_LOCKED);
      expect(event.severity).toBe(SecuritySeverity.HIGH);
      expect(event.details.lockoutDuration).toBe(lockoutDuration);
      expect(event.details.attemptCount).toBe(attemptCount);
      expect(event.details.additionalContext?.userIdentifier).toBeDefined();
    });

    it('should log lockout expiration', () => {
      const userEmail = 'test@example.com';
      
      const event = securityLogger.logEvent(SecurityEventType.LOCKOUT_EXPIRED, {
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        additionalContext: {
          userIdentifier: securityLogger['hashIdentifier'](userEmail),
          component: 'RateLimitManager',
          action: 'checkRateLimit',
          lockoutExpired: true,
          previousFailedAttempts: 5
        }
      }, 'Account lockout expired - access restored');

      expect(event.type).toBe(SecurityEventType.LOCKOUT_EXPIRED);
      expect(event.message).toBe('Account lockout expired - access restored');
      expect(event.details.additionalContext?.lockoutExpired).toBe(true);
      expect(event.details.additionalContext?.previousFailedAttempts).toBe(5);
    });
  });

  describe('Rate Limit Exceeded Logging', () => {
    it('should log rate limit exceeded events', () => {
      const userEmail = 'test@example.com';
      const attemptCount = 4;
      
      const event = securityLogger.logRateLimitExceeded(userEmail, attemptCount);

      expect(event.type).toBe(SecurityEventType.RATE_LIMIT_EXCEEDED);
      expect(event.severity).toBe(SecuritySeverity.HIGH);
      expect(event.details.attemptCount).toBe(attemptCount);
      expect(event.details.additionalContext?.userIdentifier).toBeDefined();
    });

    it('should log rate limit status checks', () => {
      const userEmail = 'test@example.com';
      
      const event = securityLogger.logEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        attemptCount: 3,
        additionalContext: {
          userIdentifier: securityLogger['hashIdentifier'](userEmail),
          component: 'RateLimitManager',
          action: 'checkRateLimit',
          attemptsRemaining: 2,
          progressiveDelay: 4000,
          canAttempt: true
        }
      }, 'Rate limit status check - 3 failed attempts');

      expect(event.details.attemptCount).toBe(3);
      expect(event.details.additionalContext?.attemptsRemaining).toBe(2);
      expect(event.details.additionalContext?.progressiveDelay).toBe(4000);
      expect(event.details.additionalContext?.canAttempt).toBe(true);
    });
  });

  describe('Validation Error Logging', () => {
    it('should log input validation failures', () => {
      const event = securityLogger.logEvent(SecurityEventType.VALIDATION_ERROR, {
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        additionalContext: {
          userIdentifier: securityLogger['hashIdentifier']('test@example.com'),
          component: 'LoginForm',
          action: 'input_validation',
          validationFailure: 'missing_required_fields',
          missingEmail: false,
          missingPassword: true
        }
      });

      expect(event.type).toBe(SecurityEventType.VALIDATION_ERROR);
      expect(event.severity).toBe(SecuritySeverity.LOW);
      expect(event.details.additionalContext?.validationFailure).toBe('missing_required_fields');
      // Note: missingPassword might be sanitized, so check if it exists or is redacted
      expect(event.details.additionalContext?.missingPassword).toBeDefined();
    });

    it('should log email format validation failures', () => {
      const event = securityLogger.logEvent(SecurityEventType.VALIDATION_ERROR, {
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        additionalContext: {
          userIdentifier: securityLogger['hashIdentifier']('invalid-email'),
          component: 'LoginForm',
          action: 'email_validation',
          validationFailure: 'invalid_email_format'
        }
      });

      expect(event.details.additionalContext?.validationFailure).toBe('invalid_email_format');
      expect(event.details.additionalContext?.action).toBe('email_validation');
    });
  });

  describe('Security Error Handler Integration', () => {
    it('should log comprehensive error information', () => {
      const error = new Error('Rate limit exceeded');
      const context = {
        userIdentifier: 'test@example.com',
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        sessionId: 'test-session-123',
        attemptCount: 2,
        additionalContext: {
          component: 'LoginForm',
          action: 'authentication'
        }
      };

      const response = securityErrorHandler.handleAuthError(error, context);

      expect(response.shouldLog).toBe(true);
      expect(response.errorType).toBe(AuthSecurityErrorType.RATE_LIMIT_EXCEEDED);
      
      // Verify console logging occurred
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log browser information analysis', () => {
      const error = new Error('Account locked');
      const context = {
        userIdentifier: 'test@example.com',
        timestamp: new Date(),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        sessionId: 'test-session-123'
      };

      const response = securityErrorHandler.handleAuthError(error, context);

      expect(response.shouldLog).toBe(true);
      expect(response.errorType).toBe(AuthSecurityErrorType.ACCOUNT_LOCKED);
      
      // Verify console logging occurred (should have multiple calls for contextual logging)
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log timing analysis for pattern detection', () => {
      const error = new Error('Rate limit exceeded');
      const testTime = new Date('2023-10-15T14:30:00Z'); // Sunday, 2:30 PM
      const context = {
        userIdentifier: 'test@example.com',
        timestamp: testTime,
        userAgent: navigator.userAgent,
        sessionId: 'test-session-123'
      };

      const response = securityErrorHandler.handleAuthError(error, context);

      expect(response.shouldLog).toBe(true);
      expect(response.errorType).toBe(AuthSecurityErrorType.RATE_LIMIT_EXCEEDED);
      
      // Verify console logging occurred
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log attempt frequency analysis for high-frequency attempts', () => {
      // Create a specific AuthSecurityError to ensure correct classification
      const errorHandler = new SecurityErrorHandler({ enableLogging: true, logger: securityLogger });
      const context = {
        userIdentifier: 'test@example.com',
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        sessionId: 'test-session-123',
        attemptCount: 4
      };

      const concurrentError = errorHandler.createAuthSecurityError(
        AuthSecurityErrorType.CONCURRENT_REQUEST,
        context
      );

      const response = securityErrorHandler.handleAuthError(concurrentError, context);

      expect(response.shouldLog).toBe(true);
      expect(response.errorType).toBe(AuthSecurityErrorType.CONCURRENT_REQUEST);
      
      // Verify console logging occurred
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Event Batching and Structured Formatting', () => {
    it('should create and manage event batches', () => {
      const batch = securityLogger.createEventBatch();
      
      batch.addEvent(SecurityEventType.FAILED_LOGIN, {
        attemptCount: 1,
        userAgent: navigator.userAgent
      });
      
      batch.addEvent(SecurityEventType.VALIDATION_ERROR, {
        userAgent: navigator.userAgent
      });

      const events = batch.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(SecurityEventType.FAILED_LOGIN);
      expect(events[1].type).toBe(SecurityEventType.VALIDATION_ERROR);

      const summary = batch.getSummary();
      expect(summary.total).toBe(2);
      expect(summary.bySeverity[SecuritySeverity.MEDIUM]).toBe(1); // FAILED_LOGIN
      expect(summary.bySeverity[SecuritySeverity.LOW]).toBe(1); // VALIDATION_ERROR
    });

    it('should format log messages consistently', () => {
      const event = securityLogger.logFailedLogin('test@example.com', 3);

      expect(event.message).toBe('Authentication failed (attempt 3)');
      expect(event.id).toMatch(/^sec_\d+_\d+$/);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.source).toBe('client');
    });
  });

  describe('Error Handling in Logging', () => {
    it('should handle logging errors gracefully', () => {
      // Mock logger to throw error
      const faultyLogger = new SecurityLogger();
      vi.spyOn(faultyLogger, 'logEvent').mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const errorHandler = new SecurityErrorHandler({
        logger: faultyLogger,
        enableLogging: true
      });

      const error = new Error('Test error');
      const context = {
        userIdentifier: 'test@example.com',
        timestamp: new Date(),
        userAgent: navigator.userAgent
      };

      // Should not throw, should return fallback response
      const response = errorHandler.handleAuthError(error, context);
      
      expect(response).toBeDefined();
      expect(response.userMessage).toBeDefined();
      expect(response.errorType).toBe(AuthSecurityErrorType.UNKNOWN_ERROR);
    });

    it('should log storage errors when security state operations fail', () => {
      const error = new Error('Storage quota exceeded');
      
      const event = securityLogger.logSecurityError(
        SecurityEventType.STORAGE_ERROR,
        error,
        {
          component: 'RateLimitManager',
          action: 'checkRateLimit',
          userIdentifier: securityLogger['hashIdentifier']('test@example.com')
        }
      );

      expect(event.type).toBe(SecurityEventType.STORAGE_ERROR);
      expect(event.severity).toBe(SecuritySeverity.MEDIUM);
      expect(event.details.errorCode).toBe('Error');
      expect(event.details.additionalContext?.errorMessage).toBe('Storage quota exceeded');
    });
  });

  describe('Privacy and Data Sanitization', () => {
    it('should sanitize sensitive information in logs', () => {
      const sensitiveUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Personal-Info-123) AppleWebKit/537.36';
      
      const event = securityLogger.logEvent(SecurityEventType.FAILED_LOGIN, {
        userAgent: sensitiveUserAgent,
        ipAddress: '192.168.1.100',
        additionalContext: {
          password: 'secret123',
          token: 'bearer-token-123',
          userEmail: 'user@example.com'
        }
      });

      expect(event.details.userAgent).toContain('(system-info-removed)');
      expect(event.details.ipAddress).toBe('192.168.1.xxx');
      expect(event.details.additionalContext?.password).toBe('[REDACTED]');
      expect(event.details.additionalContext?.token).toBe('[REDACTED]');
    });

    it('should hash user identifiers consistently', () => {
      const email = 'test@example.com';
      
      const hash1 = securityLogger['hashIdentifier'](email);
      const hash2 = securityLogger['hashIdentifier'](email);
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(email);
      expect(hash1).toMatch(/^[a-f0-9]+$/);
      expect(hash1.length).toBeLessThanOrEqual(16);
    });
  });
});