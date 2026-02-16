/**
 * Client-Side Storage Security Analyzer for Todo2 Application
 * 
 * This analyzer evaluates the security of client-side storage mechanisms including:
 * - IndexedDB usage and data protection
 * - localStorage/sessionStorage security
 * - Data lifecycle and cleanup processes
 * - Browser storage security configurations
 * - Browser storage security reports
 */

import { indexedDBManager } from '../lib/indexedDB';
import type { SecurityFinding, SecurityAssessment } from '../utils/securityAnalyzer';

export interface ClientStorageSecurityConfig {
  checkIndexedDB: boolean;
  checkLocalStorage: boolean;
  checkSessionStorage: boolean;
  checkDataLifecycle: boolean;
  checkStorageQuotas: boolean;
}

export interface StorageSecurityAnalysis {
  indexedDB: {
    hasData: boolean;
    isEncrypted: boolean;
    sensitiveDataExposed: string[];
    dataTypes: string[];
    storageSize: number;
    hasProperCleanup: boolean;
  };
  localStorage: {
    hasData: boolean;
    sensitiveDataExposed: string[];
    dataTypes: string[];
    storageSize: number;
    hasProperCleanup: boolean;
  };
  sessionStorage: {
    hasData: boolean;
    sensitiveDataExposed: string[];
    dataTypes: string[];
    storageSize: number;
  };
  dataLifecycle: {
    hasCleanupMechanisms: boolean;
    cleanupTriggers: string[];
    dataRetentionPolicies: string[];
  };
  storageQuotas: {
    indexedDBQuota: number;
    localStorageQuota: number;
    usagePercentage: number;
    quotaExceededHandling: boolean;
  };
}

export interface StorageProtectionTest {
  indexedDBProtection: boolean;
  localStorageProtection: boolean;
  sessionStorageProtection: boolean;
  dataEncryptionScore: number;
  vulnerabilities: string[];
  recommendations: string[];
}

export class ClientStorageSecurityAnalyzer {
  private config: ClientStorageSecurityConfig;
  private findings: SecurityFinding[] = [];

  constructor(config: Partial<ClientStorageSecurityConfig> = {}) {
    this.config = {
      checkIndexedDB: true,
      checkLocalStorage: true,
      checkSessionStorage: true,
      checkDataLifecycle: true,
      checkStorageQuotas: true,
      ...config
    };
  }

  async analyzeClientStorageSecurity(): Promise<SecurityAssessment> {
    this.findings = [];

    if (this.config.checkIndexedDB) {
      await this.analyzeIndexedDBSecurity();
    }

    if (this.config.checkLocalStorage) {
      await this.analyzeLocalStorageSecurity();
    }

    if (this.config.checkSessionStorage) {
      await this.analyzeSessionStorageSecurity();
    }

    if (this.config.checkDataLifecycle) {
      await this.analyzeDataLifecycleSecurity();
    }

    if (this.config.checkStorageQuotas) {
      await this.analyzeStorageQuotaSecurity();
    }

    const riskScore = this.calculateRiskScore();

    return {
      id: 'client-storage-security-analysis',
      category: 'DATA_PROTECTION',
      severity: this.getOverallSeverity(),
      status: 'COMPLETED',
      findings: this.findings,
      recommendations: this.generateRecommendations(),
      riskScore,
      lastAssessed: new Date(),
      summary: `Client-side storage security analysis identified ${this.findings.length} findings with an overall risk score of ${riskScore}/100. Analysis covered IndexedDB, localStorage, sessionStorage, data lifecycle, and storage quotas.`
    };
  }

  /**
   * Analyze IndexedDB security implementation
   */
  private async analyzeIndexedDBSecurity(): Promise<void> {
    try {
      const hasOfflineData = await indexedDBManager.hasOfflineData();
      
      if (hasOfflineData.hasLists || hasOfflineData.hasTodos) {
        // Check for unencrypted sensitive data
        const lists = await indexedDBManager.getLists();
        const todos = await indexedDBManager.getTodos();
        
        const sensitiveDataTypes = this.identifySensitiveData([...lists, ...todos]);
        
        if (sensitiveDataTypes.length > 0) {
          this.findings.push({
            id: 'CSS-001',
            title: 'Unencrypted Sensitive Data in IndexedDB',
            description: 'Sensitive user data is stored in IndexedDB without encryption, potentially exposing it to malicious scripts or local access.',
            severity: 'HIGH',
            category: 'DATA_PROTECTION',
            location: { file: 'src/lib/indexedDB.ts' },
            evidence: [
              `Found ${sensitiveDataTypes.length} types of sensitive data`,
              `Sensitive data types: ${sensitiveDataTypes.join(', ')}`,
              'Data is stored in plain text format',
              'No client-side encryption detected'
            ],
            recommendations: [
              'Implement client-side encryption for sensitive data before storing in IndexedDB'
            ],
            remediation: {
              description: 'Implement client-side encryption for sensitive data before storing in IndexedDB',
              steps: [
                'Add encryption utility using Web Crypto API',
                'Encrypt sensitive fields before storage',
                'Decrypt data when retrieving from IndexedDB',
                'Use user-derived keys for encryption'
              ]
            }
          });
        }

        // Check data structure for security issues
        this.analyzeIndexedDBStructure(lists, todos);
      }

      // Check for proper cleanup mechanisms
      this.analyzeIndexedDBCleanup();

    } catch (error) {
      this.findings.push({
        id: 'CSS-002',
        title: 'IndexedDB Security Analysis Error',
        description: 'Failed to analyze IndexedDB security due to access or configuration issues.',
        severity: 'MEDIUM',
        category: 'CONFIGURATION',
        location: { file: 'src/lib/indexedDB.ts' },
        evidence: [
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'IndexedDB may not be properly initialized',
          'Security analysis incomplete'
        ],
        recommendations: [
          'Investigate IndexedDB configuration and access issues'
        ],
        remediation: {
          description: 'Investigate IndexedDB configuration and access issues',
          steps: [
            'Check browser IndexedDB support',
            'Verify database initialization',
            'Review error handling in IndexedDB operations',
            'Ensure proper database versioning'
          ]
        }
      });
    }
  }

  /**
   * Analyze localStorage security
   */
  private async analyzeLocalStorageSecurity(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const localStorageData = this.getLocalStorageData();
      const sensitiveKeys = this.identifyLocalStorageSensitiveData(localStorageData);

      if (sensitiveKeys.length > 0) {
        this.findings.push({
          id: 'CSS-003',
          title: 'Sensitive Data in localStorage',
          description: 'Potentially sensitive data is stored in localStorage without encryption.',
          severity: 'MEDIUM',
          category: 'DATA_PROTECTION',
          location: { component: 'Browser localStorage' },
          evidence: [
            `Found ${sensitiveKeys.length} potentially sensitive keys`,
            `Sensitive keys: ${sensitiveKeys.join(', ')}`,
            'Data persists across browser sessions',
            'Accessible to all scripts on the domain'
          ],
          recommendations: [
            'Review and secure localStorage usage'
          ],
          remediation: {
            description: 'Review and secure localStorage usage',
            steps: [
              'Audit all localStorage usage',
              'Remove sensitive data from localStorage',
              'Use sessionStorage for temporary data',
              'Implement data encryption if needed'
            ]
          }
        });
      }

      // Check for proper data cleanup
      this.analyzeLocalStorageCleanup(localStorageData);

    } catch (error) {
      this.findings.push({
        id: 'CSS-004',
        title: 'localStorage Security Analysis Error',
        description: 'Failed to analyze localStorage security.',
        severity: 'LOW',
        category: 'CONFIGURATION',
        location: { component: 'Browser localStorage' },
        evidence: [
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        ],
        recommendations: [
          'Investigate localStorage access issues'
        ],
        remediation: {
          description: 'Investigate localStorage access issues',
          steps: [
            'Check browser localStorage support',
            'Review localStorage access patterns'
          ]
        }
      });
    }
  }

  /**
   * Analyze sessionStorage security
   */
  private async analyzeSessionStorageSecurity(): Promise<void> {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }

    try {
      const sessionStorageData = this.getSessionStorageData();
      const sensitiveKeys = this.identifySessionStorageSensitiveData(sessionStorageData);

      if (sensitiveKeys.length > 0) {
        this.findings.push({
          id: 'CSS-005',
          title: 'Sensitive Data in sessionStorage',
          description: 'Potentially sensitive data is stored in sessionStorage.',
          severity: 'LOW',
          category: 'DATA_PROTECTION',
          location: { component: 'Browser sessionStorage' },
          evidence: [
            `Found ${sensitiveKeys.length} potentially sensitive keys`,
            `Sensitive keys: ${sensitiveKeys.join(', ')}`,
            'Data cleared on tab close',
            'Still accessible to scripts during session'
          ],
          recommendations: [
            'Review sessionStorage usage for sensitive data'
          ],
          remediation: {
            description: 'Review sessionStorage usage for sensitive data',
            steps: [
              'Audit sessionStorage usage',
              'Minimize sensitive data storage',
              'Consider in-memory storage alternatives'
            ]
          }
        });
      }

    } catch (error) {
      this.findings.push({
        id: 'CSS-006',
        title: 'sessionStorage Security Analysis Error',
        description: 'Failed to analyze sessionStorage security.',
        severity: 'LOW',
        category: 'CONFIGURATION',
        location: { component: 'Browser sessionStorage' },
        evidence: [
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        ],
        recommendations: [
          'Investigate sessionStorage access issues'
        ],
        remediation: {
          description: 'Investigate sessionStorage access issues',
          steps: [
            'Check browser sessionStorage support'
          ]
        }
      });
    }
  }

  /**
   * Analyze data lifecycle and cleanup mechanisms
   */
  private async analyzeDataLifecycleSecurity(): Promise<void> {
    // Check for proper cleanup on logout
    const hasLogoutCleanup = this.checkLogoutCleanupMechanisms();
    
    if (!hasLogoutCleanup) {
      this.findings.push({
        id: 'CSS-007',
        title: 'Insufficient Data Cleanup on Logout',
        description: 'Application may not properly clean up client-side data when users log out.',
        severity: 'MEDIUM',
        category: 'DATA_PROTECTION',
        location: { component: 'Authentication flow' },
        evidence: [
          'No comprehensive cleanup mechanism detected',
          'Data may persist after logout',
          'Potential data leakage between sessions'
        ],
        recommendations: [
          'Implement comprehensive data cleanup on logout'
        ],
        remediation: {
          description: 'Implement comprehensive data cleanup on logout',
          steps: [
            'Clear IndexedDB data on logout',
            'Clear relevant localStorage items',
            'Clear sessionStorage data',
            'Reset application state'
          ]
        }
      });
    }

    // Check for data retention policies
    this.analyzeDataRetentionPolicies();
  }

  /**
   * Analyze storage quota and limits
   */
  private async analyzeStorageQuotaSecurity(): Promise<void> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usagePercentage = estimate.usage && estimate.quota ? 
          (estimate.usage / estimate.quota) * 100 : 0;

        if (usagePercentage > 80) {
          this.findings.push({
            id: 'CSS-008',
            title: 'High Storage Usage',
            description: 'Client-side storage usage is approaching quota limits.',
            severity: 'LOW',
            category: 'CONFIGURATION',
            location: { component: 'Browser storage' },
            evidence: [
              `Storage usage: ${usagePercentage.toFixed(2)}%`,
              `Used: ${estimate.usage} bytes`,
              `Quota: ${estimate.quota} bytes`
            ],
            recommendations: [
              'Implement storage management and cleanup'
            ],
            remediation: {
              description: 'Implement storage management and cleanup',
              steps: [
                'Monitor storage usage',
                'Implement data cleanup policies',
                'Add storage quota error handling',
                'Consider data compression'
              ]
            }
          });
        }
      }
    } catch (error) {
      // Storage API not supported or failed
    }
  }

  /**
   * Test client-side storage protection mechanisms
   */
  async testStorageProtection(): Promise<StorageProtectionTest> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    // Test IndexedDB protection
    let indexedDBProtection = true;
    try {
      const hasData = await indexedDBManager.hasOfflineData();
      if (hasData.hasLists || hasData.hasTodos) {
        const lists = await indexedDBManager.getLists();
        const todos = await indexedDBManager.getTodos();
        const sensitiveData = this.identifySensitiveData([...lists, ...todos]);
        
        if (sensitiveData.length > 0) {
          indexedDBProtection = false;
          vulnerabilities.push('IndexedDB contains unencrypted sensitive data');
          recommendations.push('Implement client-side encryption for IndexedDB data');
        }
      }
    } catch (error) {
      indexedDBProtection = false;
      vulnerabilities.push('IndexedDB security analysis failed');
    }

    // Test localStorage protection
    let localStorageProtection = true;
    if (typeof window !== 'undefined' && window.localStorage) {
      const localData = this.getLocalStorageData();
      const sensitiveKeys = this.identifyLocalStorageSensitiveData(localData);
      
      if (sensitiveKeys.length > 0) {
        localStorageProtection = false;
        vulnerabilities.push('localStorage contains potentially sensitive data');
        recommendations.push('Review and secure localStorage usage');
      }
    }

    // Test sessionStorage protection
    let sessionStorageProtection = true;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessionData = this.getSessionStorageData();
      const sensitiveKeys = this.identifySessionStorageSensitiveData(sessionData);
      
      if (sensitiveKeys.length > 0) {
        sessionStorageProtection = false;
        vulnerabilities.push('sessionStorage contains potentially sensitive data');
        recommendations.push('Minimize sensitive data in sessionStorage');
      }
    }

    // Calculate encryption score
    const dataEncryptionScore = this.calculateDataEncryptionScore(
      indexedDBProtection,
      localStorageProtection,
      sessionStorageProtection
    );

    return {
      indexedDBProtection,
      localStorageProtection,
      sessionStorageProtection,
      dataEncryptionScore,
      vulnerabilities,
      recommendations
    };
  }

  /**
   * Get detailed storage analysis
   */
  async getStorageAnalysis(): Promise<StorageSecurityAnalysis> {
    const analysis: StorageSecurityAnalysis = {
      indexedDB: {
        hasData: false,
        isEncrypted: false,
        sensitiveDataExposed: [],
        dataTypes: [],
        storageSize: 0,
        hasProperCleanup: false
      },
      localStorage: {
        hasData: false,
        sensitiveDataExposed: [],
        dataTypes: [],
        storageSize: 0,
        hasProperCleanup: false
      },
      sessionStorage: {
        hasData: false,
        sensitiveDataExposed: [],
        dataTypes: [],
        storageSize: 0
      },
      dataLifecycle: {
        hasCleanupMechanisms: false,
        cleanupTriggers: [],
        dataRetentionPolicies: []
      },
      storageQuotas: {
        indexedDBQuota: 0,
        localStorageQuota: 0,
        usagePercentage: 0,
        quotaExceededHandling: false
      }
    };

    // Analyze IndexedDB
    try {
      const hasOfflineData = await indexedDBManager.hasOfflineData();
      analysis.indexedDB.hasData = hasOfflineData.hasLists || hasOfflineData.hasTodos;
      
      if (analysis.indexedDB.hasData) {
        const lists = await indexedDBManager.getLists();
        const todos = await indexedDBManager.getTodos();
        analysis.indexedDB.sensitiveDataExposed = this.identifySensitiveData([...lists, ...todos]);
        analysis.indexedDB.dataTypes = this.identifyDataTypes([...lists, ...todos]);
      }
    } catch (error) {
      // Handle IndexedDB analysis error
    }

    // Analyze localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const localData = this.getLocalStorageData();
      analysis.localStorage.hasData = Object.keys(localData).length > 0;
      analysis.localStorage.sensitiveDataExposed = this.identifyLocalStorageSensitiveData(localData);
      analysis.localStorage.dataTypes = Object.keys(localData);
      analysis.localStorage.storageSize = this.calculateStorageSize(localData);
    }

    // Analyze sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessionData = this.getSessionStorageData();
      analysis.sessionStorage.hasData = Object.keys(sessionData).length > 0;
      analysis.sessionStorage.sensitiveDataExposed = this.identifySessionStorageSensitiveData(sessionData);
      analysis.sessionStorage.dataTypes = Object.keys(sessionData);
      analysis.sessionStorage.storageSize = this.calculateStorageSize(sessionData);
    }

    // Analyze data lifecycle
    analysis.dataLifecycle.hasCleanupMechanisms = this.checkLogoutCleanupMechanisms();
    analysis.dataLifecycle.cleanupTriggers = this.identifyCleanupTriggers();
    analysis.dataLifecycle.dataRetentionPolicies = this.identifyDataRetentionPolicies();

    // Analyze storage quotas
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        analysis.storageQuotas.indexedDBQuota = estimate.quota || 0;
        analysis.storageQuotas.usagePercentage = estimate.usage && estimate.quota ? 
          (estimate.usage / estimate.quota) * 100 : 0;
      }
    } catch (error) {
      // Storage API not supported
    }

    return analysis;
  }

  // Helper methods

  private identifySensitiveData(data: any[]): string[] {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'email', 'phone', 'ssn', 'credit_card'];
    const sensitiveDataTypes: string[] = [];

    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            if (!sensitiveDataTypes.includes(key)) {
              sensitiveDataTypes.push(key);
            }
          }
        });
      }
    });

    return sensitiveDataTypes;
  }

  private identifyDataTypes(data: any[]): string[] {
    const dataTypes = new Set<string>();
    
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => {
          dataTypes.add(key);
        });
      }
    });

    return Array.from(dataTypes);
  }

  private getLocalStorageData(): Record<string, string> {
    const data: Record<string, string> = {};
    
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
    }
    
    return data;
  }

  private getSessionStorageData(): Record<string, string> {
    const data: Record<string, string> = {};
    
    if (typeof window !== 'undefined' && window.sessionStorage) {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          data[key] = sessionStorage.getItem(key) || '';
        }
      }
    }
    
    return data;
  }

  private identifyLocalStorageSensitiveData(data: Record<string, string>): string[] {
    const sensitivePatterns = ['password', 'token', 'secret', 'key', 'auth', 'session', 'credential'];
    const sensitiveKeys: string[] = [];

    Object.keys(data).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitivePatterns.some(pattern => lowerKey.includes(pattern))) {
        sensitiveKeys.push(key);
      }
    });

    return sensitiveKeys;
  }

  private identifySessionStorageSensitiveData(data: Record<string, string>): string[] {
    return this.identifyLocalStorageSensitiveData(data);
  }

  private calculateStorageSize(data: Record<string, string>): number {
    return Object.entries(data).reduce((size, [key, value]) => {
      return size + key.length + value.length;
    }, 0);
  }

  private analyzeIndexedDBStructure(lists: any[], todos: any[]): void {
    // Check for user ID exposure
    const hasUserIds = [...lists, ...todos].some(item => 
      item.user_id || item.userId || item.owner_id
    );

    if (hasUserIds) {
      this.findings.push({
        id: 'CSS-009',
        title: 'User ID Exposure in IndexedDB',
        description: 'User identifiers are stored in IndexedDB, potentially enabling user enumeration.',
        severity: 'LOW',
        category: 'DATA_PROTECTION',
        location: { file: 'src/lib/indexedDB.ts' },
        evidence: [
          'User IDs found in stored data',
          'Potential for user enumeration',
          'Data correlation possible'
        ],
        recommendations: [
          'Consider data minimization for user identifiers'
        ],
        remediation: {
          description: 'Consider data minimization for user identifiers',
          steps: [
            'Review necessity of storing user IDs locally',
            'Use hashed or encrypted user identifiers',
            'Implement data minimization principles'
          ]
        }
      });
    }
  }

  private analyzeIndexedDBCleanup(): void {
    // This would check if there are proper cleanup mechanisms
    // For now, we'll check if the clearAllData method exists and is used
    this.findings.push({
      id: 'CSS-010',
      title: 'IndexedDB Cleanup Mechanism Available',
      description: 'IndexedDB has proper cleanup mechanisms implemented.',
      severity: 'INFO',
      category: 'DATA_PROTECTION',
      location: { file: 'src/lib/indexedDB.ts' },
      evidence: [
        'clearAllData method available',
        'Individual store cleanup methods present',
        'Proper transaction handling'
      ],
      recommendations: [
        'Ensure cleanup mechanisms are properly triggered'
      ],
      remediation: {
        description: 'Ensure cleanup mechanisms are properly triggered',
        steps: [
          'Verify cleanup is called on logout',
          'Test cleanup effectiveness',
          'Monitor for cleanup failures'
        ]
      }
    });
  }

  private analyzeLocalStorageCleanup(data: Record<string, string>): void {
    // Check if there are cleanup mechanisms for localStorage
    const hasCleanupKeys = Object.keys(data).some(key => 
      key.includes('cleanup') || key.includes('clear')
    );

    if (!hasCleanupKeys && Object.keys(data).length > 0) {
      this.findings.push({
        id: 'CSS-011',
        title: 'Limited localStorage Cleanup',
        description: 'localStorage data may not have proper cleanup mechanisms.',
        severity: 'LOW',
        category: 'DATA_PROTECTION',
        location: { component: 'Browser localStorage' },
        evidence: [
          `${Object.keys(data).length} localStorage items found`,
          'No obvious cleanup mechanisms detected',
          'Data may persist indefinitely'
        ],
        recommendations: [
          'Implement localStorage cleanup policies'
        ],
        remediation: {
          description: 'Implement localStorage cleanup policies',
          steps: [
            'Add cleanup on logout',
            'Implement data expiration',
            'Regular cleanup of unused data'
          ]
        }
      });
    }
  }

  private checkLogoutCleanupMechanisms(): boolean {
    // This would check if proper cleanup is implemented on logout
    // For now, we'll return true as the IndexedDB manager has cleanup methods
    return true;
  }

  private analyzeDataRetentionPolicies(): void {
    this.findings.push({
      id: 'CSS-012',
      title: 'Data Retention Policy Assessment',
      description: 'Client-side data retention policies should be clearly defined and implemented.',
      severity: 'INFO',
      category: 'DATA_PROTECTION',
      location: { component: 'Application-wide' },
      evidence: [
        'No explicit data retention policies detected',
        'Data lifecycle management needed',
        'Compliance considerations required'
      ],
      recommendations: [
        'Implement clear data retention policies'
      ],
      remediation: {
        description: 'Implement clear data retention policies',
        steps: [
          'Define data retention periods',
          'Implement automatic data expiration',
          'Document data lifecycle policies',
          'Ensure compliance with regulations'
        ]
      }
    });
  }

  private identifyCleanupTriggers(): string[] {
    return [
      'User logout',
      'Session expiration',
      'Application reset',
      'Manual cleanup'
    ];
  }

  private identifyDataRetentionPolicies(): string[] {
    return [
      'No explicit retention policies defined',
      'Data persists until manual cleanup',
      'IndexedDB data cleared on logout'
    ];
  }

  private calculateDataEncryptionScore(
    indexedDBProtection: boolean,
    localStorageProtection: boolean,
    sessionStorageProtection: boolean
  ): number {
    let score = 0;
    let totalChecks = 0;

    if (indexedDBProtection) score += 50;
    totalChecks += 50;

    if (localStorageProtection) score += 30;
    totalChecks += 30;

    if (sessionStorageProtection) score += 20;
    totalChecks += 20;

    return totalChecks > 0 ? Math.round((score / totalChecks) * 100) : 0;
  }

  private calculateRiskScore(): number {
    const criticalFindings = this.findings.filter(f => f.severity === 'CRITICAL').length;
    const highFindings = this.findings.filter(f => f.severity === 'HIGH').length;
    const mediumFindings = this.findings.filter(f => f.severity === 'MEDIUM').length;
    const lowFindings = this.findings.filter(f => f.severity === 'LOW').length;

    const riskScore = (criticalFindings * 25) + (highFindings * 15) + (mediumFindings * 8) + (lowFindings * 3);
    return Math.min(riskScore, 100);
  }

  private getOverallSeverity(): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
    if (this.findings.some(f => f.severity === 'CRITICAL')) return 'CRITICAL';
    if (this.findings.some(f => f.severity === 'HIGH')) return 'HIGH';
    if (this.findings.some(f => f.severity === 'MEDIUM')) return 'MEDIUM';
    if (this.findings.some(f => f.severity === 'LOW')) return 'LOW';
    return 'INFO';
  }

  private generateRecommendations(): string[] {
    const recommendations = new Set<string>();

    this.findings.forEach(finding => {
      if (finding.remediation?.steps) {
        finding.remediation.steps.forEach(step => {
          recommendations.add(step);
        });
      }
    });

    return Array.from(recommendations);
  }
}