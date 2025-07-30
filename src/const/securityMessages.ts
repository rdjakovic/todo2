/**
 * Security Error Messages and Constants
 * 
 * Defines standardized error messages, types, and severity classifications
 * for consistent security error handling across the application.
 */

export enum AuthSecurityErrorType {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  CONCURRENT_REQUEST = 'CONCURRENT_REQUEST',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorMessageConfig {
  userMessage: string;
  logMessage: string;
  severity: ErrorSeverity;
  shouldRetry: boolean;
  retryDelay?: number;
}

/**
 * Generic error messages that don't reveal sensitive information
 * All authentication failures use consistent messaging
 */
export const SECURITY_ERROR_MESSAGES: Record<AuthSecurityErrorType, ErrorMessageConfig> = {
  [AuthSecurityErrorType.RATE_LIMIT_EXCEEDED]: {
    userMessage: "Too many login attempts. Please try again later.",
    logMessage: "Rate limit exceeded for authentication attempts",
    severity: ErrorSeverity.HIGH,
    shouldRetry: true,
    retryDelay: 900000 // 15 minutes
  },
  
  [AuthSecurityErrorType.ACCOUNT_LOCKED]: {
    userMessage: "Too many login attempts. Please try again later.",
    logMessage: "Account locked due to excessive failed attempts",
    severity: ErrorSeverity.HIGH,
    shouldRetry: true,
    retryDelay: 900000 // 15 minutes
  },
  
  [AuthSecurityErrorType.INVALID_CREDENTIALS]: {
    userMessage: "Invalid credentials. Please check your email and password.",
    logMessage: "Authentication failed with invalid credentials",
    severity: ErrorSeverity.MEDIUM,
    shouldRetry: true,
    retryDelay: 1000 // 1 second
  },
  
  [AuthSecurityErrorType.NETWORK_ERROR]: {
    userMessage: "Connection error. Please check your internet connection and try again.",
    logMessage: "Network error during authentication request",
    severity: ErrorSeverity.LOW,
    shouldRetry: true,
    retryDelay: 5000 // 5 seconds
  },
  
  [AuthSecurityErrorType.VALIDATION_ERROR]: {
    userMessage: "Please check your input and try again.",
    logMessage: "Input validation failed for authentication request",
    severity: ErrorSeverity.LOW,
    shouldRetry: false
  },
  
  [AuthSecurityErrorType.STORAGE_ERROR]: {
    userMessage: "A temporary error occurred. Please try again.",
    logMessage: "Security state storage operation failed",
    severity: ErrorSeverity.MEDIUM,
    shouldRetry: true,
    retryDelay: 2000 // 2 seconds
  },
  
  [AuthSecurityErrorType.ENCRYPTION_ERROR]: {
    userMessage: "A security error occurred. Please refresh the page and try again.",
    logMessage: "Encryption/decryption operation failed",
    severity: ErrorSeverity.HIGH,
    shouldRetry: false
  },
  
  [AuthSecurityErrorType.CONCURRENT_REQUEST]: {
    userMessage: "Please wait for the current request to complete.",
    logMessage: "Concurrent authentication request blocked",
    severity: ErrorSeverity.MEDIUM,
    shouldRetry: true,
    retryDelay: 1000 // 1 second
  },
  
  [AuthSecurityErrorType.UNKNOWN_ERROR]: {
    userMessage: "An unexpected error occurred. Please try again.",
    logMessage: "Unknown error during authentication process",
    severity: ErrorSeverity.MEDIUM,
    shouldRetry: true,
    retryDelay: 3000 // 3 seconds
  }
};

/**
 * Fallback error message for any unhandled error scenarios
 */
export const FALLBACK_ERROR_MESSAGE: ErrorMessageConfig = {
  userMessage: "An unexpected error occurred. Please try again.",
  logMessage: "Unhandled error in authentication flow",
  severity: ErrorSeverity.MEDIUM,
  shouldRetry: true,
  retryDelay: 3000
};

/**
 * Error message for when the system is temporarily unavailable
 */
export const SYSTEM_UNAVAILABLE_MESSAGE: ErrorMessageConfig = {
  userMessage: "The system is temporarily unavailable. Please try again in a few minutes.",
  logMessage: "System unavailable during authentication attempt",
  severity: ErrorSeverity.HIGH,
  shouldRetry: true,
  retryDelay: 300000 // 5 minutes
};

/**
 * Success messages for positive user feedback
 */
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Successfully logged in.",
  LOGOUT_SUCCESS: "Successfully logged out.",
  ACCOUNT_UNLOCKED: "Your account is now available for login."
} as const;

/**
 * Validation error messages for form inputs
 */
export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: "Email address is required.",
  EMAIL_INVALID: "Please enter a valid email address.",
  PASSWORD_REQUIRED: "Password is required.",
  PASSWORD_TOO_SHORT: "Password must be at least 6 characters long.",
  FORM_INCOMPLETE: "Please fill in all required fields."
} as const;

/**
 * Security event descriptions for logging
 */
export const SECURITY_EVENT_DESCRIPTIONS: Record<AuthSecurityErrorType, string> = {
  [AuthSecurityErrorType.RATE_LIMIT_EXCEEDED]: "User exceeded maximum authentication attempts",
  [AuthSecurityErrorType.ACCOUNT_LOCKED]: "Account locked due to security policy violation",
  [AuthSecurityErrorType.INVALID_CREDENTIALS]: "Authentication attempt with invalid credentials",
  [AuthSecurityErrorType.NETWORK_ERROR]: "Network connectivity issue during authentication",
  [AuthSecurityErrorType.VALIDATION_ERROR]: "Input validation failure in authentication form",
  [AuthSecurityErrorType.STORAGE_ERROR]: "Security state storage operation failure",
  [AuthSecurityErrorType.ENCRYPTION_ERROR]: "Cryptographic operation failure",
  [AuthSecurityErrorType.CONCURRENT_REQUEST]: "Multiple simultaneous authentication requests detected",
  [AuthSecurityErrorType.UNKNOWN_ERROR]: "Unidentified error in authentication process"
};

/**
 * Helper function to get error configuration by type
 */
export function getErrorConfig(errorType: AuthSecurityErrorType): ErrorMessageConfig {
  return SECURITY_ERROR_MESSAGES[errorType] || FALLBACK_ERROR_MESSAGE;
}

/**
 * Helper function to determine if an error type should trigger security logging
 */
export function shouldLogSecurityEvent(errorType: AuthSecurityErrorType): boolean {
  const highSecurityEvents = [
    AuthSecurityErrorType.RATE_LIMIT_EXCEEDED,
    AuthSecurityErrorType.ACCOUNT_LOCKED,
    AuthSecurityErrorType.ENCRYPTION_ERROR,
    AuthSecurityErrorType.CONCURRENT_REQUEST
  ];
  
  return highSecurityEvents.includes(errorType);
}

/**
 * Helper function to get user-friendly error message
 */
export function getUserMessage(errorType: AuthSecurityErrorType): string {
  return getErrorConfig(errorType).userMessage;
}

/**
 * Helper function to get log message for security events
 */
export function getLogMessage(errorType: AuthSecurityErrorType): string {
  return getErrorConfig(errorType).logMessage;
}

/**
 * Helper function to determine error severity
 */
export function getErrorSeverity(errorType: AuthSecurityErrorType): ErrorSeverity {
  return getErrorConfig(errorType).severity;
}