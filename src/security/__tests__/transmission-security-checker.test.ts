/**
 * Transmission Security Checker Tests
 * 
 * Integration tests for the data transmission security checker utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransmissionSecurityChecker, createTransmissionSecurityChecker } from '../transmission-security-checker';

describe('TransmissionSecurityChecker', () => {
  let checker: TransmissionSecurityChecker;

  beforeEach(() => {
    checker = new TransmissionSecurityChecker();
  });

  describe('Security Analysis Integration', () => {
    it('should run complete security analysis', async () => {
      const config = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-key'
      };

      const report = await checker.runSecurityAnalysis(config);

      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.applicationUrl).toBe(config.supabaseUrl);
      expect(report.tlsAssessment).toBeDefined();
      expect(report.apiAssessments).toHaveLength(4);
      expect(typeof report.overallRiskScore).toBe('number');
      expect(report.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(report.overallRiskScore).toBeLessThanOrEqual(100);
    });

    it('should handle invalid configuration gracefully', async () => {
      const config = {
        supabaseUrl: '',
        supabaseKey: ''
      };

      await expect(checker.runSecurityAnalysis(config)).rejects.toThrow('Supabase URL is required');
    });

    it('should warn about placeholder configurations', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const config = {
        supabaseUrl: 'https://your-project-url.supabase.co',
        supabaseKey: 'your-project-anon-key'
      };

      await checker.runSecurityAnalysis(config);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Using placeholder Supabase URL')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Using placeholder API key')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Quick TLS Check', () => {
    it('should perform quick TLS security check', async () => {
      const result = await checker.quickTLSCheck('https://api.supabase.co');

      expect(result).toHaveProperty('secure');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should identify insecure HTTP URLs', async () => {
      const result = await checker.quickTLSCheck('http://insecure.example.com');

      expect(result.secure).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toBe('HTTP Protocol Used');
    });

    it('should handle TLS check failures', async () => {
      const result = await checker.quickTLSCheck('invalid-url');

      expect(result.secure).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('TLS Analysis Failed');
    });
  });

  describe('API Endpoints Validation', () => {
    it('should validate API endpoints security', async () => {
      const config = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'valid-api-key'
      };

      const result = await checker.validateAPIEndpoints(config);

      expect(result).toHaveProperty('allSecure');
      expect(result).toHaveProperty('endpointResults');
      expect(Array.isArray(result.endpointResults)).toBe(true);
      expect(result.endpointResults.length).toBeGreaterThan(0);

      result.endpointResults.forEach(endpoint => {
        expect(endpoint).toHaveProperty('endpoint');
        expect(endpoint).toHaveProperty('secure');
        expect(endpoint).toHaveProperty('issues');
      });
    });

    it('should identify insecure API configurations', async () => {
      const config = {
        supabaseUrl: 'http://insecure-api.example.com',
        supabaseKey: 'test-key'
      };

      const result = await checker.validateAPIEndpoints(config);

      expect(result.allSecure).toBe(false);
      expect(result.endpointResults[0].secure).toBe(false);
      expect(result.endpointResults[0].issues.length).toBeGreaterThan(0);
    });
  });

  describe('Certificate Security Check', () => {
    it('should check certificate security', async () => {
      const result = await checker.checkCertificateSecurity('https://api.supabase.co');

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('expiryWarning');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(typeof result.expiryWarning).toBe('boolean');
    });

    it('should identify missing certificates', async () => {
      const result = await checker.checkCertificateSecurity('http://no-cert.example.com');

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toBe('No SSL Certificate');
    });

    it('should handle certificate check failures', async () => {
      const result = await checker.checkCertificateSecurity('https://invalid-domain.test');

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Certificate Validation Failed');
    });
  });

  describe('Security Recommendations', () => {
    it('should generate categorized security recommendations', async () => {
      const config = {
        supabaseUrl: 'http://insecure.example.com',
        supabaseKey: 'weak-key'
      };

      const recommendations = await checker.getSecurityRecommendations(config);

      expect(recommendations).toHaveProperty('immediate');
      expect(recommendations).toHaveProperty('important');
      expect(recommendations).toHaveProperty('general');
      expect(Array.isArray(recommendations.immediate)).toBe(true);
      expect(Array.isArray(recommendations.important)).toBe(true);
      expect(Array.isArray(recommendations.general)).toBe(true);
    });

    it('should prioritize critical issues in immediate recommendations', async () => {
      const config = {
        supabaseUrl: 'http://critical-issues.example.com',
        supabaseKey: 'test-key'
      };

      const recommendations = await checker.getSecurityRecommendations(config);

      expect(recommendations.immediate.length).toBeGreaterThan(0);
    });

    it('should handle recommendation generation failures', async () => {
      const config = {
        supabaseUrl: 'invalid-url',
        supabaseKey: 'test-key'
      };

      const recommendations = await checker.getSecurityRecommendations(config);

      expect(recommendations.immediate).toContain('Fix configuration errors to enable security analysis');
    });
  });

  describe('Report Export Functionality', () => {
    let sampleReport: any;

    beforeEach(async () => {
      const config = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key'
      };
      sampleReport = await checker.runSecurityAnalysis(config);
    });

    it('should export report as JSON', async () => {
      const jsonReport = await checker.exportSecurityReport(sampleReport, 'json');

      expect(() => JSON.parse(jsonReport)).not.toThrow();
      const parsed = JSON.parse(jsonReport);
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.applicationUrl).toBeDefined();
    });

    it('should export report as Markdown', async () => {
      const markdownReport = await checker.exportSecurityReport(sampleReport, 'markdown');

      expect(markdownReport).toContain('# Data Transmission Security Report');
      expect(markdownReport).toContain('## TLS/SSL Assessment');
      expect(markdownReport).toContain('## API Security Assessment');
      expect(markdownReport).toContain('## Critical Findings');
      expect(markdownReport).toContain('## Recommendations');
      expect(markdownReport).toContain('## Compliance Status');
    });

    it('should export report as CSV', async () => {
      const csvReport = await checker.exportSecurityReport(sampleReport, 'csv');

      const lines = csvReport.split('\n');
      expect(lines[0]).toContain('Finding ID,Title,Severity,Category');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should handle unsupported export formats', async () => {
      await expect(
        checker.exportSecurityReport(sampleReport, 'xml' as any)
      ).rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('Utility Functions', () => {
    it('should create transmission security checker', () => {
      const checker = createTransmissionSecurityChecker();
      expect(checker).toBeInstanceOf(TransmissionSecurityChecker);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration fields', async () => {
      const invalidConfigs = [
        { supabaseUrl: '', supabaseKey: 'key' },
        { supabaseUrl: 'url', supabaseKey: '' },
        { supabaseUrl: 'invalid-url', supabaseKey: 'key' }
      ];

      for (const config of invalidConfigs) {
        await expect(checker.runSecurityAnalysis(config)).rejects.toThrow();
      }
    });

    it('should accept valid configuration', async () => {
      const validConfig = {
        supabaseUrl: 'https://valid.supabase.co',
        supabaseKey: 'valid-api-key'
      };

      await expect(checker.runSecurityAnalysis(validConfig)).resolves.toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network timeouts gracefully', async () => {
      const config = {
        supabaseUrl: 'https://timeout.example.com',
        supabaseKey: 'test-key'
      };

      // Should not throw, but return a report with error findings
      const report = await checker.runSecurityAnalysis(config);
      expect(report).toBeDefined();
    });

    it('should handle malformed URLs', async () => {
      const config = {
        supabaseUrl: 'not-a-url',
        supabaseKey: 'test-key'
      };

      await expect(checker.runSecurityAnalysis(config)).rejects.toThrow('Invalid Supabase URL format');
    });

    it('should handle empty responses', async () => {
      const result = await checker.quickTLSCheck('https://empty-response.example.com');
      expect(result).toBeDefined();
      expect(result.secure).toBeDefined();
    });
  });
});