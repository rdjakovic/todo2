/**
 * Security Event Logging Utility
 * 
 * Provides structured security event logging with sanitization,
 * formatting, and different log levels for security monitoring.
 */

export enum SecurityEventType {
  FAILED_LOGIN = 'failed_login',
  SUCCESSFUL_LOGIN = 'successful_login',
  ACCOUNT_LOCKED = 'account_locked',
  LOCKOUT_EXPIRED = 'lockout_expired',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_CREDENTIALS = 'invalid_credentials',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  STORAGE_ERROR = 'storage_error',
  ENCRYPTION_ERROR = 'encryption_error',
  SECURITY_STATE_CORRUPTED = 'security_state_corrupted',
  CONCURRENT_REQUEST_BLOCKED = 'concurrent_request_blocked'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface SecurityEventDetails {
  attemptCount?: number;
  lockoutDuration?: number;
  userAgent?: string;
  ipAddress?: string;
  errorCode?: string;
  timestamp?: Date;
  sessionId?: string;
  additionalContext?: Record<string, any>;
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  level: LogLevel;
  message: string;
  details: SecurityEventDetails;
  timestamp: Date;
  source: string;
}

export interface SecurityLoggerOptions {
  enableConsoleLogging?: boolean;
  logLevel?: LogLevel;
  includeStackTrace?: boolean;
  sanitizeDetails?: boolean;
  maxDetailLength?: number;
}

export class SecurityLogger {
  private static readonly DEFAULT_OPTIONS: Required<SecurityLoggerOptions> = {
    enableConsoleLogging: true,
    logLevel: LogLevel.INFO,
    includeStackTrace: false,
    sanitizeDetails: true,
    maxDetailLength: 1000
  };

  private options: Required<SecurityLoggerOptions>;
  private eventCounter: number = 0;

  constructor(options: SecurityLoggerOptions = {}) {
    this.options = { ...SecurityLogger.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    this.eventCounter++;
    const timestamp = Date.now();
    return `sec_${timestamp}_${this.eventCounter}`;
  }

  /**
   * Determine severity based on event type
   */
  private determineSeverity(eventType: SecurityEventType): SecuritySeverity {
    const severityMap: Record<SecurityEventType, SecuritySeverity> = {
      [SecurityEventType.FAILED_LOGIN]: SecuritySeverity.MEDIUM,
      [SecurityEventType.SUCCESSFUL_LOGIN]: SecuritySeverity.LOW,
      [SecurityEventType.ACCOUNT_LOCKED]: SecuritySeverity.HIGH,
      [SecurityEventType.LOCKOUT_EXPIRED]: SecuritySeverity.LOW,
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: SecuritySeverity.HIGH,
      [SecurityEventType.INVALID_CREDENTIALS]: SecuritySeverity.MEDIUM,
      [SecurityEventType.NETWORK_ERROR]: SecuritySeverity.LOW,
      [SecurityEventType.VALIDATION_ERROR]: SecuritySeverity.LOW,
      [SecurityEventType.STORAGE_ERROR]: SecuritySeverity.MEDIUM,
      [SecurityEventType.ENCRYPTION_ERROR]: SecuritySeverity.HIGH,
      [SecurityEventType.SECURITY_STATE_CORRUPTED]: SecuritySeverity.CRITICAL,
      [SecurityEventType.CONCURRENT_REQUEST_BLOCKED]: SecuritySeverity.MEDIUM
    };

    return severityMap[eventType] || SecuritySeverity.MEDIUM;
  }

  /**
   * Determine log level based on severity
   */
  private determineLogLevel(severity: SecuritySeverity): LogLevel {
    const levelMap: Record<SecuritySeverity, LogLevel> = {
      [SecuritySeverity.LOW]: LogLevel.INFO,
      [SecuritySeverity.MEDIUM]: LogLevel.WARN,
      [SecuritySeverity.HIGH]: LogLevel.ERROR,
      [SecuritySeverity.CRITICAL]: LogLevel.ERROR
    };

    return levelMap[severity];
  }

  /**
   * Sanitize sensitive information from details
   */
  private sanitizeDetails(details: SecurityEventDetails): SecurityEventDetails {
    if (!this.options.sanitizeDetails) {
      return details;
    }

    const sanitized: SecurityEventDetails = { ...details };

    // Remove or mask sensitive information
    if (sanitized.userAgent) {
      // Keep only browser name and version, remove detailed system info
      sanitized.userAgent = sanitized.userAgent.replace(
        /\(([^)]+)\)/g, 
        '(system-info-removed)'
      );
    }

    if (sanitized.ipAddress) {
      // Mask IP address for privacy
      sanitized.ipAddress = sanitized.ipAddress.replace(
        /(\d+\.\d+\.\d+)\.\d+/,
        '$1.xxx'
      );
    }

    // Sanitize additional context
    if (sanitized.additionalContext) {
      const sanitizedContext: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(sanitized.additionalContext)) {
        // Skip potentially sensitive keys
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
        const isSensitive = sensitiveKeys.some(sensitive => 
          key.toLowerCase().includes(sensitive)
        );

        if (isSensitive) {
          sanitizedContext[key] = '[REDACTED]';
        } else if (typeof value === 'string' && value.length > this.options.maxDetailLength) {
          sanitizedContext[key] = value.substring(0, this.options.maxDetailLength) + '...[TRUNCATED]';
        } else {
          sanitizedContext[key] = value;
        }
      }
      
      sanitized.additionalContext = sanitizedContext;
    }

    return sanitized;
  }

  /**
   * Format event message based on type and details
   */
  private formatMessage(eventType: SecurityEventType, details: SecurityEventDetails): string {
    const messageTemplates: Record<SecurityEventType, string> = {
      [SecurityEventType.FAILED_LOGIN]: `Authentication failed${details.attemptCount ? ` (attempt ${details.attemptCount})` : ''}`,
      [SecurityEventType.SUCCESSFUL_LOGIN]: 'User successfully authenticated',
      [SecurityEventType.ACCOUNT_LOCKED]: `Account locked${details.lockoutDuration ? ` for ${details.lockoutDuration}ms` : ''}`,
      [SecurityEventType.LOCKOUT_EXPIRED]: 'Account lockout expired, access restored',
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded, request blocked',
      [SecurityEventType.INVALID_CREDENTIALS]: 'Invalid credentials provided',
      [SecurityEventType.NETWORK_ERROR]: 'Network error during authentication',
      [SecurityEventType.VALIDATION_ERROR]: 'Input validation failed',
      [SecurityEventType.STORAGE_ERROR]: 'Security state storage error',
      [SecurityEventType.ENCRYPTION_ERROR]: 'Encryption/decryption error',
      [SecurityEventType.SECURITY_STATE_CORRUPTED]: 'Security state corruption detected',
      [SecurityEventType.CONCURRENT_REQUEST_BLOCKED]: 'Concurrent authentication request blocked'
    };

    return messageTemplates[eventType] || `Security event: ${eventType}`;
  }

  /**
   * Check if event should be logged based on log level
   */
  private shouldLog(eventLevel: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.options.logLevel);
    const eventLevelIndex = levels.indexOf(eventLevel);
    
    return eventLevelIndex >= currentLevelIndex;
  }

  /**
   * Output log to console with appropriate formatting
   */
  private outputToConsole(event: SecurityEvent): void {
    if (!this.options.enableConsoleLogging || !this.shouldLog(event.level)) {
      return;
    }

    const timestamp = event.timestamp.toISOString();
    const prefix = `[SECURITY] [${event.level.toUpperCase()}] [${timestamp}]`;
    const message = `${prefix} ${event.message}`;

    // Choose appropriate console method based on log level
    switch (event.level) {
      case LogLevel.DEBUG:
        console.debug(message, event);
        break;
      case LogLevel.INFO:
        console.info(message, event);
        break;
      case LogLevel.WARN:
        console.warn(message, event);
        break;
      case LogLevel.ERROR:
        console.error(message, event);
        break;
      default:
        console.log(message, event);
    }
  }

  /**
   * Log a security event
   */
  logEvent(
    eventType: SecurityEventType,
    details: SecurityEventDetails = {},
    customMessage?: string
  ): SecurityEvent {
    const severity = this.determineSeverity(eventType);
    const level = this.determineLogLevel(severity);
    const sanitizedDetails = this.sanitizeDetails(details);
    const message = customMessage || this.formatMessage(eventType, sanitizedDetails);

    const event: SecurityEvent = {
      id: this.generateEventId(),
      type: eventType,
      severity,
      level,
      message,
      details: {
        ...sanitizedDetails,
        timestamp: new Date()
      },
      timestamp: new Date(),
      source: 'client'
    };

    this.outputToConsole(event);

    return event;
  }

  /**
   * Log failed authentication attempt
   */
  logFailedLogin(userIdentifier?: string, attemptCount?: number, additionalContext?: Record<string, any>): SecurityEvent {
    return this.logEvent(SecurityEventType.FAILED_LOGIN, {
      attemptCount,
      userAgent: navigator?.userAgent,
      additionalContext: {
        userIdentifier: userIdentifier ? this.hashIdentifier(userIdentifier) : undefined,
        ...additionalContext
      }
    });
  }

  /**
   * Log successful authentication
   */
  logSuccessfulLogin(userIdentifier?: string, additionalContext?: Record<string, any>): SecurityEvent {
    return this.logEvent(SecurityEventType.SUCCESSFUL_LOGIN, {
      userAgent: navigator?.userAgent,
      additionalContext: {
        userIdentifier: userIdentifier ? this.hashIdentifier(userIdentifier) : undefined,
        ...additionalContext
      }
    });
  }

  /**
   * Log account lockout event
   */
  logAccountLocked(userIdentifier?: string, lockoutDuration?: number, attemptCount?: number): SecurityEvent {
    return this.logEvent(SecurityEventType.ACCOUNT_LOCKED, {
      lockoutDuration,
      attemptCount,
      userAgent: navigator?.userAgent,
      additionalContext: {
        userIdentifier: userIdentifier ? this.hashIdentifier(userIdentifier) : undefined
      }
    });
  }

  /**
   * Log rate limit exceeded event
   */
  logRateLimitExceeded(userIdentifier?: string, attemptCount?: number): SecurityEvent {
    return this.logEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      attemptCount,
      userAgent: navigator?.userAgent,
      additionalContext: {
        userIdentifier: userIdentifier ? this.hashIdentifier(userIdentifier) : undefined
      }
    });
  }

  /**
   * Log security error event
   */
  logSecurityError(
    eventType: SecurityEventType,
    error: Error,
    additionalContext?: Record<string, any>
  ): SecurityEvent {
    return this.logEvent(eventType, {
      errorCode: error.name,
      userAgent: navigator?.userAgent,
      additionalContext: {
        errorMessage: error.message,
        stack: this.options.includeStackTrace ? error.stack : undefined,
        ...additionalContext
      }
    });
  }

  /**
   * Hash user identifier for privacy
   */
  public hashIdentifier(identifier: string): string {
    try {
      // Use a simple hash function for synchronous operation
      let hash = 0;
      for (let i = 0; i < identifier.length; i++) {
        const char = identifier.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16).substring(0, 16);
    } catch (error) {
      // Fallback to timestamp-based hash
      return Date.now().toString(16).substring(0, 16);
    }
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.options.logLevel = level;
  }

  /**
   * Enable or disable console logging
   */
  setConsoleLogging(enabled: boolean): void {
    this.options.enableConsoleLogging = enabled;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): Required<SecurityLoggerOptions> {
    return { ...this.options };
  }

  /**
   * Create a batch of events for bulk logging
   */
  createEventBatch(): SecurityEventBatch {
    return new SecurityEventBatch(this);
  }
}

/**
 * Security Event Batch for bulk logging operations
 */
export class SecurityEventBatch {
  private events: SecurityEvent[] = [];
  private logger: SecurityLogger;

  constructor(logger: SecurityLogger) {
    this.logger = logger;
  }

  /**
   * Add event to batch
   */
  addEvent(eventType: SecurityEventType, details: SecurityEventDetails = {}): this {
    const event = this.logger.logEvent(eventType, details);
    this.events.push(event);
    return this;
  }

  /**
   * Get all events in batch
   */
  getEvents(): SecurityEvent[] {
    return [...this.events];
  }

  /**
   * Clear batch
   */
  clear(): this {
    this.events = [];
    return this;
  }

  /**
   * Get batch summary
   */
  getSummary(): { total: number; bySeverity: Record<SecuritySeverity, number>; byType: Record<SecurityEventType, number> } {
    const summary = {
      total: this.events.length,
      bySeverity: {} as Record<SecuritySeverity, number>,
      byType: {} as Record<SecurityEventType, number>
    };

    // Initialize counters
    Object.values(SecuritySeverity).forEach(severity => {
      summary.bySeverity[severity] = 0;
    });
    Object.values(SecurityEventType).forEach(type => {
      summary.byType[type] = 0;
    });

    // Count events
    this.events.forEach(event => {
      summary.bySeverity[event.severity]++;
      summary.byType[event.type]++;
    });

    return summary;
  }
}

// Export a default instance for convenience
export const securityLogger = new SecurityLogger();