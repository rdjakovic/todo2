/**
 * Security Error Handler
 * 
 * Provides secure error processing, message sanitization, and standardization
 * for authentication errors while maintaining comprehensive security logging.
 */

import { 
  AuthSecurityErrorType, 
  ErrorSeverity,

  FALLBACK_ERROR_MESSAGE,
  getErrorConfig,
  shouldLogSecurityEvent,
  SECURITY_EVENT_DESCRIPTIONS
} from '../const/securityMessages';

import { 
  SecurityLogger, 
  SecurityEventType, 
  SecurityEventDetails,
  SecurityEvent
} from './securityLogger';

export interface ErrorContext {
  userIdentifier?: string;
  attemptCount?: number;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  additionalContext?: Record<string, any>;
}

export interface SecureErrorResponse {
  userMessage: string;
  errorType: AuthSecurityErrorType;
  severity: ErrorSeverity;
  shouldRetry: boolean;
  retryDelay?: number;
  shouldLog: boolean;
  logEvent?: SecurityEvent;
}

export interface AuthSecurityError extends Error {
  type: AuthSecurityErrorType;
  code: string;
  userMessage: string;
  logMessage: string;
  context: ErrorContext;
  shouldRetry: boolean;
  originalError?: Error;
}

export interface SecurityErrorHandlerOptions {
  enableLogging?: boolean;
  sanitizeMessages?: boolean;
  includeStackTrace?: boolean;
  maxContextLength?: number;
  logger?: SecurityLogger;
}

export class SecurityErrorHandler {
  private static readonly DEFAULT_OPTIONS: Required<SecurityErrorHandlerOptions> = {
    enableLogging: true,
    sanitizeMessages: true,
    includeStackTrace: false,
    maxContextLength: 500,
    logger: new SecurityLogger()
  };

  private options: Required<SecurityErrorHandlerOptions>;

  constructor(options: SecurityErrorHandlerOptions = {}) {
    this.options = { ...SecurityErrorHandler.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Main error handling method that processes authentication errors
   */
  handleAuthError(error: unknown, context: ErrorContext): SecureErrorResponse {
    try {
      const errorType = this.classifyError(error);
      const errorConfig = getErrorConfig(errorType);
      const sanitizedContext = this.sanitizeContext(context);
      
      let logEvent: SecurityEvent | undefined;
      
      // Log security event if required
      if (this.options.enableLogging && shouldLogSecurityEvent(errorType)) {
        logEvent = this.logSecurityEvent(errorType, error, sanitizedContext);
        
        // Log additional context for comprehensive monitoring
        this.logContextualInformation(errorType, sanitizedContext, logEvent);
      }

      return {
        userMessage: this.sanitizeUserMessage(errorConfig.userMessage),
        errorType,
        severity: errorConfig.severity,
        shouldRetry: errorConfig.shouldRetry,
        retryDelay: errorConfig.retryDelay,
        shouldLog: shouldLogSecurityEvent(errorType),
        logEvent
      };
    } catch (handlingError) {
      // Fallback error handling if the main handler fails
      return this.createFallbackResponse(handlingError, context);
    }
  }

  /**
   * Classify the error type based on error characteristics
   */
  private classifyError(error: unknown): AuthSecurityErrorType {
    if (!error) {
      return AuthSecurityErrorType.UNKNOWN_ERROR;
    }

    // Handle AuthSecurityError instances
    if (this.isAuthSecurityError(error)) {
      return error.type;
    }

    // Handle standard Error instances
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const name = error.name.toLowerCase();

      // Network-related errors
      if (message.includes('network') || message.includes('fetch') || 
          message.includes('connection') || name.includes('networkerror')) {
        return AuthSecurityErrorType.NETWORK_ERROR;
      }

      // Rate limiting errors
      if (message.includes('rate limit') || message.includes('too many requests') ||
          message.includes('429')) {
        return AuthSecurityErrorType.RATE_LIMIT_EXCEEDED;
      }

      // Account lockout errors
      if (message.includes('locked') || message.includes('blocked') ||
          message.includes('suspended')) {
        return AuthSecurityErrorType.ACCOUNT_LOCKED;
      }

      // Validation errors
      if (message.includes('validation') || message.includes('invalid format') ||
          message.includes('required field') || name.includes('validationerror')) {
        return AuthSecurityErrorType.VALIDATION_ERROR;
      }

      // Storage errors
      if (message.includes('storage') || message.includes('localstorage') ||
          message.includes('quota') || name.includes('quotaexceedederror')) {
        return AuthSecurityErrorType.STORAGE_ERROR;
      }

      // Encryption errors
      if (message.includes('encrypt') || message.includes('decrypt') ||
          message.includes('crypto') || name.includes('cryptoerror')) {
        return AuthSecurityErrorType.ENCRYPTION_ERROR;
      }

      // Authentication errors (default for auth-related errors)
      if (message.includes('auth') || message.includes('login') ||
          message.includes('credential') || message.includes('unauthorized')) {
        return AuthSecurityErrorType.INVALID_CREDENTIALS;
      }
    }

    // Handle Supabase-specific errors
    if (this.isSupabaseError(error)) {
      return this.classifySupabaseError(error);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return this.classifyStringError(error);
    }

    return AuthSecurityErrorType.UNKNOWN_ERROR;
  }

  /**
   * Check if error is an AuthSecurityError instance
   */
  private isAuthSecurityError(error: unknown): error is AuthSecurityError {
    return typeof error === 'object' && 
           error !== null && 
           'type' in error && 
           Object.values(AuthSecurityErrorType).includes((error as any).type);
  }

  /**
   * Check if error is a Supabase error
   */
  private isSupabaseError(error: unknown): boolean {
    return typeof error === 'object' && 
           error !== null && 
           ('status' in error || 'statusCode' in error || 'code' in error);
  }

  /**
   * Classify Supabase-specific errors
   */
  private classifySupabaseError(error: any): AuthSecurityErrorType {
    const status = error.status || error.statusCode;
    const code = error.code;
    const message = error.message?.toLowerCase() || '';

    // HTTP status code classification
    if (status === 429) {
      return AuthSecurityErrorType.RATE_LIMIT_EXCEEDED;
    }

    if (status === 401 || status === 403) {
      return AuthSecurityErrorType.INVALID_CREDENTIALS;
    }

    if (status >= 500) {
      return AuthSecurityErrorType.NETWORK_ERROR;
    }

    // Supabase error code classification
    if (code === 'invalid_credentials' || code === 'email_not_confirmed') {
      return AuthSecurityErrorType.INVALID_CREDENTIALS;
    }

    if (code === 'too_many_requests') {
      return AuthSecurityErrorType.RATE_LIMIT_EXCEEDED;
    }

    // Message-based classification
    if (message.includes('invalid') || message.includes('wrong')) {
      return AuthSecurityErrorType.INVALID_CREDENTIALS;
    }

    return AuthSecurityErrorType.NETWORK_ERROR;
  }

  /**
   * Classify string-based errors
   */
  private classifyStringError(error: string): AuthSecurityErrorType {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('rate limit') || lowerError.includes('too many')) {
      return AuthSecurityErrorType.RATE_LIMIT_EXCEEDED;
    }

    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return AuthSecurityErrorType.NETWORK_ERROR;
    }

    if (lowerError.includes('invalid') || lowerError.includes('wrong')) {
      return AuthSecurityErrorType.INVALID_CREDENTIALS;
    }

    return AuthSecurityErrorType.UNKNOWN_ERROR;
  }

  /**
   * Sanitize error messages to prevent XSS and information disclosure
   */
  sanitizeUserMessage(message: string): string {
    if (!this.options.sanitizeMessages) {
      return message;
    }

    // Remove HTML tags and potentially dangerous characters
    let sanitized = message
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();

    // Limit message length
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200) + '...';
    }

    // Ensure message is not empty
    if (!sanitized) {
      sanitized = FALLBACK_ERROR_MESSAGE.userMessage;
    }

    return sanitized;
  }

  /**
   * Sanitize error context to remove sensitive information
   */
  private sanitizeContext(context: ErrorContext): ErrorContext {
    const sanitized: ErrorContext = {
      ...context,
      timestamp: new Date()
    };

    // Sanitize user identifier (hash it)
    if (sanitized.userIdentifier) {
      sanitized.userIdentifier = this.hashSensitiveData(sanitized.userIdentifier);
    }

    // Sanitize user agent
    if (sanitized.userAgent) {
      sanitized.userAgent = sanitized.userAgent.replace(
        /\(([^)]+)\)/g, 
        '(system-info-removed)'
      );
    }

    // Sanitize IP address
    if (sanitized.ipAddress) {
      sanitized.ipAddress = sanitized.ipAddress.replace(
        /(\d+\.\d+\.\d+)\.\d+/,
        '$1.xxx'
      );
    }

    // Sanitize additional context
    if (sanitized.additionalContext) {
      sanitized.additionalContext = this.sanitizeAdditionalContext(
        sanitized.additionalContext
      );
    }

    return sanitized;
  }

  /**
   * Sanitize additional context object
   */
  private sanitizeAdditionalContext(context: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

    for (const [key, value] of Object.entries(context)) {
      const isSensitive = sensitiveKeys.some(sensitive => 
        key.toLowerCase().includes(sensitive)
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        if (value.length > this.options.maxContextLength) {
          sanitized[key] = value.substring(0, this.options.maxContextLength) + '...[TRUNCATED]';
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Hash sensitive data for logging
   */
  private hashSensitiveData(data: string): string {
    try {
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return `hash_${Math.abs(hash).toString(16).substring(0, 16)}`;
    } catch (error) {
      return `hash_${Date.now().toString(16).substring(0, 16)}`;
    }
  }

  /**
   * Log security event
   */
  private logSecurityEvent(
    errorType: AuthSecurityErrorType, 
    error: unknown, 
    context: ErrorContext
  ): SecurityEvent {
    const eventType = this.mapErrorTypeToSecurityEvent(errorType);
    const details: SecurityEventDetails = {
      attemptCount: context.attemptCount,
      userAgent: context.userAgent,
      timestamp: context.timestamp,
      sessionId: context.sessionId,
      errorCode: error instanceof Error ? error.name : 'UnknownError',
      additionalContext: {
        errorType,
        userIdentifier: context.userIdentifier,
        originalMessage: error instanceof Error ? error.message : String(error),
        stack: this.options.includeStackTrace && error instanceof Error ? error.stack : undefined,
        ...context.additionalContext
      }
    };

    return this.options.logger.logEvent(
      eventType,
      details,
      SECURITY_EVENT_DESCRIPTIONS[errorType]
    );
  }

  /**
   * Log additional contextual information for comprehensive monitoring
   */
  private logContextualInformation(
    _errorType: AuthSecurityErrorType,
    context: ErrorContext,
    primaryEvent: SecurityEvent
  ): void {
    try {
      // Create a batch for related events
      const batch = this.options.logger.createEventBatch();
      
      // Log user agent analysis if available
      if (context.userAgent) {
        batch.addEvent(SecurityEventType.FAILED_LOGIN, {
          userAgent: context.userAgent,
          timestamp: new Date(),
          additionalContext: {
            relatedEventId: primaryEvent.id,
            component: 'SecurityErrorHandler',
            action: 'user_agent_analysis',
            browserInfo: this.extractBrowserInfo(context.userAgent),
            userIdentifier: context.userIdentifier
          }
        });
      }
      
      // Log timing information for pattern analysis
      if (context.timestamp) {
        const timeOfDay = context.timestamp.getHours();
        const dayOfWeek = context.timestamp.getDay();
        
        batch.addEvent(SecurityEventType.FAILED_LOGIN, {
          timestamp: context.timestamp,
          additionalContext: {
            relatedEventId: primaryEvent.id,
            component: 'SecurityErrorHandler',
            action: 'timing_analysis',
            timeOfDay,
            dayOfWeek,
            isBusinessHours: timeOfDay >= 9 && timeOfDay <= 17,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            userIdentifier: context.userIdentifier
          }
        });
      }
      
      // Log attempt frequency if available
      if (context.attemptCount && context.attemptCount > 1) {
        batch.addEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
          attemptCount: context.attemptCount,
          timestamp: new Date(),
          additionalContext: {
            relatedEventId: primaryEvent.id,
            component: 'SecurityErrorHandler',
            action: 'attempt_frequency_analysis',
            isHighFrequency: context.attemptCount >= 3,
            userIdentifier: context.userIdentifier
          }
        });
      }
      
      // Log session information if available
      if (context.sessionId) {
        batch.addEvent(SecurityEventType.FAILED_LOGIN, {
          sessionId: context.sessionId,
          timestamp: new Date(),
          additionalContext: {
            relatedEventId: primaryEvent.id,
            component: 'SecurityErrorHandler',
            action: 'session_analysis',
            sessionLength: context.sessionId.length,
            userIdentifier: context.userIdentifier
          }
        });
      }
      
    } catch (contextError) {
      // Log the contextual logging error but don't throw
      this.options.logger.logSecurityError(
        SecurityEventType.STORAGE_ERROR,
        contextError instanceof Error ? contextError : new Error(String(contextError)),
        {
          component: 'SecurityErrorHandler',
          action: 'logContextualInformation',
          primaryEventId: primaryEvent.id
        }
      );
    }
  }

  /**
   * Extract browser information from user agent
   */
  private extractBrowserInfo(userAgent: string): Record<string, any> {
    try {
      const browserInfo: Record<string, any> = {
        isChrome: userAgent.includes('Chrome'),
        isFirefox: userAgent.includes('Firefox'),
        isSafari: userAgent.includes('Safari') && !userAgent.includes('Chrome'),
        isEdge: userAgent.includes('Edge'),
        isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
        isBot: /bot|crawler|spider/i.test(userAgent)
      };
      
      // Extract version information (simplified)
      const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
      if (chromeMatch) {
        browserInfo.chromeVersion = parseInt(chromeMatch[1]);
      }
      
      const firefoxMatch = userAgent.match(/Firefox\/(\d+)/);
      if (firefoxMatch) {
        browserInfo.firefoxVersion = parseInt(firefoxMatch[1]);
      }
      
      return browserInfo;
    } catch (error) {
      return { extractionError: true };
    }
  }

  /**
   * Map AuthSecurityErrorType to SecurityEventType
   */
  private mapErrorTypeToSecurityEvent(errorType: AuthSecurityErrorType): SecurityEventType {
    const mapping: Record<AuthSecurityErrorType, SecurityEventType> = {
      [AuthSecurityErrorType.RATE_LIMIT_EXCEEDED]: SecurityEventType.RATE_LIMIT_EXCEEDED,
      [AuthSecurityErrorType.ACCOUNT_LOCKED]: SecurityEventType.ACCOUNT_LOCKED,
      [AuthSecurityErrorType.INVALID_CREDENTIALS]: SecurityEventType.INVALID_CREDENTIALS,
      [AuthSecurityErrorType.NETWORK_ERROR]: SecurityEventType.NETWORK_ERROR,
      [AuthSecurityErrorType.VALIDATION_ERROR]: SecurityEventType.VALIDATION_ERROR,
      [AuthSecurityErrorType.STORAGE_ERROR]: SecurityEventType.STORAGE_ERROR,
      [AuthSecurityErrorType.ENCRYPTION_ERROR]: SecurityEventType.ENCRYPTION_ERROR,
      [AuthSecurityErrorType.CONCURRENT_REQUEST]: SecurityEventType.CONCURRENT_REQUEST_BLOCKED,
      [AuthSecurityErrorType.UNKNOWN_ERROR]: SecurityEventType.FAILED_LOGIN
    };

    return mapping[errorType] || SecurityEventType.FAILED_LOGIN;
  }

  /**
   * Create fallback response when error handling fails
   */
  private createFallbackResponse(error: unknown, context: ErrorContext): SecureErrorResponse {
    // Log the error handling failure
    if (this.options.enableLogging) {
      this.options.logger.logSecurityError(
        SecurityEventType.STORAGE_ERROR,
        error instanceof Error ? error : new Error(String(error)),
        { errorHandlerFailure: true, originalContext: context }
      );
    }

    return {
      userMessage: FALLBACK_ERROR_MESSAGE.userMessage,
      errorType: AuthSecurityErrorType.UNKNOWN_ERROR,
      severity: FALLBACK_ERROR_MESSAGE.severity,
      shouldRetry: FALLBACK_ERROR_MESSAGE.shouldRetry,
      retryDelay: FALLBACK_ERROR_MESSAGE.retryDelay,
      shouldLog: true
    };
  }

  /**
   * Create an AuthSecurityError instance
   */
  createAuthSecurityError(
    type: AuthSecurityErrorType,
    context: ErrorContext,
    originalError?: Error
  ): AuthSecurityError {
    const config = getErrorConfig(type);
    
    const error = new Error(config.logMessage) as AuthSecurityError;
    error.name = 'AuthSecurityError';
    error.type = type;
    error.code = type;
    error.userMessage = config.userMessage;
    error.logMessage = config.logMessage;
    error.context = context;
    error.shouldRetry = config.shouldRetry;
    error.originalError = originalError;

    return error;
  }

  /**
   * Handle network errors specifically
   */
  handleNetworkError(error: unknown, context: ErrorContext): SecureErrorResponse {
    return this.handleAuthError(
      this.createAuthSecurityError(AuthSecurityErrorType.NETWORK_ERROR, context, 
        error instanceof Error ? error : undefined),
      context
    );
  }

  /**
   * Handle validation errors specifically
   */
  handleValidationError(error: unknown, context: ErrorContext): SecureErrorResponse {
    return this.handleAuthError(
      this.createAuthSecurityError(AuthSecurityErrorType.VALIDATION_ERROR, context,
        error instanceof Error ? error : undefined),
      context
    );
  }

  /**
   * Handle rate limit errors specifically
   */
  handleRateLimitError(context: ErrorContext, attemptCount?: number): SecureErrorResponse {
    const enhancedContext = { ...context, attemptCount };
    return this.handleAuthError(
      this.createAuthSecurityError(AuthSecurityErrorType.RATE_LIMIT_EXCEEDED, enhancedContext),
      enhancedContext
    );
  }

  /**
   * Handle account lockout errors specifically
   */
  handleAccountLockoutError(context: ErrorContext, lockoutDuration?: number): SecureErrorResponse {
    const enhancedContext = { 
      ...context, 
      additionalContext: { 
        ...context.additionalContext, 
        lockoutDuration 
      }
    };
    return this.handleAuthError(
      this.createAuthSecurityError(AuthSecurityErrorType.ACCOUNT_LOCKED, enhancedContext),
      enhancedContext
    );
  }

  /**
   * Get configuration
   */
  getConfiguration(): Required<SecurityErrorHandlerOptions> {
    return { ...this.options };
  }

  /**
   * Update configuration
   */
  updateConfiguration(options: Partial<SecurityErrorHandlerOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// Export a default instance for convenience
export const securityErrorHandler = new SecurityErrorHandler();

// Export utility functions
export { 
  getErrorConfig, 
  shouldLogSecurityEvent, 
  getUserMessage, 
  getLogMessage, 
  getErrorSeverity 
} from '../const/securityMessages';