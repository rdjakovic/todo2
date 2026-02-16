/**
 * Security Messages Tests
 * 
 * Tests for error message consistency, type definitions,
 * and security message utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  AuthSecurityErrorType,
  ErrorSeverity,
  SECURITY_ERROR_MESSAGES,
  FALLBACK_ERROR_MESSAGE,
  SYSTEM_UNAVAILABLE_MESSAGE,
  SUCCESS_MESSAGES,
  VALIDATION_MESSAGES,
  SECURITY_EVENT_DESCRIPTIONS,
  getErrorConfig,
  shouldLogSecurityEvent,
  getUserMessage,
  getLogMessage,
  getErrorSeverity
} from '../securityMessages';

describe('Security Messages', () => {
  describe('Error Type Definitions', () => {
    it('should have all required error types defined', () => {
      const expectedTypes = [
        'RATE_LIMIT_EXCEEDED',
        'ACCOUNT_LOCKED',
        'INVALID_CREDENTIALS',
        'NETWORK_ERROR',
        'VALIDATION_ERROR',
        'STORAGE_ERROR',
        'ENCRYPTION_ERROR',
        'CONCURRENT_REQUEST',
        'UNKNOWN_ERROR'
      ];

      expectedTypes.forEach(type => {
        expect(Object.values(AuthSecurityErrorType)).toContain(type);
      });
    });

    it('should have all severity levels defined', () => {
      const expectedSeverities = ['low', 'medium', 'high', 'critical'];

      expectedSeverities.forEach(severity => {
        expect(Object.values(ErrorSeverity)).toContain(severity);
      });
    });
  });

  describe('Security Error Messages', () => {
    it('should have error messages for all error types', () => {
      Object.values(AuthSecurityErrorType).forEach(errorType => {
        expect(SECURITY_ERROR_MESSAGES).toHaveProperty(errorType);
        
        const config = SECURITY_ERROR_MESSAGES[errorType];
        expect(config).toHaveProperty('userMessage');
        expect(config).toHaveProperty('logMessage');
        expect(config).toHaveProperty('severity');
        expect(config).toHaveProperty('shouldRetry');
        
        expect(typeof config.userMessage).toBe('string');
        expect(typeof config.logMessage).toBe('string');
        expect(Object.values(ErrorSeverity)).toContain(config.severity);
        expect(typeof config.shouldRetry).toBe('boolean');
      });
    });

    it('should have consistent generic messages for security-sensitive errors', () => {
      const securitySensitiveErrors = [
        AuthSecurityErrorType.RATE_LIMIT_EXCEEDED,
        AuthSecurityErrorType.ACCOUNT_LOCKED
      ];

      securitySensitiveErrors.forEach(errorType => {
        const config = SECURITY_ERROR_MESSAGES[errorType];
        expect(config.userMessage).toBe("Too many login attempts. Please try again later.");
      });
    });

    it('should not reveal sensitive information in user messages', () => {
      Object.values(SECURITY_ERROR_MESSAGES).forEach(config => {
        const message = config.userMessage.toLowerCase();
        
        // Should not contain sensitive technical details
        expect(message).not.toContain('database');
        expect(message).not.toContain('server');
        expect(message).not.toContain('internal');
        expect(message).not.toContain('exception');
        expect(message).not.toContain('stack');
        expect(message).not.toContain('debug');
        
        // Should not reveal specific timing information
        expect(message).not.toMatch(/\d+\s*(minute|second|hour)/);
      });
    });

    it('should have appropriate retry delays for retryable errors', () => {
      Object.entries(SECURITY_ERROR_MESSAGES).forEach(([_errorType, config]) => {
        if (config.shouldRetry && config.retryDelay) {
          expect(config.retryDelay).toBeGreaterThan(0);
          
          // High-security errors should have longer delays
          if (config.severity === ErrorSeverity.HIGH || config.severity === ErrorSeverity.CRITICAL) {
            expect(config.retryDelay).toBeGreaterThanOrEqual(60000); // At least 1 minute
          }
        }
      });
    });

    it('should have proper severity classification', () => {
      // Critical security events
      expect(SECURITY_ERROR_MESSAGES[AuthSecurityErrorType.ENCRYPTION_ERROR].severity)
        .toBe(ErrorSeverity.HIGH);
      
      // High-security events
      expect(SECURITY_ERROR_MESSAGES[AuthSecurityErrorType.RATE_LIMIT_EXCEEDED].severity)
        .toBe(ErrorSeverity.HIGH);
      expect(SECURITY_ERROR_MESSAGES[AuthSecurityErrorType.ACCOUNT_LOCKED].severity)
        .toBe(ErrorSeverity.HIGH);
      
      // Medium-security events
      expect(SECURITY_ERROR_MESSAGES[AuthSecurityErrorType.INVALID_CREDENTIALS].severity)
        .toBe(ErrorSeverity.MEDIUM);
      expect(SECURITY_ERROR_MESSAGES[AuthSecurityErrorType.STORAGE_ERROR].severity)
        .toBe(ErrorSeverity.MEDIUM);
      
      // Low-security events
      expect(SECURITY_ERROR_MESSAGES[AuthSecurityErrorType.NETWORK_ERROR].severity)
        .toBe(ErrorSeverity.LOW);
      expect(SECURITY_ERROR_MESSAGES[AuthSecurityErrorType.VALIDATION_ERROR].severity)
        .toBe(ErrorSeverity.LOW);
    });
  });

  describe('Fallback and System Messages', () => {
    it('should have proper fallback error message', () => {
      expect(FALLBACK_ERROR_MESSAGE).toHaveProperty('userMessage');
      expect(FALLBACK_ERROR_MESSAGE).toHaveProperty('logMessage');
      expect(FALLBACK_ERROR_MESSAGE).toHaveProperty('severity');
      expect(FALLBACK_ERROR_MESSAGE).toHaveProperty('shouldRetry');
      
      expect(FALLBACK_ERROR_MESSAGE.userMessage).toBe("An unexpected error occurred. Please try again.");
      expect(FALLBACK_ERROR_MESSAGE.severity).toBe(ErrorSeverity.MEDIUM);
      expect(FALLBACK_ERROR_MESSAGE.shouldRetry).toBe(true);
    });

    it('should have proper system unavailable message', () => {
      expect(SYSTEM_UNAVAILABLE_MESSAGE).toHaveProperty('userMessage');
      expect(SYSTEM_UNAVAILABLE_MESSAGE).toHaveProperty('logMessage');
      expect(SYSTEM_UNAVAILABLE_MESSAGE).toHaveProperty('severity');
      expect(SYSTEM_UNAVAILABLE_MESSAGE).toHaveProperty('shouldRetry');
      
      expect(SYSTEM_UNAVAILABLE_MESSAGE.severity).toBe(ErrorSeverity.HIGH);
      expect(SYSTEM_UNAVAILABLE_MESSAGE.shouldRetry).toBe(true);
      expect(SYSTEM_UNAVAILABLE_MESSAGE.retryDelay).toBeGreaterThan(60000); // At least 1 minute
    });
  });

  describe('Success Messages', () => {
    it('should have all required success messages', () => {
      expect(SUCCESS_MESSAGES).toHaveProperty('LOGIN_SUCCESS');
      expect(SUCCESS_MESSAGES).toHaveProperty('LOGOUT_SUCCESS');
      expect(SUCCESS_MESSAGES).toHaveProperty('ACCOUNT_UNLOCKED');
      
      Object.values(SUCCESS_MESSAGES).forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Validation Messages', () => {
    it('should have all required validation messages', () => {
      const expectedValidationMessages = [
        'EMAIL_REQUIRED',
        'EMAIL_INVALID',
        'PASSWORD_REQUIRED',
        'PASSWORD_TOO_SHORT',
        'FORM_INCOMPLETE'
      ];

      expectedValidationMessages.forEach(key => {
        expect(VALIDATION_MESSAGES).toHaveProperty(key);
        expect(typeof VALIDATION_MESSAGES[key as keyof typeof VALIDATION_MESSAGES]).toBe('string');
      });
    });

    it('should have user-friendly validation messages', () => {
      Object.values(VALIDATION_MESSAGES).forEach(message => {
        expect(message).not.toContain('null');
        expect(message).not.toContain('undefined');
        expect(message).not.toContain('error');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Security Event Descriptions', () => {
    it('should have descriptions for all error types', () => {
      Object.values(AuthSecurityErrorType).forEach(errorType => {
        expect(SECURITY_EVENT_DESCRIPTIONS).toHaveProperty(errorType);
        
        const description = SECURITY_EVENT_DESCRIPTIONS[errorType];
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive and professional event descriptions', () => {
      Object.values(SECURITY_EVENT_DESCRIPTIONS).forEach(description => {
        // Should be descriptive
        expect(description.length).toBeGreaterThan(10);
        
        // Should not contain casual language
        expect(description.toLowerCase()).not.toContain('oops');
        expect(description.toLowerCase()).not.toContain('whoops');
        expect(description.toLowerCase()).not.toContain('uh oh');
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getErrorConfig', () => {
      it('should return correct config for valid error types', () => {
        Object.values(AuthSecurityErrorType).forEach(errorType => {
          const config = getErrorConfig(errorType);
          
          expect(config).toHaveProperty('userMessage');
          expect(config).toHaveProperty('logMessage');
          expect(config).toHaveProperty('severity');
          expect(config).toHaveProperty('shouldRetry');
          
          expect(config).toEqual(SECURITY_ERROR_MESSAGES[errorType]);
        });
      });

      it('should return fallback config for invalid error types', () => {
        const invalidType = 'INVALID_TYPE' as AuthSecurityErrorType;
        const config = getErrorConfig(invalidType);
        
        expect(config).toEqual(FALLBACK_ERROR_MESSAGE);
      });
    });

    describe('shouldLogSecurityEvent', () => {
      it('should return true for high-security events', () => {
        const highSecurityEvents = [
          AuthSecurityErrorType.RATE_LIMIT_EXCEEDED,
          AuthSecurityErrorType.ACCOUNT_LOCKED,
          AuthSecurityErrorType.ENCRYPTION_ERROR,
          AuthSecurityErrorType.CONCURRENT_REQUEST
        ];

        highSecurityEvents.forEach(eventType => {
          expect(shouldLogSecurityEvent(eventType)).toBe(true);
        });
      });

      it('should return false for low-security events', () => {
        const lowSecurityEvents = [
          AuthSecurityErrorType.VALIDATION_ERROR,
          AuthSecurityErrorType.NETWORK_ERROR
        ];

        lowSecurityEvents.forEach(eventType => {
          expect(shouldLogSecurityEvent(eventType)).toBe(false);
        });
      });
    });

    describe('getUserMessage', () => {
      it('should return correct user messages', () => {
        Object.values(AuthSecurityErrorType).forEach(errorType => {
          const message = getUserMessage(errorType);
          const expectedMessage = SECURITY_ERROR_MESSAGES[errorType]?.userMessage || FALLBACK_ERROR_MESSAGE.userMessage;
          
          expect(message).toBe(expectedMessage);
        });
      });
    });

    describe('getLogMessage', () => {
      it('should return correct log messages', () => {
        Object.values(AuthSecurityErrorType).forEach(errorType => {
          const message = getLogMessage(errorType);
          const expectedMessage = SECURITY_ERROR_MESSAGES[errorType]?.logMessage || FALLBACK_ERROR_MESSAGE.logMessage;
          
          expect(message).toBe(expectedMessage);
        });
      });
    });

    describe('getErrorSeverity', () => {
      it('should return correct severity levels', () => {
        Object.values(AuthSecurityErrorType).forEach(errorType => {
          const severity = getErrorSeverity(errorType);
          const expectedSeverity = SECURITY_ERROR_MESSAGES[errorType]?.severity || FALLBACK_ERROR_MESSAGE.severity;
          
          expect(severity).toBe(expectedSeverity);
          expect(Object.values(ErrorSeverity)).toContain(severity);
        });
      });
    });
  });

  describe('Message Consistency', () => {
    it('should have consistent message formatting', () => {
      Object.values(SECURITY_ERROR_MESSAGES).forEach(config => {
        // User messages should end with period
        expect(config.userMessage).toMatch(/\.$/);
        
        // User messages should start with capital letter
        expect(config.userMessage).toMatch(/^[A-Z]/);
        
        // Log messages should not end with period (for consistency with logging)
        expect(config.logMessage).not.toMatch(/\.$/);
      });
    });

    it('should have appropriate message lengths', () => {
      Object.values(SECURITY_ERROR_MESSAGES).forEach(config => {
        // User messages should be concise but informative
        expect(config.userMessage.length).toBeGreaterThan(10);
        expect(config.userMessage.length).toBeLessThan(200);
        
        // Log messages should be descriptive
        expect(config.logMessage.length).toBeGreaterThan(5);
        expect(config.logMessage.length).toBeLessThan(150);
      });
    });

    it('should not have duplicate user messages for different error types', () => {
      const userMessages = Object.values(SECURITY_ERROR_MESSAGES).map(config => config.userMessage);
      const uniqueMessages = [...new Set(userMessages)];
      
      // Allow some duplication for security-sensitive errors (rate limit and account locked)
      expect(uniqueMessages.length).toBeGreaterThanOrEqual(userMessages.length - 1);
    });
  });

  describe('Security Considerations', () => {
    it('should not reveal system internals in user messages', () => {
      Object.values(SECURITY_ERROR_MESSAGES).forEach(config => {
        const message = config.userMessage.toLowerCase();
        
        // Should not reveal technical details
        expect(message).not.toContain('sql');
        expect(message).not.toContain('database');
        expect(message).not.toContain('table');
        expect(message).not.toContain('query');
        expect(message).not.toContain('exception');
        expect(message).not.toContain('null pointer');
        expect(message).not.toContain('undefined');
        expect(message).not.toContain('stack trace');
      });
    });

    it('should not reveal timing information in user messages', () => {
      Object.values(SECURITY_ERROR_MESSAGES).forEach(config => {
        const message = config.userMessage.toLowerCase();
        
        // Should not reveal specific timing
        expect(message).not.toMatch(/\d+\s*seconds?/);
        expect(message).not.toMatch(/\d+\s*minutes?/);
        expect(message).not.toMatch(/\d+\s*hours?/);
        expect(message).not.toContain('milliseconds');
      });
    });

    it('should have appropriate retry delays for security', () => {
      // Rate limiting should have significant delay
      expect(SECURITY_ERROR_MESSAGES[AuthSecurityErrorType.RATE_LIMIT_EXCEEDED].retryDelay)
        .toBeGreaterThanOrEqual(900000); // 15 minutes

      // Account lockout should have significant delay
      expect(SECURITY_ERROR_MESSAGES[AuthSecurityErrorType.ACCOUNT_LOCKED].retryDelay)
        .toBeGreaterThanOrEqual(900000); // 15 minutes

      // Network errors should have reasonable delay
      expect(SECURITY_ERROR_MESSAGES[AuthSecurityErrorType.NETWORK_ERROR].retryDelay)
        .toBeLessThan(10000); // Less than 10 seconds
    });
  });
});