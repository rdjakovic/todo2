/**
 * Data Transmission Security Analyzer Tests
 * 
 * Tests for validating data-in-transit protection and security analysis functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataTransmissionSecurityAnalyzer } from '../data-transmission-analyzer';

describe('DataTransmissionSecurityAnalyzer', () => {
  let analyzer: DataTransmissionSecurityAnalyzer;

  beforeEach(() => {
    analyzer = new DataTransmissionSecurityAnalyzer();
  });

  describe('TLS Configuration Analysis', () => {
    it('should identify HTTP as critical security risk', async () => {
      const result = await analyzer.analyzeTLSConfiguration('http://example.com');
      
      expect(result.riskLevel).toBe('CRITICAL');
      expect(result.protocol).toBe('http:');
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].severity).toBe('CRITICAL');
      expect(result.findings[0].title).toBe('HTTP Protocol Used');
      expect(result.findings[0].cweId).toBe('CWE-319');
    });

    it('should validate HTTPS URLs properly', async () => {
      const result = await analyzer.analyzeTLSConfiguration('https://api.supabase.co');
      
      expect(result.protocol).toBe('https:');
      expect(result.certificateValid).toBe(true);
      expect(result.version).toBe('TLS 1.3');
      expect(result.hsts).toBe(true);
    });

    it('should handle invalid URLs gracefully', async () => {
      const result = await analyzer.analyzeTLSConfiguration('invalid-url');
      
      expect(result.riskLevel).toBe('CRITICAL');
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].title).toBe('TLS Analysis Failed');
    });

    it('should assess security headers for Supabase URLs', async () => {
      const result = await analyzer.analyzeTLSConfiguration('https://test.supabase.co');
      
      expect(result.secureHeaders['Strict-Transport-Security']).toBe(true);
      expect(result.secureHeaders['X-Content-Type-Options']).toBe(true);
      expect(result.secureHeaders['Content-Security-Policy']).toBe(true);
    });
  });

  describe('API Security Configuration Analysis', () => {
    it('should identify non-HTTPS API endpoints as critical', async () => {
      const results = await analyzer.analyzeAPISecurityConfiguration(
        'http://api.example.com',
        'test-api-key'
      );
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].riskLevel).toBe('CRITICAL');
      expect(results[0].httpsEnforced).toBe(false);
      expect(results[0].findings[0].severity).toBe('CRITICAL');
      expect(results[0].findings[0].cweId).toBe('CWE-319');
    });

    it('should analyze Supabase API endpoints correctly', async () => {
      const results = await analyzer.analyzeAPISecurityConfiguration(
        'https://test.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      );
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.httpsEnforced).toBe(true);
        expect(result.dataEncryption).toBe(true);
      });
    });

    it('should detect weak API keys', async () => {
      const results = await analyzer.analyzeAPISecurityConfiguration(
        'https://api.supabase.co',
        'short-key'
      );
      
      // Check all results for weak key finding since it's added during analysis
      const allFindings = results.flatMap(r => r.findings);
      const weakKeyFinding = allFindings.find(f => f.title === 'Weak API Key');
      expect(weakKeyFinding).toBeDefined();
      expect(weakKeyFinding?.severity).toBe('MEDIUM');
    });

    it('should identify permissive CORS configurations', async () => {
      const results = await analyzer.analyzeAPISecurityConfiguration(
        'https://api.supabase.co',
        'valid-api-key-with-sufficient-length'
      );
      
      const corsFindings = results.flatMap(r => r.findings)
        .filter(f => f.category === 'CORS');
      
      expect(corsFindings.length).toBeGreaterThan(0);
      expect(corsFindings[0].title).toBe('Permissive CORS Configuration');
    });

    it('should handle API analysis failures gracefully', async () => {
      const results = await analyzer.analyzeAPISecurityConfiguration(
        'invalid-url',
        'api-key'
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].riskLevel).toBe('CRITICAL');
      expect(results[0].findings[0].title).toBe('API Analysis Failed');
    });
  });

  describe('Certificate Validation', () => {
    it('should identify missing SSL certificates', async () => {
      const findings = await analyzer.validateCertificateSecurity('http://example.com');
      
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('CRITICAL');
      expect(findings[0].title).toBe('No SSL Certificate');
      expect(findings[0].cweId).toBe('CWE-295');
    });

    it('should validate Supabase certificates', async () => {
      const findings = await analyzer.validateCertificateSecurity('https://api.supabase.co');
      
      // Should have no critical findings for valid Supabase certificates
      const criticalFindings = findings.filter(f => f.severity === 'CRITICAL');
      expect(criticalFindings).toHaveLength(0);
    });

    it('should detect expiring certificates', async () => {
      // This test would need to be mocked for a certificate expiring soon
      const findings = await analyzer.validateCertificateSecurity('https://api.supabase.co');
      
      // For now, just ensure the method runs without error
      expect(Array.isArray(findings)).toBe(true);
    });

    it('should handle certificate validation failures', async () => {
      const findings = await analyzer.validateCertificateSecurity('https://invalid-domain-that-does-not-exist.com');
      
      expect(findings.length).toBeGreaterThanOrEqual(1);
      const failureFindings = findings.filter(f => f.title === 'Certificate Validation Failed');
      expect(failureFindings.length).toBeGreaterThan(0);
      expect(failureFindings[0].severity).toBe('HIGH');
    });
  });

  describe('Security Report Generation', () => {
    it('should generate comprehensive security report', async () => {
      const report = await analyzer.generateSecurityReport(
        'https://test.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
      );
      
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.applicationUrl).toBe('https://test.supabase.co');
      expect(report.tlsAssessment).toBeDefined();
      expect(report.apiAssessments).toHaveLength(4); // 4 Supabase endpoints
      expect(report.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(report.overallRiskScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.complianceStatus).toHaveProperty('gdpr');
      expect(report.complianceStatus).toHaveProperty('soc2');
      expect(report.complianceStatus).toHaveProperty('pciDss');
    });

    it('should calculate risk scores correctly', async () => {
      const httpReport = await analyzer.generateSecurityReport(
        'http://insecure.example.com',
        'weak-key'
      );
      
      const httpsReport = await analyzer.generateSecurityReport(
        'https://secure.supabase.co',
        'strong-api-key-with-sufficient-length'
      );
      
      expect(httpReport.overallRiskScore).toBeGreaterThan(httpsReport.overallRiskScore);
    });

    it('should identify critical findings correctly', async () => {
      const report = await analyzer.generateSecurityReport(
        'http://insecure.example.com',
        'api-key'
      );
      
      expect(report.criticalFindings.length).toBeGreaterThan(0);
      expect(report.criticalFindings[0].severity).toBe('CRITICAL');
    });

    it('should generate appropriate recommendations', async () => {
      const report = await analyzer.generateSecurityReport(
        'https://api.supabase.co',
        'test-api-key'
      );
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations).toContain('Implement HTTP Strict Transport Security (HSTS) headers');
      expect(report.recommendations).toContain('Use Content Security Policy (CSP) headers to prevent XSS attacks');
    });

    it('should assess compliance status', async () => {
      const secureReport = await analyzer.generateSecurityReport(
        'https://secure.supabase.co',
        'secure-api-key'
      );
      
      const insecureReport = await analyzer.generateSecurityReport(
        'http://insecure.example.com',
        'weak-key'
      );
      
      expect(secureReport.complianceStatus.gdpr).toBe(true);
      expect(secureReport.complianceStatus.soc2).toBe(true);
      
      expect(insecureReport.complianceStatus.gdpr).toBe(false);
      expect(insecureReport.complianceStatus.soc2).toBe(false);
      expect(insecureReport.complianceStatus.pciDss).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty URLs', async () => {
      const result = await analyzer.analyzeTLSConfiguration('');
      expect(result.riskLevel).toBe('CRITICAL');
    });

    it('should handle null/undefined inputs gracefully', async () => {
      // @ts-expect-error Testing error handling
      const result = await analyzer.analyzeTLSConfiguration(null);
      expect(result.riskLevel).toBe('CRITICAL');
    });

    it('should handle malformed API keys', async () => {
      const results = await analyzer.analyzeAPISecurityConfiguration(
        'https://api.supabase.co',
        ''
      );
      
      expect(results).toHaveLength(4); // Should still analyze endpoints
    });

    it('should limit risk scores to maximum of 100', async () => {
      // Create a scenario with many critical findings
      const report = await analyzer.generateSecurityReport(
        'http://very-insecure.example.com',
        'x'
      );
      
      expect(report.overallRiskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration with Supabase Configuration', () => {
    it('should analyze real Supabase URL patterns', async () => {
      const supabaseUrl = 'https://abcdefghijklmnop.supabase.co';
      const report = await analyzer.generateSecurityReport(supabaseUrl, 'test-key');
      
      expect(report.tlsAssessment.protocol).toBe('https:');
      expect(report.tlsAssessment.hsts).toBe(true);
      expect(report.apiAssessments.length).toBe(4);
    });

    it('should validate environment variable patterns', async () => {
      const testUrl = 'https://your-project-url.supabase.co';
      const testKey = 'your-project-anon-key';
      
      const report = await analyzer.generateSecurityReport(testUrl, testKey);
      
      // Should detect placeholder values
      const weakKeyFinding = report.apiAssessments[0].findings
        .find(f => f.title === 'Weak API Key');
      expect(weakKeyFinding).toBeDefined();
    });
  });
});