/**
 * User Data Isolation and Access Control Checker
 * 
 * Integration utility for running comprehensive user data isolation analysis
 * on the Todo2 application, combining RLS analysis, data segregation testing,
 * and data retention assessment.
 */

import { UserDataIsolationAnalyzer, UserDataIsolationReport } from './user-data-isolation-analyzer';
import { UserDataSegregationTester, UserDataIsolationTestSuite } from './user-data-segregation-tester';
import { DataRetentionAnalyzer, DataRetentionReport } from './data-retention-analyzer';

export interface UserDataIsolationConfig {
  migrationFiles: string[];
  codeFiles: { path: string; content: string }[];
  runTests: boolean;
  includeRetentionAnalysis: boolean;
}

export interface ComprehensiveUserDataReport {
  timestamp: Date;
  applicationName: string;
  isolationAnalysis: UserDataIsolationReport;
  segregationTests?: UserDataIsolationTestSuite;
  retentionAnalysis?: DataRetentionReport;
  overallSecurityScore: number;
  criticalFindings: number;
  complianceStatus: {
    gdpr: boolean;
    ccpa: boolean;
    soc2: boolean;
    overallCompliant: boolean;
  };
  recommendations: {
    immediate: string[];
    important: string[];
    general: string[];
  };
  summary: string;
}

export class UserDataIsolationChecker {
  private analyzer: UserDataIsolationAnalyzer;
  private tester: UserDataSegregationTester;
  private retentionAnalyzer: DataRetentionAnalyzer;

  constructor() {
    this.analyzer = new UserDataIsolationAnalyzer();
    this.tester = new UserDataSegregationTester();
    this.retentionAnalyzer = new DataRetentionAnalyzer();
  }

  /**
   * Runs comprehensive user data isolation and access control analysis
   */
  async runComprehensiveAnalysis(config: UserDataIsolationConfig): Promise<ComprehensiveUserDataReport> {
    console.log('Starting comprehensive user data isolation analysis...');
    
    try {
      // Validate configuration
      this.validateConfiguration(config);
      
      // Run isolation analysis
      console.log('Analyzing user data isolation and RLS policies...');
      const isolationAnalysis = await this.analyzer.generateSecurityReport(
        config.migrationFiles,
        config.codeFiles
      );
      
      // Run segregation tests if requested
      let segregationTests: UserDataIsolationTestSuite | undefined;
      if (config.runTests) {
        console.log('Running user data segregation tests...');
        try {
          await this.tester.setupTestEnvironment();
          segregationTests = await this.tester.runDataSegregationTests();
          await this.tester.cleanupTestEnvironment();
        } catch (error) {
          console.warn('Segregation tests failed:', error);
          segregationTests = {
            suiteName: 'User Data Segregation Test Suite',
            testResults: [{
              testName: 'Test Suite Execution',
              passed: false,
              description: 'Failed to execute segregation tests',
              findings: [`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
              severity: 'HIGH',
              recommendation: 'Fix test environment and retry'
            }],
            overallPassed: false,
            criticalFailures: 1,
            highFailures: 0,
            summary: 'Segregation tests could not be executed'
          };
        }
      }
      
      // Run retention analysis if requested
      let retentionAnalysis: DataRetentionReport | undefined;
      if (config.includeRetentionAnalysis) {
        console.log('Analyzing data retention and deletion processes...');
        retentionAnalysis = await this.retentionAnalyzer.generateDataRetentionReport(config.codeFiles);
      }
      
      // Generate comprehensive report
      const report = this.generateComprehensiveReport(
        isolationAnalysis,
        segregationTests,
        retentionAnalysis
      );
      
      console.log(`Analysis completed. Overall security score: ${report.overallSecurityScore}/100`);
      console.log(`Critical findings: ${report.criticalFindings}`);
      console.log(`Overall compliance: ${report.complianceStatus.overallCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
      
      return report;
    } catch (error) {
      console.error('Comprehensive analysis failed:', error);
      throw error;
    }
  }

  /**
   * Runs quick user data isolation check
   */
  async quickIsolationCheck(config: Omit<UserDataIsolationConfig, 'runTests' | 'includeRetentionAnalysis'>): Promise<{
    secure: boolean;
    criticalIssues: number;
    rlsEnabled: boolean;
    userDataIsolated: boolean;
    recommendations: string[];
  }> {
    try {
      const isolationAnalysis = await this.analyzer.generateSecurityReport(
        config.migrationFiles,
        config.codeFiles
      );
      
      const criticalIssues = isolationAnalysis.criticalFindings.length;
      const secure = criticalIssues === 0 && isolationAnalysis.overallSecurityScore >= 80;
      
      // Check if RLS is enabled
      const rlsEnabled = isolationAnalysis.rlsPolicyAssessments.some(p => 
        p.securityLevel === 'SECURE' && p.userIsolation
      );
      
      // Check if user data is properly isolated
      const userDataIsolated = isolationAnalysis.dataSegregationAssessments.every(a => 
        a.hasUserFilter && !a.crossUserAccess
      );
      
      const recommendations = isolationAnalysis.recommendations.slice(0, 5); // Top 5 recommendations
      
      return {
        secure,
        criticalIssues,
        rlsEnabled,
        userDataIsolated,
        recommendations
      };
    } catch (error) {
      return {
        secure: false,
        criticalIssues: 1,
        rlsEnabled: false,
        userDataIsolated: false,
        recommendations: [`Quick check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validates RLS policies specifically
   */
  async validateRLSPolicies(migrationFiles: string[]): Promise<{
    allTablesProtected: boolean;
    weakPolicies: string[];
    missingPolicies: string[];
    recommendations: string[];
  }> {
    try {
      const rlsAssessments = await this.analyzer.analyzeRLSPolicies(migrationFiles);
      
      const criticalTables = ['lists', 'todos'];
      const protectedTables = rlsAssessments
        .filter(a => a.securityLevel === 'SECURE')
        .map(a => a.tableName);
      
      const weakPolicies = rlsAssessments
        .filter(a => a.securityLevel === 'WEAK' || a.securityLevel === 'VULNERABLE')
        .map(a => `${a.tableName}.${a.policyName}`);
      
      const missingPolicies = criticalTables.filter(table => 
        !rlsAssessments.some(a => a.tableName === table && a.securityLevel !== 'MISSING')
      );
      
      const allTablesProtected = criticalTables.every(table => protectedTables.includes(table));
      
      const recommendations: string[] = [];
      if (missingPolicies.length > 0) {
        recommendations.push(`Create RLS policies for tables: ${missingPolicies.join(', ')}`);
      }
      if (weakPolicies.length > 0) {
        recommendations.push(`Strengthen RLS policies: ${weakPolicies.join(', ')}`);
      }
      if (allTablesProtected) {
        recommendations.push('RLS policies are properly configured');
      }
      
      return {
        allTablesProtected,
        weakPolicies,
        missingPolicies,
        recommendations
      };
    } catch (error) {
      return {
        allTablesProtected: false,
        weakPolicies: [],
        missingPolicies: ['lists', 'todos'],
        recommendations: [`RLS validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Checks data retention compliance
   */
  async checkDataRetentionCompliance(codeFiles: { path: string; content: string }[]): Promise<{
    compliant: boolean;
    complianceScore: number;
    hasUserDeletion: boolean;
    hasDataExport: boolean;
    criticalIssues: string[];
    recommendations: string[];
  }> {
    try {
      const retentionReport = await this.retentionAnalyzer.generateDataRetentionReport(codeFiles);
      
      const compliant = retentionReport.overallComplianceScore >= 70;
      const hasUserDeletion = retentionReport.deletionProcesses.some(p => p.userInitiated);
      const hasDataExport = retentionReport.privacyCompliance.some(p => p.dataPortability);
      
      const criticalIssues = retentionReport.criticalFindings.map(f => f.title);
      const recommendations = retentionReport.recommendations.slice(0, 5);
      
      return {
        compliant,
        complianceScore: retentionReport.overallComplianceScore,
        hasUserDeletion,
        hasDataExport,
        criticalIssues,
        recommendations
      };
    } catch (error) {
      return {
        compliant: false,
        complianceScore: 0,
        hasUserDeletion: false,
        hasDataExport: false,
        criticalIssues: [`Retention check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Fix data retention analysis and retry']
      };
    }
  }

  /**
   * Exports comprehensive report to various formats
   */
  async exportReport(
    report: ComprehensiveUserDataReport,
    format: 'json' | 'markdown' | 'csv'
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      
      case 'markdown':
        return this.generateMarkdownReport(report);
      
      case 'csv':
        return this.generateCSVReport(report);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods

  private validateConfiguration(config: UserDataIsolationConfig): void {
    if (!config.migrationFiles || config.migrationFiles.length === 0) {
      throw new Error('Migration files are required for RLS policy analysis');
    }
    
    if (!config.codeFiles || config.codeFiles.length === 0) {
      throw new Error('Code files are required for data segregation analysis');
    }
    
    // Validate that critical files are included
    const hasStoreFiles = config.codeFiles.some(f => f.path.includes('store'));
    const hasSupabaseFiles = config.codeFiles.some(f => f.path.includes('supabase'));
    
    if (!hasStoreFiles) {
      console.warn('Warning: No store files found. Data access analysis may be incomplete.');
    }
    
    if (!hasSupabaseFiles) {
      console.warn('Warning: No Supabase files found. Database integration analysis may be incomplete.');
    }
  }

  private generateComprehensiveReport(
    isolationAnalysis: UserDataIsolationReport,
    segregationTests?: UserDataIsolationTestSuite,
    retentionAnalysis?: DataRetentionReport
  ): ComprehensiveUserDataReport {
    // Collect all critical findings
    let criticalFindings = isolationAnalysis.criticalFindings.length;
    if (segregationTests) {
      criticalFindings += segregationTests.criticalFailures;
    }
    if (retentionAnalysis) {
      criticalFindings += retentionAnalysis.criticalFindings.length;
    }

    // Calculate overall security score
    let overallSecurityScore = isolationAnalysis.overallSecurityScore;
    let scoreCount = 1;
    
    if (segregationTests && segregationTests.overallPassed) {
      overallSecurityScore += 85; // Good test score
      scoreCount++;
    } else if (segregationTests) {
      overallSecurityScore += Math.max(0, 85 - (segregationTests.criticalFailures * 20));
      scoreCount++;
    }
    
    if (retentionAnalysis) {
      overallSecurityScore += retentionAnalysis.overallComplianceScore;
      scoreCount++;
    }
    
    overallSecurityScore = Math.round(overallSecurityScore / scoreCount);

    // Assess overall compliance
    const gdprCompliant = isolationAnalysis.complianceStatus.gdpr && 
                         (retentionAnalysis?.privacyCompliance.find(p => p.regulation === 'GDPR')?.complianceScore || 0) >= 70;
    const ccpaCompliant = isolationAnalysis.complianceStatus.ccpa && 
                         (retentionAnalysis?.privacyCompliance.find(p => p.regulation === 'CCPA')?.complianceScore || 0) >= 70;
    const soc2Compliant = isolationAnalysis.complianceStatus.soc2;
    const overallCompliant = gdprCompliant && ccpaCompliant && soc2Compliant && criticalFindings === 0;

    // Generate categorized recommendations
    const recommendations = this.categorizeRecommendations(
      isolationAnalysis,
      segregationTests,
      retentionAnalysis
    );

    // Generate summary
    const summary = this.generateSummary(
      overallSecurityScore,
      criticalFindings,
      overallCompliant,
      segregationTests?.overallPassed,
      retentionAnalysis?.overallComplianceScore
    );

    return {
      timestamp: new Date(),
      applicationName: 'Todo2',
      isolationAnalysis,
      segregationTests,
      retentionAnalysis,
      overallSecurityScore,
      criticalFindings,
      complianceStatus: {
        gdpr: gdprCompliant,
        ccpa: ccpaCompliant,
        soc2: soc2Compliant,
        overallCompliant
      },
      recommendations,
      summary
    };
  }

  private categorizeRecommendations(
    isolationAnalysis: UserDataIsolationReport,
    segregationTests?: UserDataIsolationTestSuite,
    retentionAnalysis?: DataRetentionReport
  ): {
    immediate: string[];
    important: string[];
    general: string[];
  } {
    const immediate = new Set<string>();
    const important = new Set<string>();
    const general = new Set<string>();

    // Add critical findings as immediate actions
    isolationAnalysis.criticalFindings.forEach(finding => {
      immediate.add(finding.recommendation);
    });

    if (segregationTests) {
      segregationTests.testResults
        .filter(r => !r.passed && r.severity === 'CRITICAL')
        .forEach(r => immediate.add(r.recommendation));
      
      segregationTests.testResults
        .filter(r => !r.passed && r.severity === 'HIGH')
        .forEach(r => important.add(r.recommendation));
    }

    if (retentionAnalysis) {
      retentionAnalysis.criticalFindings.forEach(finding => {
        immediate.add(finding.recommendation);
      });
      
      retentionAnalysis.actionItems.immediate.forEach(action => {
        immediate.add(action);
      });
      
      retentionAnalysis.actionItems.shortTerm.forEach(action => {
        important.add(action);
      });
    }

    // Add general recommendations
    isolationAnalysis.recommendations.forEach(rec => {
      if (!immediate.has(rec) && !important.has(rec)) {
        general.add(rec);
      }
    });

    return {
      immediate: Array.from(immediate),
      important: Array.from(important),
      general: Array.from(general)
    };
  }

  private generateSummary(
    overallSecurityScore: number,
    criticalFindings: number,
    overallCompliant: boolean,
    testsPass?: boolean,
    retentionScore?: number
  ): string {
    let summary = `User Data Isolation Analysis Summary:\n`;
    summary += `Overall Security Score: ${overallSecurityScore}/100\n`;
    summary += `Critical Findings: ${criticalFindings}\n`;
    summary += `Compliance Status: ${overallCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n`;
    
    if (testsPass !== undefined) {
      summary += `Segregation Tests: ${testsPass ? 'PASSED' : 'FAILED'}\n`;
    }
    
    if (retentionScore !== undefined) {
      summary += `Data Retention Compliance: ${retentionScore}%\n`;
    }

    summary += `\n`;
    
    if (criticalFindings > 0) {
      summary += `⚠️  CRITICAL: ${criticalFindings} critical security issues require immediate attention\n`;
    } else if (overallSecurityScore < 70) {
      summary += `⚠️  WARNING: Security score below acceptable threshold\n`;
    } else if (overallCompliant) {
      summary += `✅ GOOD: User data isolation is properly implemented and compliant\n`;
    } else {
      summary += `⚠️  REVIEW: Some compliance issues need to be addressed\n`;
    }

    return summary;
  }

  private generateMarkdownReport(report: ComprehensiveUserDataReport): string {
    const sections = [
      '# User Data Isolation and Access Control Report',
      '',
      `**Generated:** ${report.timestamp.toISOString()}`,
      `**Application:** ${report.applicationName}`,
      `**Overall Security Score:** ${report.overallSecurityScore}/100`,
      `**Critical Findings:** ${report.criticalFindings}`,
      '',
      '## Executive Summary',
      '',
      report.summary,
      '',
      '## Compliance Status',
      '',
      `- **GDPR Compliant:** ${report.complianceStatus.gdpr ? 'Yes' : 'No'}`,
      `- **CCPA Compliant:** ${report.complianceStatus.ccpa ? 'Yes' : 'No'}`,
      `- **SOC 2 Compliant:** ${report.complianceStatus.soc2 ? 'Yes' : 'No'}`,
      `- **Overall Compliant:** ${report.complianceStatus.overallCompliant ? 'Yes' : 'No'}`,
      '',
      '## RLS Policy Assessment',
      '',
      ...report.isolationAnalysis.rlsPolicyAssessments.map(policy => [
        `### ${policy.tableName} - ${policy.policyName}`,
        `- **Security Level:** ${policy.securityLevel}`,
        `- **User Isolation:** ${policy.userIsolation ? 'Yes' : 'No'}`,
        `- **Policy Type:** ${policy.policyType}`,
        ''
      ]).flat()
    ];

    if (report.segregationTests) {
      sections.push(
        '## Data Segregation Tests',
        '',
        `**Overall Result:** ${report.segregationTests.overallPassed ? 'PASSED' : 'FAILED'}`,
        `**Critical Failures:** ${report.segregationTests.criticalFailures}`,
        `**High Failures:** ${report.segregationTests.highFailures}`,
        '',
        ...report.segregationTests.testResults.map(test => [
          `### ${test.testName}`,
          `**Status:** ${test.passed ? 'PASSED' : 'FAILED'}`,
          `**Severity:** ${test.severity}`,
          `**Description:** ${test.description}`,
          ''
        ]).flat()
      );
    }

    if (report.retentionAnalysis) {
      sections.push(
        '## Data Retention Analysis',
        '',
        `**Compliance Score:** ${report.retentionAnalysis.overallComplianceScore}%`,
        `**Critical Findings:** ${report.retentionAnalysis.criticalFindings.length}`,
        '',
        '### Retention Policies',
        '',
        ...report.retentionAnalysis.retentionPolicies.map(policy => [
          `#### ${policy.dataType}`,
          `- **Retention Period:** ${policy.retentionPeriod || 'Not defined'}`,
          `- **User Controlled Deletion:** ${policy.userControlledDeletion ? 'Yes' : 'No'}`,
          `- **Automatic Deletion:** ${policy.automaticDeletion ? 'Yes' : 'No'}`,
          ''
        ]).flat()
      );
    }

    sections.push(
      '## Recommendations',
      '',
      '### Immediate Actions',
      '',
      ...report.recommendations.immediate.map(rec => `- ${rec}`),
      '',
      '### Important Actions',
      '',
      ...report.recommendations.important.map(rec => `- ${rec}`),
      '',
      '### General Improvements',
      '',
      ...report.recommendations.general.map(rec => `- ${rec}`)
    );

    return sections.join('\n');
  }

  private generateCSVReport(report: ComprehensiveUserDataReport): string {
    const headers = [
      'Category',
      'Item',
      'Status',
      'Severity',
      'Description',
      'Recommendation'
    ];

    const rows: string[][] = [];

    // Add RLS policy assessments
    report.isolationAnalysis.rlsPolicyAssessments.forEach(policy => {
      rows.push([
        'RLS Policy',
        `${policy.tableName}.${policy.policyName}`,
        policy.securityLevel,
        policy.securityLevel === 'SECURE' ? 'LOW' : 'HIGH',
        `User isolation: ${policy.userIsolation}`,
        policy.findings.map(f => f.recommendation).join('; ')
      ]);
    });

    // Add segregation test results
    if (report.segregationTests) {
      report.segregationTests.testResults.forEach(test => {
        rows.push([
          'Segregation Test',
          test.testName,
          test.passed ? 'PASSED' : 'FAILED',
          test.severity,
          test.description,
          test.recommendation
        ]);
      });
    }

    // Add retention analysis
    if (report.retentionAnalysis) {
      report.retentionAnalysis.retentionPolicies.forEach(policy => {
        rows.push([
          'Data Retention',
          policy.dataType,
          policy.userControlledDeletion ? 'COMPLIANT' : 'NON-COMPLIANT',
          policy.userControlledDeletion ? 'LOW' : 'MEDIUM',
          `Retention: ${policy.retentionPeriod || 'Not defined'}`,
          'Implement user-controlled deletion if missing'
        ]);
      });
    }

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
  }
}

// Utility functions

export function createUserDataIsolationChecker(): UserDataIsolationChecker {
  return new UserDataIsolationChecker();
}

export async function runQuickUserDataCheck(
  migrationFiles: string[],
  codeFiles: { path: string; content: string }[]
): Promise<{
  secure: boolean;
  criticalIssues: number;
  complianceScore: number;
  summary: string;
}> {
  const checker = createUserDataIsolationChecker();
  
  try {
    const result = await checker.quickIsolationCheck({ migrationFiles, codeFiles });
    
    return {
      secure: result.secure,
      criticalIssues: result.criticalIssues,
      complianceScore: result.secure ? 85 : (result.criticalIssues > 0 ? 30 : 60),
      summary: `User data isolation: ${result.secure ? 'SECURE' : 'NEEDS ATTENTION'}, ` +
               `RLS: ${result.rlsEnabled ? 'ENABLED' : 'MISSING'}, ` +
               `Data isolated: ${result.userDataIsolated ? 'YES' : 'NO'}`
    };
  } catch (error) {
    return {
      secure: false,
      criticalIssues: 1,
      complianceScore: 0,
      summary: `User data isolation check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}