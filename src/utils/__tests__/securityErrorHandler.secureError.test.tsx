/**
 * Security Error Handler Tests
 * 
 * Comprehensive tests for error message consistency, sanitization,
 * XSS prevention, security event logging, and edge case handling.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  SecurityErrorHandler, 
  ErrorContext
} from '../securityErrorHandler';
import { 
  AuthSecurityErrorType, 
  getErrorConfig,
  shouldLogSecurityEvent
} from '../../const/securityMessages';
import { SecurityEventType } from '../securityLogger';

// Mock security logger
vi.mock('../securityLogger', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    SecurityLogger: vi.fn().mockImplementation(() => ({
      logEvent: vi.fn(),
      logSecurityError: vi.fn(),
      createEventBatch: vi.fn(() => ({
        addEvent: vi.fn(),
        getEvents: vi.fn(() => []),
        clear: vi.fn(),
        getSummary: vi.fn(() => ({ total: 0, bySeverity: {}, byType: {} }))
      }))
    }))
  };
});

describe('Security Error Handler Tests', () => {
  let errorHandler: SecurityErrorHandler;
  let mockLogger: any;
  let baseContext: ErrorContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock logger
    mockLogger = {
      logEvent: vi.fn(),
      logSecurityError: vi.fn(),
      createEventBatch: vi.fn(() => ({
        addEvent: vi.fn(),
        getEvents: vi.fn(() => []),
        clear: vi.fn(),
        getSummary: vi.fn(() => ({ total: 0, bySeverity: {}, byType: {} }))
      }))
    };
    
    // Create error handler with mock logger
    errorHandler = new SecurityErrorHandler({
      enableLogging: true,
      sanitizeMessages: true,
      includeStackTrace: false,
      maxContextLength: 500,
      logger: mockLogger
    });
    
    // Base context for tests
    baseContext = {
      userIdentifier: 'test@example.com',
      attemptCount: 1,
      timestamp: new Date(),
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      sessionId: 'test-session-123'
    };
  });

  describe('Error Message Consistency and Sanitization', () => {
    it('should return consistent generic messages for all authentication failures', () => {
      const testCases = [
        { error: new Error('Invalid email or password'), expectedType: AuthSecurityErrorType.INVALID_CREDENTIALS },
        { error: new Error('User not found'), expectedType: AuthSecurityErrorType.INVALID_CREDENTIALS },
        { error: new Error('Wrong password'), expectedType: AuthSecurityErrorType.INVALID_CREDENTIALS },
        { error: new Error('Account does not exist'), expectedType: AuthSecurityErrorType.INVALID_CREDENTIALS }
      ];

      testCases.forEach(({ error, expectedType }) => {
        const response = errorHandler.handleAuthError(error, baseContext);
        
        expect(response.errorType).toBe(expectedType);
        expect(response.userMessage).toBe(getErrorConfig(expectedType).userMessage);
        expect(response.userMessage).not.toContain('not found');
        expect(response.userMessage).not.toContain('does not exist');
        expect(response.userMessage).not.toContain('wrong');
      });
    });

    it('should sanitize error messages to prevent XSS attacks', () => {
      const maliciousErrors = [
        '<script>alert("xss")</script>Invalid credentials',
        'javascript:alert("xss")Login failed',
        '<img src="x" onerror="alert(1)">Authentication error',
        'onclick="alert(1)"Login error',
        '<svg onload="alert(1)">Error message</svg>'
      ];

      maliciousErrors.forEach(maliciousError => {
        const response = errorHandler.handleAuthError(
          new Error(maliciousError), 
          baseContext
        );
        
        // Should not contain any HTML tags or JavaScript
        expect(response.userMessage).not.toMatch(/<[^>]*>/);
        expect(response.userMessage).not.toMatch(/javascript:/i);
        expect(response.userMessage).not.toMatch(/on\w+=/i);
        expect(response.userMessage).not.toContain('<script>');
        expect(response.userMessage).not.toContain('onerror');
        expect(response.userMessage).not.toContain('onload');
      });
    });

    it('should limit error message length to prevent buffer overflow', () => {
      const longMessage = 'A'.repeat(1000) + 'Invalid credentials';
      const error = new Error(longMessage);
      
      const response = errorHandler.handleAuthError(error, baseContext);
      
      expect(response.userMessage.length).toBeLessThanOrEqual(203); // 200 + '...'
    });

    it('should handle empty or null error messages gracefully', () => {
      const testCases = [
        new Error(''),
        new Error(),
        null,
        undefined,
        ''
      ];

      testCases.forEach(error => {
        const response = errorHandler.handleAuthError(error, baseContext);
        
        expect(response.userMessage).toBeTruthy();
        expect(response.userMessage.length).toBeGreaterThan(0);
        expect(response.errorType).toBeDefined();
      });
    });

    it('should remove sensitive information from error messages', () => {
      const sensitiveErrors = [
        'Database connection failed: host=db.internal.com user=admin password=secret123',
        'API key invalid: sk-1234567890abcdef',
        'Token expired: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        'SQL Error: SELECT * FROM users WHERE email="test@example.com" AND password="plaintext"'
      ];

      sensitiveErrors.forEach(sensitiveError => {
        const response = errorHandler.handleAuthError(
          new Error(sensitiveError), 
          baseContext
        );
        
        // Should not contain sensitive information
        expect(response.userMessage).not.toContain('password=');
        expect(response.userMessage).not.toContain('sk-');
        expect(response.userMessage).not.toContain('eyJ');
        expect(response.userMessage).not.toContain('SELECT');
        expect(response.userMessage).not.toContain('db.internal.com');
      });
    });
  });

  describe('Error Classification and Type Detection', () => {
    it('should correctly classify network errors', () => {
      const networkErrors = [
        new Error('Network request failed'),
        new Error('fetch failed'),
        new Error('Connection timeout'),
        { name: 'NetworkError', message: 'Connection lost' }
      ];

      networkErrors.forEach(error => {
        const response = errorHandler.handleAuthError(error, baseContext);
        expect(response.errorType).toBe(AuthSecurityErrorType.NETWORK_ERROR);
      });
    });

    it('should correctly classify rate limiting errors', () => {
      const rateLimitErrors = [
        new Error('Rate limit exceeded'),
        new Error('Too many requests'),
        new Error('429 Too Many Requests'),
        { status: 429, message: 'Rate limited' }
      ];

      rateLimitErrors.forEach(error => {
        const response = errorHandler.handleAuthError(error, baseContext);
        expect(response.errorType).toBe(AuthSecurityErrorType.RATE_LIMIT_EXCEEDED);
      });
    });

    it('should correctly classify validation errors', () => {
      const validationErrors = [
        new Error('Validation failed'),
        new Error('Invalid format'),
        new Error('Required field missing'),
        { name: 'ValidationError', message: 'Invalid input' }
      ];

      validationErrors.forEach(error => {
        const response = errorHandler.handleAuthError(error, baseContext);
        expect(response.errorType).toBe(AuthSecurityErrorType.VALIDATION_ERROR);
      });
    });

    it('should correctly classify storage errors', () => {
      const storageErrors = [
        new Error('localStorage quota exceeded'),
        new Error('Storage operation failed'),
        { name: 'QuotaExceededError', message: 'Storage full' },
        new DOMException('QuotaExceededError')
      ];

      storageErrors.forEach(error => {
        const response = errorHandler.handleAuthError(error, baseContext);
        expect(response.errorType).toBe(AuthSecurityErrorType.STORAGE_ERROR);
      });
    });

    it('should correctly classify encryption errors', () => {
      const encryptionErrors = [
        new Error('Encryption failed'),
        new Error('Decryption error'),
        new Error('Crypto operation failed'),
        { name: 'CryptoError', message: 'Invalid key' }
      ];

      encryptionErrors.forEach(error => {
        const response = errorHandler.handleAuthError(error, baseContext);
        expect(response.errorType).toBe(AuthSecurityErrorType.ENCRYPTION_ERROR);
      });
    });

    it('should handle Supabase-specific errors correctly', () => {
      const supabaseErrors = [
        { status: 401, message: 'Invalid credentials' },
        { statusCode: 403, message: 'Forbidden' },
        { code: 'invalid_credentials', message: 'Auth failed' },
        { code: 'too_many_requests', message: 'Rate limited' },
        { status: 500, message: 'Internal server error' }
      ];

      const expectedTypes = [
        AuthSecurityErrorType.INVALID_CREDENTIALS,
        AuthSecurityErrorType.INVALID_CREDENTIALS,
        AuthSecurityErrorType.INVALID_CREDENTIALS,
        AuthSecurityErrorType.RATE_LIMIT_EXCEEDED,
        AuthSecurityErrorType.NETWORK_ERROR
      ];

      supabaseErrors.forEach((error, index) => {
        const response = errorHandler.handleAuthError(error, baseContext);
        expect(response.errorType).toBe(expectedTypes[index]);
      });
    });

    it('should handle AuthSecurityError instances correctly', () => {
      const authError = errorHandler.createAuthSecurityError(
        AuthSecurityErrorType.ACCOUNT_LOCKED,
        baseContext
      );

      const response = errorHandler.handleAuthError(authError, baseContext);
      
      expect(response.errorType).toBe(AuthSecurityErrorType.ACCOUNT_LOCKED);
      expect(response.userMessage).toBe(getErrorConfig(AuthSecurityErrorType.ACCOUNT_LOCKED).userMessage);
    });
  });

  describe('Context Sanitization and Privacy Protection', () => {
    it('should hash user identifiers for privacy', () => {
      const context: ErrorContext = {
        ...baseContext,
        userIdentifier: 'sensitive@example.com'
      };

      errorHandler.handleAuthError(new Error('Test error'), context);

      // Verify logger was called with hashed identifier
      expect(mockLogger.logEvent).toHaveBeenCalled();
      const logCall = mockLogger.logEvent.mock.calls[0];
      const loggedDetails = logCall[1];
      
      expect(loggedDetails.additionalContext.userIdentifier).toMatch(/^hash_[a-f0-9]+$/);
      expect(loggedDetails.additionalContext.userIdentifier).not.toContain('sensitive@example.com');
    });

    it('should sanitize user agent information', () => {
      const context: ErrorContext = {
        ...baseContext,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0'
      };

      errorHandler.handleAuthError(new Error('Test error'), context);

      expect(mockLogger.logEvent).toHaveBeenCalled();
      const logCall = mockLogger.logEvent.mock.calls[0];
      const loggedDetails = logCall[1];
      
      expect(loggedDetails.userAgent).toContain('(system-info-removed)');
      expect(loggedDetails.userAgent).not.toContain('Windows NT 10.0');
      expect(loggedDetails.userAgent).not.toContain('Win64; x64');
    });

    it('should sanitize IP addresses', () => {
      const context: ErrorContext = {
        ...baseContext,
        ipAddress: '192.168.1.100'
      };

      errorHandler.handleAuthError(new Error('Test error'), context);

      expect(mockLogger.logEvent).toHaveBeenCalled();
      const logCall = mockLogger.logEvent.mock.calls[0];
      const loggedDetails = logCall[1];
      
      expect(loggedDetails.ipAddress).toBe('192.168.1.xxx');
    });

    it('should redact sensitive keys from additional context', () => {
      const context: ErrorContext = {
        ...baseContext,
        additionalContext: {
          password: 'secret123',
          token: 'bearer-token-123',
          apiKey: 'sk-1234567890',
          secretKey: 'secret-key-456',
          normalField: 'safe-value',
          authHeader: 'Bearer token123'
        }
      };

      errorHandler.handleAuthError(new Error('Test error'), context);

      expect(mockLogger.logEvent).toHaveBeenCalled();
      const logCall = mockLogger.logEvent.mock.calls[0];
      const loggedDetails = logCall[1];
      const sanitizedContext = loggedDetails.additionalContext;
      
      expect(sanitizedContext.password).toBe('[REDACTED]');
      expect(sanitizedContext.token).toBe('[REDACTED]');
      expect(sanitizedContext.apiKey).toBe('[REDACTED]');
      expect(sanitizedContext.secretKey).toBe('[REDACTED]');
      expect(sanitizedContext.authHeader).toBe('[REDACTED]');
      expect(sanitizedContext.normalField).toBe('safe-value');
    });

    it('should truncate long context values', () => {
      const longValue = 'A'.repeat(1000);
      const context: ErrorContext = {
        ...baseContext,
        additionalContext: {
          longField: longValue,
          shortField: 'short'
        }
      };

      errorHandler.handleAuthError(new Error('Test error'), context);

      expect(mockLogger.logEvent).toHaveBeenCalled();
      const logCall = mockLogger.logEvent.mock.calls[0];
      const loggedDetails = logCall[1];
      const sanitizedContext = loggedDetails.additionalContext;
      
      expect(sanitizedContext.longField).toContain('...[TRUNCATED]');
      expect(sanitizedContext.longField.length).toBeLessThanOrEqual(515); // 500 + '...[TRUNCATED]'
      expect(sanitizedContext.shortField).toBe('short');
    });
  });

  describe('Security Event Logging', () => {
    it('should log high-severity security events', () => {
      const highSeverityErrors = [
        AuthSecurityErrorType.RATE_LIMIT_EXCEEDED,
        AuthSecurityErrorType.ACCOUNT_LOCKED,
        AuthSecurityErrorType.ENCRYPTION_ERROR
      ];

      highSeverityErrors.forEach(errorType => {
        vi.clearAllMocks();
        
        const error = errorHandler.createAuthSecurityError(errorType, baseContext);
        errorHandler.handleAuthError(error, baseContext);
        
        expect(mockLogger.logEvent).toHaveBeenCalled();
        expect(shouldLogSecurityEvent(errorType)).toBe(true);
      });
    });

    it('should not log low-severity events when configured', () => {
      const lowSeverityHandler = new SecurityErrorHandler({
        enableLogging: false,
        logger: mockLogger
      });

      lowSeverityHandler.handleAuthError(
        new Error('Network error'), 
        baseContext
      );

      expect(mockLogger.logEvent).not.toHaveBeenCalled();
    });

    it('should include comprehensive event details in logs', () => {
      const context: ErrorContext = {
        ...baseContext,
        attemptCount: 3,
        sessionId: 'session-123'
      };

      errorHandler.handleAuthError(
        new Error('Rate limit exceeded'), 
        context
      );

      expect(mockLogger.logEvent).toHaveBeenCalled();
      const logCall = mockLogger.logEvent.mock.calls[0];
      const [eventType, details, description] = logCall;
      
      expect(eventType).toBe(SecurityEventType.RATE_LIMIT_EXCEEDED);
      expect(details.attemptCount).toBe(3);
      expect(details.sessionId).toBe('session-123');
      expect(details.userAgent).toBeDefined();
      expect(details.timestamp).toBeInstanceOf(Date);
      expect(details.additionalContext).toBeDefined();
      expect(description).toBeTruthy();
    });

    it('should create event batches for contextual information', () => {
      const mockBatch = {
        addEvent: vi.fn(),
        getEvents: vi.fn(() => []),
        clear: vi.fn(),
        getSummary: vi.fn(() => ({ total: 0, bySeverity: {}, byType: {} }))
      };
      
      mockLogger.createEventBatch.mockReturnValue(mockBatch);

      errorHandler.handleAuthError(
        new Error('Rate limit exceeded'), 
        baseContext
      );

      expect(mockLogger.createEventBatch).toHaveBeenCalled();
      expect(mockBatch.addEvent).toHaveBeenCalled();
    });

    it('should extract and log browser information', () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      ];

      userAgents.forEach(userAgent => {
        vi.clearAllMocks();
        
        const context = { ...baseContext, userAgent };
        errorHandler.handleAuthError(new Error('Test error'), context);

        expect(mockLogger.createEventBatch).toHaveBeenCalled();
        const mockBatch = mockLogger.createEventBatch.mock.results[0].value;
        expect(mockBatch.addEvent).toHaveBeenCalled();
        
        // Check if browser info was extracted
        const addEventCalls = mockBatch.addEvent.mock.calls;
        const browserInfoCall = addEventCalls.find((call: any) => 
          call[1]?.additionalContext?.action === 'user_agent_analysis'
        );
        
        expect(browserInfoCall).toBeDefined();
        expect(browserInfoCall[1].additionalContext.browserInfo).toBeDefined();
      });
    });

    it('should log timing analysis for pattern detection', () => {
      const mockBatch = {
        addEvent: vi.fn(),
        getEvents: vi.fn(() => []),
        clear: vi.fn(),
        getSummary: vi.fn(() => ({ total: 0, bySeverity: {}, byType: {} }))
      };
      
      mockLogger.createEventBatch.mockReturnValue(mockBatch);

      // Test business hours detection
      const businessHourTime = new Date();
      businessHourTime.setHours(14); // 2 PM
      
      const context = { ...baseContext, timestamp: businessHourTime };
      errorHandler.handleAuthError(new Error('Test error'), context);

      expect(mockBatch.addEvent).toHaveBeenCalled();
      
      const timingCall = mockBatch.addEvent.mock.calls.find(call => 
        call[1]?.additionalContext?.action === 'timing_analysis'
      );
      
      expect(timingCall).toBeDefined();
      expect(timingCall![1].additionalContext.isBusinessHours).toBe(true);
      expect(timingCall![1].additionalContext.timeOfDay).toBe(14);
    });

    it('should handle logging errors gracefully', () => {
      // Mock logger to throw error
      mockLogger.logEvent.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      // Should not throw error, should return fallback response
      const response = errorHandler.handleAuthError(
        new Error('Test error'), 
        baseContext
      );

      expect(response).toBeDefined();
      expect(response.userMessage).toBeTruthy();
      expect(response.errorType).toBeDefined();
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    it('should provide appropriate retry recommendations', () => {
      const testCases = [
        { 
          errorType: AuthSecurityErrorType.NETWORK_ERROR, 
          shouldRetry: true, 
          expectedDelay: 5000 
        },
        { 
          errorType: AuthSecurityErrorType.RATE_LIMIT_EXCEEDED, 
          shouldRetry: true, 
          expectedDelay: 900000 
        },
        { 
          errorType: AuthSecurityErrorType.VALIDATION_ERROR, 
          shouldRetry: false 
        },
        { 
          errorType: AuthSecurityErrorType.ENCRYPTION_ERROR, 
          shouldRetry: false 
        }
      ];

      testCases.forEach(({ errorType, shouldRetry, expectedDelay }) => {
        const error = errorHandler.createAuthSecurityError(errorType, baseContext);
        const response = errorHandler.handleAuthError(error, baseContext);
        
        expect(response.shouldRetry).toBe(shouldRetry);
        if (expectedDelay) {
          expect(response.retryDelay).toBe(expectedDelay);
        }
      });
    });

    it('should handle specific error types with dedicated methods', () => {
      // Test network error handler
      const networkResponse = errorHandler.handleNetworkError(
        new Error('Connection failed'), 
        baseContext
      );
      expect(networkResponse.errorType).toBe(AuthSecurityErrorType.NETWORK_ERROR);

      // Test validation error handler
      const validationResponse = errorHandler.handleValidationError(
        new Error('Invalid input'), 
        baseContext
      );
      expect(validationResponse.errorType).toBe(AuthSecurityErrorType.VALIDATION_ERROR);

      // Test rate limit error handler
      const rateLimitResponse = errorHandler.handleRateLimitError(
        baseContext, 
        5
      );
      expect(rateLimitResponse.errorType).toBe(AuthSecurityErrorType.RATE_LIMIT_EXCEEDED);

      // Test account lockout error handler
      const lockoutResponse = errorHandler.handleAccountLockoutError(
        baseContext, 
        900000
      );
      expect(lockoutResponse.errorType).toBe(AuthSecurityErrorType.ACCOUNT_LOCKED);
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect sanitization configuration', () => {
      const noSanitizeHandler = new SecurityErrorHandler({
        sanitizeMessages: false,
        logger: mockLogger
      });

      const maliciousError = '<script>alert("xss")</script>Test error';
      const response = noSanitizeHandler.handleAuthError(
        new Error(maliciousError), 
        baseContext
      );

      // Should contain HTML when sanitization is disabled
      expect(response.userMessage).toContain('<script>');
    });

    it('should respect logging configuration', () => {
      const noLoggingHandler = new SecurityErrorHandler({
        enableLogging: false,
        logger: mockLogger
      });

      noLoggingHandler.handleAuthError(
        new Error('Rate limit exceeded'), 
        baseContext
      );

      expect(mockLogger.logEvent).not.toHaveBeenCalled();
    });

    it('should respect stack trace configuration', () => {
      const stackTraceHandler = new SecurityErrorHandler({
        includeStackTrace: true,
        logger: mockLogger
      });

      const errorWithStack = new Error('Test error');
      errorWithStack.stack = 'Error: Test error\n    at test.js:1:1';

      stackTraceHandler.handleAuthError(errorWithStack, baseContext);

      expect(mockLogger.logEvent).toHaveBeenCalled();
      const logCall = mockLogger.logEvent.mock.calls[0];
      const details = logCall[1];
      
      expect(details.additionalContext.stack).toBeDefined();
      expect(details.additionalContext.stack).toContain('test.js:1:1');
    });

    it('should allow configuration updates', () => {
      const initialConfig = errorHandler.getConfiguration();
      expect(initialConfig.sanitizeMessages).toBe(true);

      errorHandler.updateConfiguration({ sanitizeMessages: false });
      
      const updatedConfig = errorHandler.getConfiguration();
      expect(updatedConfig.sanitizeMessages).toBe(false);
    });

    it('should handle custom context length limits', () => {
      const shortContextHandler = new SecurityErrorHandler({
        maxContextLength: 10,
        logger: mockLogger
      });

      const context: ErrorContext = {
        ...baseContext,
        additionalContext: {
          longField: 'This is a very long field that should be truncated'
        }
      };

      shortContextHandler.handleAuthError(new Error('Test error'), context);

      expect(mockLogger.logEvent).toHaveBeenCalled();
      const logCall = mockLogger.logEvent.mock.calls[0];
      const details = logCall[1];
      
      expect(details.additionalContext.longField).toContain('...[TRUNCATED]');
      expect(details.additionalContext.longField.length).toBeLessThanOrEqual(25); // 10 + '...[TRUNCATED]'
    });
  });

  describe('Edge Cases and Error Boundaries', () => {
    it('should handle circular reference objects', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const context: ErrorContext = {
        ...baseContext,
        additionalContext: { circular: circularObj }
      };

      // Should not throw error
      expect(() => {
        errorHandler.handleAuthError(new Error('Test error'), context);
      }).not.toThrow();
    });

    it('should handle undefined and null contexts gracefully', () => {
      const responses = [
        errorHandler.handleAuthError(new Error('Test'), {} as ErrorContext),
        errorHandler.handleAuthError(new Error('Test'), { timestamp: new Date() })
      ];

      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.userMessage).toBeTruthy();
        expect(response.errorType).toBeDefined();
      });
    });

    it('should handle very large error objects', () => {
      const largeError = {
        message: 'A'.repeat(10000),
        stack: 'B'.repeat(10000),
        name: 'LargeError',
        additionalData: 'C'.repeat(10000)
      };

      const response = errorHandler.handleAuthError(largeError, baseContext);
      
      expect(response).toBeDefined();
      expect(response.userMessage.length).toBeLessThanOrEqual(203);
    });

    it('should handle errors during error handling', () => {
      // Mock logger to throw during logging
      mockLogger.logEvent.mockImplementation(() => {
        throw new Error('Logger failed');
      });

      // Should still return a valid response
      const response = errorHandler.handleAuthError(
        new Error('Original error'), 
        baseContext
      );

      expect(response).toBeDefined();
      expect(response.userMessage).toBeTruthy();
      expect(response.errorType).toBeDefined();
    });

    it('should handle malformed context objects', () => {
      const malformedContexts = [
        { timestamp: 'not-a-date' },
        { attemptCount: 'not-a-number' },
        { userAgent: null },
        { additionalContext: 'not-an-object' }
      ];

      malformedContexts.forEach(malformedContext => {
        expect(() => {
          errorHandler.handleAuthError(
            new Error('Test error'), 
            malformedContext as any
          );
        }).not.toThrow();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle high-frequency error processing efficiently', () => {
      const startTime = performance.now();
      
      // Process 1000 errors
      for (let i = 0; i < 1000; i++) {
        errorHandler.handleAuthError(
          new Error(`Error ${i}`), 
          { ...baseContext, attemptCount: i }
        );
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should not leak memory with repeated error handling', () => {
      // Create many error contexts
      const contexts = Array.from({ length: 100 }, (_, i) => ({
        ...baseContext,
        userIdentifier: `user${i}@example.com`,
        additionalContext: {
          data: `data-${i}`,
          timestamp: Date.now() + i
        }
      }));

      // Process all contexts
      contexts.forEach((context, i) => {
        errorHandler.handleAuthError(new Error(`Error ${i}`), context);
      });

      // Verify all contexts were processed
      expect(mockLogger.logEvent).toHaveBeenCalledTimes(100);
    });
  });
});