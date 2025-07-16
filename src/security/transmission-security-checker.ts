/**
 * Data Transmission Security Checker
 * 
 * Integration utility for running data transmission security analysis
 * on the Todo2 application's Supabase configuration
 */

import { DataTransmissionSecurityAnalyzer, DataTransmissionSecurityReport } from './data-transmission-analyzer';

export interface TransmissionSecurityConfig {
  supabaseUrl: string;
  supabaseKey: string;
  additionalEndpoints?: string[];
}

export class TransmissionSecurityChecker {
  private analyzer: DataTransmissionSecurityAnalyzer;

  constructor() {
    this.analyzer = new DataTransmissionSecurityAnalyzer();
  }

  /**
   * Runs comprehensive data transmission security analysis
   */
  async runSecurityAnalysis(config: TransmissionSecurityConfig): Promise<DataTransmissionSecurityReport> {
    console.log('Starting data transmission security analysis...');
    
    try {
      // Validate configuration
      this.validateConfiguration(config);
      
      // Generate comprehensive security report
      const report = await this.analyzer.generateSecurityReport(
        config.supabaseUrl,
        config.supabaseKey
      );
      
      console.log(`Security analysis completed. Risk score: ${report.overallRiskScore}/100`);
      console.log(`Critical findings: ${report.criticalFindings.length}`);
      
      return report;
    } catch (error) {
      console.error('Security analysis failed:', error);
      throw error;
    }
  }

  /**
   * Runs quick TLS security check
   */
  async quickTLSCheck(url: string): Promise<{
    secure: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const tlsAssessment = await this.analyzer.analyzeTLSConfiguration(url);
      
      const secure = tlsAssessment.riskLevel === 'LOW';
      const issues = tlsAssessment.findings.map(f => f.title);
      const recommendations = tlsAssessment.findings.map(f => f.recommendation);
      
      return { secure, issues, recommendations };
    } catch (error) {
      return {
        secure: false,
        issues: [`TLS check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Verify URL accessibility and fix configuration issues']
      };
    }
  }

  /**
   * Validates API endpoints security
   */
  async validateAPIEndpoints(config: TransmissionSecurityConfig): Promise<{
    allSecure: boolean;
    endpointResults: Array<{
      endpoint: string;
      secure: boolean;
      issues: string[];
    }>;
  }> {
    try {
      const apiAssessments = await this.analyzer.analyzeAPISecurityConfiguration(
        config.supabaseUrl,
        config.supabaseKey
      );
      
      const endpointResults = apiAssessments.map(assessment => ({
        endpoint: assessment.endpoint,
        secure: assessment.riskLevel === 'LOW',
        issues: assessment.findings.map(f => f.title)
      }));
      
      const allSecure = endpointResults.every(result => result.secure);
      
      return { allSecure, endpointResults };
    } catch (error) {
      return {
        allSecure: false,
        endpointResults: [{
          endpoint: config.supabaseUrl,
          secure: false,
          issues: [`API validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }]
      };
    }
  }

  /**
   * Checks certificate security status
   */
  async checkCertificateSecurity(url: string): Promise<{
    valid: boolean;
    issues: string[];
    expiryWarning: boolean;
  }> {
    try {
      const findings = await this.analyzer.validateCertificateSecurity(url);
      
      const valid = !findings.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
      const issues = findings.map(f => f.title);
      const expiryWarning = findings.some(f => f.title.includes('Expiring'));
      
      return { valid, issues, expiryWarning };
    } catch (error) {
      return {
        valid: false,
        issues: [`Certificate check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        expiryWarning: false
      };
    }
  }

  /**
   * Generates security recommendations based on current configuration
   */
  async getSecurityRecommendations(config: TransmissionSecurityConfig): Promise<{
    immediate: string[];
    important: string[];
    general: string[];
  }> {
    try {
      const report = await this.runSecurityAnalysis(config);
      
      const immediate: string[] = [];
      const important: string[] = [];
      const general: string[] = [];
      
      // Categorize findings by severity
      report.criticalFindings.forEach(finding => {
        immediate.push(finding.recommendation);
      });
      
      const allFindings = [
        ...report.tlsAssessment.findings,
        ...report.apiAssessments.flatMap(a => a.findings)
      ];
      
      allFindings.forEach(finding => {
        if (finding.severity === 'HIGH' && !immediate.includes(finding.recommendation)) {
          important.push(finding.recommendation);
        } else if (finding.severity === 'MEDIUM' && 
                   !immediate.includes(finding.recommendation) && 
                   !important.includes(finding.recommendation)) {
          general.push(finding.recommendation);
        }
      });
      
      // Add general recommendations if not already included
      report.recommendations.forEach(rec => {
        if (!immediate.includes(rec) && !important.includes(rec) && !general.includes(rec)) {
          general.push(rec);
        }
      });
      
      return { immediate, important, general };
    } catch (error) {
      return {
        immediate: ['Fix configuration errors to enable security analysis'],
        important: ['Verify Supabase URL and API key configuration'],
        general: ['Implement HTTPS for all communications', 'Use strong API keys']
      };
    }
  }

  /**
   * Exports security report to various formats
   */
  async exportSecurityReport(
    report: DataTransmissionSecurityReport,
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

  private validateConfiguration(config: TransmissionSecurityConfig): void {
    if (!config.supabaseUrl) {
      throw new Error('Supabase URL is required');
    }
    
    if (!config.supabaseKey) {
      throw new Error('Supabase API key is required');
    }
    
    try {
      new URL(config.supabaseUrl);
    } catch {
      throw new Error('Invalid Supabase URL format');
    }
    
    if (config.supabaseUrl.includes('your-project-url')) {
      console.warn('Warning: Using placeholder Supabase URL. Update with actual project URL.');
    }
    
    if (config.supabaseKey.includes('your-project-anon-key')) {
      console.warn('Warning: Using placeholder API key. Update with actual project key.');
    }
  }

  private generateMarkdownReport(report: DataTransmissionSecurityReport): string {
    const sections = [
      '# Data Transmission Security Report',
      '',
      `**Generated:** ${report.timestamp.toISOString()}`,
      `**Application URL:** ${report.applicationUrl}`,
      `**Overall Risk Score:** ${report.overallRiskScore}/100`,
      '',
      '## TLS/SSL Assessment',
      '',
      `- **Protocol:** ${report.tlsAssessment.protocol}`,
      `- **TLS Version:** ${report.tlsAssessment.version}`,
      `- **Certificate Valid:** ${report.tlsAssessment.certificateValid ? 'Yes' : 'No'}`,
      `- **HSTS Enabled:** ${report.tlsAssessment.hsts ? 'Yes' : 'No'}`,
      `- **Risk Level:** ${report.tlsAssessment.riskLevel}`,
      '',
      '## API Security Assessment',
      '',
      ...report.apiAssessments.map(api => [
        `### ${api.endpoint}`,
        `- **HTTPS Enforced:** ${api.httpsEnforced ? 'Yes' : 'No'}`,
        `- **Authentication Required:** ${api.authenticationRequired ? 'Yes' : 'No'}`,
        `- **Risk Level:** ${api.riskLevel}`,
        ''
      ]).flat(),
      '## Critical Findings',
      '',
      ...report.criticalFindings.map(finding => [
        `### ${finding.title}`,
        `**Severity:** ${finding.severity}`,
        `**Description:** ${finding.description}`,
        `**Recommendation:** ${finding.recommendation}`,
        ''
      ]).flat(),
      '## Recommendations',
      '',
      ...report.recommendations.map(rec => `- ${rec}`),
      '',
      '## Compliance Status',
      '',
      `- **GDPR Compliant:** ${report.complianceStatus.gdpr ? 'Yes' : 'No'}`,
      `- **SOC 2 Compliant:** ${report.complianceStatus.soc2 ? 'Yes' : 'No'}`,
      `- **PCI DSS Compliant:** ${report.complianceStatus.pciDss ? 'Yes' : 'No'}`
    ];
    
    return sections.join('\n');
  }

  private generateCSVReport(report: DataTransmissionSecurityReport): string {
    const headers = [
      'Finding ID',
      'Title',
      'Severity',
      'Category',
      'Description',
      'Recommendation',
      'CWE ID'
    ];
    
    const allFindings = [
      ...report.tlsAssessment.findings,
      ...report.apiAssessments.flatMap(a => a.findings)
    ];
    
    const rows = allFindings.map(finding => [
      finding.id,
      finding.title,
      finding.severity,
      finding.category,
      finding.description.replace(/,/g, ';'), // Escape commas
      finding.recommendation.replace(/,/g, ';'),
      finding.cweId || ''
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}

// Utility function to create checker with environment variables
export function createTransmissionSecurityChecker(): TransmissionSecurityChecker {
  return new TransmissionSecurityChecker();
}

// Utility function to run analysis with current environment configuration
export async function analyzeCurrentConfiguration(): Promise<DataTransmissionSecurityReport> {
  const checker = createTransmissionSecurityChecker();
  
  // Get configuration from environment variables (would be available at runtime)
  const config: TransmissionSecurityConfig = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co',
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-project-anon-key'
  };
  
  return await checker.runSecurityAnalysis(config);
}