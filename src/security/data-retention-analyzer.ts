/**
 * Data Retention and Deletion Process Analyzer
 * 
 * This module analyzes data retention policies, deletion processes,
 * and privacy compliance for user data in the Todo2 application.
 */

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: string | null;
  automaticDeletion: boolean;
  userControlledDeletion: boolean;
  cascadeDeletion: boolean;
  backupRetention: string | null;
  complianceRequirements: string[];
}

export interface DeletionProcessAssessment {
  processName: string;
  dataTypes: string[];
  userInitiated: boolean;
  adminInitiated: boolean;
  automaticTrigger: boolean;
  completeness: 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE';
  secureWipe: boolean;
  auditTrail: boolean;
  findings: SecurityFinding[];
}

export interface PrivacyComplianceAssessment {
  regulation: 'GDPR' | 'CCPA' | 'PIPEDA' | 'LGPD';
  rightToErasure: boolean;
  dataPortability: boolean;
  consentManagement: boolean;
  dataMinimization: boolean;
  purposeLimitation: boolean;
  complianceScore: number;
  findings: SecurityFinding[];
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'RETENTION' | 'DELETION' | 'PRIVACY' | 'COMPLIANCE' | 'AUDIT';
  recommendation: string;
  regulationRef?: string;
  requirementRef?: string;
}

export interface DataRetentionReport {
  timestamp: Date;
  applicationName: string;
  retentionPolicies: DataRetentionPolicy[];
  deletionProcesses: DeletionProcessAssessment[];
  privacyCompliance: PrivacyComplianceAssessment[];
  overallComplianceScore: number;
  criticalFindings: SecurityFinding[];
  recommendations: string[];
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export class DataRetentionAnalyzer {
  private findings: SecurityFinding[] = [];
  private findingCounter = 0;

  /**
   * Analyzes data retention policies across the application
   */
  async analyzeDataRetentionPolicies(codeFiles: { path: string; content: string }[]): Promise<DataRetentionPolicy[]> {
    const policies: DataRetentionPolicy[] = [];

    try {
      // Define data types to analyze
      const dataTypes = [
        { name: 'User Account Data', table: 'auth.users', sensitive: true },
        { name: 'Todo Lists', table: 'lists', sensitive: false },
        { name: 'Todo Items', table: 'todos', sensitive: false },
        { name: 'Session Data', table: 'sessions', sensitive: true },
        { name: 'Local Storage Data', table: 'localStorage', sensitive: false },
        { name: 'IndexedDB Data', table: 'indexedDB', sensitive: false },
        { name: 'Authentication Tokens', table: 'tokens', sensitive: true },
        { name: 'Error Logs', table: 'logs', sensitive: false }
      ];

      for (const dataType of dataTypes) {
        const policy = await this.analyzeDataTypeRetention(dataType, codeFiles);
        policies.push(policy);
      }

      return policies;
    } catch (error) {
      // Return error policy
      return [{
        dataType: 'ANALYSIS_FAILED',
        retentionPeriod: null,
        automaticDeletion: false,
        userControlledDeletion: false,
        cascadeDeletion: false,
        backupRetention: null,
        complianceRequirements: []
      }];
    }
  }

  /**
   * Analyzes deletion processes in the application
   */
  async analyzeDeletionProcesses(codeFiles: { path: string; content: string }[]): Promise<DeletionProcessAssessment[]> {
    const processes: DeletionProcessAssessment[] = [];

    try {
      // Identify deletion processes
      const deletionProcesses = [
        { name: 'User Account Deletion', dataTypes: ['User Account Data', 'Todo Lists', 'Todo Items'] },
        { name: 'Todo List Deletion', dataTypes: ['Todo Lists', 'Todo Items'] },
        { name: 'Todo Item Deletion', dataTypes: ['Todo Items'] },
        { name: 'Session Cleanup', dataTypes: ['Session Data', 'Authentication Tokens'] },
        { name: 'Local Data Cleanup', dataTypes: ['Local Storage Data', 'IndexedDB Data'] },
        { name: 'Log Cleanup', dataTypes: ['Error Logs'] }
      ];

      for (const process of deletionProcesses) {
        const assessment = await this.assessDeletionProcess(process, codeFiles);
        processes.push(assessment);
      }

      return processes;
    } catch (error) {
      return [{
        processName: 'ANALYSIS_FAILED',
        dataTypes: [],
        userInitiated: false,
        adminInitiated: false,
        automaticTrigger: false,
        completeness: 'INCOMPLETE',
        secureWipe: false,
        auditTrail: false,
        findings: [this.createFinding(
          'Deletion Process Analysis Failed',
          `Failed to analyze deletion processes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'HIGH',
          'DELETION',
          'Review deletion process implementation and ensure proper error handling'
        )]
      }];
    }
  }

  /**
   * Analyzes privacy compliance across different regulations
   */
  async analyzePrivacyCompliance(
    retentionPolicies: DataRetentionPolicy[],
    deletionProcesses: DeletionProcessAssessment[],
    codeFiles: { path: string; content: string }[]
  ): Promise<PrivacyComplianceAssessment[]> {
    const assessments: PrivacyComplianceAssessment[] = [];

    try {
      const regulations = ['GDPR', 'CCPA', 'PIPEDA', 'LGPD'] as const;

      for (const regulation of regulations) {
        const assessment = await this.assessRegulationCompliance(
          regulation,
          retentionPolicies,
          deletionProcesses,
          codeFiles
        );
        assessments.push(assessment);
      }

      return assessments;
    } catch (error) {
      return [{
        regulation: 'GDPR',
        rightToErasure: false,
        dataPortability: false,
        consentManagement: false,
        dataMinimization: false,
        purposeLimitation: false,
        complianceScore: 0,
        findings: [this.createFinding(
          'Privacy Compliance Analysis Failed',
          `Failed to analyze privacy compliance: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'HIGH',
          'COMPLIANCE',
          'Review privacy compliance implementation and regulatory requirements'
        )]
      }];
    }
  }

  /**
   * Generates comprehensive data retention and deletion report
   */
  async generateDataRetentionReport(codeFiles: { path: string; content: string }[]): Promise<DataRetentionReport> {
    const timestamp = new Date();

    // Perform all analyses
    const retentionPolicies = await this.analyzeDataRetentionPolicies(codeFiles);
    const deletionProcesses = await this.analyzeDeletionProcesses(codeFiles);
    const privacyCompliance = await this.analyzePrivacyCompliance(retentionPolicies, deletionProcesses, codeFiles);

    // Collect all findings
    const allFindings = [
      ...deletionProcesses.flatMap(p => p.findings),
      ...privacyCompliance.flatMap(p => p.findings),
      ...this.findings
    ];

    // Filter critical findings
    const criticalFindings = allFindings.filter(f => f.severity === 'CRITICAL');

    // Calculate overall compliance score
    const overallComplianceScore = this.calculateOverallComplianceScore(privacyCompliance);

    // Generate recommendations
    const recommendations = this.generateRecommendations(allFindings, retentionPolicies, deletionProcesses);

    // Generate action items
    const actionItems = this.generateActionItems(allFindings, criticalFindings);

    return {
      timestamp,
      applicationName: 'Todo2',
      retentionPolicies,
      deletionProcesses,
      privacyCompliance,
      overallComplianceScore,
      criticalFindings,
      recommendations,
      actionItems
    };
  }

  // Private helper methods

  private async analyzeDataTypeRetention(
    dataType: { name: string; table: string; sensitive: boolean },
    codeFiles: { path: string; content: string }[]
  ): Promise<DataRetentionPolicy> {
    // Check for retention-related code
    const hasRetentionLogic = codeFiles.some(f => 
      f.content.includes('retention') || 
      f.content.includes('expire') || 
      f.content.includes('cleanup')
    );



    // Check for user-controlled deletion
    const hasUserDeletion = codeFiles.some(f => 
      f.content.includes('deleteTodo') || 
      f.content.includes('deleteList') || 
      f.content.includes('reset') ||
      f.content.includes('clearAllData')
    );

    // Check for cascade deletion
    const hasCascadeDeletion = codeFiles.some(f => 
      f.content.includes('CASCADE') || 
      f.content.includes('ON DELETE CASCADE')
    );

    // Determine compliance requirements based on data sensitivity
    const complianceRequirements = [];
    if (dataType.sensitive) {
      complianceRequirements.push('GDPR Article 17 (Right to Erasure)');
      complianceRequirements.push('CCPA Right to Delete');
    }
    if (dataType.name.includes('Session') || dataType.name.includes('Token')) {
      complianceRequirements.push('Session Security Best Practices');
    }

    return {
      dataType: dataType.name,
      retentionPeriod: hasRetentionLogic ? 'Application-defined' : null,
      automaticDeletion: hasRetentionLogic,
      userControlledDeletion: hasUserDeletion,
      cascadeDeletion: hasCascadeDeletion,
      backupRetention: null, // Would need to analyze backup policies
      complianceRequirements
    };
  }

  private async assessDeletionProcess(
    process: { name: string; dataTypes: string[] },
    codeFiles: { path: string; content: string }[]
  ): Promise<DeletionProcessAssessment> {
    const findings: SecurityFinding[] = [];

    // Check if deletion process exists
    const processKeywords = this.getDeletionKeywords(process.name);
    const hasProcess = codeFiles.some(f => 
      processKeywords.some(keyword => f.content.includes(keyword))
    );

    if (!hasProcess) {
      findings.push(this.createFinding(
        `Missing ${process.name} Process`,
        `No implementation found for ${process.name}`,
        'MEDIUM',
        'DELETION',
        `Implement ${process.name} functionality`,
        undefined,
        '2.5'
      ));
    }

    // Check for user-initiated deletion
    const userInitiated = codeFiles.some(f => 
      f.content.includes('onClick') || 
      f.content.includes('onDelete') || 
      f.content.includes('handleDelete')
    );

    // Check for automatic triggers
    const automaticTrigger = codeFiles.some(f => 
      f.content.includes('cleanup') || 
      f.content.includes('expire') || 
      f.content.includes('timeout')
    );

    // Assess completeness
    let completeness: 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE';
    if (hasProcess && userInitiated) {
      completeness = 'COMPLETE';
    } else if (hasProcess || userInitiated) {
      completeness = 'PARTIAL';
    } else {
      completeness = 'INCOMPLETE';
    }

    // Check for audit trail
    const auditTrail = codeFiles.some(f => 
      f.content.includes('log') || 
      f.content.includes('audit') || 
      f.content.includes('console.log')
    );

    if (!auditTrail && process.name.includes('Account')) {
      findings.push(this.createFinding(
        `Missing Audit Trail for ${process.name}`,
        `${process.name} does not maintain an audit trail`,
        'MEDIUM',
        'AUDIT',
        'Implement audit logging for sensitive deletion operations',
        undefined,
        '2.5'
      ));
    }

    return {
      processName: process.name,
      dataTypes: process.dataTypes,
      userInitiated,
      adminInitiated: false, // Todo2 doesn't have admin functionality
      automaticTrigger,
      completeness,
      secureWipe: false, // Would need to analyze secure deletion methods
      auditTrail,
      findings
    };
  }

  private async assessRegulationCompliance(
    regulation: 'GDPR' | 'CCPA' | 'PIPEDA' | 'LGPD',
    retentionPolicies: DataRetentionPolicy[],
    deletionProcesses: DeletionProcessAssessment[],
    codeFiles: { path: string; content: string }[]
  ): Promise<PrivacyComplianceAssessment> {
    const findings: SecurityFinding[] = [];

    // Check right to erasure (GDPR Article 17, CCPA Right to Delete)
    const hasUserDeletion = deletionProcesses.some(p => 
      p.userInitiated && p.processName.includes('Account')
    );
    
    if (!hasUserDeletion) {
      findings.push(this.createFinding(
        `Missing Right to Erasure (${regulation})`,
        `Application does not provide user-initiated data deletion as required by ${regulation}`,
        'HIGH',
        'COMPLIANCE',
        'Implement user account deletion functionality',
        regulation === 'GDPR' ? 'GDPR Article 17' : `${regulation} Right to Delete`,
        '2.5'
      ));
    }

    // Check data portability (GDPR Article 20)
    const hasDataExport = codeFiles.some(f => 
      f.content.includes('export') || 
      f.content.includes('download') || 
      f.content.includes('backup')
    );

    if (!hasDataExport && regulation === 'GDPR') {
      findings.push(this.createFinding(
        'Missing Data Portability (GDPR)',
        'Application does not provide data export functionality as required by GDPR Article 20',
        'MEDIUM',
        'COMPLIANCE',
        'Implement user data export functionality',
        'GDPR Article 20',
        '2.5'
      ));
    }

    // Check consent management
    const hasConsentManagement = codeFiles.some(f => 
      f.content.includes('consent') || 
      f.content.includes('privacy') || 
      f.content.includes('terms')
    );

    // Check data minimization
    const hasDataMinimization = retentionPolicies.some(p => 
      p.automaticDeletion || p.retentionPeriod !== null
    );

    if (!hasDataMinimization) {
      findings.push(this.createFinding(
        `Data Minimization Concern (${regulation})`,
        `Application may not follow data minimization principles required by ${regulation}`,
        'MEDIUM',
        'COMPLIANCE',
        'Implement data retention policies and automatic cleanup',
        regulation === 'GDPR' ? 'GDPR Article 5(1)(c)' : `${regulation} Data Minimization`,
        '2.5'
      ));
    }

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore({
      rightToErasure: hasUserDeletion,
      dataPortability: hasDataExport,
      consentManagement: hasConsentManagement,
      dataMinimization: hasDataMinimization,
      purposeLimitation: true // Assume purpose limitation is met for todo app
    });

    return {
      regulation,
      rightToErasure: hasUserDeletion,
      dataPortability: hasDataExport,
      consentManagement: hasConsentManagement,
      dataMinimization: hasDataMinimization,
      purposeLimitation: true,
      complianceScore,
      findings
    };
  }

  private getDeletionKeywords(processName: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'User Account Deletion': ['deleteUser', 'removeAccount', 'signOut', 'reset'],
      'Todo List Deletion': ['deleteList', 'removeList'],
      'Todo Item Deletion': ['deleteTodo', 'removeTodo'],
      'Session Cleanup': ['signOut', 'clearSession', 'logout'],
      'Local Data Cleanup': ['clearAllData', 'reset', 'cleanup'],
      'Log Cleanup': ['clearLogs', 'cleanup']
    };

    return keywordMap[processName] || ['delete', 'remove', 'clear'];
  }

  private calculateComplianceScore(compliance: {
    rightToErasure: boolean;
    dataPortability: boolean;
    consentManagement: boolean;
    dataMinimization: boolean;
    purposeLimitation: boolean;
  }): number {
    const weights = {
      rightToErasure: 30,
      dataPortability: 20,
      consentManagement: 20,
      dataMinimization: 20,
      purposeLimitation: 10
    };

    let score = 0;
    if (compliance.rightToErasure) score += weights.rightToErasure;
    if (compliance.dataPortability) score += weights.dataPortability;
    if (compliance.consentManagement) score += weights.consentManagement;
    if (compliance.dataMinimization) score += weights.dataMinimization;
    if (compliance.purposeLimitation) score += weights.purposeLimitation;

    return score;
  }

  private calculateOverallComplianceScore(assessments: PrivacyComplianceAssessment[]): number {
    if (assessments.length === 0) return 0;
    
    const totalScore = assessments.reduce((sum, assessment) => sum + assessment.complianceScore, 0);
    return Math.round(totalScore / assessments.length);
  }

  private generateRecommendations(
    findings: SecurityFinding[],
    retentionPolicies: DataRetentionPolicy[],
    deletionProcesses: DeletionProcessAssessment[]
  ): string[] {
    const recommendations = new Set<string>();

    // Add recommendations from findings
    findings.forEach(finding => {
      recommendations.add(finding.recommendation);
    });

    // Add general recommendations
    recommendations.add('Implement comprehensive data retention policies for all data types');
    recommendations.add('Provide user-controlled data deletion functionality');
    recommendations.add('Implement automatic cleanup for temporary and session data');
    recommendations.add('Maintain audit trails for all data deletion operations');
    recommendations.add('Regular review and update of data retention policies');
    recommendations.add('Implement data export functionality for user data portability');
    recommendations.add('Document data processing purposes and retention periods');

    // Add specific recommendations based on analysis
    const hasUserDeletion = deletionProcesses.some(p => p.userInitiated);
    if (!hasUserDeletion) {
      recommendations.add('Implement user account deletion with cascade deletion of associated data');
    }

    const hasAutomaticCleanup = retentionPolicies.some(p => p.automaticDeletion);
    if (!hasAutomaticCleanup) {
      recommendations.add('Implement automatic cleanup for expired sessions and temporary data');
    }

    return Array.from(recommendations);
  }

  private generateActionItems(
    allFindings: SecurityFinding[],
    criticalFindings: SecurityFinding[]
  ): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Immediate actions (Critical findings)
    criticalFindings.forEach(finding => {
      immediate.push(finding.recommendation);
    });

    // Short-term actions (High severity findings)
    allFindings
      .filter(f => f.severity === 'HIGH' && !criticalFindings.includes(f))
      .forEach(finding => {
        shortTerm.push(finding.recommendation);
      });

    // Long-term actions (Medium and Low severity findings)
    allFindings
      .filter(f => (f.severity === 'MEDIUM' || f.severity === 'LOW') && 
                   !criticalFindings.includes(f))
      .forEach(finding => {
        longTerm.push(finding.recommendation);
      });

    // Add general action items if none exist
    if (immediate.length === 0 && shortTerm.length === 0 && longTerm.length === 0) {
      longTerm.push('Review and document current data retention practices');
      longTerm.push('Implement basic data deletion functionality');
      longTerm.push('Create privacy policy and data processing documentation');
    }

    return { immediate, shortTerm, longTerm };
  }

  private createFinding(
    title: string,
    description: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    category: 'RETENTION' | 'DELETION' | 'PRIVACY' | 'COMPLIANCE' | 'AUDIT',
    recommendation: string,
    regulationRef?: string,
    requirementRef?: string
  ): SecurityFinding {
    return {
      id: `DR-${++this.findingCounter}`,
      title,
      description,
      severity,
      category,
      recommendation,
      regulationRef,
      requirementRef
    };
  }
}

/**
 * Utility function to run quick data retention analysis
 */
export async function runQuickDataRetentionAnalysis(codeFiles: { path: string; content: string }[]): Promise<{
  complianceScore: number;
  criticalIssues: number;
  hasUserDeletion: boolean;
  hasDataExport: boolean;
  summary: string;
}> {
  const analyzer = new DataRetentionAnalyzer();
  
  try {
    const report = await analyzer.generateDataRetentionReport(codeFiles);
    
    const hasUserDeletion = report.deletionProcesses.some(p => p.userInitiated);
    const hasDataExport = report.privacyCompliance.some(p => p.dataPortability);
    
    const summary = `Data Retention Analysis: ${report.overallComplianceScore}% compliant, ` +
                   `${report.criticalFindings.length} critical issues, ` +
                   `${hasUserDeletion ? 'has' : 'missing'} user deletion, ` +
                   `${hasDataExport ? 'has' : 'missing'} data export`;

    return {
      complianceScore: report.overallComplianceScore,
      criticalIssues: report.criticalFindings.length,
      hasUserDeletion,
      hasDataExport,
      summary
    };
  } catch (error) {
    return {
      complianceScore: 0,
      criticalIssues: 1,
      hasUserDeletion: false,
      hasDataExport: false,
      summary: `Data retention analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}