/**
 * Security Configuration System
 * 
 * Provides configurable security settings for authentication enhancements
 * including rate limiting, error handling, and security monitoring.
 */

export interface RateLimitConfig {
  maxAttempts: number;
  lockoutDuration: number; // in milliseconds
  progressiveDelay: boolean;
  baseDelay: number; // base delay in milliseconds for progressive delays
  maxDelay: number; // maximum delay cap in milliseconds
  storageKey: string;
}

export interface ErrorHandlingConfig {
  enableGenericMessages: boolean;
  enableDetailedLogging: boolean;
  sanitizeErrorMessages: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxErrorMessageLength: number;
}

export interface SecurityMonitoringConfig {
  enableSecurityLogging: boolean;
  enableEventBatching: boolean;
  batchSize: number;
  batchTimeout: number; // in milliseconds
  enableCrossTabSync: boolean;
  cleanupInterval: number; // in milliseconds
}

export interface StorageConfig {
  enableEncryption: boolean;
  enableIntegrityValidation: boolean;
  storagePrefix: string;
  encryptionKeyDerivation: 'pbkdf2' | 'scrypt';
  compressionEnabled: boolean;
}

export interface FeatureToggles {
  enableRateLimiting: boolean;
  enableProgressiveDelay: boolean;
  enableAccountLockout: boolean;
  enableSecurityLogging: boolean;
  enableErrorSanitization: boolean;
  enableCrossTabSync: boolean;
  enableEncryptedStorage: boolean;
  enableIntegrityValidation: boolean;
  enableSecurityMonitoring: boolean;
}

export interface CustomizableMessages {
  rateLimitExceeded: string;
  accountLocked: string;
  invalidCredentials: string;
  networkError: string;
  validationError: string;
  storageError: string;
  encryptionError: string;
  genericError: string;
}

export interface TimingParameters {
  rateLimitCheckInterval: number; // in milliseconds
  stateCleanupInterval: number; // in milliseconds
  lockoutGracePeriod: number; // in milliseconds
  progressiveDelayMultiplier: number;
  maxProgressiveDelay: number; // in milliseconds
  errorDisplayDuration: number; // in milliseconds
}

export interface SecurityConfig {
  rateLimit: RateLimitConfig;
  errorHandling: ErrorHandlingConfig;
  monitoring: SecurityMonitoringConfig;
  storage: StorageConfig;
  features: FeatureToggles;
  messages: CustomizableMessages;
  timing: TimingParameters;
  environment: 'development' | 'production' | 'test';
  version: string;
}

export enum SecurityLevel {
  LENIENT = 'lenient',
  MODERATE = 'moderate',
  STRICT = 'strict'
}

export interface SecurityLevelPreset {
  level: SecurityLevel;
  config: Partial<SecurityConfig>;
  description: string;
}

/**
 * Default security configuration
 */
const DEFAULT_CONFIG: SecurityConfig = {
  rateLimit: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    progressiveDelay: true,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    storageKey: 'auth_security_state'
  },
  errorHandling: {
    enableGenericMessages: true,
    enableDetailedLogging: true,
    sanitizeErrorMessages: true,
    logLevel: 'info',
    maxErrorMessageLength: 500
  },
  monitoring: {
    enableSecurityLogging: true,
    enableEventBatching: true,
    batchSize: 10,
    batchTimeout: 5000, // 5 seconds
    enableCrossTabSync: true,
    cleanupInterval: 60000 // 1 minute
  },
  storage: {
    enableEncryption: true,
    enableIntegrityValidation: true,
    storagePrefix: 'todo2_security_',
    encryptionKeyDerivation: 'pbkdf2',
    compressionEnabled: false
  },
  features: {
    enableRateLimiting: true,
    enableProgressiveDelay: true,
    enableAccountLockout: true,
    enableSecurityLogging: true,
    enableErrorSanitization: true,
    enableCrossTabSync: true,
    enableEncryptedStorage: true,
    enableIntegrityValidation: true,
    enableSecurityMonitoring: true
  },
  messages: {
    rateLimitExceeded: "Too many login attempts. Please try again later.",
    accountLocked: "Too many login attempts. Please try again later.",
    invalidCredentials: "Invalid credentials. Please check your email and password.",
    networkError: "Connection error. Please check your internet connection and try again.",
    validationError: "Please check your input and try again.",
    storageError: "A temporary error occurred. Please try again.",
    encryptionError: "A security error occurred. Please refresh the page and try again.",
    genericError: "An error occurred. Please try again."
  },
  timing: {
    rateLimitCheckInterval: 1000, // 1 second
    stateCleanupInterval: 60000, // 1 minute
    lockoutGracePeriod: 5000, // 5 seconds
    progressiveDelayMultiplier: 2.0,
    maxProgressiveDelay: 30000, // 30 seconds
    errorDisplayDuration: 5000 // 5 seconds
  },
  environment: 'production',
  version: '1.0.0'
};

/**
 * Development environment overrides
 */
const DEVELOPMENT_OVERRIDES: Partial<SecurityConfig> = {
  rateLimit: {
    maxAttempts: 3,
    lockoutDuration: 5 * 60 * 1000, // 5 minutes for faster testing
    progressiveDelay: true,
    baseDelay: 500,
    maxDelay: 10000,
    storageKey: 'dev_auth_security_state'
  },
  errorHandling: {
    enableGenericMessages: false, // Show detailed errors in dev
    enableDetailedLogging: true,
    sanitizeErrorMessages: false,
    logLevel: 'debug',
    maxErrorMessageLength: 1000
  },
  monitoring: {
    enableSecurityLogging: true,
    enableEventBatching: false, // Immediate logging in dev
    batchSize: 1,
    batchTimeout: 0,
    enableCrossTabSync: true,
    cleanupInterval: 30000 // 30 seconds
  },
  storage: {
    enableEncryption: false, // Disable encryption in dev for easier debugging
    enableIntegrityValidation: true,
    storagePrefix: 'dev_todo2_security_',
    encryptionKeyDerivation: 'pbkdf2',
    compressionEnabled: false
  },
  features: {
    enableRateLimiting: true,
    enableProgressiveDelay: true,
    enableAccountLockout: true,
    enableSecurityLogging: true,
    enableErrorSanitization: false, // Show detailed errors in dev
    enableCrossTabSync: true,
    enableEncryptedStorage: false, // Easier debugging
    enableIntegrityValidation: true,
    enableSecurityMonitoring: true
  },
  messages: {
    rateLimitExceeded: "[DEV] Rate limit exceeded - too many attempts",
    accountLocked: "[DEV] Account locked due to failed attempts",
    invalidCredentials: "[DEV] Authentication failed - invalid credentials",
    networkError: "[DEV] Network error occurred during authentication",
    validationError: "[DEV] Input validation failed",
    storageError: "[DEV] Storage operation failed",
    encryptionError: "[DEV] Encryption/decryption error",
    genericError: "[DEV] Generic error occurred"
  },
  timing: {
    rateLimitCheckInterval: 500, // Faster checks in dev
    stateCleanupInterval: 30000, // 30 seconds
    lockoutGracePeriod: 2000, // 2 seconds
    progressiveDelayMultiplier: 1.5,
    maxProgressiveDelay: 10000, // 10 seconds
    errorDisplayDuration: 10000 // 10 seconds for easier debugging
  },
  environment: 'development'
};

/**
 * Test environment overrides
 */
const TEST_OVERRIDES: Partial<SecurityConfig> = {
  rateLimit: {
    maxAttempts: 2,
    lockoutDuration: 1000, // 1 second for fast tests
    progressiveDelay: false,
    baseDelay: 100,
    maxDelay: 1000,
    storageKey: 'test_auth_security_state'
  },
  errorHandling: {
    enableGenericMessages: true,
    enableDetailedLogging: false,
    sanitizeErrorMessages: true,
    logLevel: 'error',
    maxErrorMessageLength: 200
  },
  monitoring: {
    enableSecurityLogging: false, // Disable logging in tests
    enableEventBatching: false,
    batchSize: 1,
    batchTimeout: 0,
    enableCrossTabSync: false,
    cleanupInterval: 1000
  },
  storage: {
    enableEncryption: false,
    enableIntegrityValidation: false,
    storagePrefix: 'test_todo2_security_',
    encryptionKeyDerivation: 'pbkdf2',
    compressionEnabled: false
  },
  features: {
    enableRateLimiting: true,
    enableProgressiveDelay: false, // Faster tests
    enableAccountLockout: true,
    enableSecurityLogging: false, // No logging in tests
    enableErrorSanitization: true,
    enableCrossTabSync: false, // No cross-tab in tests
    enableEncryptedStorage: false, // Faster tests
    enableIntegrityValidation: false, // Faster tests
    enableSecurityMonitoring: false // No monitoring in tests
  },
  messages: {
    rateLimitExceeded: "Test: Rate limit exceeded",
    accountLocked: "Test: Account locked",
    invalidCredentials: "Test: Invalid credentials",
    networkError: "Test: Network error",
    validationError: "Test: Validation error",
    storageError: "Test: Storage error",
    encryptionError: "Test: Encryption error",
    genericError: "Test: Generic error"
  },
  timing: {
    rateLimitCheckInterval: 100, // Very fast for tests
    stateCleanupInterval: 1000, // 1 second
    lockoutGracePeriod: 100, // 100ms
    progressiveDelayMultiplier: 1.0, // No progression in tests
    maxProgressiveDelay: 1000, // 1 second max
    errorDisplayDuration: 1000 // 1 second
  },
  environment: 'test'
};

/**
 * Security level presets
 */
export const SECURITY_LEVEL_PRESETS: Record<SecurityLevel, SecurityLevelPreset> = {
  [SecurityLevel.LENIENT]: {
    level: SecurityLevel.LENIENT,
    description: 'Relaxed security settings for better user experience',
    config: {
      rateLimit: {
        maxAttempts: 10,
        lockoutDuration: 5 * 60 * 1000, // 5 minutes
        progressiveDelay: false,
        baseDelay: 500,
        maxDelay: 5000,
        storageKey: 'auth_security_state'
      },
      errorHandling: {
        enableGenericMessages: false,
        enableDetailedLogging: true,
        sanitizeErrorMessages: true,
        logLevel: 'warn',
        maxErrorMessageLength: 300
      },
      features: {
        enableRateLimiting: true,
        enableProgressiveDelay: false, // Disabled for better UX
        enableAccountLockout: true,
        enableSecurityLogging: true,
        enableErrorSanitization: false, // Show more details
        enableCrossTabSync: true,
        enableEncryptedStorage: true,
        enableIntegrityValidation: true,
        enableSecurityMonitoring: true
      },
      messages: {
        rateLimitExceeded: "Please wait a moment before trying again.",
        accountLocked: "Please wait a few minutes before trying again.",
        invalidCredentials: "Login failed. Please check your credentials and try again.",
        networkError: "Connection issue. Please check your internet and try again.",
        validationError: "Please check your input and try again.",
        storageError: "A temporary issue occurred. Please try again.",
        encryptionError: "A security issue occurred. Please refresh and try again.",
        genericError: "Something went wrong. Please try again."
      },
      timing: {
        rateLimitCheckInterval: 2000, // Slower checks
        stateCleanupInterval: 120000, // 2 minutes
        lockoutGracePeriod: 10000, // 10 seconds grace
        progressiveDelayMultiplier: 1.0, // No progression
        maxProgressiveDelay: 5000, // 5 seconds max
        errorDisplayDuration: 3000 // 3 seconds
      }
    }
  },
  [SecurityLevel.MODERATE]: {
    level: SecurityLevel.MODERATE,
    description: 'Balanced security settings (default)',
    config: DEFAULT_CONFIG
  },
  [SecurityLevel.STRICT]: {
    level: SecurityLevel.STRICT,
    description: 'Enhanced security settings for high-security environments',
    config: {
      rateLimit: {
        maxAttempts: 3,
        lockoutDuration: 30 * 60 * 1000, // 30 minutes
        progressiveDelay: true,
        baseDelay: 2000,
        maxDelay: 60000, // 1 minute
        storageKey: 'auth_security_state'
      },
      errorHandling: {
        enableGenericMessages: true,
        enableDetailedLogging: true,
        sanitizeErrorMessages: true,
        logLevel: 'info',
        maxErrorMessageLength: 100
      },
      monitoring: {
        enableSecurityLogging: true,
        enableEventBatching: true,
        batchSize: 5,
        batchTimeout: 2000,
        enableCrossTabSync: true,
        cleanupInterval: 30000
      },
      features: {
        enableRateLimiting: true,
        enableProgressiveDelay: true, // Full progressive delay
        enableAccountLockout: true,
        enableSecurityLogging: true,
        enableErrorSanitization: true, // Full sanitization
        enableCrossTabSync: true,
        enableEncryptedStorage: true,
        enableIntegrityValidation: true,
        enableSecurityMonitoring: true
      },
      messages: {
        rateLimitExceeded: "Access temporarily restricted.",
        accountLocked: "Access temporarily restricted.",
        invalidCredentials: "Authentication failed.",
        networkError: "Connection error occurred.",
        validationError: "Invalid input provided.",
        storageError: "System error occurred.",
        encryptionError: "Security error occurred.",
        genericError: "An error occurred."
      },
      timing: {
        rateLimitCheckInterval: 500, // Frequent checks
        stateCleanupInterval: 30000, // 30 seconds
        lockoutGracePeriod: 1000, // 1 second grace
        progressiveDelayMultiplier: 3.0, // Aggressive progression
        maxProgressiveDelay: 60000, // 1 minute max
        errorDisplayDuration: 8000 // 8 seconds
      }
    }
  }
};

/**
 * Security Configuration Manager
 */
export class SecurityConfigManager {
  private static instance: SecurityConfigManager;
  private config: SecurityConfig;
  private customOverrides: Partial<SecurityConfig> = {};

  private constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SecurityConfigManager {
    if (!SecurityConfigManager.instance) {
      SecurityConfigManager.instance = new SecurityConfigManager();
    }
    return SecurityConfigManager.instance;
  }

  /**
   * Load configuration based on environment
   */
  private loadConfiguration(): SecurityConfig {
    const environment = this.detectEnvironment();
    let config = { ...DEFAULT_CONFIG };

    // Apply environment-specific overrides
    switch (environment) {
      case 'development':
        config = this.mergeConfig(config, DEVELOPMENT_OVERRIDES);
        break;
      case 'test':
        config = this.mergeConfig(config, TEST_OVERRIDES);
        break;
      case 'production':
      default:
        // Use default config for production
        break;
    }

    config.environment = environment;
    return config;
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): 'development' | 'production' | 'test' {
    // Check for test environment first
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return 'test';
    }
    
    // Check for Vitest test environment
    if (typeof globalThis !== 'undefined' && 'vi' in globalThis) {
      return 'test';
    }

    // Check for development environment
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      return 'development';
    }

    // Check for Vite dev mode
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      return 'development';
    }

    // Default to production
    return 'production';
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(base: SecurityConfig, override: Partial<SecurityConfig>): SecurityConfig {
    const merged = { ...base };

    for (const key in override) {
      const overrideValue = override[key as keyof SecurityConfig];
      if (overrideValue && typeof overrideValue === 'object' && !Array.isArray(overrideValue)) {
        merged[key as keyof SecurityConfig] = {
          ...merged[key as keyof SecurityConfig],
          ...overrideValue
        } as any;
      } else if (overrideValue !== undefined) {
        (merged as any)[key] = overrideValue;
      }
    }

    return merged;
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityConfig {
    return this.mergeConfig(this.config, this.customOverrides);
  }

  /**
   * Get specific configuration section
   */
  getRateLimitConfig(): RateLimitConfig {
    const config = this.getConfig();
    return config.rateLimit;
  }

  getErrorHandlingConfig(): ErrorHandlingConfig {
    const config = this.getConfig();
    return config.errorHandling;
  }

  getMonitoringConfig(): SecurityMonitoringConfig {
    const config = this.getConfig();
    return config.monitoring;
  }

  getStorageConfig(): StorageConfig {
    const config = this.getConfig();
    return config.storage;
  }

  getFeatureToggles(): FeatureToggles {
    const config = this.getConfig();
    return config.features;
  }

  getCustomizableMessages(): CustomizableMessages {
    const config = this.getConfig();
    return config.messages;
  }

  getTimingParameters(): TimingParameters {
    const config = this.getConfig();
    return config.timing;
  }

  /**
   * Update configuration with custom overrides
   */
  updateConfig(overrides: Partial<SecurityConfig>): void {
    // Merge new overrides with existing custom overrides
    this.customOverrides = this.mergeConfig(
      this.customOverrides as SecurityConfig,
      overrides
    );
  }

  /**
   * Apply security level preset
   */
  applySecurityLevel(level: SecurityLevel): void {
    const preset = SECURITY_LEVEL_PRESETS[level];
    if (preset) {
      this.updateConfig(preset.config);
    } else {
      throw new Error(`Invalid security level: ${level}`);
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    this.customOverrides = {};
    this.config = this.loadConfiguration();
  }

  /**
   * Validate configuration
   */
  validateConfig(config: Partial<SecurityConfig> = this.getConfig()): string[] {
    const errors: string[] = [];

    // Validate rate limit config
    if (config.rateLimit) {
      const { maxAttempts, lockoutDuration, baseDelay, maxDelay } = config.rateLimit;
      
      if (maxAttempts !== undefined && (maxAttempts < 1 || maxAttempts > 100)) {
        errors.push('maxAttempts must be between 1 and 100');
      }
      
      if (lockoutDuration !== undefined && (lockoutDuration < 1000 || lockoutDuration > 24 * 60 * 60 * 1000)) {
        errors.push('lockoutDuration must be between 1 second and 24 hours');
      }
      
      if (baseDelay !== undefined && baseDelay < 0) {
        errors.push('baseDelay must be non-negative');
      }
      
      if (maxDelay !== undefined && baseDelay !== undefined && maxDelay < baseDelay) {
        errors.push('maxDelay must be greater than or equal to baseDelay');
      }
    }

    // Validate error handling config
    if (config.errorHandling) {
      const { maxErrorMessageLength, logLevel } = config.errorHandling;
      
      if (maxErrorMessageLength !== undefined && (maxErrorMessageLength < 50 || maxErrorMessageLength > 2000)) {
        errors.push('maxErrorMessageLength must be between 50 and 2000 characters');
      }
      
      if (logLevel !== undefined && !['debug', 'info', 'warn', 'error'].includes(logLevel)) {
        errors.push('logLevel must be one of: debug, info, warn, error');
      }
    }

    // Validate monitoring config
    if (config.monitoring) {
      const { batchSize, batchTimeout, cleanupInterval } = config.monitoring;
      
      if (batchSize !== undefined && (batchSize < 1 || batchSize > 100)) {
        errors.push('batchSize must be between 1 and 100');
      }
      
      if (batchTimeout !== undefined && batchTimeout < 0) {
        errors.push('batchTimeout must be non-negative');
      }
      
      if (cleanupInterval !== undefined && cleanupInterval < 1000) {
        errors.push('cleanupInterval must be at least 1000ms');
      }
    }

    // Validate timing parameters
    if (config.timing) {
      const { 
        rateLimitCheckInterval, 
        stateCleanupInterval, 
        lockoutGracePeriod,
        progressiveDelayMultiplier,
        maxProgressiveDelay,
        errorDisplayDuration
      } = config.timing;
      
      if (rateLimitCheckInterval !== undefined && rateLimitCheckInterval < 100) {
        errors.push('rateLimitCheckInterval must be at least 100ms');
      }
      
      if (stateCleanupInterval !== undefined && stateCleanupInterval < 1000) {
        errors.push('stateCleanupInterval must be at least 1000ms');
      }
      
      if (lockoutGracePeriod !== undefined && lockoutGracePeriod < 0) {
        errors.push('lockoutGracePeriod must be non-negative');
      }
      
      if (progressiveDelayMultiplier !== undefined && (progressiveDelayMultiplier < 1.0 || progressiveDelayMultiplier > 10.0)) {
        errors.push('progressiveDelayMultiplier must be between 1.0 and 10.0');
      }
      
      if (maxProgressiveDelay !== undefined && maxProgressiveDelay < 1000) {
        errors.push('maxProgressiveDelay must be at least 1000ms');
      }
      
      if (errorDisplayDuration !== undefined && errorDisplayDuration < 1000) {
        errors.push('errorDisplayDuration must be at least 1000ms');
      }
    }

    // Validate messages
    if (config.messages) {
      Object.entries(config.messages).forEach(([key, message]) => {
        if (typeof message === 'string' && (message.length < 5 || message.length > 200)) {
          errors.push(`${key} message must be between 5 and 200 characters`);
        }
      });
    }

    return errors;
  }

  /**
   * Feature toggle methods
   */
  isFeatureEnabled(feature: keyof FeatureToggles): boolean {
    const features = this.getFeatureToggles();
    return features[feature];
  }

  enableFeature(feature: keyof FeatureToggles): void {
    this.updateConfig({
      features: {
        [feature]: true
      }
    });
  }

  disableFeature(feature: keyof FeatureToggles): void {
    this.updateConfig({
      features: {
        [feature]: false
      }
    });
  }

  toggleFeature(feature: keyof FeatureToggles): void {
    const currentState = this.isFeatureEnabled(feature);
    this.updateConfig({
      features: {
        [feature]: !currentState
      }
    });
  }

  /**
   * Message customization methods
   */
  updateMessage(messageType: keyof CustomizableMessages, message: string): void {
    this.updateConfig({
      messages: {
        [messageType]: message
      }
    });
  }

  updateMessages(messages: Partial<CustomizableMessages>): void {
    this.updateConfig({
      messages: messages
    });
  }

  getMessage(messageType: keyof CustomizableMessages): string {
    const messages = this.getCustomizableMessages();
    return messages[messageType];
  }

  /**
   * Timing parameter methods
   */
  updateTimingParameter(parameter: keyof TimingParameters, value: number): void {
    this.updateConfig({
      timing: {
        [parameter]: value
      }
    });
  }

  updateTimingParameters(parameters: Partial<TimingParameters>): void {
    this.updateConfig({
      timing: parameters
    });
  }

  getTimingParameter(parameter: keyof TimingParameters): number {
    const timing = this.getTimingParameters();
    return timing[parameter];
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): Record<string, any> {
    const config = this.getConfig();
    return {
      environment: config.environment,
      version: config.version,
      rateLimitMaxAttempts: config.rateLimit.maxAttempts,
      rateLimitLockoutDuration: config.rateLimit.lockoutDuration,
      errorHandlingGenericMessages: config.errorHandling.enableGenericMessages,
      monitoringEnabled: config.monitoring.enableSecurityLogging,
      storageEncrypted: config.storage.enableEncryption,
      featuresEnabled: Object.entries(config.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature),
      hasCustomOverrides: Object.keys(this.customOverrides).length > 0
    };
  }
}

// Export singleton instance
export const securityConfig = SecurityConfigManager.getInstance();

// Export types and constants
export type {
  SecurityConfig,
  RateLimitConfig,
  ErrorHandlingConfig,
  SecurityMonitoringConfig,
  StorageConfig,
  FeatureToggles,
  CustomizableMessages,
  TimingParameters,
  SecurityLevelPreset
};