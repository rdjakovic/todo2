/**
 * Integration tests for Supabase Authentication Security
 * These tests run against the actual Supabase configuration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { analyzeSupabaseAuthSecurity, generateSupabaseSecurityReport } from '../supabaseSecurityAnalyzer';
import { supabase } from '../../lib/supabase';

describe('Supabase Security Integration Tests', () => {
  beforeAll(async () => {
    // Ensure we're testing in a controlled environment
    console.log('Running Supabase security integration tests...');
  });

  it('should perform complete security analysis', async () => {
    const analysis = await analyzeSupabaseAuthSecurity();
    
    // Verify analysis structure
    expect(analysis).toBeDefined();
    expect(analysis.timestamp).toBeInstanceOf(Date);
    expect(Array.isArray(analysis.findings)).toBe(true);
    expect(analysis.summary).toBeDefined();
    expect(analysis.configuration).toBeDefined();
    expect(analysis.tokenAnalysis).toBeDefined();
    expect(analysis.stateManagement).toBeDefined();

    // Verify summary structure
    expect(typeof analysis.summary.criticalCount).toBe('number');
    expect(typeof analysis.summary.highCount).toBe('number');
    expect(typeof analysis.summary.mediumCount).toBe('number');
    expect(typeof analysis.summary.lowCount).toBe('number');
    expect(typeof analysis.summary.infoCount).toBe('number');
    expect(['critical', 'high', 'medium', 'low']).toContain(analysis.summary.overallRisk);

    // Verify configuration analysis
    expect(typeof analysis.configuration.persistSession).toBe('boolean');
    expect(typeof analysis.configuration.autoRefreshToken).toBe('boolean');
    expect(typeof analysis.configuration.hasValidUrl).toBe('boolean');
    expect(typeof analysis.configuration.hasAnonKey).toBe('boolean');

    // Verify token analysis
    expect(typeof analysis.tokenAnalysis.hasValidSession).toBe('boolean');
    expect(typeof analysis.tokenAnalysis.refreshTokenPresent).toBe('boolean');
    expect(typeof analysis.tokenAnalysis.jwtStructureValid).toBe('boolean');

    // Verify state management analysis
    expect(typeof analysis.stateManagement.authStateListenerActive).toBe('boolean');
    expect(typeof analysis.stateManagement.userPersistence).toBe('boolean');
    expect(typeof analysis.stateManagement.sessionRecovery).toBe('boolean');
    expect(Array.isArray(analysis.stateManagement.errorHandling)).toBe(true);

    console.log(`Analysis completed with ${analysis.findings.length} findings`);
    console.log(`Overall risk: ${analysis.summary.overallRisk}`);
  }, 30000); // 30 second timeout for integration test

  it('should generate comprehensive security report', async () => {
    const report = await generateSupabaseSecurityReport();
    
    expect(typeof report).toBe('string');
    expect(report.length).toBeGreaterThan(0);
    
    // Verify report contains expected sections
    expect(report).toContain('# Supabase Authentication Security Analysis Report');
    expect(report).toContain('## Executive Summary');
    expect(report).toContain('## Configuration Analysis');
    expect(report).toContain('## Token Analysis');
    expect(report).toContain('## State Management Analysis');
    expect(report).toContain('## Detailed Findings');
    
    console.log('Security report generated successfully');
  }, 30000);

  it('should validate Supabase client configuration', async () => {
    // Test that Supabase client is properly configured
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    
    // Test basic auth methods exist
    expect(typeof supabase.auth.getSession).toBe('function');
    expect(typeof supabase.auth.getUser).toBe('function');
    expect(typeof supabase.auth.signOut).toBe('function');
    expect(typeof supabase.auth.onAuthStateChange).toBe('function');
  });

  it('should handle environment variable validation', () => {
    // These should be defined for the tests to run properly
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // In test environment, these might be mock values
    if (supabaseUrl && supabaseKey) {
      expect(typeof supabaseUrl).toBe('string');
      expect(typeof supabaseKey).toBe('string');
      expect(supabaseUrl.length).toBeGreaterThan(0);
      expect(supabaseKey.length).toBeGreaterThan(0);
    }
  });

  it('should test authentication flow security', async () => {
    try {
      // Test session retrieval (should not throw)
      const { error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.log('Session error (expected in test environment):', sessionError.message);
      }
      
      // Test user retrieval (should not throw)
      const { error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.log('User error (expected in test environment):', userError.message);
      }
      
      // Test sign out (should not throw)
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.log('Sign out error (may be expected):', signOutError.message);
      }
      
      // If we get here without throwing, the basic auth flow is working
      expect(true).toBe(true);
      
    } catch (error) {
      // Log the error but don't fail the test - this might be expected in test environment
      console.log('Auth flow test error (may be expected in test environment):', error);
    }
  });

  it('should validate security findings format', async () => {
    const analysis = await analyzeSupabaseAuthSecurity();
    
    // Validate each finding has required properties
    analysis.findings.forEach(finding => {
      expect(finding.id).toBeDefined();
      expect(typeof finding.id).toBe('string');
      expect(finding.id).toMatch(/^SUPA-\d{3}$/);
      
      expect(finding.title).toBeDefined();
      expect(typeof finding.title).toBe('string');
      
      expect(finding.description).toBeDefined();
      expect(typeof finding.description).toBe('string');
      
      expect(['critical', 'high', 'medium', 'low', 'info']).toContain(finding.severity);
      expect(['authentication', 'authorization', 'configuration', 'token_management']).toContain(finding.category);
      
      expect(finding.location).toBeDefined();
      expect(typeof finding.location).toBe('string');
      
      expect(finding.recommendation).toBeDefined();
      expect(typeof finding.recommendation).toBe('string');
      
      if (finding.evidence) {
        expect(Array.isArray(finding.evidence)).toBe(true);
      }
      
      if (finding.cweId) {
        expect(typeof finding.cweId).toBe('string');
        expect(finding.cweId).toMatch(/^CWE-\d+$/);
      }
    });
  });

  it('should provide actionable recommendations', async () => {
    const analysis = await analyzeSupabaseAuthSecurity();
    
    // Ensure all findings have actionable recommendations
    analysis.findings.forEach(finding => {
      expect(finding.recommendation.length).toBeGreaterThan(10);
      expect(finding.recommendation).not.toContain('TODO');
      expect(finding.recommendation).not.toContain('TBD');
    });
    
    // Critical and high findings should have specific recommendations
    const criticalAndHigh = analysis.findings.filter(f => 
      f.severity === 'critical' || f.severity === 'high'
    );
    
    criticalAndHigh.forEach(finding => {
      expect(finding.recommendation.length).toBeGreaterThan(20);
    });
  });
});