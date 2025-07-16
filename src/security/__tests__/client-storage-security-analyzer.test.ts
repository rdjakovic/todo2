import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClientStorageSecurityAnalyzer } from '../client-storage-security-analyzer';
import { indexedDBManager } from '../../lib/indexedDB';

// Mock IndexedDB manager
vi.mock('../../lib/indexedDB', () => ({
  indexedDBManager: {
    hasOfflineData: vi.fn(),
    getLists: vi.fn(),
    getTodos: vi.fn(),
    clearAllData: vi.fn()
  }
}));

// Mock browser storage APIs
const mockLocalStorage = {
  length: 0,
  key: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

const mockSessionStorage = {
  length: 0,
  key: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Mock navigator.storage
const mockStorageEstimate = vi.fn();

describe('ClientStorageSecurityAnalyzer', () => {
  let analyzer: ClientStorageSecurityAnalyzer;

  beforeEach(() => {
    analyzer = new ClientStorageSecurityAnalyzer();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup window mock
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });

    // Setup navigator.storage mock
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: mockStorageEstimate
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeClientStorageSecurity', () => {
    it('should perform comprehensive client storage security analysis', async () => {
      // Mock IndexedDB data
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

      // Mock localStorage data
      mockLocalStorage.length = 2;
      mockLocalStorage.key.mockImplementation((index: number) => {
        const keys = ['theme', 'todo-sort-by'];
        return keys[index] || null;
      });
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        const data: Record<string, string> = {
          'theme': 'dark',
          'todo-sort-by': 'dateCreated'
        };
        return data[key] || null;
      });

      // Mock storage estimate
      mockStorageEstimate.mockResolvedValue({
        usage: 1024 * 1024, // 1MB
        quota: 10 * 1024 * 1024 // 10MB
      });

      const assessment = await analyzer.analyzeClientStorageSecurity();

      expect(assessment).toBeDefined();
      expect(assessment.id).toBe('client-storage-security-analysis');
      expect(assessment.category).toBe('DATA_PROTECTION');
      expect(assessment.findings).toBeInstanceOf(Array);
      expect(assessment.recommendations).toBeInstanceOf(Array);
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(100);
      expect(assessment.summary).toContain('Client-side storage security analysis');
    });

    it('should identify unencrypted sensitive data in IndexedDB', async () => {
      vi.mocked(indexedDBManager.hasOfflineData).mockResolvedValue({
        hasLists: true,
        hasTodos: true
      });
      
      vi.mocked(indexedDBManager.getLists).mockResolvedValue([
        { id: '1', name: 'Test List', user_id: 'user1', email: 'test@example.com' }
      ]);
      
      vi.mocked(indexedDBManager.getTodos).mockResolvedValue([
        { id: '1', title: 'Test Todo', password: 'secret123' }
      ]);

      const assessment = await analyzer.analyzeClientStorageSecurity();
      
      const sensitiveDataFinding = assessment.findings.find(
        finding => finding.id === 'CSS-001'
      );

      expect(sensitiveDataFinding).toBeDefined();
      expect(sensitiveDataFinding?.title).toContain('Unencrypted Sensitive Data');
      expect(sensitiveDataFinding?.severity).toBe('HIGH');
      expect(sensitiveDataFinding?.evidence).toContain('Found 2 types of sensitive data');
    });

    it('should detect sensitive data in localStorage', async () => {
      // Mock localStorage with sensitive data
      mockLocalStorage.length = 3;
      mockLocalStorage.key.mockImplementation((index: number) => {
        const keys = ['theme', 'auth-token', 'user-session'];
        return keys[index] || null;
      });
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        const data: Record<string, string> = {
          'theme': 'dark',
          'auth-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          'user-session': 'session-data'
        };
        return data[key] || null;
      });

      const assessment = await analyzer.analyzeClientStorageSecurity();
      
      const localStorageFinding = assessment.findings.find(
        finding => finding.id === 'CSS-003'
      );

      expect(localStorageFinding).toBeDefined();
      expect(localStorageFinding?.title).toContain('Sensitive Data in localStorage');
      expect(localStorageFinding?.severity).toBe('MEDIUM');
    });

    it('should detect sensitive data in sessionStorage', async () => {
      // Mock sessionStorage with sensitive data
      mockSessionStorage.length = 2;
      mockSessionStorage.key.mockImplementation((index: number) => {
        const keys = ['temp-token', 'session-key'];
        return keys[index] || null;
      });
      mockSessionStorage.getItem.mockImplementation((key: string) => {
        const data: Record<string, string> = {
          'temp-token': 'temp-auth-token',
          'session-key': 'session-secret'
        };
        return data[key] || null;
      });

      const assessment = await analyzer.analyzeClientStorageSecurity();
      
      const sessionStorageFinding = assessment.findings.find(
        finding => finding.id === 'CSS-005'
      );

      expect(sessionStorageFinding).toBeDefined();
      expect(sessionStorageFinding?.title).toContain('Sensitive Data in sessionStorage');
      expect(sessionStorageFinding?.severity).toBe('LOW');
    });

    it('should detect high storage usage', async () => {
      // Mock high storage usage
      mockStorageEstimate.mockResolvedValue({
        usage: 9 * 1024 * 1024, // 9MB
        quota: 10 * 1024 * 1024 // 10MB (90% usage)
      });

      const assessment = await analyzer.analyzeClientStorageSecurity();
      
      const storageUsageFinding = assessment.findings.find(
        finding => finding.id === 'CSS-008'
      );

      expect(storageUsageFinding).toBeDefined();
      expect(storageUsageFinding?.title).toContain('High Storage Usage');
      expect(storageUsageFinding?.severity).toBe('LOW');
    });

    it('should handle IndexedDB analysis errors gracefully', async () => {
      vi.mocked(indexedDBManager.hasOfflineData).mockRejectedValue(new Error('IndexedDB error'));

      const assessment = await analyzer.analyzeClientStorageSecurity();
      
      const errorFinding = assessment.findings.find(
        finding => finding.id === 'CSS-002'
      );

      expect(errorFinding).toBeDefined();
      expect(errorFinding?.title).toContain('IndexedDB Security Analysis Error');
      expect(errorFinding?.severity).toBe('MEDIUM');
    });
  });

  describe('testStorageProtection', () => {
    it('should test storage protection when no sensitive data exists', async () => {
      vi.mocked(indexedDBManager.hasOfflineData).mockResolvedValue({
        hasLists: false,
        hasTodos: false
      });

      mockLocalStorage.length = 1;
      mockLocalStorage.key.mockReturnValue('theme');
      mockLocalStorage.getItem.mockReturnValue('dark');

      mockSessionStorage.length = 0;

      const result = await analyzer.testStorageProtection();

      expect(result.indexedDBProtection).toBe(true);
      expect(result.localStorageProtection).toBe(true);
      expect(result.sessionStorageProtection).toBe(true);
      expect(result.dataEncryptionScore).toBe(100);
      expect(result.vulnerabilities).toHaveLength(0);
    });

    it('should detect unprotected storage with sensitive data', async () => {
      vi.mocked(indexedDBManager.hasOfflineData).mockResolvedValue({
        hasLists: true,
        hasTodos: true
      });
      
      vi.mocked(indexedDBManager.getLists).mockResolvedValue([
        { id: '1', name: 'Test List', email: 'test@example.com' }
      ]);
      
      vi.mocked(indexedDBManager.getTodos).mockResolvedValue([
        { id: '1', title: 'Test Todo', password: 'secret' }
      ]);

      mockLocalStorage.length = 1;
      mockLocalStorage.key.mockReturnValue('auth-token');
      mockLocalStorage.getItem.mockReturnValue('token-value');

      const result = await analyzer.testStorageProtection();

      expect(result.indexedDBProtection).toBe(false);
      expect(result.localStorageProtection).toBe(false);
      expect(result.dataEncryptionScore).toBeLessThan(100);
      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle IndexedDB protection test errors', async () => {
      vi.mocked(indexedDBManager.hasOfflineData).mockRejectedValue(new Error('Test error'));

      const result = await analyzer.testStorageProtection();

      expect(result.indexedDBProtection).toBe(false);
      expect(result.vulnerabilities).toContain('IndexedDB security analysis failed');
    });
  });

  describe('getStorageAnalysis', () => {
    it('should provide detailed storage analysis', async () => {
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

      mockLocalStorage.length = 2;
      mockLocalStorage.key.mockImplementation((index: number) => {
        const keys = ['theme', 'todo-sort-by'];
        return keys[index] || null;
      });
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        const data: Record<string, string> = {
          'theme': 'dark',
          'todo-sort-by': 'dateCreated'
        };
        return data[key] || null;
      });

      mockStorageEstimate.mockResolvedValue({
        usage: 1024 * 1024,
        quota: 10 * 1024 * 1024
      });

      const analysis = await analyzer.getStorageAnalysis();

      expect(analysis).toBeDefined();
      expect(analysis.indexedDB.hasData).toBe(true);
      expect(analysis.localStorage.hasData).toBe(true);
      expect(analysis.localStorage.dataTypes).toContain('theme');
      expect(analysis.localStorage.dataTypes).toContain('todo-sort-by');
      expect(analysis.dataLifecycle.hasCleanupMechanisms).toBe(true);
      expect(analysis.storageQuotas.usagePercentage).toBe(10);
    });

    it('should handle storage analysis when no data exists', async () => {
      vi.mocked(indexedDBManager.hasOfflineData).mockResolvedValue({
        hasLists: false,
        hasTodos: false
      });

      mockLocalStorage.length = 0;
      mockSessionStorage.length = 0;

      const analysis = await analyzer.getStorageAnalysis();

      expect(analysis.indexedDB.hasData).toBe(false);
      expect(analysis.localStorage.hasData).toBe(false);
      expect(analysis.sessionStorage.hasData).toBe(false);
      expect(analysis.indexedDB.sensitiveDataExposed).toHaveLength(0);
      expect(analysis.localStorage.sensitiveDataExposed).toHaveLength(0);
    });
  });

  describe('configuration options', () => {
    it('should respect configuration to skip IndexedDB analysis', async () => {
      const configuredAnalyzer = new ClientStorageSecurityAnalyzer({
        checkIndexedDB: false
      });

      const assessment = await configuredAnalyzer.analyzeClientStorageSecurity();
      
      const indexedDBFindings = assessment.findings.filter(
        finding => finding.id.startsWith('CSS-001') || 
                   finding.id.startsWith('CSS-002') || 
                   finding.id.startsWith('CSS-009') ||
                   finding.id.startsWith('CSS-010')
      );

      expect(indexedDBFindings.length).toBe(0);
    });

    it('should respect configuration to skip localStorage analysis', async () => {
      const configuredAnalyzer = new ClientStorageSecurityAnalyzer({
        checkLocalStorage: false
      });

      const assessment = await configuredAnalyzer.analyzeClientStorageSecurity();
      
      const localStorageFindings = assessment.findings.filter(
        finding => finding.id.startsWith('CSS-003') || 
                   finding.id.startsWith('CSS-004') ||
                   finding.id.startsWith('CSS-011')
      );

      expect(localStorageFindings.length).toBe(0);
    });

    it('should respect configuration to skip sessionStorage analysis', async () => {
      const configuredAnalyzer = new ClientStorageSecurityAnalyzer({
        checkSessionStorage: false
      });

      const assessment = await configuredAnalyzer.analyzeClientStorageSecurity();
      
      const sessionStorageFindings = assessment.findings.filter(
        finding => finding.id.startsWith('CSS-005') || 
                   finding.id.startsWith('CSS-006')
      );

      expect(sessionStorageFindings.length).toBe(0);
    });

    it('should respect configuration to skip data lifecycle analysis', async () => {
      const configuredAnalyzer = new ClientStorageSecurityAnalyzer({
        checkDataLifecycle: false
      });

      const assessment = await configuredAnalyzer.analyzeClientStorageSecurity();
      
      const lifecycleFindings = assessment.findings.filter(
        finding => finding.id.startsWith('CSS-007') || 
                   finding.id.startsWith('CSS-012')
      );

      expect(lifecycleFindings.length).toBe(0);
    });

    it('should respect configuration to skip storage quota analysis', async () => {
      const configuredAnalyzer = new ClientStorageSecurityAnalyzer({
        checkStorageQuotas: false
      });

      const assessment = await configuredAnalyzer.analyzeClientStorageSecurity();
      
      const quotaFindings = assessment.findings.filter(
        finding => finding.id.startsWith('CSS-008')
      );

      expect(quotaFindings.length).toBe(0);
    });
  });

  describe('risk scoring', () => {
    it('should calculate risk score based on finding severity', async () => {
      // Mock data that will generate findings of different severities
      vi.mocked(indexedDBManager.hasOfflineData).mockResolvedValue({
        hasLists: true,
        hasTodos: true
      });
      
      vi.mocked(indexedDBManager.getLists).mockResolvedValue([
        { id: '1', name: 'Test List', password: 'secret', email: 'test@example.com' }
      ]);
      
      vi.mocked(indexedDBManager.getTodos).mockResolvedValue([
        { id: '1', title: 'Test Todo', token: 'auth-token' }
      ]);

      mockLocalStorage.length = 1;
      mockLocalStorage.key.mockReturnValue('auth-secret');
      mockLocalStorage.getItem.mockReturnValue('secret-value');

      const assessment = await analyzer.analyzeClientStorageSecurity();

      expect(assessment.riskScore).toBeGreaterThan(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(100);
      
      // Should have high severity findings due to sensitive data
      const highSeverityFindings = assessment.findings.filter(f => f.severity === 'HIGH');
      expect(highSeverityFindings.length).toBeGreaterThan(0);
    });

    it('should have low risk score when no issues are found', async () => {
      vi.mocked(indexedDBManager.hasOfflineData).mockResolvedValue({
        hasLists: false,
        hasTodos: false
      });

      mockLocalStorage.length = 1;
      mockLocalStorage.key.mockReturnValue('theme');
      mockLocalStorage.getItem.mockReturnValue('dark');

      mockSessionStorage.length = 0;

      const assessment = await analyzer.analyzeClientStorageSecurity();

      // Should have low risk score with only informational findings
      expect(assessment.riskScore).toBeLessThan(50);
    });
  });

  describe('error handling', () => {
    it('should handle localStorage analysis errors gracefully', async () => {
      // Mock localStorage to throw an error
      mockLocalStorage.key.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const assessment = await analyzer.analyzeClientStorageSecurity();
      
      const errorFinding = assessment.findings.find(
        finding => finding.id === 'CSS-004'
      );

      expect(errorFinding).toBeDefined();
      expect(errorFinding?.title).toContain('localStorage Security Analysis Error');
      expect(errorFinding?.severity).toBe('LOW');
    });

    it('should handle sessionStorage analysis errors gracefully', async () => {
      // Mock sessionStorage to throw an error
      mockSessionStorage.length = 1;
      mockSessionStorage.key.mockImplementation(() => {
        throw new Error('sessionStorage error');
      });

      const assessment = await analyzer.analyzeClientStorageSecurity();
      
      const errorFinding = assessment.findings.find(
        finding => finding.id === 'CSS-006'
      );

      expect(errorFinding).toBeDefined();
      expect(errorFinding?.title).toContain('sessionStorage Security Analysis Error');
      expect(errorFinding?.severity).toBe('LOW');
    });

    it('should handle storage estimate API errors gracefully', async () => {
      // Mock storage estimate to throw an error
      mockStorageEstimate.mockRejectedValue(new Error('Storage API error'));

      const assessment = await analyzer.analyzeClientStorageSecurity();

      // Should not throw an error and should complete analysis
      expect(assessment).toBeDefined();
      expect(assessment.findings).toBeInstanceOf(Array);
    });
  });
});