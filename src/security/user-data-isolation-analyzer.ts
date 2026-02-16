/**
 * User Data Isolation and Access Control Analyzer
 * 
 * This module analyzes user data isolation, access control mechanisms,
 * Row Level Security (RLS) policies, and data retention processes in the Todo2 application.
 */

export interface RLSPolicyAssessment {
  tableName: string;
  policyName: string;
  policyType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  userIsolation: boolean;
  policyExpression: string;
  securityLevel: 'SECURE' | 'WEAK' | 'VULNERABLE' | 'MISSING';
  findings: SecurityFinding[];
}

export interface UserDataSegregationAssessment {
  tableName: string;
  userIdColumn: string;
  hasUserFilter: boolean;
  crossUserAccess: boolean;
  dataLeakageRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findings: SecurityFinding[];
}

export interface DataSharingControlAssessment {
  feature: string;
  sharingEnabled: boolean;
  accessControls: string[];
  permissionModel: 'NONE' | 'BASIC' | 'ROLE_BASED' | 'ATTRIBUTE_BASED';
  privacyCompliant: boolean;
  findings: SecurityFinding[];
}

export interface DataRetentionAssessment {
  dataType: string;
  retentionPolicy: string | null;
  automaticDeletion: boolean;
  userControlledDeletion: boolean;
  gdprCompliant: boolean;
  findings: SecurityFinding[];
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'RLS' | 'DATA_SEGREGATION' | 'ACCESS_CONTROL' | 'DATA_RETENTION' | 'PRIVACY';
  recommendation: string;
  cweId?: string;
  requirementRef?: string;
}

export interface UserDataIsolationReport {
  timestamp: Date;
  applicationName: string;
  rlsPolicyAssessments: RLSPolicyAssessment[];
  dataSegregationAssessments: UserDataSegregationAssessment[];
  dataSharingAssessments: DataSharingControlAssessment[];
  dataRetentionAssessments: DataRetentionAssessment[];
  overallSecurityScore: number;
  criticalFindings: SecurityFinding[];
  recommendations: string[];
  complianceStatus: {
    gdpr: boolean;
    ccpa: boolean;
    soc2: boolean;
  };
}

export class UserDataIsolationAnalyzer {
  private findingCounter = 0;

  /**
   * Analyzes Row Level Security (RLS) policies from database migrations
   */
  async analyzeRLSPolicies(migrationFiles: string[]): Promise<RLSPolicyAssessment[]> {
    const assessments: RLSPolicyAssessment[] = [];

    try {
      for (const migrationContent of migrationFiles) {
        const policies = this.extractRLSPolicies(migrationContent);
        
        for (const policy of policies) {
          const assessment = await this.assessRLSPolicy(policy);
          assessments.push(assessment);
        }
      }

      // Check for missing RLS policies on critical tables
      const criticalTables = ['lists', 'todos'];
      const coveredTables = new Set(assessments.map(a => a.tableName));
      
      for (const table of criticalTables) {
        if (!coveredTables.has(table)) {
          assessments.push({
            tableName: table,
            policyName: 'MISSING',
            policyType: 'ALL',
            userIsolation: false,
            policyExpression: '',
            securityLevel: 'MISSING',
            findings: [this.createFinding(
              `Missing RLS Policy for ${table}`,
              `Table '${table}' does not have Row Level Security policies defined`,
              'CRITICAL',
              'RLS',
              `Create RLS policies for table '${table}' to ensure user data isolation`,
              'CWE-284',
              '2.4'
            )]
          });
        }
      }

      return assessments;
    } catch (error) {
      const errorAssessment: RLSPolicyAssessment = {
        tableName: 'UNKNOWN',
        policyName: 'ANALYSIS_FAILED',
        policyType: 'ALL',
        userIsolation: false,
        policyExpression: '',
        securityLevel: 'VULNERABLE',
        findings: [this.createFinding(
          'RLS Policy Analysis Failed',
          `Failed to analyze RLS policies: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'HIGH',
          'RLS',
          'Review database migration files and ensure they are accessible'
        )]
      };

      return [errorAssessment];
    }
  }

  /**
   * Analyzes user data segregation in application code
   */
  async analyzeUserDataSegregation(codeFiles: { path: string; content: string }[]): Promise<UserDataSegregationAssessment[]> {
    const assessments: UserDataSegregationAssessment[] = [];

    try {
      // Analyze database queries and data access patterns
      for (const file of codeFiles) {
        if (file.path.includes('store') || file.path.includes('supabase')) {
          const queries = this.extractDatabaseQueries(file.content);
          
          for (const query of queries) {
            const assessment = this.assessDataSegregation(query, file.path);
            if (assessment) {
              assessments.push(assessment);
            }
          }
        }
      }

      // Check for common data segregation issues
      this.checkCrossUserDataAccess(assessments);
      
      return assessments;
    } catch (error) {
      const errorAssessment: UserDataSegregationAssessment = {
        tableName: 'UNKNOWN',
        userIdColumn: 'UNKNOWN',
        hasUserFilter: false,
        crossUserAccess: true,
        dataLeakageRisk: 'CRITICAL',
        findings: [this.createFinding(
          'Data Segregation Analysis Failed',
          `Failed to analyze user data segregation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'HIGH',
          'DATA_SEGREGATION',
          'Review application code and database access patterns'
        )]
      };

      return [errorAssessment];
    }
  }

  /**
   * Analyzes data sharing and privacy controls
   */
  async analyzeDataSharingControls(codeFiles: { path: string; content: string }[]): Promise<DataSharingControlAssessment[]> {
    const assessments: DataSharingControlAssessment[] = [];

    try {
      // Analyze sharing features in the application
      const sharingFeatures = [
        { name: 'Todo List Sharing', enabled: false },
        { name: 'Todo Item Sharing', enabled: false },
        { name: 'User Profile Sharing', enabled: false },
        { name: 'Data Export', enabled: false }
      ];

      for (const feature of sharingFeatures) {
        const hasSharing = this.detectSharingFeature(feature.name, codeFiles);
        
        const assessment: DataSharingControlAssessment = {
          feature: feature.name,
          sharingEnabled: hasSharing,
          accessControls: hasSharing ? this.extractAccessControls(feature.name, codeFiles) : [],
          permissionModel: hasSharing ? this.determinePermissionModel(feature.name, codeFiles) : 'NONE',
          privacyCompliant: this.assessPrivacyCompliance(feature.name, hasSharing),
          findings: []
        };

        // Add findings based on sharing configuration
        if (hasSharing && assessment.accessControls.length === 0) {
          assessment.findings.push(this.createFinding(
            `Uncontrolled Data Sharing in ${feature.name}`,
            `${feature.name} allows data sharing without proper access controls`,
            'HIGH',
            'ACCESS_CONTROL',
            `Implement proper access controls for ${feature.name}`,
            'CWE-285',
            '2.5'
          ));
        }

        if (hasSharing && !assessment.privacyCompliant) {
          assessment.findings.push(this.createFinding(
            `Privacy Non-Compliance in ${feature.name}`,
            `${feature.name} may not comply with privacy regulations`,
            'MEDIUM',
            'PRIVACY',
            `Review ${feature.name} for GDPR and privacy compliance`,
            undefined,
            '2.5'
          ));
        }

        assessments.push(assessment);
      }

      return assessments;
    } catch (error) {
      const errorAssessment: DataSharingControlAssessment = {
        feature: 'ANALYSIS_FAILED',
        sharingEnabled: false,
        accessControls: [],
        permissionModel: 'NONE',
        privacyCompliant: false,
        findings: [this.createFinding(
          'Data Sharing Analysis Failed',
          `Failed to analyze data sharing controls: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'HIGH',
          'ACCESS_CONTROL',
          'Review application code for data sharing features'
        )]
      };

      return [errorAssessment];
    }
  }

  /**
   * Analyzes data retention and deletion processes
   */
  async analyzeDataRetention(codeFiles: { path: string; content: string }[]): Promise<DataRetentionAssessment[]> {
    const assessments: DataRetentionAssessment[] = [];

    try {
      const dataTypes = [
        { name: 'User Account Data', table: 'auth.users' },
        { name: 'Todo Lists', table: 'lists' },
        { name: 'Todo Items', table: 'todos' },
        { name: 'Session Data', table: 'local_storage' },
        { name: 'Offline Data', table: 'indexeddb' }
      ];

      for (const dataType of dataTypes) {
        const assessment = await this.assessDataRetention(dataType, codeFiles);
        assessments.push(assessment);
      }

      return assessments;
    } catch (error) {
      const errorAssessment: DataRetentionAssessment = {
        dataType: 'UNKNOWN',
        retentionPolicy: null,
        automaticDeletion: false,
        userControlledDeletion: false,
        gdprCompliant: false,
        findings: [this.createFinding(
          'Data Retention Analysis Failed',
          `Failed to analyze data retention: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'HIGH',
          'DATA_RETENTION',
          'Review data retention and deletion processes'
        )]
      };

      return [errorAssessment];
    }
  }

  /**
   * Generates comprehensive user data isolation security report
   */
  async generateSecurityReport(
    migrationFiles: string[],
    codeFiles: { path: string; content: string }[]
  ): Promise<UserDataIsolationReport> {
    const timestamp = new Date();
    
    // Perform all security assessments
    const rlsPolicyAssessments = await this.analyzeRLSPolicies(migrationFiles);
    const dataSegregationAssessments = await this.analyzeUserDataSegregation(codeFiles);
    const dataSharingAssessments = await this.analyzeDataSharingControls(codeFiles);
    const dataRetentionAssessments = await this.analyzeDataRetention(codeFiles);

    // Collect all findings
    const allFindings = [
      ...rlsPolicyAssessments.flatMap(a => a.findings),
      ...dataSegregationAssessments.flatMap(a => a.findings),
      ...dataSharingAssessments.flatMap(a => a.findings),
      ...dataRetentionAssessments.flatMap(a => a.findings)
    ];

    // Filter critical findings
    const criticalFindings = allFindings.filter(f => f.severity === 'CRITICAL');

    // Calculate overall security score (0-100, higher is better)
    const overallSecurityScore = this.calculateSecurityScore(allFindings, rlsPolicyAssessments);

    // Generate recommendations
    const recommendations = this.generateRecommendations(allFindings);

    // Assess compliance status
    const complianceStatus = this.assessCompliance(allFindings);

    return {
      timestamp,
      applicationName: 'Todo2',
      rlsPolicyAssessments,
      dataSegregationAssessments,
      dataSharingAssessments,
      dataRetentionAssessments,
      overallSecurityScore,
      criticalFindings,
      recommendations,
      complianceStatus
    };
  }

  // Private helper methods

  private extractRLSPolicies(migrationContent: string): Array<{
    tableName: string;
    policyName: string;
    policyType: string;
    expression: string;
  }> {
    const policies: Array<{
      tableName: string;
      policyName: string;
      policyType: string;
      expression: string;
    }> = [];

    // Extract CREATE POLICY statements (handle both quoted and unquoted policy names)
    const policyRegex = /CREATE POLICY\s+(?:"([^"]+)"|(\w+))\s+ON\s+(\w+)\s+FOR\s+(\w+)[\s\S]*?USING\s*\(((?:[^()]|\([^)]*\))*)\)(?:\s+WITH CHECK\s*\(((?:[^()]|\([^)]*\))*)\))?/gi;
    
    let match;
    while ((match = policyRegex.exec(migrationContent)) !== null) {
      policies.push({
        tableName: match[3],
        policyName: match[1] || match[2], // Handle both quoted and unquoted names
        policyType: match[4],
        expression: match[5] || match[6] || ''
      });
    }

    return policies;
  }

  private async assessRLSPolicy(policy: {
    tableName: string;
    policyName: string;
    policyType: string;
    expression: string;
  }): Promise<RLSPolicyAssessment> {
    const findings: SecurityFinding[] = [];
    
    // Check if policy includes user isolation
    const hasUserIsolation = policy.expression.includes('auth.uid()') || 
                            policy.expression.includes('user_id');
    
    if (!hasUserIsolation) {
      findings.push(this.createFinding(
        `Weak RLS Policy: ${policy.policyName}`,
        `RLS policy '${policy.policyName}' on table '${policy.tableName}' does not include user isolation`,
        'HIGH',
        'RLS',
        'Update RLS policy to include user ID filtering using auth.uid()',
        'CWE-284',
        '2.4'
      ));
    }

    // Check for overly permissive policies
    if (policy.expression.includes('true') || policy.expression.trim() === '') {
      findings.push(this.createFinding(
        `Overly Permissive RLS Policy: ${policy.policyName}`,
        `RLS policy '${policy.policyName}' is overly permissive and may allow unauthorized access`,
        'CRITICAL',
        'RLS',
        'Restrict RLS policy to only allow access to user\'s own data',
        'CWE-285',
        '2.4'
      ));
    }

    // Determine security level
    let securityLevel: 'SECURE' | 'WEAK' | 'VULNERABLE' | 'MISSING';
    if (findings.some(f => f.severity === 'CRITICAL')) {
      securityLevel = 'VULNERABLE';
    } else if (findings.some(f => f.severity === 'HIGH')) {
      securityLevel = 'WEAK';
    } else {
      securityLevel = 'SECURE';
    }

    return {
      tableName: policy.tableName,
      policyName: policy.policyName,
      policyType: policy.policyType as any,
      userIsolation: hasUserIsolation,
      policyExpression: policy.expression,
      securityLevel,
      findings
    };
  }

  private extractDatabaseQueries(content: string): Array<{
    table: string;
    operation: string;
    hasUserFilter: boolean;
    query: string;
  }> {
    const queries: Array<{
      table: string;
      operation: string;
      hasUserFilter: boolean;
      query: string;
    }> = [];

    // Extract Supabase queries
    const supabaseRegex = /supabase\s*\.from\s*\(\s*["'](\w+)["']\s*\)\s*\.(\w+)/g;
    
    let match;
    while ((match = supabaseRegex.exec(content)) !== null) {
      const table = match[1];
      const operation = match[2];
      
      // Look for user filtering in the surrounding context
      const contextStart = Math.max(0, match.index - 200);
      const contextEnd = Math.min(content.length, match.index + 200);
      const context = content.substring(contextStart, contextEnd);
      
      const hasUserFilter = context.includes('user_id') || 
                           context.includes('auth.uid()') || 
                           context.includes('currentUser');

      queries.push({
        table,
        operation,
        hasUserFilter,
        query: context
      });
    }

    return queries;
  }

  private assessDataSegregation(query: {
    table: string;
    operation: string;
    hasUserFilter: boolean;
    query: string;
  }, filePath: string): UserDataSegregationAssessment | null {
    const findings: SecurityFinding[] = [];
    
    // Skip non-user-data tables
    if (!['lists', 'todos'].includes(query.table)) {
      return null;
    }

    // Check for missing user filtering
    if (!query.hasUserFilter && query.operation === 'select') {
      findings.push(this.createFinding(
        `Missing User Filter in ${query.table}`,
        `Database query in ${filePath} selects from '${query.table}' without user filtering`,
        'HIGH',
        'DATA_SEGREGATION',
        'Add user ID filtering to database queries to prevent cross-user data access',
        'CWE-284',
        '2.4'
      ));
    }

    // Determine data leakage risk
    let dataLeakageRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (!query.hasUserFilter) {
      dataLeakageRisk = query.operation === 'select' ? 'HIGH' : 'CRITICAL';
    } else {
      dataLeakageRisk = 'LOW';
    }

    return {
      tableName: query.table,
      userIdColumn: 'user_id',
      hasUserFilter: query.hasUserFilter,
      crossUserAccess: !query.hasUserFilter,
      dataLeakageRisk,
      findings
    };
  }

  private checkCrossUserDataAccess(assessments: UserDataSegregationAssessment[]): void {
    const vulnerableTables = assessments.filter(a => a.crossUserAccess);
    
    if (vulnerableTables.length > 0) {
      for (const assessment of vulnerableTables) {
        assessment.findings.push(this.createFinding(
          `Cross-User Data Access Risk in ${assessment.tableName}`,
          `Table '${assessment.tableName}' may allow users to access other users' data`,
          'CRITICAL',
          'DATA_SEGREGATION',
          'Implement proper user data isolation in database queries and RLS policies',
          'CWE-284',
          '2.4'
        ));
      }
    }
  }

  private detectSharingFeature(_featureName: string, codeFiles: { path: string; content: string }[]): boolean {
    const sharingKeywords = ['share', 'export', 'public', 'collaborate'];
    
    for (const file of codeFiles) {
      const content = file.content.toLowerCase();
      if (sharingKeywords.some(keyword => content.includes(keyword))) {
        return true;
      }
    }
    
    return false;
  }

  private extractAccessControls(_featureName: string, codeFiles: { path: string; content: string }[]): string[] {
    const controls: string[] = [];
    
    // Look for common access control patterns
    const controlPatterns = [
      'permission',
      'authorize',
      'canAccess',
      'hasRole',
      'checkPermission'
    ];

    for (const file of codeFiles) {
      for (const pattern of controlPatterns) {
        if (file.content.includes(pattern)) {
          controls.push(pattern);
        }
      }
    }

    return [...new Set(controls)]; // Remove duplicates
  }

  private determinePermissionModel(_featureName: string, codeFiles: { path: string; content: string }[]): 'NONE' | 'BASIC' | 'ROLE_BASED' | 'ATTRIBUTE_BASED' {
    const hasRoles = codeFiles.some(f => f.content.includes('role') || f.content.includes('Role'));
    const hasAttributes = codeFiles.some(f => f.content.includes('attribute') || f.content.includes('permission'));
    const hasBasicAuth = codeFiles.some(f => f.content.includes('auth') || f.content.includes('user'));

    if (hasAttributes) return 'ATTRIBUTE_BASED';
    if (hasRoles) return 'ROLE_BASED';
    if (hasBasicAuth) return 'BASIC';
    return 'NONE';
  }

  private assessPrivacyCompliance(_featureName: string, hasSharing: boolean): boolean {
    // For now, assume sharing features need explicit privacy controls
    return !hasSharing; // If no sharing, it's compliant by default
  }

  private async assessDataRetention(
    dataType: { name: string; table: string },
    codeFiles: { path: string; content: string }[]
  ): Promise<DataRetentionAssessment> {
    const findings: SecurityFinding[] = [];
    
    // Check for deletion functionality
    const hasDeletion = codeFiles.some(f => 
      f.content.includes('delete') || 
      f.content.includes('remove') || 
      f.content.includes('clear')
    );

    // Check for automatic cleanup
    const hasAutomaticCleanup = codeFiles.some(f => 
      f.content.includes('cleanup') || 
      f.content.includes('expire') || 
      f.content.includes('retention')
    );

    // Check for user-controlled deletion
    const hasUserDeletion = codeFiles.some(f => 
      f.content.includes('deleteTodo') || 
      f.content.includes('deleteList') || 
      f.content.includes('reset')
    );

    // Assess GDPR compliance
    const gdprCompliant = hasDeletion && hasUserDeletion;

    if (!hasDeletion) {
      findings.push(this.createFinding(
        `No Data Deletion for ${dataType.name}`,
        `${dataType.name} lacks data deletion functionality`,
        'MEDIUM',
        'DATA_RETENTION',
        `Implement data deletion functionality for ${dataType.name}`,
        undefined,
        '2.5'
      ));
    }

    if (!hasUserDeletion) {
      findings.push(this.createFinding(
        `No User-Controlled Deletion for ${dataType.name}`,
        `Users cannot delete their own ${dataType.name}`,
        'MEDIUM',
        'DATA_RETENTION',
        `Allow users to delete their own ${dataType.name}`,
        undefined,
        '2.5'
      ));
    }

    if (!hasAutomaticCleanup && dataType.name.includes('Session')) {
      findings.push(this.createFinding(
        `No Automatic Cleanup for ${dataType.name}`,
        `${dataType.name} lacks automatic cleanup mechanisms`,
        'LOW',
        'DATA_RETENTION',
        `Implement automatic cleanup for expired ${dataType.name}`,
        undefined,
        '2.5'
      ));
    }

    return {
      dataType: dataType.name,
      retentionPolicy: hasAutomaticCleanup ? 'Automatic cleanup enabled' : null,
      automaticDeletion: hasAutomaticCleanup,
      userControlledDeletion: hasUserDeletion,
      gdprCompliant,
      findings
    };
  }

  private createFinding(
    title: string,
    description: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    category: 'RLS' | 'DATA_SEGREGATION' | 'ACCESS_CONTROL' | 'DATA_RETENTION' | 'PRIVACY',
    recommendation: string,
    cweId?: string,
    requirementRef?: string
  ): SecurityFinding {
    return {
      id: `UDI-${++this.findingCounter}`,
      title,
      description,
      severity,
      category,
      recommendation,
      cweId,
      requirementRef
    };
  }

  private calculateSecurityScore(findings: SecurityFinding[], rlsAssessments: RLSPolicyAssessment[]): number {
    let score = 100;
    
    // Deduct points for findings
    findings.forEach(finding => {
      switch (finding.severity) {
        case 'CRITICAL': score -= 25; break;
        case 'HIGH': score -= 15; break;
        case 'MEDIUM': score -= 8; break;
        case 'LOW': score -= 3; break;
      }
    });

    // Bonus points for secure RLS policies
    const secureRLSPolicies = rlsAssessments.filter(a => a.securityLevel === 'SECURE').length;
    score += secureRLSPolicies * 5;

    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(findings: SecurityFinding[]): string[] {
    const recommendations = new Set<string>();
    
    findings.forEach(finding => {
      recommendations.add(finding.recommendation);
    });

    // Add general recommendations
    recommendations.add('Implement comprehensive Row Level Security (RLS) policies for all user data tables');
    recommendations.add('Ensure all database queries include proper user filtering');
    recommendations.add('Implement user-controlled data deletion for GDPR compliance');
    recommendations.add('Regular audit of data access patterns and user isolation');
    recommendations.add('Implement data retention policies with automatic cleanup');

    return Array.from(recommendations);
  }

  private assessCompliance(findings: SecurityFinding[]): {
    gdpr: boolean;
    ccpa: boolean;
    soc2: boolean;
  } {
    const hasCriticalDataIssues = findings.some(f => 
      (f.category === 'DATA_SEGREGATION' || f.category === 'DATA_RETENTION') && 
      f.severity === 'CRITICAL'
    );
    
    const hasAccessControlIssues = findings.some(f => 
      f.category === 'ACCESS_CONTROL' && 
      (f.severity === 'CRITICAL' || f.severity === 'HIGH')
    );

    const hasRLSIssues = findings.some(f => 
      f.category === 'RLS' && 
      (f.severity === 'CRITICAL' || f.severity === 'HIGH')
    );

    const hasDataRetentionIssues = findings.some(f => 
      f.category === 'DATA_RETENTION' && 
      f.severity === 'HIGH'
    );

    return {
      gdpr: !hasCriticalDataIssues && !hasDataRetentionIssues, // GDPR requires data protection and deletion rights
      ccpa: !hasCriticalDataIssues && !hasAccessControlIssues, // CCPA requires data access control
      soc2: !hasRLSIssues && !hasAccessControlIssues // SOC 2 requires access controls
    };
  }
}