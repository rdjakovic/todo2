/**
 * Client-Side Storage Security Report Generator
 * 
 * Generates comprehensive security reports for client-side storage analysis
 */

import { ClientStorageSecurityAnalyzer, type StorageSecurityAnalysis, type StorageProtectionTest } from './client-storage-security-analyzer';
import type { SecurityAssessment } from '../utils/securityAnalyzer';

export interface ClientStorageSecurityReport {
  executiveSummary: string;
  detailedFindings: string;
  technicalAnalysis: string;
  recommendations: string;
  complianceAssessment: string;
}

export class ClientStorageSecurityReportGenerator {
  private analyzer: ClientStorageSecurityAnalyzer;

  constructor(analyzer: ClientStorageSecurityAnalyzer) {
    this.analyzer = analyzer;
  }

  async generateComprehensiveReport(): Promise<ClientStorageSecurityReport> {
    const assessment = await this.analyzer.analyzeClientStorageSecurity();
    const protectionTest = await this.analyzer.testStorageProtection();
    const storageAnalysis = await this.analyzer.getStorageAnalysis();

    return {
      executiveSummary: this.generateExecutiveSummary(assessment, protectionTest),
      detailedFindings: this.generateDetailedFindings(assessment),
      technicalAnalysis: this.generateTechnicalAnalysis(storageAnalysis, protectionTest),
      recommendations: this.generateRecommendations(assessment, protectionTest),
      complianceAssessment: this.generateComplianceAssessment(assessment, storageAnalysis)
    };
  }

  async generateMarkdownReport(): Promise<string> {
    const report = await this.generateComprehensiveReport();
    const timestamp = new Date().toISOString();

    return `# Client-Side Storage Security Analysis Report

**Generated:** ${timestamp}
**Analysis Type:** Comprehensive Client-Side Storage Security Assessment
**Application:** Todo2 Application

---

## Executive Summary

${report.executiveSummary}

---

## Detailed Security Findings

${report.detailedFindings}

---

## Technical Analysis

${report.technicalAnalysis}

---

## Security Recommendations

${report.recommendations}

---

## Compliance Assessment

${report.complianceAssessment}

---

## Report Metadata

- **Analysis Date:** ${timestamp}
- **Report Version:** 1.0
- **Analyzer:** ClientStorageSecurityAnalyzer
- **Scope:** IndexedDB, localStorage, sessionStorage, Data Lifecycle, Storage Quotas

---

*This report was generated automatically by the Todo2 Security Analysis Framework.*
`;
  }

  private generateExecutiveSummary(assessment: SecurityAssessment, protectionTest: StorageProtectionTest): string {
    const criticalCount = assessment.findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = assessment.findings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = assessment.findings.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = assessment.findings.filter(f => f.severity === 'LOW').length;

    const overallRisk = this.getRiskLevel(assessment.riskScore);
    const protectionStatus = this.getProtectionStatus(protectionTest);

    return `### Security Posture Overview

The client-side storage security analysis of the Todo2 application has identified **${assessment.findings.length} security findings** with an overall risk score of **${assessment.riskScore}/100** (${overallRisk} risk level).

**Finding Distribution:**
- 🔴 Critical: ${criticalCount}
- 🟠 High: ${highCount}
- 🟡 Medium: ${mediumCount}
- 🔵 Low: ${lowCount}
- ℹ️ Informational: ${assessment.findings.filter(f => f.severity === 'INFO').length}

**Storage Protection Status:**
- IndexedDB Protection: ${protectionTest.indexedDBProtection ? '✅ Protected' : '❌ Vulnerable'}
- localStorage Protection: ${protectionTest.localStorageProtection ? '✅ Protected' : '❌ Vulnerable'}
- sessionStorage Protection: ${protectionTest.sessionStorageProtection ? '✅ Protected' : '❌ Vulnerable'}
- Data Encryption Score: ${protectionTest.dataEncryptionScore}%

**Key Concerns:**
${protectionTest.vulnerabilities.length > 0 ? 
  protectionTest.vulnerabilities.map(v => `- ${v}`).join('\n') : 
  '- No major vulnerabilities identified'}

**Overall Assessment:** ${protectionStatus}`;
  }

  private generateDetailedFindings(assessment: SecurityAssessment): string {
    if (assessment.findings.length === 0) {
      return '### No Security Findings\n\nThe analysis did not identify any security issues with the client-side storage implementation.';
    }

    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    let findings = '';

    severityOrder.forEach(severity => {
      const severityFindings = assessment.findings.filter(f => f.severity === severity);
      if (severityFindings.length > 0) {
        findings += `### ${severity} Severity Findings (${severityFindings.length})\n\n`;
        
        severityFindings.forEach((finding, index) => {
          findings += `#### ${severity}-${index + 1}: ${finding.title}\n\n`;
          findings += `**Description:** ${finding.description}\n\n`;
          findings += `**Location:** ${finding.location}\n\n`;
          findings += `**Category:** ${finding.category}\n\n`;
          
          if (finding.evidence && finding.evidence.length > 0) {
            findings += `**Evidence:**\n`;
            finding.evidence.forEach(evidence => {
              findings += `- ${evidence}\n`;
            });
            findings += '\n';
          }

          if (finding.remediation) {
            findings += `**Remediation:**\n`;
            findings += `${finding.remediation.description}\n\n`;
            if (finding.remediation.steps && finding.remediation.steps.length > 0) {
              findings += `**Steps:**\n`;
              finding.remediation.steps.forEach((step, stepIndex) => {
                findings += `${stepIndex + 1}. ${step}\n`;
              });
              findings += '\n';
            }
          }

          findings += '---\n\n';
        });
      }
    });

    return findings;
  }

  private generateTechnicalAnalysis(storageAnalysis: StorageSecurityAnalysis, protectionTest: StorageProtectionTest): string {
    return `### Storage Security Analysis

#### IndexedDB Analysis
- **Has Data:** ${storageAnalysis.indexedDB.hasData ? 'Yes' : 'No'}
- **Encryption Status:** ${storageAnalysis.indexedDB.isEncrypted ? 'Encrypted' : 'Unencrypted'}
- **Sensitive Data Types:** ${storageAnalysis.indexedDB.sensitiveDataExposed.length}
- **Data Categories:** ${storageAnalysis.indexedDB.dataTypes.length}
- **Storage Size:** ${storageAnalysis.indexedDB.storageSize} bytes
- **Cleanup Mechanisms:** ${storageAnalysis.indexedDB.hasProperCleanup ? 'Present' : 'Missing'}

${storageAnalysis.indexedDB.sensitiveDataExposed.length > 0 ? 
  `**Exposed Sensitive Data Types:**\n${storageAnalysis.indexedDB.sensitiveDataExposed.map(type => `- ${type}`).join('\n')}\n` : 
  '**No sensitive data exposure detected in IndexedDB.**\n'}

#### localStorage Analysis
- **Has Data:** ${storageAnalysis.localStorage.hasData ? 'Yes' : 'No'}
- **Sensitive Data Types:** ${storageAnalysis.localStorage.sensitiveDataExposed.length}
- **Data Categories:** ${storageAnalysis.localStorage.dataTypes.length}
- **Storage Size:** ${storageAnalysis.localStorage.storageSize} characters
- **Cleanup Mechanisms:** ${storageAnalysis.localStorage.hasProperCleanup ? 'Present' : 'Missing'}

${storageAnalysis.localStorage.sensitiveDataExposed.length > 0 ? 
  `**Exposed Sensitive Data Keys:**\n${storageAnalysis.localStorage.sensitiveDataExposed.map(key => `- ${key}`).join('\n')}\n` : 
  '**No sensitive data exposure detected in localStorage.**\n'}

#### sessionStorage Analysis
- **Has Data:** ${storageAnalysis.sessionStorage.hasData ? 'Yes' : 'No'}
- **Sensitive Data Types:** ${storageAnalysis.sessionStorage.sensitiveDataExposed.length}
- **Data Categories:** ${storageAnalysis.sessionStorage.dataTypes.length}
- **Storage Size:** ${storageAnalysis.sessionStorage.storageSize} characters

${storageAnalysis.sessionStorage.sensitiveDataExposed.length > 0 ? 
  `**Exposed Sensitive Data Keys:**\n${storageAnalysis.sessionStorage.sensitiveDataExposed.map(key => `- ${key}`).join('\n')}\n` : 
  '**No sensitive data exposure detected in sessionStorage.**\n'}

#### Data Lifecycle Management
- **Cleanup Mechanisms:** ${storageAnalysis.dataLifecycle.hasCleanupMechanisms ? 'Implemented' : 'Missing'}
- **Cleanup Triggers:** ${storageAnalysis.dataLifecycle.cleanupTriggers.join(', ')}
- **Retention Policies:** ${storageAnalysis.dataLifecycle.dataRetentionPolicies.length} defined

#### Storage Quota Management
- **IndexedDB Quota:** ${(storageAnalysis.storageQuotas.indexedDBQuota / (1024 * 1024)).toFixed(2)} MB
- **localStorage Quota:** ${(storageAnalysis.storageQuotas.localStorageQuota / (1024 * 1024)).toFixed(2)} MB
- **Usage Percentage:** ${storageAnalysis.storageQuotas.usagePercentage.toFixed(2)}%
- **Quota Exceeded Handling:** ${storageAnalysis.storageQuotas.quotaExceededHandling ? 'Implemented' : 'Missing'}

### Protection Test Results

**Overall Data Encryption Score:** ${protectionTest.dataEncryptionScore}%

**Storage Protection Status:**
- IndexedDB: ${protectionTest.indexedDBProtection ? '✅ Protected' : '❌ Vulnerable'}
- localStorage: ${protectionTest.localStorageProtection ? '✅ Protected' : '❌ Vulnerable'}
- sessionStorage: ${protectionTest.sessionStorageProtection ? '✅ Protected' : '❌ Vulnerable'}

${protectionTest.vulnerabilities.length > 0 ? 
  `**Identified Vulnerabilities:**\n${protectionTest.vulnerabilities.map(v => `- ${v}`).join('\n')}\n` : 
  '**No major vulnerabilities identified.**\n'}`;
  }

  private generateRecommendations(assessment: SecurityAssessment, protectionTest: StorageProtectionTest): string {
    const recommendations = new Set<string>();

    // Add recommendations from findings
    assessment.findings.forEach(finding => {
      if (finding.remediation?.steps) {
        finding.remediation.steps.forEach(step => {
          recommendations.add(step);
        });
      }
    });

    // Add recommendations from protection test
    protectionTest.recommendations.forEach(rec => {
      recommendations.add(rec);
    });

    if (recommendations.size === 0) {
      return '### No Specific Recommendations\n\nThe current client-side storage implementation appears to follow security best practices.';
    }

    const prioritizedRecommendations = this.prioritizeRecommendations(Array.from(recommendations), assessment);

    let recommendationsText = '### Priority Recommendations\n\n';

    if (prioritizedRecommendations.immediate.length > 0) {
      recommendationsText += '#### Immediate Action Required (Critical)\n';
      prioritizedRecommendations.immediate.forEach((rec, index) => {
        recommendationsText += `${index + 1}. **${rec}**\n`;
      });
      recommendationsText += '\n';
    }

    if (prioritizedRecommendations.high.length > 0) {
      recommendationsText += '#### High Priority (Short Term)\n';
      prioritizedRecommendations.high.forEach((rec, index) => {
        recommendationsText += `${index + 1}. ${rec}\n`;
      });
      recommendationsText += '\n';
    }

    if (prioritizedRecommendations.medium.length > 0) {
      recommendationsText += '#### Medium Priority (Medium Term)\n';
      prioritizedRecommendations.medium.forEach((rec, index) => {
        recommendationsText += `${index + 1}. ${rec}\n`;
      });
      recommendationsText += '\n';
    }

    if (prioritizedRecommendations.low.length > 0) {
      recommendationsText += '#### Low Priority (Long Term)\n';
      prioritizedRecommendations.low.forEach((rec, index) => {
        recommendationsText += `${index + 1}. ${rec}\n`;
      });
      recommendationsText += '\n';
    }

    recommendationsText += '### Implementation Guidelines\n\n';
    recommendationsText += '1. **Prioritize Critical and High severity findings** for immediate attention\n';
    recommendationsText += '2. **Implement data encryption** for sensitive information stored client-side\n';
    recommendationsText += '3. **Review data lifecycle policies** to ensure proper cleanup and retention\n';
    recommendationsText += '4. **Monitor storage usage** to prevent quota exceeded errors\n';
    recommendationsText += '5. **Regular security assessments** to maintain security posture\n';

    return recommendationsText;
  }

  private generateComplianceAssessment(assessment: SecurityAssessment, storageAnalysis: StorageSecurityAnalysis): string {
    const complianceChecks = {
      gdpr: this.assessGDPRCompliance(storageAnalysis),
      pci: this.assessPCICompliance(assessment),
      owasp: this.assessOWASPCompliance(assessment),
      iso27001: this.assessISO27001Compliance(storageAnalysis)
    };

    return `### Regulatory Compliance Assessment

#### GDPR (General Data Protection Regulation)
**Status:** ${complianceChecks.gdpr.status}
**Score:** ${complianceChecks.gdpr.score}%

${complianceChecks.gdpr.findings.map(finding => `- ${finding}`).join('\n')}

#### PCI DSS (Payment Card Industry Data Security Standard)
**Status:** ${complianceChecks.pci.status}
**Score:** ${complianceChecks.pci.score}%

${complianceChecks.pci.findings.map(finding => `- ${finding}`).join('\n')}

#### OWASP Top 10 Alignment
**Status:** ${complianceChecks.owasp.status}
**Score:** ${complianceChecks.owasp.score}%

${complianceChecks.owasp.findings.map(finding => `- ${finding}`).join('\n')}

#### ISO 27001 Information Security Management
**Status:** ${complianceChecks.iso27001.status}
**Score:** ${complianceChecks.iso27001.score}%

${complianceChecks.iso27001.findings.map(finding => `- ${finding}`).join('\n')}

### Overall Compliance Score: ${Math.round((complianceChecks.gdpr.score + complianceChecks.pci.score + complianceChecks.owasp.score + complianceChecks.iso27001.score) / 4)}%`;
  }

  private getRiskLevel(riskScore: number): string {
    if (riskScore >= 80) return 'Critical';
    if (riskScore >= 60) return 'High';
    if (riskScore >= 40) return 'Medium';
    if (riskScore >= 20) return 'Low';
    return 'Minimal';
  }

  private getProtectionStatus(protectionTest: StorageProtectionTest): string {
    const protectedCount = [
      protectionTest.indexedDBProtection,
      protectionTest.localStorageProtection,
      protectionTest.sessionStorageProtection
    ].filter(Boolean).length;

    if (protectedCount === 3) return 'All storage mechanisms are properly protected';
    if (protectedCount === 2) return 'Most storage mechanisms are protected with some vulnerabilities';
    if (protectedCount === 1) return 'Limited storage protection with significant vulnerabilities';
    return 'Storage mechanisms require immediate security improvements';
  }

  private prioritizeRecommendations(recommendations: string[], assessment: SecurityAssessment) {
    const criticalKeywords = ['encrypt', 'sensitive', 'password', 'token', 'secret'];
    const highKeywords = ['cleanup', 'validation', 'access', 'permission'];
    const mediumKeywords = ['monitor', 'policy', 'configuration'];

    return {
      immediate: recommendations.filter(rec => 
        criticalKeywords.some(keyword => rec.toLowerCase().includes(keyword)) ||
        assessment.findings.some(f => f.severity === 'CRITICAL')
      ),
      high: recommendations.filter(rec => 
        highKeywords.some(keyword => rec.toLowerCase().includes(keyword)) &&
        !criticalKeywords.some(keyword => rec.toLowerCase().includes(keyword))
      ),
      medium: recommendations.filter(rec => 
        mediumKeywords.some(keyword => rec.toLowerCase().includes(keyword)) &&
        !highKeywords.some(keyword => rec.toLowerCase().includes(keyword)) &&
        !criticalKeywords.some(keyword => rec.toLowerCase().includes(keyword))
      ),
      low: recommendations.filter(rec => 
        !criticalKeywords.some(keyword => rec.toLowerCase().includes(keyword)) &&
        !highKeywords.some(keyword => rec.toLowerCase().includes(keyword)) &&
        !mediumKeywords.some(keyword => rec.toLowerCase().includes(keyword))
      )
    };
  }

  private assessGDPRCompliance(storageAnalysis: StorageSecurityAnalysis) {
    const findings: string[] = [];
    let score = 100;

    // Check for data minimization
    if (storageAnalysis.indexedDB.sensitiveDataExposed.length > 0) {
      findings.push('❌ Sensitive personal data stored without encryption (Article 32)');
      score -= 30;
    } else {
      findings.push('✅ No unencrypted sensitive personal data detected');
    }

    // Check for data retention
    if (!storageAnalysis.dataLifecycle.hasCleanupMechanisms) {
      findings.push('❌ No clear data retention and deletion mechanisms (Article 17)');
      score -= 25;
    } else {
      findings.push('✅ Data cleanup mechanisms implemented');
    }

    // Check for data portability
    findings.push('ℹ️ Data portability mechanisms should be verified manually (Article 20)');

    return {
      status: score >= 80 ? 'Compliant' : score >= 60 ? 'Partially Compliant' : 'Non-Compliant',
      score: Math.max(0, score),
      findings
    };
  }

  private assessPCICompliance(assessment: SecurityAssessment) {
    const findings: string[] = [];
    let score = 100;

    // Check for sensitive authentication data
    const hasAuthDataFindings = assessment.findings.some(f => 
      f.title.toLowerCase().includes('password') || 
      f.title.toLowerCase().includes('token') ||
      f.title.toLowerCase().includes('credential')
    );

    if (hasAuthDataFindings) {
      findings.push('❌ Potential storage of sensitive authentication data (Requirement 3.4)');
      score -= 40;
    } else {
      findings.push('✅ No sensitive authentication data storage detected');
    }

    // Check for encryption
    const hasEncryptionFindings = assessment.findings.some(f => 
      f.title.toLowerCase().includes('unencrypted') ||
      f.title.toLowerCase().includes('encryption')
    );

    if (hasEncryptionFindings) {
      findings.push('❌ Unencrypted sensitive data storage (Requirement 3.4)');
      score -= 30;
    } else {
      findings.push('✅ No unencrypted sensitive data detected');
    }

    findings.push('ℹ️ Full PCI DSS compliance requires comprehensive assessment');

    return {
      status: score >= 80 ? 'Compliant' : score >= 60 ? 'Partially Compliant' : 'Non-Compliant',
      score: Math.max(0, score),
      findings
    };
  }

  private assessOWASPCompliance(assessment: SecurityAssessment) {
    const findings: string[] = [];
    let score = 100;

    // A03:2021 – Injection (including XSS through stored data)
    const hasInjectionRisk = assessment.findings.some(f => 
      f.category === 'INPUT_VALIDATION' ||
      f.title.toLowerCase().includes('xss') ||
      f.title.toLowerCase().includes('injection')
    );

    if (hasInjectionRisk) {
      findings.push('❌ Potential injection vulnerabilities through stored data (A03:2021)');
      score -= 25;
    } else {
      findings.push('✅ No obvious injection vulnerabilities detected');
    }

    // A02:2021 – Cryptographic Failures
    const hasCryptoFailures = assessment.findings.some(f => 
      f.title.toLowerCase().includes('unencrypted') ||
      f.title.toLowerCase().includes('encryption')
    );

    if (hasCryptoFailures) {
      findings.push('❌ Cryptographic failures - unencrypted sensitive data (A02:2021)');
      score -= 30;
    } else {
      findings.push('✅ No cryptographic failures detected');
    }

    // A05:2021 – Security Misconfiguration
    const hasMisconfiguration = assessment.findings.some(f => 
      f.category === 'CONFIGURATION'
    );

    if (hasMisconfiguration) {
      findings.push('❌ Security misconfigurations detected (A05:2021)');
      score -= 20;
    } else {
      findings.push('✅ No security misconfigurations detected');
    }

    return {
      status: score >= 80 ? 'Aligned' : score >= 60 ? 'Partially Aligned' : 'Not Aligned',
      score: Math.max(0, score),
      findings
    };
  }

  private assessISO27001Compliance(storageAnalysis: StorageSecurityAnalysis) {
    const findings: string[] = [];
    let score = 100;

    // A.18.1.4 Privacy and protection of personally identifiable information
    if (storageAnalysis.indexedDB.sensitiveDataExposed.length > 0 || 
        storageAnalysis.localStorage.sensitiveDataExposed.length > 0) {
      findings.push('❌ Insufficient protection of personally identifiable information (A.18.1.4)');
      score -= 30;
    } else {
      findings.push('✅ Adequate protection of personally identifiable information');
    }

    // A.12.3.1 Information backup
    if (!storageAnalysis.dataLifecycle.hasCleanupMechanisms) {
      findings.push('❌ No clear data lifecycle management procedures (A.12.3.1)');
      score -= 25;
    } else {
      findings.push('✅ Data lifecycle management procedures implemented');
    }

    // A.10.1.1 Audit logging
    findings.push('ℹ️ Audit logging for data access should be verified (A.12.4.1)');

    return {
      status: score >= 80 ? 'Compliant' : score >= 60 ? 'Partially Compliant' : 'Non-Compliant',
      score: Math.max(0, score),
      findings
    };
  }
}