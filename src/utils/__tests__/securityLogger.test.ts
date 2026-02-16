/**
 * Unit tests for SecurityLogger utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SecurityLogger,
  SecurityEventBatch,
  SecurityEventType,
  SecuritySeverity,
  LogLevel,
  securityLogger
} from '../securityLogger';

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn()
};

// Mock navigator
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

describe('SecurityLogger', () => {
  let logger: SecurityLogger;

  beforeEach(() => {
    // Mock console
    Object.assign(console, mockConsole);
    
    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });

    logger = new SecurityLogger();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      const defaultLogger = new SecurityLogger();
      expect(defaultLogger).toBeInstanceOf(SecurityLogger);
      
      const config = defaultLogger.getConfiguration();
      expect(config.enableConsoleLogging).toBe(true);
      expect(config.logLevel).toBe(LogLevel.INFO);
      expect(config.includeStackTrace).toBe(false);
      expect(config.sanitizeDetails).toBe(true);
      expect(config.maxDetailLength).toBe(1000);
    });

    it('should create instance with custom options', () => {
      const customLogger = new SecurityLogger({
        enableConsoleLogging: false,
        logLevel: LogLevel.ERROR,
        includeStackTrace: true,
        sanitizeDetails: false,
        maxDetailLength: 500
      });

      const config = customLogger.getConfiguration();
      expect(config.enableConsoleLogging).toBe(false);
      expect(config.logLevel).toBe(LogLevel.ERROR);
      expect(config.includeStackTrace).toBe(true);
      expect(config.sanitizeDetails).toBe(false);
      expect(config.maxDetailLength).toBe(500);
    });
  });

  describe('Event Logging', () => {
    it('should log security event with correct structure', () => {
      const event = logger.logEvent(SecurityEventType.FAILED_LOGIN, {
        attemptCount: 1,
        userAgent: 'test-agent'
      });

      expect(event).toMatchObject({
        id: expect.stringMatching(/^sec_\d+_\d+$/),
        type: SecurityEventType.FAILED_LOGIN,
        severity: SecuritySeverity.MEDIUM,
        level: LogLevel.WARN,
        message: 'Authentication failed (attempt 1)',
        source: 'client',
        timestamp: expect.any(Date)
      });

      expect(event.details).toMatchObject({
        attemptCount: 1,
        timestamp: expect.any(Date)
      });
    });

    it('should generate unique event IDs', () => {
      const event1 = logger.logEvent(SecurityEventType.FAILED_LOGIN);
      const event2 = logger.logEvent(SecurityEventType.FAILED_LOGIN);
      
      expect(event1.id).not.toBe(event2.id);
      expect(event1.id).toMatch(/^sec_\d+_1$/);
      expect(event2.id).toMatch(/^sec_\d+_2$/);
    });

    it('should determine correct severity for different event types', () => {
      const failedLogin = logger.logEvent(SecurityEventType.FAILED_LOGIN);
      const successfulLogin = logger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN);
      const accountLocked = logger.logEvent(SecurityEventType.ACCOUNT_LOCKED);
      const stateCorrupted = logger.logEvent(SecurityEventType.SECURITY_STATE_CORRUPTED);

      expect(failedLogin.severity).toBe(SecuritySeverity.MEDIUM);
      expect(successfulLogin.severity).toBe(SecuritySeverity.LOW);
      expect(accountLocked.severity).toBe(SecuritySeverity.HIGH);
      expect(stateCorrupted.severity).toBe(SecuritySeverity.CRITICAL);
    });

    it('should determine correct log level based on severity', () => {
      const lowSeverity = logger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN);
      const mediumSeverity = logger.logEvent(SecurityEventType.FAILED_LOGIN);
      const highSeverity = logger.logEvent(SecurityEventType.ACCOUNT_LOCKED);
      const criticalSeverity = logger.logEvent(SecurityEventType.SECURITY_STATE_CORRUPTED);

      expect(lowSeverity.level).toBe(LogLevel.INFO);
      expect(mediumSeverity.level).toBe(LogLevel.WARN);
      expect(highSeverity.level).toBe(LogLevel.ERROR);
      expect(criticalSeverity.level).toBe(LogLevel.ERROR);
    });
  });

  describe('Message Formatting', () => {
    it('should format messages correctly for different event types', () => {
      const failedLogin = logger.logEvent(SecurityEventType.FAILED_LOGIN, { attemptCount: 3 });
      const successfulLogin = logger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN);
      const accountLocked = logger.logEvent(SecurityEventType.ACCOUNT_LOCKED, { lockoutDuration: 900000 });

      expect(failedLogin.message).toBe('Authentication failed (attempt 3)');
      expect(successfulLogin.message).toBe('User successfully authenticated');
      expect(accountLocked.message).toBe('Account locked for 900000ms');
    });

    it('should use custom message when provided', () => {
      const event = logger.logEvent(
        SecurityEventType.FAILED_LOGIN,
        {},
        'Custom security message'
      );

      expect(event.message).toBe('Custom security message');
    });
  });

  describe('Detail Sanitization', () => {
    it('should sanitize user agent information', () => {
      const event = logger.logEvent(SecurityEventType.FAILED_LOGIN, {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      expect(event.details.userAgent).toBe('Mozilla/5.0 (system-info-removed) AppleWebKit/537.36');
    });

    it('should mask IP addresses', () => {
      const event = logger.logEvent(SecurityEventType.FAILED_LOGIN, {
        ipAddress: '192.168.1.100'
      });

      expect(event.details.ipAddress).toBe('192.168.1.xxx');
    });

    it('should redact sensitive information from additional context', () => {
      const event = logger.logEvent(SecurityEventType.FAILED_LOGIN, {
        additionalContext: {
          password: 'secret123',
          token: 'abc123',
          username: 'testuser',
          normalField: 'normalValue'
        }
      });

      expect(event.details.additionalContext).toEqual({
        password: '[REDACTED]',
        token: '[REDACTED]',
        username: 'testuser',
        normalField: 'normalValue'
      });
    });

    it('should truncate long values in additional context', () => {
      const longValue = 'a'.repeat(1500);
      const event = logger.logEvent(SecurityEventType.FAILED_LOGIN, {
        additionalContext: {
          longField: longValue
        }
      });

      expect(event.details.additionalContext?.longField).toBe(
        'a'.repeat(1000) + '...[TRUNCATED]'
      );
    });

    it('should not sanitize when sanitization is disabled', () => {
      const unsanitizedLogger = new SecurityLogger({ sanitizeDetails: false });
      const event = unsanitizedLogger.logEvent(SecurityEventType.FAILED_LOGIN, {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        additionalContext: {
          password: 'secret123'
        }
      });

      expect(event.details.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      expect(event.details.additionalContext?.password).toBe('secret123');
    });
  });

  describe('Console Logging', () => {
    it('should log to console with correct format', () => {
      logger.logEvent(SecurityEventType.FAILED_LOGIN, { attemptCount: 1 });

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^\[SECURITY\] \[WARN\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Authentication failed \(attempt 1\)$/),
        expect.any(Object)
      );
    });

    it('should use correct console method based on log level', () => {
      logger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN); // INFO level
      logger.logEvent(SecurityEventType.FAILED_LOGIN); // WARN level
      logger.logEvent(SecurityEventType.ACCOUNT_LOCKED); // ERROR level

      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should respect log level filtering', () => {
      logger.setLogLevel(LogLevel.ERROR);
      
      logger.logEvent(SecurityEventType.SUCCESSFUL_LOGIN); // INFO level - should not log
      logger.logEvent(SecurityEventType.FAILED_LOGIN); // WARN level - should not log
      logger.logEvent(SecurityEventType.ACCOUNT_LOCKED); // ERROR level - should log

      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should not log to console when disabled', () => {
      logger.setConsoleLogging(false);
      logger.logEvent(SecurityEventType.FAILED_LOGIN);

      expect(mockConsole.warn).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Methods', () => {
    it('should log failed login with correct details', () => {
      const event = logger.logFailedLogin('user@example.com', 3, { extra: 'data' });

      expect(event.type).toBe(SecurityEventType.FAILED_LOGIN);
      expect(event.details.attemptCount).toBe(3);
      expect(event.details.userAgent).toBe('Mozilla/5.0 (system-info-removed) AppleWebKit/537.36');
      expect(event.details.additionalContext?.extra).toBe('data');
    });

    it('should log successful login with correct details', () => {
      const event = logger.logSuccessfulLogin('user@example.com', { sessionId: 'abc123' });

      expect(event.type).toBe(SecurityEventType.SUCCESSFUL_LOGIN);
      expect(event.details.userAgent).toBe('Mozilla/5.0 (system-info-removed) AppleWebKit/537.36');
      expect(event.details.additionalContext?.sessionId).toBe('abc123');
    });

    it('should log account locked with correct details', () => {
      const event = logger.logAccountLocked('user@example.com', 900000, 5);

      expect(event.type).toBe(SecurityEventType.ACCOUNT_LOCKED);
      expect(event.details.lockoutDuration).toBe(900000);
      expect(event.details.attemptCount).toBe(5);
    });

    it('should log rate limit exceeded with correct details', () => {
      const event = logger.logRateLimitExceeded('user@example.com', 6);

      expect(event.type).toBe(SecurityEventType.RATE_LIMIT_EXCEEDED);
      expect(event.details.attemptCount).toBe(6);
    });

    it('should log security error with correct details', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      const loggerWithStack = new SecurityLogger({ includeStackTrace: true });
      const event = loggerWithStack.logSecurityError(
        SecurityEventType.ENCRYPTION_ERROR,
        error,
        { context: 'test' }
      );

      expect(event.type).toBe(SecurityEventType.ENCRYPTION_ERROR);
      expect(event.details.errorCode).toBe('Error');
      expect(event.details.additionalContext?.errorMessage).toBe('Test error');
      expect(event.details.additionalContext?.stack).toBe('Error stack trace');
      expect(event.details.additionalContext?.context).toBe('test');
    });
  });

  describe('Configuration Management', () => {
    it('should update log level', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      expect(logger.getConfiguration().logLevel).toBe(LogLevel.DEBUG);
    });

    it('should update console logging setting', () => {
      logger.setConsoleLogging(false);
      expect(logger.getConfiguration().enableConsoleLogging).toBe(false);
    });
  });

  describe('SecurityEventBatch', () => {
    let batch: SecurityEventBatch;

    beforeEach(() => {
      batch = logger.createEventBatch();
    });

    it('should create empty batch', () => {
      expect(batch.getEvents()).toHaveLength(0);
    });

    it('should add events to batch', () => {
      batch.addEvent(SecurityEventType.FAILED_LOGIN, { attemptCount: 1 });
      batch.addEvent(SecurityEventType.SUCCESSFUL_LOGIN);

      const events = batch.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(SecurityEventType.FAILED_LOGIN);
      expect(events[1].type).toBe(SecurityEventType.SUCCESSFUL_LOGIN);
    });

    it('should clear batch', () => {
      batch.addEvent(SecurityEventType.FAILED_LOGIN);
      batch.clear();

      expect(batch.getEvents()).toHaveLength(0);
    });

    it('should generate correct summary', () => {
      batch.addEvent(SecurityEventType.FAILED_LOGIN); // MEDIUM severity
      batch.addEvent(SecurityEventType.FAILED_LOGIN); // MEDIUM severity
      batch.addEvent(SecurityEventType.SUCCESSFUL_LOGIN); // LOW severity
      batch.addEvent(SecurityEventType.ACCOUNT_LOCKED); // HIGH severity

      const summary = batch.getSummary();

      expect(summary.total).toBe(4);
      expect(summary.bySeverity[SecuritySeverity.LOW]).toBe(1);
      expect(summary.bySeverity[SecuritySeverity.MEDIUM]).toBe(2);
      expect(summary.bySeverity[SecuritySeverity.HIGH]).toBe(1);
      expect(summary.bySeverity[SecuritySeverity.CRITICAL]).toBe(0);
      expect(summary.byType[SecurityEventType.FAILED_LOGIN]).toBe(2);
      expect(summary.byType[SecurityEventType.SUCCESSFUL_LOGIN]).toBe(1);
      expect(summary.byType[SecurityEventType.ACCOUNT_LOCKED]).toBe(1);
    });

    it('should support method chaining', () => {
      const result = batch
        .addEvent(SecurityEventType.FAILED_LOGIN)
        .addEvent(SecurityEventType.SUCCESSFUL_LOGIN)
        .clear();

      expect(result).toBe(batch);
      expect(batch.getEvents()).toHaveLength(0);
    });
  });

  describe('Default Instance', () => {
    it('should export default security logger instance', () => {
      expect(securityLogger).toBeInstanceOf(SecurityLogger);
    });

    it('should use default configuration', () => {
      const config = securityLogger.getConfiguration();
      expect(config.enableConsoleLogging).toBe(true);
      expect(config.logLevel).toBe(LogLevel.INFO);
    });
  });

  describe('User Identifier Hashing', () => {
    it('should hash user identifiers in convenience methods', () => {
      const event = logger.logFailedLogin('user@example.com');
      
      expect(event.details.additionalContext?.userIdentifier).toBeDefined();
      expect(event.details.additionalContext?.userIdentifier).not.toBe('user@example.com');
      expect(typeof event.details.additionalContext?.userIdentifier).toBe('string');
    });

    it('should generate consistent hashes for same identifier', () => {
      const event1 = logger.logFailedLogin('user@example.com');
      const event2 = logger.logFailedLogin('user@example.com');
      
      expect(event1.details.additionalContext?.userIdentifier).toBe(
        event2.details.additionalContext?.userIdentifier
      );
    });

    it('should generate different hashes for different identifiers', () => {
      const event1 = logger.logFailedLogin('user1@example.com');
      const event2 = logger.logFailedLogin('user2@example.com');
      
      expect(event1.details.additionalContext?.userIdentifier).not.toBe(
        event2.details.additionalContext?.userIdentifier
      );
    });
  });
});