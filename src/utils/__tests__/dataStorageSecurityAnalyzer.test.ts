/**
 * Tests for Data Storage Security Analyzer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataStorageSecurityAnalyzer } from '../dataStorageSecurityAnalyzer';
import { indexedDBManager } from '../../lib/indexedDB';
import { supabase } from '../../lib/supabase';

// Mock IndexedDB manager
vi.mock('../../lib/indexedDB', () => ({
  indexedDBManager: {
    hasOfflineData: vi.fn(),
    getLists: vi.fn(),
    getTodos: vi.fn(),
    clearAllData: vi.fn()
  }
}));

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

describe('DataStorageSecurityAnalyzer', () => {
  let analyzer: DataStorageSecurityAnalyzer;

  beforeEach(() => {
    analyzer = new DataStorageSecurityAnalyzer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeDataStorageSecurity', () => {
    it('should perform comprehensive data storage security analysis', async () => {
      const assessment = await analyzer.analyzeDataStorageSecurity();

      expect(assessment).toBeDefined();
      expect(assessment.id).toBe('DATA-STORAGE-001');
      expect(assessment.category).toBe('Data Storage Security Analysis');
      expect(assessment.findings).toBeInstanceOf(Array);
      expect(assessment.findings.length).toBeGreaterThan(0);
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.lastAssessed).toBeInstanceOf(Date);
      expect(assessment.summary).toContain('Data storage security analysis');
    });

    it('should identify unencrypted sensitive data in IndexedDB', async () => {
      const assessment = await analyzer.analyzeDataStorageSecurity();
      
      const unencryptedDataFinding = assessment.findings.find(
        finding => finding.id === 'DS-001'
      );

      expect(unencryptedDataFinding).toBeDefined();
      expect(unencryptedDataFinding?.title).toContain('Unencrypted Sensitive Data');
      expect(unencryptedDataFinding?.severity).toBe('HIGH');
      expect(unencryptedDataFinding?.category).toBe('DATA_PROTECTION');
      expect(unencryptedDataFinding?.evidence).toContain('Todo titles and notes stored in plain text');
    });

    it('should identify data isolation issues', async () => {
      const assessment = await analyzer.analyzeDataStorageSecurity();
      
      const isolationFinding = assessment.findings.find(
        finding => finding.id === 'DS-002'
      );

      expect(isolationFinding).toBeDefined();
      expect(isolationFinding?.title).toContain('Insufficient Data Isolation');
      expect(isolationFinding?.severity).toBe('MEDIUM');
      expect(isolationFinding?.recommendations).toContain('Implement user-specific database names or partitioning');
    });

    it('should identify RLS implementation as positive finding', async () => {
      const assessment = await analyzer.analyzeDataStorageSecurity();
      
      const rlsFinding = assessment.findings.find(
        finding => finding.id === 'DS-005'
      );

      expect(rlsFinding).toBeDefined();
      expect(rlsFinding?.title).toContain('Row Level Security Implementation');
      expect(rlsFinding?.severity).toBe('INFO');
      expect(rlsFinding?.evidence).toContain('RLS enabled on lists table');
    });

    it('should identify missing client-side encryption', async () => {
      const assessment = await analyzer.analyzeDataStorageSecurity();
      
      const encryptionFinding = assessment.findings.find(
        finding => finding.id === 'DS-009'
      );

      expect(encryptionFinding).toBeDefined();
      expect(encryptionFinding?.title).toContain('Missing Client-Side Data Encryption');
      expect(encryptionFinding?.severity).toBe('HIGH');
      expect(encryptionFinding?.recommendations).toContain('Implement client-side encryption using Web Crypto API');
    });

    it('should identify missing key management system', async () => {
      const assessment = await analyzer.analyzeDataStorageSecurity();
      
      const keyMgmtFinding = assessment.findings.find(
        finding => finding.id === 'DS-010'
      );

      expect(keyMgmtFinding).toBeDefined();
      expect(keyMgmtFinding?.title).toContain('No Encryption Key Management System');
      expect(keyMgmtFinding?.severity).toBe('HIGH');
      expect(keyMgmtFinding?.cweId).toBe('CWE-320');
    });
  });

  describe('testDataAtRestProtection', () => {
    it('should test IndexedDB protection when no data exists', async () => {
      vi.mocked(indexedDBManager.hasOfflineData).mockResolvedValue({
        hasLists: false,
        hasTodos: false
      });

      const result = await analyzer.testDataAtRestProtection();

      expect(result.indexedDBProtection).toBe(true);
      expect(result.vulnerabilities).not.toContain('IndexedDB data stored without encryption');
    });

    it('should detect unprotected IndexedDB data', async () => {
      vi.mocked(indexedDBManager.hasOfflineData).mockResolvedValue({
        hasLists: true,
        hasTodos: true
      });
      
      vi.mocked(indexedDBManager.getLists).mockResolvedValue([
        { id: '1', name: 'Test List', user_id: 'user1' }
      ]);
      
      vi.mocked(indexedDBManager.getTodos).mockResolvedValue([
        { id: '1', title: 'Test Todo', list_id: '1' }
      ]);

      const result = await analyzer.testDataAtRestProtection();

      expect(result.indexedDBProtection).toBe(false);
      expect(result.vulnerabilities).toContain('IndexedDB data stored without encryption');
    });

    it('should test Supabase protection with proper RLS', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: null, error: { message: 'RLS policy violation' } }))
        }))
      } as any);

      const result = await analyzer.testDataAtRestProtection();

      expect(result.supabaseProtection).toBe(true);
    });

    it('should calculate encryption effectiveness score', async () => {
      vi.mocked(indexedDBManager.hasOfflineData).mockResolvedValue({
        hasLists: false,
        hasTodos: false
      });

      const result = await analyzer.testDataAtRestProtection();

      expect(result.encryptionEffectiveness).toBeGreaterThanOrEqual(0);
      expect(result.encryptionEffectiveness).toBeLessThanOrEqual(100);
    });
  });

  describe('generateDataStorageReport', () => {
    it('should generate comprehensive security report', async () => {
      await analyzer.analyzeDataStorageSecurity();
      const report = analyzer.generateDataStorageReport();

      expect(report).toContain('# Data Storage Security Analysis Report');
      expect(report).toContain('**Analysis Date:**');
      expect(report).toContain('**Total Findings:**');
      expect(report).toContain('## Findings Summary');
      expect(report).toContain('## Detailed Findings');
      expect(report).toContain('HIGH:');
      expect(report).toContain('MEDIUM:');
    });

    it('should include finding details in report', async () => {
      await analyzer.analyzeDataStorageSecurity();
      const report = analyzer.generateDataStorageReport();

      expect(report).toContain('Unencrypted Sensitive Data');
      expect(report).toContain('**Evidence:**');
      expect(report).toContain('**Recommendations:**');
      expect(report).toContain('**Location:**');
    });
  });

  describe('configuration options', () => {
    it('should respect configuration to skip IndexedDB analysis', async () => {
      const configuredAnalyzer = new DataStorageSecurityAnalyzer({
        checkIndexedDB: false
      });

      const assessment = await configuredAnalyzer.analyzeDataStorageSecurity();
      
      const indexedDBFindings = assessment.findings.filter(
        finding => finding.id.startsWith('DS-001') || 
                   finding.id.startsWith('DS-002') || 
                   finding.id.startsWith('DS-003') || 
                   finding.id.startsWith('DS-004')
      );

      expect(indexedDBFindings.length).toBe(0);
    });

    it('should respect configuration to skip Supabase analysis', async () => {
      const configuredAnalyzer = new DataStorageSecurityAnalyzer({
        checkSupabaseConfig: false
      });

      const assessment = await configuredAnalyzer.analyzeDataStorageSecurity();
      
      const supabaseFindings = assessment.findings.filter(
        finding => finding.location.file?.includes('supabase') || 
                   finding.location.component?.includes('Supabase')
      );

      expect(supabaseFindings.length).toBe(0);
    });

    it('should respect configuration to skip encryption analysis', async () => {
      const configuredAnalyzer = new DataStorageSecurityAnalyzer({
        checkDataEncryption: false
      });

      const assessment = await configuredAnalyzer.analyzeDataStorageSecurity();
      
      const encryptionFindings = assessment.findings.filter(
        finding => finding.id === 'DS-009' || finding.id === 'DS-010'
      );

      expect(encryptionFindings.length).toBe(0);
    });

    it('should respect configuration to skip data retention analysis', async () => {
      const configuredAnalyzer = new DataStorageSecurityAnalyzer({
        checkDataRetention: false
      });

      const assessment = await configuredAnalyzer.analyzeDataStorageSecurity();
      
      const retentionFindings = assessment.findings.filter(
        finding => finding.id === 'DS-011' || finding.id === 'DS-012'
      );

      expect(retentionFindings.length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle IndexedDB analysis errors gracefully', async () => {
      // Create a new analyzer instance to avoid interference from previous tests
      const errorAnalyzer = new DataStorageSecurityAnalyzer();
      
      // Mock the IndexedDB manager to throw an error
      vi.mocked(indexedDBManager.hasOfflineData).mockRejectedValue(new Error('IndexedDB error'));

      const assessment = await errorAnalyzer.analyzeDataStorageSecurity();
      
      const errorFinding = assessment.findings.find(
        finding => finding.id === 'DS-ERROR-001'
      );

      expect(errorFinding).toBeDefined();
      expect(errorFinding?.title).toContain('IndexedDB Security Analysis Error');
      expect(errorFinding?.severity).toBe('HIGH');
    });

    it('should handle Supabase analysis errors gracefully', async () => {
      // Create a new analyzer instance to avoid interference from previous tests
      const errorAnalyzer = new DataStorageSecurityAnalyzer();
      
      // Mock Supabase to throw an error during analysis
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Supabase error');
      });

      const assessment = await errorAnalyzer.analyzeDataStorageSecurity();
      
      const errorFinding = assessment.findings.find(
        finding => finding.id === 'DS-ERROR-002'
      );

      expect(errorFinding).toBeDefined();
      expect(errorFinding?.title).toContain('Supabase Security Analysis Error');
      expect(errorFinding?.severity).toBe('HIGH');
    });
  });

  describe('risk score calculation', () => {
    it('should calculate appropriate risk scores', async () => {
      const assessment = await analyzer.analyzeDataStorageSecurity();

      expect(assessment.riskScore).toBeGreaterThan(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(100);
    });

    it('should weight critical findings higher than low findings', async () => {
      // This test verifies the risk calculation logic indirectly
      const assessment = await analyzer.analyzeDataStorageSecurity();
      
      const highSeverityFindings = assessment.findings.filter(f => f.severity === 'HIGH');
      
      // If we have high severity findings, risk score should be significant
      if (highSeverityFindings.length > 0) {
        expect(assessment.riskScore).toBeGreaterThan(10);
      }
    });
  });
});