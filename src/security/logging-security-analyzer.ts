/**
 * Logging Security Analyzer
 * 
 * This analyzer evaluates the security of logging implementations,
 * tests for sensitive data exposure, and assesses monitoring capabilities.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface LoggingSecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'SENSITIVE_DATA' | 'INFORMATION_DISCLOSURE' | 'MONITORING' | 'CONFIGURATION' | 'ERROR_HANDLING';
  location: string;
  evidence: string[];
  recommendations: string[];
  cweId?: string;
  compliance?: string[];
}

interface LoggingSecurityAnalysis {
  timestamp: Date;
  summary: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  findings: LoggingSecurityFinding[];
  recommendations: string[];
  complianceStatus: {
    gdpr: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
    soc2: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
    pci: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  };
}

export class LoggingSecurityAnalyzer {
  private findings: LoggingSecurityFinding[] = [];
  private findingCounter = 0;

  /**
   * Analyze logging security across the application
   */
  async analyzeLoggingSecurity(): Promise<LoggingSecurityAnalysis> {
    console.log('🔍 Starting Logging Security Analysis...');
    
    this.findings = [];
    this.findingCounter = 0;

    // Analyze console logging usage
    await this.analyzeConsoleLogging();
    
    // Check for sensitive data in logs
    await this.analyzeSensitiveDataExposure();
    
    // Evaluate error handling patterns
    await this.analyzeErrorHandling();
    
    // Assess monitoring capabilities
    await this.analyzeMonitoringCapabilities();
    
    // Check environment-based logging
    await this.analyzeEnvironmentLogging();
    
    // Evaluate audit trail implementation
    await this.analyzeAuditTrail();

    const summary = this.generateSummary();
    const recommendations = this.generateRecommendations();
    const complianceStatus = this.assessCompliance();

    console.log(`✅ Analysis complete. Found ${this.findings.length} findings.`);

    return {
      timestamp: new Date(),
      summary,
      findings: this.findings,
      recommendations,
      complianceStatus
    };
  }

  /**
   * Analyze console logging usage throughout the application
   */
  private async analyzeConsoleLogging(): Promise<void> {
    const sourceFiles = this.getSourceFiles(['src']);
    const consoleLogPattern = /console\.(log|error|warn|info|debug|trace)/g;
    let totalConsoleStatements = 0;
    const filesWithLogging: string[] = [];

    for (const file of sourceFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const matches = content.match(consoleLogPattern);
        
        if (matches) {
          totalConsoleStatements += matches.length;
          filesWithLogging.push(file);
        }
      } catch (error) {
        console.warn(`Could not read file ${file}:`, error);
      }
    }

    if (totalConsoleStatements > 10) {
      this.addFinding(
        'Extensive Console Logging Usage',
        `Found ${totalConsoleStatements} console logging statements across ${filesWithLogging.length} files. This may expose sensitive information in production environments.`,
        'HIGH',
        'INFORMATION_DISCLOSURE',
        'Application-wide',
        [
          `${totalConsoleStatements} console logging statements found`,
          `${filesWithLogging.length} files contain console logging`,
          'No environment-based logging configuration detected'
        ],
        [
          'Implement environment-based logging levels',
          'Remove or conditionally disable console logging in production',
          'Use structured logging framework instead of console methods',
          'Implement log sanitization for sensitive data'
        ],
        'CWE-532'
      );
    }

    // Check for specific sensitive logging patterns
    await this.checkSensitiveLoggingPatterns(sourceFiles);
  }

  /**
   * Check for sensitive data patterns in logging statements
   */
  private async checkSensitiveLoggingPatterns(files: string[]): Promise<void> {
    const sensitivePatterns = [
      { pattern: /console\.(log|error|warn|info).*user.*:/gi, type: 'User Data' },
      { pattern: /console\.(log|error|warn|info).*session/gi, type: 'Session Data' },
      { pattern: /console\.(log|error|warn|info).*token/gi, type: 'Token Data' },
      { pattern: /console\.(log|error|warn|info).*password/gi, type: 'Password Data' },
      { pattern: /console\.(log|error|warn|info).*key/gi, type: 'Key Data' },
      { pattern: /console\.(log|error|warn|info).*auth/gi, type: 'Authentication Data' },
      { pattern: /console\.(log|error|warn|info).*error/gi, type: 'Error Details' }
    ];

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        
        for (const { pattern, type } of sensitivePatterns) {
          const matches = content.match(pattern);
          if (matches && matches.length > 0) {
            this.addFinding(
              `Potential ${type} Exposure in Logs`,
              `Found ${matches.length} logging statements that may expose ${type.toLowerCase()} in ${file}`,
              'HIGH',
              'SENSITIVE_DATA',
              file,
              matches.slice(0, 5), // Show first 5 matches
              [
                `Remove ${type.toLowerCase()} from logging statements`,
                'Implement data sanitization before logging',
                'Use generic error messages for user-facing logs',
                'Log detailed information server-side only'
              ],
              'CWE-532'
            );
          }
        }
      } catch (error) {
        console.warn(`Could not analyze file ${file}:`, error);
      }
    }
  }

  /**
   * Analyze sensitive data exposure in logs
   */
  private async analyzeSensitiveDataExposure(): Promise<void> {
    const sourceFiles = this.getSourceFiles(['src']);
    
    // Check for direct object logging
    const objectLoggingPattern = /console\.(log|error|warn|info)\([^)]*\bobject\b|\{|\[/gi;
    let objectLoggingCount = 0;

    for (const file of sourceFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const matches = content.match(objectLoggingPattern);
        if (matches) {
          objectLoggingCount += matches.length;
        }
      } catch (error) {
        console.warn(`Could not read file ${file}:`, error);
      }
    }

    if (objectLoggingCount > 5) {
      this.addFinding(
        'Direct Object Logging Detected',
        `Found ${objectLoggingCount} instances of direct object logging which may expose sensitive data structures`,
        'MEDIUM',
        'SENSITIVE_DATA',
        'Application-wide',
        [
          `${objectLoggingCount} direct object logging statements found`,
          'Objects may contain sensitive user data',
          'No data sanitization detected before logging'
        ],
        [
          'Implement object sanitization before logging',
          'Log only necessary object properties',
          'Use structured logging with field filtering',
          'Implement data classification for logging'
        ],
        'CWE-532'
      );
    }
  }

  /**
   * Analyze error handling patterns for information disclosure
   */
  private async analyzeErrorHandling(): Promise<void> {
    const sourceFiles = this.getSourceFiles(['src']);
    const errorHandlingPatterns = [
      /catch\s*\([^)]*\)\s*\{[^}]*console\.(error|log)/gi,
      /\.catch\([^)]*console\.(error|log)/gi,
      /error\s*=>[^}]*console\.(error|log)/gi
    ];

    let errorLoggingCount = 0;
    const filesWithErrorLogging: string[] = [];

    for (const file of sourceFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        let hasErrorLogging = false;

        for (const pattern of errorHandlingPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            errorLoggingCount += matches.length;
            hasErrorLogging = true;
          }
        }

        if (hasErrorLogging) {
          filesWithErrorLogging.push(file);
        }
      } catch (error) {
        console.warn(`Could not read file ${file}:`, error);
      }
    }

    if (errorLoggingCount > 0) {
      this.addFinding(
        'Error Details Exposed in Logs',
        `Found ${errorLoggingCount} error handling blocks that log error details to console`,
        'MEDIUM',
        'INFORMATION_DISCLOSURE',
        'Application-wide',
        [
          `${errorLoggingCount} error logging statements found`,
          `${filesWithErrorLogging.length} files contain error logging`,
          'Error objects may contain sensitive system information'
        ],
        [
          'Implement error sanitization before logging',
          'Use generic error messages for users',
          'Log detailed errors server-side only',
          'Create error classification system'
        ],
        'CWE-209'
      );
    }
  }

  /**
   * Assess security monitoring capabilities
   */
  private async analyzeMonitoringCapabilities(): Promise<void> {
    const sourceFiles = this.getSourceFiles(['src']);
    
    // Check for security event logging
    const securityEventPatterns = [
      /security.*event/gi,
      /audit.*log/gi,
      /security.*monitor/gi,
      /alert.*security/gi,
      /incident.*log/gi
    ];

    let hasSecurityLogging = false;

    for (const file of sourceFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        
        for (const pattern of securityEventPatterns) {
          if (pattern.test(content)) {
            hasSecurityLogging = true;
            break;
          }
        }

        if (hasSecurityLogging) break;
      } catch (error) {
        console.warn(`Could not read file ${file}:`, error);
      }
    }

    if (!hasSecurityLogging) {
      this.addFinding(
        'No Security Event Monitoring',
        'No security event logging or monitoring framework detected in the application',
        'MEDIUM',
        'MONITORING',
        'Application-wide',
        [
          'No security event logging framework found',
          'No monitoring for authentication failures',
          'No alerting for suspicious activities',
          'No audit trail for security-relevant actions'
        ],
        [
          'Implement security event logging framework',
          'Define security event categories and severity levels',
          'Create monitoring dashboards for security events',
          'Implement alerting for critical security events'
        ],
        'CWE-778'
      );
    }

    // Check for structured logging framework
    await this.checkStructuredLogging(sourceFiles);
  }

  /**
   * Check for structured logging framework implementation
   */
  private async checkStructuredLogging(files: string[]): Promise<void> {
    const loggingFrameworks = ['winston', 'pino', 'bunyan', 'log4js'];
    let hasStructuredLogging = false;

    // Check package.json for logging dependencies
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      for (const framework of loggingFrameworks) {
        if (allDeps[framework]) {
          hasStructuredLogging = true;
          break;
        }
      }
    } catch (error) {
      console.warn('Could not read package.json:', error);
    }

    // Check for logging framework imports in source files
    if (!hasStructuredLogging) {
      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf8');
          for (const framework of loggingFrameworks) {
            if (content.includes(`import`) && content.includes(framework)) {
              hasStructuredLogging = true;
              break;
            }
          }
          if (hasStructuredLogging) break;
        } catch (error) {
          console.warn(`Could not read file ${file}:`, error);
        }
      }
    }

    if (!hasStructuredLogging) {
      this.addFinding(
        'No Structured Logging Framework',
        'No structured logging framework detected. Application relies on basic console methods.',
        'MEDIUM',
        'CONFIGURATION',
        'Application-wide',
        [
          'No logging framework dependencies found',
          'All logging done through console methods',
          'No log levels, formatting, or structured data',
          'No centralized logging configuration'
        ],
        [
          'Implement structured logging framework (Winston, Pino, etc.)',
          'Define log levels and security event categories',
          'Create centralized logging configuration',
          'Implement log formatting standards'
        ],
        'CWE-778'
      );
    }
  }

  /**
   * Analyze environment-based logging configuration
   */
  private async analyzeEnvironmentLogging(): Promise<void> {
    const configFiles = ['vite.config.ts', 'src/main.tsx', '.env', '.env.example'];
    let hasEnvironmentLogging = false;

    for (const file of configFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        if (content.includes('NODE_ENV') && (content.includes('log') || content.includes('debug'))) {
          hasEnvironmentLogging = true;
          break;
        }
      } catch (error) {
        // File doesn't exist or can't be read
      }
    }

    if (!hasEnvironmentLogging) {
      this.addFinding(
        'No Environment-Based Logging Configuration',
        'No environment-based logging configuration detected. Same logging behavior in all environments.',
        'LOW',
        'CONFIGURATION',
        'Configuration files',
        [
          'No environment-specific log filtering',
          'Debug information available in production',
          'No log level configuration',
          'Same logging behavior across environments'
        ],
        [
          'Implement environment-based logging configuration',
          'Disable debug logging in production',
          'Create production-safe logging policies',
          'Implement log level management'
        ],
        'CWE-532'
      );
    }
  }

  /**
   * Analyze audit trail implementation
   */
  private async analyzeAuditTrail(): Promise<void> {
    const sourceFiles = this.getSourceFiles(['src']);
    const auditPatterns = [
      /audit.*log/gi,
      /user.*action.*log/gi,
      /activity.*log/gi,
      /trail/gi
    ];

    let hasAuditTrail = false;

    for (const file of sourceFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        
        for (const pattern of auditPatterns) {
          if (pattern.test(content)) {
            hasAuditTrail = true;
            break;
          }
        }

        if (hasAuditTrail) break;
      } catch (error) {
        console.warn(`Could not read file ${file}:`, error);
      }
    }

    if (!hasAuditTrail) {
      this.addFinding(
        'Limited Audit Trail Implementation',
        'No comprehensive audit trail logging detected for user actions and system events',
        'LOW',
        'MONITORING',
        'Application-wide',
        [
          'No structured audit logging',
          'User actions not systematically logged',
          'No compliance-ready audit trails',
          'Limited forensic capabilities'
        ],
        [
          'Implement comprehensive audit logging',
          'Create audit event standards',
          'Ensure audit log integrity and retention',
          'Implement audit log analysis capabilities'
        ],
        'CWE-778'
      );
    }
  }

  /**
   * Get all source files from specified directories
   */
  private getSourceFiles(directories: string[]): string[] {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    const walkDir = (dir: string) => {
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            walkDir(fullPath);
          } else if (stat.isFile() && extensions.includes(extname(item))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`Could not read directory ${dir}:`, error);
      }
    };

    for (const dir of directories) {
      walkDir(dir);
    }

    return files;
  }

  /**
   * Add a security finding
   */
  private addFinding(
    title: string,
    description: string,
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO',
    category: 'SENSITIVE_DATA' | 'INFORMATION_DISCLOSURE' | 'MONITORING' | 'CONFIGURATION' | 'ERROR_HANDLING',
    location: string,
    evidence: string[],
    recommendations: string[],
    cweId?: string,
    compliance?: string[]
  ): void {
    this.findings.push({
      id: `LOG-${String(++this.findingCounter).padStart(3, '0')}`,
      title,
      description,
      severity,
      category,
      location,
      evidence,
      recommendations,
      cweId,
      compliance
    });
  }

  /**
   * Generate analysis summary
   */
  private generateSummary() {
    const criticalCount = this.findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = this.findings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = this.findings.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = this.findings.filter(f => f.severity === 'LOW').length;
    const infoCount = this.findings.filter(f => f.severity === 'INFO').length;

    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (criticalCount > 0) overallRisk = 'CRITICAL';
    else if (highCount > 0) overallRisk = 'HIGH';
    else if (mediumCount > 2) overallRisk = 'HIGH';
    else if (mediumCount > 0 || highCount > 0) overallRisk = 'MEDIUM';

    return {
      totalFindings: this.findings.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      overallRisk
    };
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(): string[] {
    return [
      'Implement environment-based logging configuration',
      'Remove sensitive data from console logs',
      'Deploy structured logging framework',
      'Create security event monitoring system',
      'Implement error message sanitization',
      'Establish audit trail logging',
      'Create log retention and archival policies',
      'Implement log access controls and encryption',
      'Develop security monitoring dashboards',
      'Create incident response procedures'
    ];
  }

  /**
   * Assess compliance status
   */
  private assessCompliance() {
    const hasHighSeverityFindings = this.findings.some(f => f.severity === 'HIGH' || f.severity === 'CRITICAL');
    const hasSensitiveDataFindings = this.findings.some(f => f.category === 'SENSITIVE_DATA');
    const hasMonitoringFindings = this.findings.some(f => f.category === 'MONITORING');

    return {
      gdpr: hasSensitiveDataFindings ? 'NON_COMPLIANT' : 'PARTIAL' as 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT',
      soc2: hasMonitoringFindings ? 'NON_COMPLIANT' : 'PARTIAL' as 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT',
      pci: hasHighSeverityFindings ? 'NON_COMPLIANT' : 'PARTIAL' as 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT'
    };
  }
}

/**
 * Run logging security analysis
 */
export async function runLoggingSecurityAnalysis(): Promise<LoggingSecurityAnalysis> {
  const analyzer = new LoggingSecurityAnalyzer();
  return await analyzer.analyzeLoggingSecurity();
}