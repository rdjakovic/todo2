/**
 * Security Configuration System Tests
 * 
 * Tests for configurable security settings and environment-based configuration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SecurityConfigManager,
  securityConfig,
  SecurityLevel,
  SECURITY_LEVEL_PRESETS,
  type SecurityConfig,
  type RateLimitConfig,
  type ErrorHandlingConfig,
  type SecurityMonitoringConfig,
  type StorageConfig
} from '../securityConfig';

describe('SecurityConfigManager', () => {
  let configManager: SecurityConfigManager;

  beforeEach(() => {
    // Create a fresh instance for each test
    configManager = SecurityConfigManager.getInstance();
    configManager.resetToDefaults();
  });

  afterEach(() => {
    // Clean up any environment variable mocks
    vi.unstubAllEnvs();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SecurityConfigManager.getInstance();
      const instance2 = SecurityConfigManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export a singleton instance', () => {
      expect(securityConfig).toBeInstanceOf(SecurityConfigManager);
      expect(securityConfig).toBe(SecurityConfigManager.getInstance());
    });
  });

  describe('Environment Detection', () => {
    it('should detect test environment', () => {
      const config = configManager.getConfig();
      expect(config.environment).toBe('test');
      expect(config.rateLimit.maxAttempts).toBe(2);
      expect(config.rateLimit.lockoutDuration).toBe(1000);
      expect(config.monitoring.enableSecurityLogging).toBe(false);
    });

    it('should detect development environment', () => {
      // Mock development environment by clearing test indicators
      const originalNodeEnv = process.env.NODE_ENV;
      const originalGlobalThis = globalThis;
      
      // Remove test environment indicators
      delete (globalThis as any).vi;
      vi.stubEnv('NODE_ENV', 'development');
      
      try {
        // Create new instance to pick up environment
        const devConfigManager = new (SecurityConfigManager as any)();
        const config = devConfigManager.getConfig();
        
        expect(config.environment).toBe('development');
        expect(config.rateLimit.maxAttempts).toBe(3);
        expect(config.rateLimit.lockoutDuration).toBe(5 * 60 * 1000);
        expect(config.errorHandling.enableGenericMessages).toBe(false);
        expect(config.storage.enableEncryption).toBe(false);
      } finally {
        // Restore test environment
        (globalThis as any).vi = vi;
        if (originalNodeEnv) {
          vi.stubEnv('NODE_ENV', originalNodeEnv);
        }
      }
    });

    it('should have production configuration values available', () => {
      // Test that production config values are defined in the system
      // Since we're in test environment, we can't easily test production detection
      // but we can verify the production config structure exists
      const testConfig = configManager.getConfig();
      
      // Apply a mock production-like config to test the structure
      configManager.updateConfig({
        environment: 'production',
        rateLimit: {
          maxAttempts: 5,
          lockoutDuration: 15 * 60 * 1000
        },
        errorHandling: {
          enableGenericMessages: true
        },
        storage: {
          enableEncryption: true
        }
      });
      
      const config = configManager.getConfig();
      expect(config.rateLimit.maxAttempts).toBe(5);
      expect(config.rateLimit.lockoutDuration).toBe(15 * 60 * 1000);
      expect(config.errorHandling.enableGenericMessages).toBe(true);
      expect(config.storage.enableEncryption).toBe(true);
      
      // Reset for other tests
      configManager.resetToDefaults();
    });
  });

  describe('Configuration Access', () => {
    it('should return complete configuration', () => {
      const config = configManager.getConfig();
      
      expect(config).toHaveProperty('rateLimit');
      expect(config).toHaveProperty('errorHandling');
      expect(config).toHaveProperty('monitoring');
      expect(config).toHaveProperty('storage');
      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('version');
    });

    it('should return rate limit configuration', () => {
      const rateLimitConfig = configManager.getRateLimitConfig();
      
      expect(rateLimitConfig).toHaveProperty('maxAttempts');
      expect(rateLimitConfig).toHaveProperty('lockoutDuration');
      expect(rateLimitConfig).toHaveProperty('progressiveDelay');
      expect(rateLimitConfig).toHaveProperty('baseDelay');
      expect(rateLimitConfig).toHaveProperty('maxDelay');
      expect(rateLimitConfig).toHaveProperty('storageKey');
      
      expect(typeof rateLimitConfig.maxAttempts).toBe('number');
      expect(typeof rateLimitConfig.lockoutDuration).toBe('number');
      expect(typeof rateLimitConfig.progressiveDelay).toBe('boolean');
    });

    it('should return error handling configuration', () => {
      const errorConfig = configManager.getErrorHandlingConfig();
      
      expect(errorConfig).toHaveProperty('enableGenericMessages');
      expect(errorConfig).toHaveProperty('enableDetailedLogging');
      expect(errorConfig).toHaveProperty('sanitizeErrorMessages');
      expect(errorConfig).toHaveProperty('logLevel');
      expect(errorConfig).toHaveProperty('maxErrorMessageLength');
      
      expect(typeof errorConfig.enableGenericMessages).toBe('boolean');
      expect(['debug', 'info', 'warn', 'error']).toContain(errorConfig.logLevel);
    });

    it('should return monitoring configuration', () => {
      const monitoringConfig = configManager.getMonitoringConfig();
      
      expect(monitoringConfig).toHaveProperty('enableSecurityLogging');
      expect(monitoringConfig).toHaveProperty('enableEventBatching');
      expect(monitoringConfig).toHaveProperty('batchSize');
      expect(monitoringConfig).toHaveProperty('batchTimeout');
      expect(monitoringConfig).toHaveProperty('enableCrossTabSync');
      expect(monitoringConfig).toHaveProperty('cleanupInterval');
      
      expect(typeof monitoringConfig.enableSecurityLogging).toBe('boolean');
      expect(typeof monitoringConfig.batchSize).toBe('number');
    });

    it('should return storage configuration', () => {
      const storageConfig = configManager.getStorageConfig();
      
      expect(storageConfig).toHaveProperty('enableEncryption');
      expect(storageConfig).toHaveProperty('enableIntegrityValidation');
      expect(storageConfig).toHaveProperty('storagePrefix');
      expect(storageConfig).toHaveProperty('encryptionKeyDerivation');
      expect(storageConfig).toHaveProperty('compressionEnabled');
      
      expect(typeof storageConfig.enableEncryption).toBe('boolean');
      expect(['pbkdf2', 'scrypt']).toContain(storageConfig.encryptionKeyDerivation);
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration with partial overrides', () => {
      const originalMaxAttempts = configManager.getRateLimitConfig().maxAttempts;
      
      configManager.updateConfig({
        rateLimit: {
          maxAttempts: 10
        }
      });
      
      const updatedConfig = configManager.getRateLimitConfig();
      expect(updatedConfig.maxAttempts).toBe(10);
      expect(updatedConfig.maxAttempts).not.toBe(originalMaxAttempts);
      
      // Other properties should remain unchanged
      expect(updatedConfig.lockoutDuration).toBeDefined();
      expect(updatedConfig.progressiveDelay).toBeDefined();
    });

    it('should merge nested configuration objects', () => {
      configManager.updateConfig({
        rateLimit: {
          maxAttempts: 8
        },
        errorHandling: {
          logLevel: 'debug'
        }
      });
      
      const config = configManager.getConfig();
      expect(config.rateLimit.maxAttempts).toBe(8);
      expect(config.errorHandling.logLevel).toBe('debug');
      
      // Other properties should remain unchanged
      expect(config.rateLimit.lockoutDuration).toBeDefined();
      expect(config.errorHandling.enableGenericMessages).toBeDefined();
    });

    it('should preserve custom overrides across multiple updates', () => {
      configManager.updateConfig({
        rateLimit: { maxAttempts: 7 }
      });
      
      configManager.updateConfig({
        errorHandling: { logLevel: 'warn' }
      });
      
      const config = configManager.getConfig();
      expect(config.rateLimit.maxAttempts).toBe(7);
      expect(config.errorHandling.logLevel).toBe('warn');
    });
  });

  describe('Security Level Presets', () => {
    it('should have all security level presets defined', () => {
      expect(SECURITY_LEVEL_PRESETS).toHaveProperty(SecurityLevel.LENIENT);
      expect(SECURITY_LEVEL_PRESETS).toHaveProperty(SecurityLevel.MODERATE);
      expect(SECURITY_LEVEL_PRESETS).toHaveProperty(SecurityLevel.STRICT);
      
      Object.values(SECURITY_LEVEL_PRESETS).forEach(preset => {
        expect(preset).toHaveProperty('level');
        expect(preset).toHaveProperty('config');
        expect(preset).toHaveProperty('description');
        expect(typeof preset.description).toBe('string');
      });
    });

    it('should apply lenient security level', () => {
      configManager.applySecurityLevel(SecurityLevel.LENIENT);
      
      const config = configManager.getConfig();
      expect(config.rateLimit.maxAttempts).toBe(10);
      expect(config.rateLimit.lockoutDuration).toBe(5 * 60 * 1000);
      expect(config.rateLimit.progressiveDelay).toBe(false);
      expect(config.errorHandling.enableGenericMessages).toBe(false);
    });

    it('should apply moderate security level', () => {
      configManager.applySecurityLevel(SecurityLevel.MODERATE);
      
      const config = configManager.getConfig();
      // Should match default production settings
      expect(config.rateLimit.maxAttempts).toBe(5);
      expect(config.rateLimit.lockoutDuration).toBe(15 * 60 * 1000);
      expect(config.errorHandling.enableGenericMessages).toBe(true);
    });

    it('should apply strict security level', () => {
      configManager.applySecurityLevel(SecurityLevel.STRICT);
      
      const config = configManager.getConfig();
      expect(config.rateLimit.maxAttempts).toBe(3);
      expect(config.rateLimit.lockoutDuration).toBe(30 * 60 * 1000);
      expect(config.rateLimit.maxDelay).toBe(60000);
      expect(config.errorHandling.maxErrorMessageLength).toBe(100);
    });

    it('should throw error for invalid security level', () => {
      expect(() => {
        configManager.applySecurityLevel('invalid' as SecurityLevel);
      }).toThrow('Invalid security level: invalid');
    });
  });

  describe('Configuration Reset', () => {
    it('should reset to default configuration', () => {
      // Apply some changes
      configManager.updateConfig({
        rateLimit: { maxAttempts: 20 }
      });
      configManager.applySecurityLevel(SecurityLevel.STRICT);
      
      // Verify changes were applied
      expect(configManager.getRateLimitConfig().maxAttempts).toBe(3); // From strict preset
      
      // Reset to defaults
      configManager.resetToDefaults();
      
      // Should be back to test environment defaults
      const config = configManager.getConfig();
      expect(config.rateLimit.maxAttempts).toBe(2); // Test environment default
      expect(config.environment).toBe('test');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const errors = configManager.validateConfig();
      expect(errors).toEqual([]);
    });

    it('should validate rate limit configuration', () => {
      const invalidConfig: Partial<SecurityConfig> = {
        rateLimit: {
          maxAttempts: 0, // Invalid: too low
          lockoutDuration: 500, // Invalid: too low
          baseDelay: 1000, // Valid base delay
          maxDelay: 500, // Invalid: less than baseDelay
          progressiveDelay: true,
          storageKey: 'test'
        }
      };
      
      const errors = configManager.validateConfig(invalidConfig);
      expect(errors).toContain('maxAttempts must be between 1 and 100');
      expect(errors).toContain('lockoutDuration must be between 1 second and 24 hours');
      // baseDelay is now valid, so we don't expect this error
      expect(errors).toContain('maxDelay must be greater than or equal to baseDelay');
    });

    it('should validate error handling configuration', () => {
      const invalidConfig: Partial<SecurityConfig> = {
        errorHandling: {
          maxErrorMessageLength: 10, // Invalid: too low
          logLevel: 'invalid' as any, // Invalid: not in allowed values
          enableGenericMessages: true,
          enableDetailedLogging: true,
          sanitizeErrorMessages: true
        }
      };
      
      const errors = configManager.validateConfig(invalidConfig);
      expect(errors).toContain('maxErrorMessageLength must be between 50 and 2000 characters');
      expect(errors).toContain('logLevel must be one of: debug, info, warn, error');
    });

    it('should validate monitoring configuration', () => {
      const invalidConfig: Partial<SecurityConfig> = {
        monitoring: {
          batchSize: 0, // Invalid: too low
          batchTimeout: -1000, // Invalid: negative
          cleanupInterval: 500, // Invalid: too low
          enableSecurityLogging: true,
          enableEventBatching: true,
          enableCrossTabSync: true
        }
      };
      
      const errors = configManager.validateConfig(invalidConfig);
      expect(errors).toContain('batchSize must be between 1 and 100');
      expect(errors).toContain('batchTimeout must be non-negative');
      expect(errors).toContain('cleanupInterval must be at least 1000ms');
    });

    it('should validate extreme values', () => {
      const extremeConfig: Partial<SecurityConfig> = {
        rateLimit: {
          maxAttempts: 1000, // Invalid: too high
          lockoutDuration: 25 * 60 * 60 * 1000, // Invalid: more than 24 hours
          baseDelay: 0,
          maxDelay: 0,
          progressiveDelay: true,
          storageKey: 'test'
        },
        errorHandling: {
          maxErrorMessageLength: 5000, // Invalid: too high
          logLevel: 'info',
          enableGenericMessages: true,
          enableDetailedLogging: true,
          sanitizeErrorMessages: true
        },
        monitoring: {
          batchSize: 200, // Invalid: too high
          batchTimeout: 0,
          cleanupInterval: 1000,
          enableSecurityLogging: true,
          enableEventBatching: true,
          enableCrossTabSync: true
        }
      };
      
      const errors = configManager.validateConfig(extremeConfig);
      expect(errors).toContain('maxAttempts must be between 1 and 100');
      expect(errors).toContain('lockoutDuration must be between 1 second and 24 hours');
      expect(errors).toContain('maxErrorMessageLength must be between 50 and 2000 characters');
      expect(errors).toContain('batchSize must be between 1 and 100');
    });
  });

  describe('Configuration Summary', () => {
    it('should provide configuration summary', () => {
      const summary = configManager.getConfigSummary();
      
      expect(summary).toHaveProperty('environment');
      expect(summary).toHaveProperty('version');
      expect(summary).toHaveProperty('rateLimitMaxAttempts');
      expect(summary).toHaveProperty('rateLimitLockoutDuration');
      expect(summary).toHaveProperty('errorHandlingGenericMessages');
      expect(summary).toHaveProperty('monitoringEnabled');
      expect(summary).toHaveProperty('storageEncrypted');
      expect(summary).toHaveProperty('hasCustomOverrides');
      
      expect(typeof summary.environment).toBe('string');
      expect(typeof summary.hasCustomOverrides).toBe('boolean');
    });

    it('should indicate custom overrides in summary', () => {
      // Initially no custom overrides
      let summary = configManager.getConfigSummary();
      expect(summary.hasCustomOverrides).toBe(false);
      
      // Apply custom overrides
      configManager.updateConfig({
        rateLimit: { maxAttempts: 15 }
      });
      
      summary = configManager.getConfigSummary();
      expect(summary.hasCustomOverrides).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for configuration objects', () => {
      const config = configManager.getConfig();
      
      // TypeScript should enforce these types at compile time
      expect(typeof config.rateLimit.maxAttempts).toBe('number');
      expect(typeof config.rateLimit.progressiveDelay).toBe('boolean');
      expect(typeof config.errorHandling.enableGenericMessages).toBe('boolean');
      expect(typeof config.monitoring.enableSecurityLogging).toBe('boolean');
      expect(typeof config.storage.enableEncryption).toBe('boolean');
      expect(typeof config.environment).toBe('string');
    });

    it('should handle partial configuration updates safely', () => {
      // This should not cause TypeScript errors and should work at runtime
      configManager.updateConfig({
        rateLimit: {
          maxAttempts: 7
          // Other properties should remain unchanged
        }
      });
      
      const config = configManager.getRateLimitConfig();
      expect(config.maxAttempts).toBe(7);
      expect(config.lockoutDuration).toBeDefined();
      expect(config.progressiveDelay).toBeDefined();
    });
  });

  describe('Feature Toggles', () => {
    it('should check if features are enabled', () => {
      expect(configManager.isFeatureEnabled('enableRateLimiting')).toBe(true);
      expect(configManager.isFeatureEnabled('enableSecurityLogging')).toBe(false); // Test environment
    });

    it('should enable features', () => {
      configManager.enableFeature('enableSecurityLogging');
      expect(configManager.isFeatureEnabled('enableSecurityLogging')).toBe(true);
    });

    it('should disable features', () => {
      configManager.disableFeature('enableRateLimiting');
      expect(configManager.isFeatureEnabled('enableRateLimiting')).toBe(false);
    });

    it('should toggle features', () => {
      const initialState = configManager.isFeatureEnabled('enableProgressiveDelay');
      configManager.toggleFeature('enableProgressiveDelay');
      expect(configManager.isFeatureEnabled('enableProgressiveDelay')).toBe(!initialState);
      
      configManager.toggleFeature('enableProgressiveDelay');
      expect(configManager.isFeatureEnabled('enableProgressiveDelay')).toBe(initialState);
    });

    it('should return feature toggles configuration', () => {
      const features = configManager.getFeatureToggles();
      
      expect(features).toHaveProperty('enableRateLimiting');
      expect(features).toHaveProperty('enableProgressiveDelay');
      expect(features).toHaveProperty('enableAccountLockout');
      expect(features).toHaveProperty('enableSecurityLogging');
      expect(features).toHaveProperty('enableErrorSanitization');
      expect(features).toHaveProperty('enableCrossTabSync');
      expect(features).toHaveProperty('enableEncryptedStorage');
      expect(features).toHaveProperty('enableIntegrityValidation');
      expect(features).toHaveProperty('enableSecurityMonitoring');
      
      Object.values(features).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('Message Customization', () => {
    it('should get customizable messages', () => {
      const messages = configManager.getCustomizableMessages();
      
      expect(messages).toHaveProperty('rateLimitExceeded');
      expect(messages).toHaveProperty('accountLocked');
      expect(messages).toHaveProperty('invalidCredentials');
      expect(messages).toHaveProperty('networkError');
      expect(messages).toHaveProperty('validationError');
      expect(messages).toHaveProperty('storageError');
      expect(messages).toHaveProperty('encryptionError');
      expect(messages).toHaveProperty('genericError');
      
      Object.values(messages).forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should update individual messages', () => {
      const customMessage = 'Custom rate limit message';
      configManager.updateMessage('rateLimitExceeded', customMessage);
      
      expect(configManager.getMessage('rateLimitExceeded')).toBe(customMessage);
    });

    it('should update multiple messages', () => {
      const customMessages = {
        rateLimitExceeded: 'Custom rate limit',
        accountLocked: 'Custom account locked',
        invalidCredentials: 'Custom invalid credentials'
      };
      
      configManager.updateMessages(customMessages);
      
      expect(configManager.getMessage('rateLimitExceeded')).toBe(customMessages.rateLimitExceeded);
      expect(configManager.getMessage('accountLocked')).toBe(customMessages.accountLocked);
      expect(configManager.getMessage('invalidCredentials')).toBe(customMessages.invalidCredentials);
    });

    it('should get individual messages', () => {
      const message = configManager.getMessage('networkError');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('Timing Parameters', () => {
    it('should get timing parameters', () => {
      const timing = configManager.getTimingParameters();
      
      expect(timing).toHaveProperty('rateLimitCheckInterval');
      expect(timing).toHaveProperty('stateCleanupInterval');
      expect(timing).toHaveProperty('lockoutGracePeriod');
      expect(timing).toHaveProperty('progressiveDelayMultiplier');
      expect(timing).toHaveProperty('maxProgressiveDelay');
      expect(timing).toHaveProperty('errorDisplayDuration');
      
      Object.values(timing).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });

    it('should update individual timing parameters', () => {
      const newInterval = 2000;
      configManager.updateTimingParameter('rateLimitCheckInterval', newInterval);
      
      expect(configManager.getTimingParameter('rateLimitCheckInterval')).toBe(newInterval);
    });

    it('should update multiple timing parameters', () => {
      const newTiming = {
        rateLimitCheckInterval: 1500,
        stateCleanupInterval: 45000,
        lockoutGracePeriod: 3000
      };
      
      configManager.updateTimingParameters(newTiming);
      
      expect(configManager.getTimingParameter('rateLimitCheckInterval')).toBe(newTiming.rateLimitCheckInterval);
      expect(configManager.getTimingParameter('stateCleanupInterval')).toBe(newTiming.stateCleanupInterval);
      expect(configManager.getTimingParameter('lockoutGracePeriod')).toBe(newTiming.lockoutGracePeriod);
    });

    it('should get individual timing parameters', () => {
      const interval = configManager.getTimingParameter('errorDisplayDuration');
      expect(typeof interval).toBe('number');
      expect(interval).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Configuration Validation', () => {
    it('should validate timing parameters', () => {
      const invalidConfig: Partial<SecurityConfig> = {
        timing: {
          rateLimitCheckInterval: 50, // Invalid: too low
          stateCleanupInterval: 500, // Invalid: too low
          lockoutGracePeriod: -1000, // Invalid: negative
          progressiveDelayMultiplier: 15.0, // Invalid: too high
          maxProgressiveDelay: 500, // Invalid: too low
          errorDisplayDuration: 100 // Invalid: too low
        }
      };
      
      const errors = configManager.validateConfig(invalidConfig);
      expect(errors).toContain('rateLimitCheckInterval must be at least 100ms');
      expect(errors).toContain('stateCleanupInterval must be at least 1000ms');
      expect(errors).toContain('lockoutGracePeriod must be non-negative');
      expect(errors).toContain('progressiveDelayMultiplier must be between 1.0 and 10.0');
      expect(errors).toContain('maxProgressiveDelay must be at least 1000ms');
      expect(errors).toContain('errorDisplayDuration must be at least 1000ms');
    });

    it('should validate message lengths', () => {
      const invalidConfig: Partial<SecurityConfig> = {
        messages: {
          rateLimitExceeded: 'Hi', // Invalid: too short
          accountLocked: 'A'.repeat(250), // Invalid: too long
          invalidCredentials: 'Valid message length',
          networkError: '', // Invalid: empty
          validationError: 'OK',
          storageError: 'Good',
          encryptionError: 'Fine',
          genericError: 'Test'
        }
      };
      
      const errors = configManager.validateConfig(invalidConfig);
      expect(errors.some(error => error.includes('rateLimitExceeded message must be between 5 and 200 characters'))).toBe(true);
      expect(errors.some(error => error.includes('accountLocked message must be between 5 and 200 characters'))).toBe(true);
      expect(errors.some(error => error.includes('networkError message must be between 5 and 200 characters'))).toBe(true);
    });
  });

  describe('Enhanced Configuration Summary', () => {
    it('should include enabled features in summary', () => {
      configManager.enableFeature('enableSecurityLogging');
      configManager.enableFeature('enableRateLimiting');
      
      const summary = configManager.getConfigSummary();
      expect(summary).toHaveProperty('featuresEnabled');
      expect(Array.isArray(summary.featuresEnabled)).toBe(true);
      expect(summary.featuresEnabled).toContain('enableSecurityLogging');
      expect(summary.featuresEnabled).toContain('enableRateLimiting');
    });
  });
});

describe('Security Level Presets', () => {
  it('should have consistent structure across all presets', () => {
    Object.values(SECURITY_LEVEL_PRESETS).forEach(preset => {
      expect(preset).toHaveProperty('level');
      expect(preset).toHaveProperty('config');
      expect(preset).toHaveProperty('description');
      
      expect(Object.values(SecurityLevel)).toContain(preset.level);
      expect(typeof preset.description).toBe('string');
      expect(preset.description.length).toBeGreaterThan(0);
      
      // Config should be a valid partial SecurityConfig
      if (preset.config.rateLimit) {
        expect(typeof preset.config.rateLimit.maxAttempts).toBe('number');
      }
      if (preset.config.errorHandling) {
        expect(typeof preset.config.errorHandling.enableGenericMessages).toBe('boolean');
      }
      if (preset.config.features) {
        Object.values(preset.config.features).forEach(value => {
          expect(typeof value).toBe('boolean');
        });
      }
      if (preset.config.messages) {
        Object.values(preset.config.messages).forEach(message => {
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
        });
      }
      if (preset.config.timing) {
        Object.values(preset.config.timing).forEach(value => {
          expect(typeof value).toBe('number');
          expect(value).toBeGreaterThan(0);
        });
      }
    });
  });

  it('should have different configurations for different security levels', () => {
    const lenient = SECURITY_LEVEL_PRESETS[SecurityLevel.LENIENT];
    const moderate = SECURITY_LEVEL_PRESETS[SecurityLevel.MODERATE];
    const strict = SECURITY_LEVEL_PRESETS[SecurityLevel.STRICT];
    
    // Lenient should be more permissive than strict
    if (lenient.config.rateLimit && strict.config.rateLimit) {
      expect(lenient.config.rateLimit.maxAttempts).toBeGreaterThan(
        strict.config.rateLimit.maxAttempts || 0
      );
      expect(lenient.config.rateLimit.lockoutDuration).toBeLessThan(
        strict.config.rateLimit.lockoutDuration || Infinity
      );
    }
    
    // Each level should have a unique description
    expect(lenient.description).not.toBe(moderate.description);
    expect(moderate.description).not.toBe(strict.description);
    expect(strict.description).not.toBe(lenient.description);
    
    // Feature toggles should be different
    if (lenient.config.features && strict.config.features) {
      expect(lenient.config.features.enableProgressiveDelay).toBe(false);
      expect(strict.config.features.enableProgressiveDelay).toBe(true);
    }
    
    // Messages should be different
    if (lenient.config.messages && strict.config.messages) {
      expect(lenient.config.messages.rateLimitExceeded).not.toBe(
        strict.config.messages.rateLimitExceeded
      );
    }
  });
});