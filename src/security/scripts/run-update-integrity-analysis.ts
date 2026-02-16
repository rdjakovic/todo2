#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import { join } from 'path';


interface UpdateSecurityFinding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  evidence: string[];
  recommendations: string[];
  cweId?: string;
  impact: string;
  exploitability: string;
}

interface UpdateSecurityReport {
  summary: {
    totalFindings: number;
    criticalFindings: number;
    highFindings: number;
    mediumFindings: number;
    lowFindings: number;
    infoFindings: number;
  };
  findings: UpdateSecurityFinding[];
  recommendations: string[];
  timestamp: string;
}

class UpdateIntegrityAnalyzer {
  private findings: UpdateSecurityFinding[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  async analyzeUpdateMechanism(): Promise<UpdateSecurityReport> {
    console.log('🔍 Starting update mechanism and code integrity analysis...');

    // Analyze Tauri updater configuration
    await this.analyzeTauriUpdaterConfig();
    
    // Check code signing configuration
    await this.analyzeCodeSigning();
    
    // Analyze update delivery mechanisms
    await this.analyzeUpdateDelivery();
    
    // Check binary integrity verification
    await this.analyzeBinaryIntegrity();
    
    // Analyze update security and tamper protection
    await this.analyzeUpdateSecurity();
    
    // Check dependency update mechanisms
    await this.analyzeDependencyUpdates();

    return this.generateReport();
  }

  private async analyzeTauriUpdaterConfig(): Promise<void> {
    console.log('📋 Analyzing Tauri updater configuration...');

    try {
      const tauriConfigPath = join(this.projectRoot, 'src-tauri', 'tauri.conf.json');
      const configContent = await fs.readFile(tauriConfigPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Check if updater is configured
      if (!config.updater) {
        this.findings.push({
          id: 'UPDATE-001',
          title: 'No Tauri Updater Configuration',
          severity: 'high',
          category: 'Update Mechanism',
          description: 'The application does not have Tauri updater configured, which means no automatic update mechanism is in place.',
          evidence: [
            'No "updater" section found in tauri.conf.json',
            'Application relies on manual updates only'
          ],
          recommendations: [
            'Configure Tauri updater plugin for secure automatic updates',
            'Implement update server with proper authentication',
            'Set up code signing for update packages',
            'Configure update intervals and user notification'
          ],
          impact: 'Users may run outdated versions with known vulnerabilities',
          exploitability: 'High - attackers can exploit known vulnerabilities in outdated versions'
        });
      }

      // Check for update-related dependencies
      const cargoTomlPath = join(this.projectRoot, 'src-tauri', 'Cargo.toml');
      const cargoContent = await fs.readFile(cargoTomlPath, 'utf-8');
      
      if (!cargoContent.includes('tauri-plugin-updater')) {
        this.findings.push({
          id: 'UPDATE-002',
          title: 'Missing Tauri Updater Plugin',
          severity: 'medium',
          category: 'Update Dependencies',
          description: 'The tauri-plugin-updater dependency is not included in Cargo.toml.',
          evidence: [
            'tauri-plugin-updater not found in Cargo.toml dependencies',
            'No updater functionality available in the application'
          ],
          recommendations: [
            'Add tauri-plugin-updater to Cargo.toml dependencies',
            'Initialize updater plugin in main.rs',
            'Configure updater endpoints and authentication'
          ],
          impact: 'No automatic update capability available',
          exploitability: 'Medium - manual update process may be delayed or skipped'
        });
      }

    } catch (error) {
      this.findings.push({
        id: 'UPDATE-003',
        title: 'Tauri Configuration Analysis Failed',
        severity: 'medium',
        category: 'Configuration',
        description: `Failed to analyze Tauri configuration: ${error}`,
        evidence: [`Error: ${error}`],
        recommendations: [
          'Verify tauri.conf.json exists and is valid JSON',
          'Check file permissions for configuration files'
        ],
        impact: 'Cannot assess update configuration security',
        exploitability: 'Low - configuration issues may indicate broader problems'
      });
    }
  }

  private async analyzeCodeSigning(): Promise<void> {
    console.log('🔐 Analyzing code signing configuration...');

    try {
      const tauriConfigPath = join(this.projectRoot, 'src-tauri', 'tauri.conf.json');
      const configContent = await fs.readFile(tauriConfigPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Check bundle configuration for signing
      if (!config.bundle?.sign) {
        this.findings.push({
          id: 'SIGN-001',
          title: 'No Code Signing Configuration',
          severity: 'critical',
          category: 'Code Integrity',
          description: 'The application bundle is not configured for code signing, which allows tampering and impersonation.',
          evidence: [
            'No "sign" configuration in bundle section',
            'Binaries will not be digitally signed',
            'No certificate validation for updates'
          ],
          recommendations: [
            'Configure code signing certificates for all target platforms',
            'Set up signing keys in secure environment variables',
            'Implement certificate validation in update process',
            'Use timestamping for long-term signature validity'
          ],
          cweId: 'CWE-345',
          impact: 'Attackers can distribute malicious versions of the application',
          exploitability: 'High - unsigned binaries can be easily modified and redistributed'
        });
      }

      // Check for certificate configuration
      const hasWindowsSigning = config.bundle?.windows?.signCommand || 
                               config.bundle?.windows?.certificateThumbprint ||
                               process.env.WINDOWS_CERTIFICATE_THUMBPRINT;
      
      const hasMacOSSigning = config.bundle?.macOS?.signingIdentity ||
                             process.env.APPLE_SIGNING_IDENTITY;

      if (!hasWindowsSigning) {
        this.findings.push({
          id: 'SIGN-002',
          title: 'Missing Windows Code Signing',
          severity: 'high',
          category: 'Platform Security',
          description: 'Windows binaries are not configured for code signing.',
          evidence: [
            'No Windows signing configuration found',
            'No certificate thumbprint or signing command specified'
          ],
          recommendations: [
            'Obtain Windows code signing certificate',
            'Configure certificate thumbprint in environment variables',
            'Set up signing command in bundle configuration'
          ],
          impact: 'Windows users will see security warnings and may not trust the application',
          exploitability: 'Medium - Windows Defender and browsers may block unsigned executables'
        });
      }

      if (!hasMacOSSigning) {
        this.findings.push({
          id: 'SIGN-003',
          title: 'Missing macOS Code Signing',
          severity: 'high',
          category: 'Platform Security',
          description: 'macOS binaries are not configured for code signing.',
          evidence: [
            'No macOS signing identity found',
            'No Apple Developer certificate configuration'
          ],
          recommendations: [
            'Obtain Apple Developer certificate',
            'Configure signing identity in environment variables',
            'Set up notarization for macOS distribution'
          ],
          impact: 'macOS users will see security warnings and Gatekeeper may block the application',
          exploitability: 'Medium - macOS security features may prevent application execution'
        });
      }

    } catch (error) {
      this.findings.push({
        id: 'SIGN-004',
        title: 'Code Signing Analysis Failed',
        severity: 'medium',
        category: 'Analysis Error',
        description: `Failed to analyze code signing configuration: ${error}`,
        evidence: [`Error: ${error}`],
        recommendations: [
          'Verify configuration files are accessible',
          'Check JSON syntax in tauri.conf.json'
        ],
        impact: 'Cannot assess code signing security',
        exploitability: 'Low - analysis limitation only'
      });
    }
  }

  private async analyzeUpdateDelivery(): Promise<void> {
    console.log('🚀 Analyzing update delivery mechanisms...');

    // Check for update server configuration
    const hasUpdateServer = process.env.TAURI_UPDATE_SERVER || 
                           process.env.UPDATE_SERVER_URL;

    if (!hasUpdateServer) {
      this.findings.push({
        id: 'DELIVERY-001',
        title: 'No Update Server Configuration',
        severity: 'high',
        category: 'Update Infrastructure',
        description: 'No update server is configured for delivering application updates.',
        evidence: [
          'No TAURI_UPDATE_SERVER environment variable',
          'No UPDATE_SERVER_URL configuration found',
          'No update delivery mechanism in place'
        ],
        recommendations: [
          'Set up secure update server with HTTPS',
          'Configure update server URL in environment variables',
          'Implement authentication for update server access',
          'Set up CDN for global update distribution'
        ],
        impact: 'No mechanism for delivering security updates to users',
        exploitability: 'High - users remain vulnerable to known security issues'
      });
    }

    // Check for HTTPS enforcement
    if (hasUpdateServer && !hasUpdateServer.startsWith('https://')) {
      this.findings.push({
        id: 'DELIVERY-002',
        title: 'Insecure Update Server Protocol',
        severity: 'critical',
        category: 'Transport Security',
        description: 'Update server is not configured to use HTTPS, allowing man-in-the-middle attacks.',
        evidence: [
          `Update server URL: ${hasUpdateServer}`,
          'HTTP protocol allows interception and modification of updates'
        ],
        recommendations: [
          'Configure update server to use HTTPS only',
          'Implement certificate pinning for update requests',
          'Add HSTS headers to update server responses'
        ],
        cweId: 'CWE-319',
        impact: 'Attackers can intercept and modify updates in transit',
        exploitability: 'High - network-level attacks can inject malicious updates'
      });
    }

    // Check for update authentication
    const hasUpdateAuth = process.env.UPDATE_SERVER_TOKEN ||
                         process.env.UPDATE_API_KEY;

    if (!hasUpdateAuth) {
      this.findings.push({
        id: 'DELIVERY-003',
        title: 'No Update Server Authentication',
        severity: 'medium',
        category: 'Access Control',
        description: 'Update server access is not authenticated, potentially allowing unauthorized update distribution.',
        evidence: [
          'No UPDATE_SERVER_TOKEN found',
          'No UPDATE_API_KEY configuration',
          'Unauthenticated access to update endpoints'
        ],
        recommendations: [
          'Implement API key authentication for update server',
          'Use JWT tokens for update request authentication',
          'Set up rate limiting for update requests'
        ],
        impact: 'Unauthorized parties may be able to distribute malicious updates',
        exploitability: 'Medium - requires access to update server infrastructure'
      });
    }
  }

  private async analyzeBinaryIntegrity(): Promise<void> {
    console.log('🔒 Analyzing binary integrity verification...');

    try {
      // Check for checksum verification
      const packageJsonPath = join(this.projectRoot, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      // Check for integrity checking scripts
      const hasIntegrityCheck = packageJson.scripts && 
        Object.values(packageJson.scripts).some((script: any) => 
          script.includes('checksum') || 
          script.includes('integrity') || 
          script.includes('verify')
        );

      if (!hasIntegrityCheck) {
        this.findings.push({
          id: 'INTEGRITY-001',
          title: 'No Binary Integrity Verification',
          severity: 'high',
          category: 'Binary Security',
          description: 'No mechanisms are in place to verify binary integrity during updates.',
          evidence: [
            'No checksum verification scripts found',
            'No integrity checking in build process',
            'No hash validation for downloaded updates'
          ],
          recommendations: [
            'Implement SHA-256 checksum verification for all binaries',
            'Add integrity checking to update process',
            'Store checksums on secure server separate from binaries',
            'Verify checksums before installing updates'
          ],
          cweId: 'CWE-354',
          impact: 'Corrupted or tampered binaries may be installed without detection',
          exploitability: 'Medium - requires ability to modify binaries in transit or storage'
        });
      }

      // Check for build reproducibility
      const hasBuildReproducibility = packageJson.scripts && 
        Object.values(packageJson.scripts).some((script: any) => 
          script.includes('reproducible') || 
          script.includes('deterministic')
        );

      if (!hasBuildReproducibility) {
        this.findings.push({
          id: 'INTEGRITY-002',
          title: 'No Reproducible Build Configuration',
          severity: 'medium',
          category: 'Build Security',
          description: 'Build process is not configured for reproducibility, making it difficult to verify binary authenticity.',
          evidence: [
            'No reproducible build scripts',
            'No deterministic build configuration',
            'Build timestamps and environment may vary'
          ],
          recommendations: [
            'Configure deterministic build settings',
            'Use fixed timestamps in build process',
            'Document build environment requirements',
            'Implement build verification process'
          ],
          impact: 'Difficult to verify that binaries match source code',
          exploitability: 'Low - primarily affects auditability'
        });
      }

    } catch (error) {
      this.findings.push({
        id: 'INTEGRITY-003',
        title: 'Binary Integrity Analysis Failed',
        severity: 'low',
        category: 'Analysis Error',
        description: `Failed to analyze binary integrity configuration: ${error}`,
        evidence: [`Error: ${error}`],
        recommendations: [
          'Verify package.json is accessible and valid',
          'Check file permissions'
        ],
        impact: 'Cannot assess binary integrity measures',
        exploitability: 'Low - analysis limitation only'
      });
    }
  }

  private async analyzeUpdateSecurity(): Promise<void> {
    console.log('🛡️ Analyzing update security and tamper protection...');

    // Check for update rollback mechanism
    const hasRollback = await this.checkForRollbackMechanism();
    if (!hasRollback) {
      this.findings.push({
        id: 'SECURITY-001',
        title: 'No Update Rollback Mechanism',
        severity: 'medium',
        category: 'Update Safety',
        description: 'No mechanism exists to rollback failed or problematic updates.',
        evidence: [
          'No rollback functionality in update process',
          'No backup of previous version before update',
          'No recovery mechanism for failed updates'
        ],
        recommendations: [
          'Implement automatic backup before updates',
          'Add rollback functionality to update process',
          'Create recovery mechanism for failed updates',
          'Test rollback process regularly'
        ],
        impact: 'Failed updates may leave application in unusable state',
        exploitability: 'Low - primarily affects availability'
      });
    }

    // Check for update validation
    const hasUpdateValidation = await this.checkForUpdateValidation();
    if (!hasUpdateValidation) {
      this.findings.push({
        id: 'SECURITY-002',
        title: 'No Update Package Validation',
        severity: 'high',
        category: 'Update Security',
        description: 'Update packages are not validated before installation.',
        evidence: [
          'No signature verification for update packages',
          'No version validation logic',
          'No compatibility checking before update'
        ],
        recommendations: [
          'Implement digital signature verification for updates',
          'Add version compatibility checking',
          'Validate update package structure before installation',
          'Check minimum system requirements before update'
        ],
        cweId: 'CWE-345',
        impact: 'Malicious or incompatible updates may be installed',
        exploitability: 'High - if update server is compromised'
      });
    }

    // Check for secure update storage
    const hasSecureStorage = await this.checkForSecureUpdateStorage();
    if (!hasSecureStorage) {
      this.findings.push({
        id: 'SECURITY-003',
        title: 'Insecure Update Storage',
        severity: 'medium',
        category: 'Storage Security',
        description: 'Downloaded updates are not stored securely before installation.',
        evidence: [
          'No secure temporary storage for updates',
          'Update files may be accessible to other processes',
          'No cleanup of temporary update files'
        ],
        recommendations: [
          'Store updates in secure temporary directory',
          'Set appropriate file permissions for update files',
          'Clean up temporary files after installation',
          'Use encrypted storage for sensitive update data'
        ],
        impact: 'Update files may be tampered with before installation',
        exploitability: 'Medium - requires local system access'
      });
    }
  }

  private async analyzeDependencyUpdates(): Promise<void> {
    console.log('📦 Analyzing dependency update mechanisms...');

    try {
      // Check for automated dependency updates
      const packageJsonPath = join(this.projectRoot, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      // Check for security audit scripts
      const hasSecurityAudit = packageJson.scripts && 
        Object.keys(packageJson.scripts).some(script => 
          script.includes('audit') || script.includes('security')
        );

      if (!hasSecurityAudit) {
        this.findings.push({
          id: 'DEP-001',
          title: 'No Dependency Security Audit',
          severity: 'medium',
          category: 'Dependency Security',
          description: 'No automated dependency security auditing is configured.',
          evidence: [
            'No npm audit scripts in package.json',
            'No security checking in build process',
            'No automated vulnerability scanning'
          ],
          recommendations: [
            'Add npm audit to build process',
            'Configure automated dependency vulnerability scanning',
            'Set up alerts for new security vulnerabilities',
            'Implement dependency update automation'
          ],
          impact: 'Vulnerable dependencies may remain undetected',
          exploitability: 'Medium - depends on specific vulnerabilities'
        });
      }

      // Check for dependency pinning
      const hasPinnedDependencies = this.checkDependencyPinning(packageJson);
      if (!hasPinnedDependencies) {
        this.findings.push({
          id: 'DEP-002',
          title: 'Unpinned Dependencies',
          severity: 'low',
          category: 'Dependency Management',
          description: 'Dependencies are not pinned to specific versions, which may lead to unexpected updates.',
          evidence: [
            'Dependencies use version ranges instead of exact versions',
            'Potential for unexpected dependency updates',
            'Build reproducibility may be affected'
          ],
          recommendations: [
            'Pin critical dependencies to exact versions',
            'Use package-lock.json for consistent installs',
            'Regularly review and update dependency versions',
            'Test thoroughly when updating dependencies'
          ],
          impact: 'Unexpected dependency updates may introduce vulnerabilities or break functionality',
          exploitability: 'Low - requires compromised package registry'
        });
      }

    } catch (error) {
      this.findings.push({
        id: 'DEP-003',
        title: 'Dependency Analysis Failed',
        severity: 'low',
        category: 'Analysis Error',
        description: `Failed to analyze dependency update mechanisms: ${error}`,
        evidence: [`Error: ${error}`],
        recommendations: [
          'Verify package.json is accessible',
          'Check file permissions and JSON syntax'
        ],
        impact: 'Cannot assess dependency update security',
        exploitability: 'Low - analysis limitation only'
      });
    }
  }

  private async checkForRollbackMechanism(): Promise<boolean> {
    try {
      // Check for rollback-related code in Tauri source
      const mainRsPath = join(this.projectRoot, 'src-tauri', 'src', 'main.rs');
      const mainRsContent = await fs.readFile(mainRsPath, 'utf-8');
      
      return mainRsContent.includes('rollback') || 
             mainRsContent.includes('backup') ||
             mainRsContent.includes('restore');
    } catch {
      return false;
    }
  }

  private async checkForUpdateValidation(): Promise<boolean> {
    try {
      // Check for validation-related code
      const mainRsPath = join(this.projectRoot, 'src-tauri', 'src', 'main.rs');
      const mainRsContent = await fs.readFile(mainRsPath, 'utf-8');
      
      return mainRsContent.includes('validate') || 
             mainRsContent.includes('verify') ||
             mainRsContent.includes('signature');
    } catch {
      return false;
    }
  }

  private async checkForSecureUpdateStorage(): Promise<boolean> {
    try {
      // Check for secure storage implementation
      const mainRsPath = join(this.projectRoot, 'src-tauri', 'src', 'main.rs');
      const mainRsContent = await fs.readFile(mainRsPath, 'utf-8');
      
      return mainRsContent.includes('secure') || 
             mainRsContent.includes('temp') ||
             mainRsContent.includes('cleanup');
    } catch {
      return false;
    }
  }

  private checkDependencyPinning(packageJson: any): boolean {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const totalDeps = Object.keys(dependencies).length;
    
    if (totalDeps === 0) return true;
    
    const pinnedDeps = Object.values(dependencies).filter((version: any) => 
      !version.startsWith('^') && !version.startsWith('~') && !version.includes('>')
    ).length;
    
    // Consider it pinned if more than 80% of dependencies are exact versions
    return (pinnedDeps / totalDeps) > 0.8;
  }

  private generateReport(): UpdateSecurityReport {
    const summary = {
      totalFindings: this.findings.length,
      criticalFindings: this.findings.filter(f => f.severity === 'critical').length,
      highFindings: this.findings.filter(f => f.severity === 'high').length,
      mediumFindings: this.findings.filter(f => f.severity === 'medium').length,
      lowFindings: this.findings.filter(f => f.severity === 'low').length,
      infoFindings: this.findings.filter(f => f.severity === 'info').length,
    };

    const recommendations = [
      'Implement Tauri updater plugin with secure configuration',
      'Set up code signing for all target platforms',
      'Configure HTTPS-only update server with authentication',
      'Implement binary integrity verification with checksums',
      'Add update rollback and validation mechanisms',
      'Set up automated dependency security auditing',
      'Configure secure update storage and cleanup processes',
      'Implement reproducible build process for verification'
    ];

    return {
      summary,
      findings: this.findings,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json';

  const analyzer = new UpdateIntegrityAnalyzer();
  const report = await analyzer.analyzeUpdateMechanism();

  if (verbose) {
    console.log('\n📊 Update Mechanism Security Analysis Results:');
    console.log(`Total findings: ${report.summary.totalFindings}`);
    console.log(`Critical: ${report.summary.criticalFindings}, High: ${report.summary.highFindings}, Medium: ${report.summary.mediumFindings}, Low: ${report.summary.lowFindings}`);
    
    report.findings.forEach(finding => {
      console.log(`\n[${finding.severity.toUpperCase()}] ${finding.title}`);
      console.log(`Category: ${finding.category}`);
      console.log(`Description: ${finding.description}`);
      if (finding.cweId) console.log(`CWE: ${finding.cweId}`);
    });
  }

  if (outputFile) {
    if (format === 'markdown') {
      const markdownReport = generateMarkdownReport(report);
      await fs.writeFile(outputFile, markdownReport);
      console.log(`📝 Markdown report saved to: ${outputFile}`);
    } else {
      await fs.writeFile(outputFile, JSON.stringify(report, null, 2));
      console.log(`📄 JSON report saved to: ${outputFile}`);
    }
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

function generateMarkdownReport(report: UpdateSecurityReport): string {
  const { summary, findings, recommendations, timestamp } = report;
  
  let markdown = `# Update Mechanism and Code Integrity Security Analysis Report

**Generated:** ${new Date(timestamp).toLocaleString()}

## Executive Summary

This report analyzes the update mechanism and code integrity security of the Todo2 application. The analysis covers update delivery, code signing, binary integrity verification, and tamper protection mechanisms.

### Findings Summary

- **Total Findings:** ${summary.totalFindings}
- **Critical:** ${summary.criticalFindings}
- **High:** ${summary.highFindings}
- **Medium:** ${summary.mediumFindings}
- **Low:** ${summary.lowFindings}
- **Info:** ${summary.infoFindings}

## Security Findings

`;

  findings.forEach((finding, index) => {
    markdown += `### ${index + 1}. ${finding.title}

**Severity:** ${finding.severity.toUpperCase()}  
**Category:** ${finding.category}  
${finding.cweId ? `**CWE:** ${finding.cweId}  ` : ''}

**Description:** ${finding.description}

**Impact:** ${finding.impact}

**Exploitability:** ${finding.exploitability}

**Evidence:**
${finding.evidence.map(e => `- ${e}`).join('\n')}

**Recommendations:**
${finding.recommendations.map(r => `- ${r}`).join('\n')}

---

`;
  });

  markdown += `## Overall Recommendations

${recommendations.map(r => `- ${r}`).join('\n')}

## Conclusion

The update mechanism analysis reveals several critical areas that need attention to ensure secure application updates. Priority should be given to implementing code signing, secure update delivery, and binary integrity verification.

Regular security reviews of the update process should be conducted, especially when making changes to the build or deployment pipeline.
`;

  return markdown;
}

// Run main function
main().catch(console.error);

export { UpdateIntegrityAnalyzer, type UpdateSecurityReport, type UpdateSecurityFinding };