/**
 * Security Monitor Integration Test
 * 
 * Simple integration test to verify security monitor functionality
 * with real dependencies.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecurityMonitor } from '../securityMonitor';

describe('SecurityMonitor Integration', () => {
  let securityMonitor: SecurityMonitor;

  beforeEach(() => {
    // Create a fresh instance with short intervals for testing
    securityMonitor = new SecurityMonitor({
      cleanupInterval: 100,
      healthCheckInterval: 200,
      enableAutoCleanup: false, // Disable for controlled testing
      enableHealthChecks: false
    });
  });

  afterEach(() => {
    securityMonitor.stop();
  });

  it('should initialize with correct configuration', () => {
    const status = securityMonitor.getStatus();
    
    expect(status.isRunning).toBe(false);
    expect(status.config.cleanupInterval).toBe(100);
    expect(status.config.healthCheckInterval).toBe(200);
    expect(status.config.enableAutoCleanup).toBe(false);
    expect(status.config.enableHealthChecks).toBe(false);
  });

  it('should start and stop correctly', () => {
    expect(securityMonitor.getStatus().isRunning).toBe(false);
    
    securityMonitor.start();
    expect(securityMonitor.getStatus().isRunning).toBe(true);
    
    securityMonitor.stop();
    expect(securityMonitor.getStatus().isRunning).toBe(false);
  });

  it('should update configuration', () => {
    const newConfig = {
      cleanupInterval: 500,
      maxStateAge: 60000
    };
    
    securityMonitor.updateConfig(newConfig);
    const status = securityMonitor.getStatus();
    
    expect(status.config.cleanupInterval).toBe(500);
    expect(status.config.maxStateAge).toBe(60000);
  });

  it('should perform cleanup without errors', async () => {
    const cleanedCount = await securityMonitor.cleanupExpiredStates();
    expect(typeof cleanedCount).toBe('number');
    expect(cleanedCount).toBeGreaterThanOrEqual(0);
  });

  it('should validate non-existent state as valid', async () => {
    const isValid = await securityMonitor.validateStateIntegrity('nonexistent@example.com');
    expect(isValid).toBe(true);
  });

  it('should perform health check without errors', async () => {
    const health = await securityMonitor.performHealthCheck();
    
    expect(health).toBeDefined();
    expect(typeof health.totalStates).toBe('number');
    expect(typeof health.validStates).toBe('number');
    expect(typeof health.corruptedStates).toBe('number');
    expect(typeof health.expiredStates).toBe('number');
    expect(health.lastHealthCheckTime).toBeInstanceOf(Date);
  });

  it('should perform forced maintenance check', async () => {
    const result = await securityMonitor.forceMaintenanceCheck();
    
    expect(result).toBeDefined();
    expect(typeof result.cleanedStates).toBe('number');
    expect(result.healthReport).toBeDefined();
    expect(result.healthReport.totalStates).toBeGreaterThanOrEqual(0);
  });
});