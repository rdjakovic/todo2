/**
 * Basic Security Error Handler Tests
 * 
 * Simple tests to verify core functionality without complex mocking.
 */

import { describe, it, expect } from 'vitest';
import { 
  SecurityErrorHandler, 
  securityErrorHandler,
  AuthSecurityError,
  ErrorContext
} from '../securityErrorHandler';
import { 
  AuthSecurityErrorType, 
  ErrorSeverity,
  getUserMessage
} from '../../const/securityMessages';

describe('SecurityErrorHandler - Basic Tests', () => {
  const mockContext: ErrorContext = {
    userIdentifier: 'test@example.com',
    attemptCount: 1,
    timestamp: new Date(),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    sessionId: 'test-session-123'
  };

  describe('Error Classification', () => {
    it('should classify AuthSecurityError correctly', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      
      const authError: AuthSecurityError = {
        name: 'AuthSecurityError',
        message: 'Rate limit exceeded',
        type: AuthSecurityErrorType.RATE_LIMIT_EXCEEDED,
        code: 'RATE_LIMIT_EXCEEDED',
        userMessage: 'Too many attempts',
        logMessage: 'Rate limit exceeded',
        context: mockContext,
        shouldRetry: true
      };

      const result = handler.handleAuthError(authError, mockContext);

      expect(result.errorType).toBe(AuthSecurityErrorType.RATE_LIMIT_EXCEEDED);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.shouldRetry).toBe(true);
      expect(result.userMessage).toBeTruthy();
    });

    it('should classify network errors correctly', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';

      const result = handler.handleAuthError(networkError, mockContext);

      expect(result.errorType).toBe(AuthSecurityErrorType.NETWORK_ERROR);
      expect(result.severity).toBe(ErrorSeverity.LOW);
    });

    it('should classify unknown errors with fallback', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      const unknownError = { someProperty: 'unknown' };

      const result = handler.handleAuthError(unknownError, mockContext);

      expect(result.errorType).toBe(AuthSecurityErrorType.UNKNOWN_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('Message Sanitization', () => {
    it('should sanitize HTML tags from error messages', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      const maliciousError = new Error('<script>alert("xss")</script>Invalid credentials');

      const result = handler.handleAuthError(maliciousError, mockContext);

      expect(result.userMessage).not.toContain('<script>');
      expect(result.userMessage).not.toContain('alert');
    });

    it('should remove dangerous characters from messages', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      const dangerousError = new Error('Error with "quotes" and <tags> & ampersands');

      const result = handler.handleAuthError(dangerousError, mockContext);

      expect(result.userMessage).not.toContain('"');
      expect(result.userMessage).not.toContain('<');
      expect(result.userMessage).not.toContain('>');
      expect(result.userMessage).not.toContain('&');
    });

    it('should provide fallback for empty messages', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      const emptyError = new Error('');

      const result = handler.handleAuthError(emptyError, mockContext);

      expect(result.userMessage).toBeTruthy();
      expect(result.userMessage.length).toBeGreaterThan(0);
    });
  });

  describe('Specific Error Handlers', () => {
    it('should handle network errors with specific method', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      const networkError = new Error('Connection failed');

      const result = handler.handleNetworkError(networkError, mockContext);

      expect(result.errorType).toBe(AuthSecurityErrorType.NETWORK_ERROR);
      expect(result.userMessage).toBe(getUserMessage(AuthSecurityErrorType.NETWORK_ERROR));
    });

    it('should handle validation errors with specific method', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      const validationError = new Error('Invalid email format');

      const result = handler.handleValidationError(validationError, mockContext);

      expect(result.errorType).toBe(AuthSecurityErrorType.VALIDATION_ERROR);
      expect(result.userMessage).toBe(getUserMessage(AuthSecurityErrorType.VALIDATION_ERROR));
    });

    it('should handle rate limit errors with attempt count', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });

      const result = handler.handleRateLimitError(mockContext, 5);

      expect(result.errorType).toBe(AuthSecurityErrorType.RATE_LIMIT_EXCEEDED);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('AuthSecurityError Creation', () => {
    it('should create proper AuthSecurityError instances', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      
      const error = handler.createAuthSecurityError(
        AuthSecurityErrorType.INVALID_CREDENTIALS,
        mockContext
      );

      expect(error.name).toBe('AuthSecurityError');
      expect(error.type).toBe(AuthSecurityErrorType.INVALID_CREDENTIALS);
      expect(error.code).toBe(AuthSecurityErrorType.INVALID_CREDENTIALS);
      expect(error.userMessage).toBe(getUserMessage(AuthSecurityErrorType.INVALID_CREDENTIALS));
      expect(error.context).toBe(mockContext);
      expect(error.shouldRetry).toBe(true);
    });

    it('should preserve original error in AuthSecurityError', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      const originalError = new Error('Original error message');
      
      const error = handler.createAuthSecurityError(
        AuthSecurityErrorType.NETWORK_ERROR,
        mockContext,
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const handler = new SecurityErrorHandler();
      const config = handler.getConfiguration();

      expect(config).toHaveProperty('enableLogging');
      expect(config).toHaveProperty('sanitizeMessages');
      expect(config).toHaveProperty('includeStackTrace');
      expect(config).toHaveProperty('maxContextLength');
      expect(config).toHaveProperty('logger');
    });

    it('should update configuration', () => {
      const handler = new SecurityErrorHandler();
      
      handler.updateConfiguration({
        enableLogging: false,
        sanitizeMessages: false
      });

      const config = handler.getConfiguration();

      expect(config.enableLogging).toBe(false);
      expect(config.sanitizeMessages).toBe(false);
    });
  });

  describe('Default Instance', () => {
    it('should provide a working default instance', () => {
      const result = securityErrorHandler.handleAuthError(
        new Error('Test error'),
        mockContext
      );

      expect(result).toHaveProperty('userMessage');
      expect(result).toHaveProperty('errorType');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('shouldRetry');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined errors', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      
      const result1 = handler.handleAuthError(null, mockContext);
      const result2 = handler.handleAuthError(undefined, mockContext);

      expect(result1.errorType).toBe(AuthSecurityErrorType.UNKNOWN_ERROR);
      expect(result2.errorType).toBe(AuthSecurityErrorType.UNKNOWN_ERROR);
    });

    it('should handle errors without message property', () => {
      const handler = new SecurityErrorHandler({ enableLogging: false });
      const errorWithoutMessage = { name: 'CustomError' };

      const result = handler.handleAuthError(errorWithoutMessage, mockContext);

      expect(result.userMessage).toBeTruthy();
      expect(result.errorType).toBe(AuthSecurityErrorType.UNKNOWN_ERROR);
    });
  });
});