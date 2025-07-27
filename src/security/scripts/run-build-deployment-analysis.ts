#!/usr/bin/env tsx

/**
 * Build and Deployment Security Analysis Script
 * Analyzes build configuration, deployment settings, and security misconfigurations
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface BuildSecurityIssue {
  type: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  file?: string;
  recommendation: string;
}

interface BuildSecurityReport {
  timestamp: string;
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  issues: BuildSecurityIssue[];
  recommendations: string[];
  complianceStatus: {
    owasp: boolean;
    nist: boolean;
    soc2: boolean;
  };
}

class BuildDeploymentSecurityAnalyzer {
  private workspaceRoot: string;
  private report: BuildSecurityReport;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.report = {
      timestamp: new Date().toISOString(),
      overallRisk: 'low',
      summary: '',
      issues: [],
      recommendations: [],
      complianceStatus: {
        owasp: false,
        nist: false,
        soc2: false
      }
    };
  }

  async analyze(): Promise<BuildSecurityReport> {
    console.log('🔍 Starting build and deployment security analysis...');

    try {
      await this.analyzeBuildConfiguration();
      await this.analyzePackageConfiguration();
      await this.analyzeTauriConfiguration();
      await this.analyzeServiceWorkerSecurity();
      await this.analyzeSecurityHeaders();
      await this.analyzeCICD();
      await this.analyzeEnvironmentSecurity();
      await this.runBuildTest();
      
      this.calculateOverallRisk();
      this.generateRecommendations();
      this.assessCompliance();
      
      console.log('✅ Build and deployment security analysis completed');
      return this.report;
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      this.addIssue({
        type: 'critical',
        category: 'Analysis Error',
        title: 'Security analysis failed',
        description: `Analysis failed with error: ${error}`,
        recommendation: 'Review analysis configuration and retry'
      });
      return this.report;
    }
  }

  private async analyzeBuildConfiguration(): Promise<void> {
    console.log('📦 Analyzing build configuration...');

    // Analyze Vite configuration
    const viteConfigPath = join(this.workspaceRoot, 'vite.config.ts');
    if (await this.fileExists(viteConfigPath)) {
      const viteConfig = await fs.readFile(viteConfigPath, 'utf-8');
      
      // Check for security headers
      if (!viteConfig.includes('X-Frame-Options') && !viteConfig.includes('headers')) {
        this.addIssue({
          type: 'medium',
          category: 'Security Headers',
          title: 'Missing security headers in build configuration',
          description: 'Vite configuration does not include security headers like X-Frame-Options, X-Content-Type-Options',
          file: 'vite.config.ts',
          recommendation: 'Add security headers to Vite server configuration'
        });
      }

      // Check for CSP configuration
      if (!viteConfig.includes('Content-Security-Policy') && !viteConfig.includes('csp')) {
        this.addIssue({
          type: 'high',
          category: 'Content Security Policy',
          title: 'Missing Content Security Policy in build',
          description: 'No Content Security Policy configured in build process',
          file: 'vite.config.ts',
          recommendation: 'Configure CSP in build process or HTML template'
        });
      }

      // Check compression configuration
      if (viteConfig.includes('vite-plugin-compression')) {
        console.log('✅ Compression enabled in build');
      } else {
        this.addIssue({
          type: 'low',
          category: 'Performance Security',
          title: 'Missing build compression',
          description: 'Build compression not configured, may impact performance',
          file: 'vite.config.ts',
          recommendation: 'Enable Gzip/Brotli compression in build process'
        });
      }
    }

    // Analyze TypeScript configuration
    const tsconfigPath = join(this.workspaceRoot, 'tsconfig.json');
    if (await this.fileExists(tsconfigPath)) {
      const tsconfig = await fs.readFile(tsconfigPath, 'utf-8');
      try {
        // Remove comments and parse JSON
        const cleanJson = tsconfig.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
        const config = JSON.parse(cleanJson);
        
        if (config.compilerOptions?.strict) {
          console.log('✅ TypeScript strict mode enabled');
        } else {
          this.addIssue({
            type: 'medium',
            category: 'Type Safety',
            title: 'TypeScript strict mode not enabled',
            description: 'Strict mode provides better type safety and security',
            file: 'tsconfig.json',
            recommendation: 'Enable strict mode in TypeScript configuration'
          });
        }
      } catch (error) {
        console.log('⚠️ Could not parse tsconfig.json, skipping TypeScript analysis');
      }
    }
  }

  private async analyzePackageConfiguration(): Promise<void> {
    console.log('📋 Analyzing package configuration...');

    const packagePath = join(this.workspaceRoot, 'package.json');
    if (await this.fileExists(packagePath)) {
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      // Check for security scripts
      const securityScripts = Object.keys(packageJson.scripts || {})
        .filter(script => script.includes('security'));
      
      if (securityScripts.length > 0) {
        console.log(`✅ Found ${securityScripts.length} security scripts`);
      } else {
        this.addIssue({
          type: 'medium',
          category: 'Security Automation',
          title: 'Missing security scripts',
          description: 'No security-related npm scripts found',
          file: 'package.json',
          recommendation: 'Add security scripts for linting, auditing, and testing'
        });
      }

      // Check for audit script
      if (!packageJson.scripts?.['security:audit']) {
        this.addIssue({
          type: 'medium',
          category: 'Dependency Security',
          title: 'Missing dependency audit script',
          description: 'No npm audit script configured',
          file: 'package.json',
          recommendation: 'Add "security:audit": "npm audit --audit-level moderate" script'
        });
      }

      // Check for ESLint security plugin
      const hasSecurityPlugin = packageJson.devDependencies?.['eslint-plugin-security'] ||
                               packageJson.dependencies?.['eslint-plugin-security'];
      
      if (!hasSecurityPlugin) {
        this.addIssue({
          type: 'medium',
          category: 'Static Analysis',
          title: 'Missing ESLint security plugin',
          description: 'ESLint security plugin not installed',
          file: 'package.json',
          recommendation: 'Install and configure eslint-plugin-security'
        });
      }
    }
  }

  private async analyzeTauriConfiguration(): Promise<void> {
    console.log('🖥️ Analyzing Tauri configuration...');

    const tauriConfigPath = join(this.workspaceRoot, 'src-tauri', 'tauri.conf.json');
    if (await this.fileExists(tauriConfigPath)) {
      const tauriConfig = await fs.readFile(tauriConfigPath, 'utf-8');
      const config = JSON.parse(tauriConfig);

      // Check CSP configuration
      if (config.app?.security?.csp === null) {
        this.addIssue({
          type: 'critical',
          category: 'Content Security Policy',
          title: 'Content Security Policy disabled in Tauri',
          description: 'CSP is explicitly disabled (null) in Tauri configuration',
          file: 'src-tauri/tauri.conf.json',
          recommendation: 'Enable CSP with appropriate directives for your application'
        });
      } else if (!config.app?.security?.csp) {
        this.addIssue({
          type: 'high',
          category: 'Content Security Policy',
          title: 'No Content Security Policy configured',
          description: 'CSP not configured in Tauri application',
          file: 'src-tauri/tauri.conf.json',
          recommendation: 'Configure CSP to prevent XSS attacks'
        });
      }

      // Check bundle configuration
      if (config.bundle?.targets === 'all') {
        this.addIssue({
          type: 'low',
          category: 'Build Security',
          title: 'Building for all targets',
          description: 'Application configured to build for all targets without restriction',
          file: 'src-tauri/tauri.conf.json',
          recommendation: 'Specify only required target platforms'
        });
      }

      // Check for allowlist configuration
      if (!config.tauri?.allowlist) {
        this.addIssue({
          type: 'medium',
          category: 'API Security',
          title: 'No API allowlist configured',
          description: 'Tauri API allowlist not configured, may expose unnecessary APIs',
          file: 'src-tauri/tauri.conf.json',
          recommendation: 'Configure allowlist to restrict available Tauri APIs'
        });
      }
    }
  }

  private async analyzeServiceWorkerSecurity(): Promise<void> {
    console.log('⚙️ Analyzing service worker security...');

    const swPath = join(this.workspaceRoot, 'public', 'sw.js');
    if (await this.fileExists(swPath)) {
      const swContent = await fs.readFile(swPath, 'utf-8');

      // Check for hardcoded credentials
      if (swContent.includes('your-project.supabase.co') || 
          swContent.includes('your-anon-key')) {
        this.addIssue({
          type: 'critical',
          category: 'Credential Security',
          title: 'Hardcoded credentials in service worker',
          description: 'Service worker contains hardcoded API URLs and keys',
          file: 'public/sw.js',
          recommendation: 'Use environment variables or secure configuration for API credentials'
        });
      }

      // Check for secure cache policies
      if (swContent.includes('cache.addAll') && !swContent.includes('supabase')) {
        console.log('✅ Service worker has cache exclusions for API calls');
      } else if (!swContent.includes('supabase.co') && !swContent.includes('auth/')) {
        this.addIssue({
          type: 'medium',
          category: 'Cache Security',
          title: 'Potentially insecure caching policy',
          description: 'Service worker may cache sensitive API responses',
          file: 'public/sw.js',
          recommendation: 'Exclude authentication and API endpoints from caching'
        });
      }

      // Check for secure communication
      if (!swContent.includes('https://') && swContent.includes('http://')) {
        this.addIssue({
          type: 'high',
          category: 'Transport Security',
          title: 'Insecure HTTP communication in service worker',
          description: 'Service worker may use insecure HTTP connections',
          file: 'public/sw.js',
          recommendation: 'Ensure all communication uses HTTPS'
        });
      }
    }
  }

  private async analyzeSecurityHeaders(): Promise<void> {
    console.log('🛡️ Analyzing security headers configuration...');

    const indexPath = join(this.workspaceRoot, 'index.html');
    if (await this.fileExists(indexPath)) {
      const indexContent = await fs.readFile(indexPath, 'utf-8');

      // Check for CSP meta tag
      if (!indexContent.includes('Content-Security-Policy')) {
        this.addIssue({
          type: 'high',
          category: 'Content Security Policy',
          title: 'No CSP meta tag in HTML',
          description: 'HTML does not include Content-Security-Policy meta tag',
          file: 'index.html',
          recommendation: 'Add CSP meta tag to HTML head section'
        });
      }

      // Check for other security meta tags
      const securityHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy'
      ];

      securityHeaders.forEach(header => {
        if (!indexContent.includes(header)) {
          this.addIssue({
            type: 'medium',
            category: 'Security Headers',
            title: `Missing ${header} header`,
            description: `HTML does not include ${header} meta tag`,
            file: 'index.html',
            recommendation: `Add ${header} meta tag for additional security`
          });
        }
      });
    }
  }

  private async analyzeCICD(): Promise<void> {
    console.log('🔄 Analyzing CI/CD configuration...');

    const cicdPaths = [
      '.github/workflows',
      '.gitlab-ci.yml',
      'azure-pipelines.yml',
      'Jenkinsfile',
      '.circleci/config.yml'
    ];

    let hasCICD = false;
    for (const path of cicdPaths) {
      if (await this.fileExists(join(this.workspaceRoot, path))) {
        hasCICD = true;
        break;
      }
    }

    if (!hasCICD) {
      this.addIssue({
        type: 'medium',
        category: 'DevOps Security',
        title: 'No CI/CD pipeline detected',
        description: 'No continuous integration/deployment configuration found',
        recommendation: 'Set up CI/CD pipeline with security scanning and automated testing'
      });
    }

    // Check for security scanning in CI/CD
    // This would require reading the actual CI/CD files if they exist
  }

  private async analyzeEnvironmentSecurity(): Promise<void> {
    console.log('🌍 Analyzing environment configuration...');

    const envExamplePath = join(this.workspaceRoot, '.env.example');
    if (await this.fileExists(envExamplePath)) {
      const envContent = await fs.readFile(envExamplePath, 'utf-8');

      // Check for sensitive data patterns
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /private.*key/i,
        /api.*key/i
      ];

      sensitivePatterns.forEach(pattern => {
        if (pattern.test(envContent)) {
          this.addIssue({
            type: 'medium',
            category: 'Environment Security',
            title: 'Sensitive data patterns in environment template',
            description: 'Environment template may expose sensitive configuration patterns',
            file: '.env.example',
            recommendation: 'Review environment variables for sensitive data exposure'
          });
        }
      });
    }

    // Check for .env file in repository (should not exist)
    const envPath = join(this.workspaceRoot, '.env');
    if (await this.fileExists(envPath)) {
      this.addIssue({
        type: 'high',
        category: 'Environment Security',
        title: '.env file present in repository',
        description: 'Environment file with potentially sensitive data found in repository',
        file: '.env',
        recommendation: 'Remove .env file from repository and add to .gitignore'
      });
    }
  }

  private async runBuildTest(): Promise<void> {
    console.log('🏗️ Testing build process...');

    try {
      // Test TypeScript compilation
      execSync('npx tsc --noEmit', { 
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });
      console.log('✅ TypeScript compilation successful');
    } catch (error) {
      this.addIssue({
        type: 'critical',
        category: 'Build Process',
        title: 'TypeScript compilation errors',
        description: 'Build process fails due to TypeScript compilation errors',
        recommendation: 'Fix TypeScript errors before deployment'
      });
    }

    try {
      // Test build process
      execSync('npm run build', { 
        cwd: this.workspaceRoot,
        stdio: 'pipe'
      });
      console.log('✅ Build process successful');
    } catch (error) {
      this.addIssue({
        type: 'critical',
        category: 'Build Process',
        title: 'Build process failure',
        description: 'Application build process fails',
        recommendation: 'Fix build errors before deployment'
      });
    }
  }

  private addIssue(issue: BuildSecurityIssue): void {
    this.report.issues.push(issue);
  }

  private calculateOverallRisk(): void {
    const criticalCount = this.report.issues.filter(i => i.type === 'critical').length;
    const highCount = this.report.issues.filter(i => i.type === 'high').length;
    const mediumCount = this.report.issues.filter(i => i.type === 'medium').length;

    if (criticalCount > 0) {
      this.report.overallRisk = 'critical';
    } else if (highCount > 2) {
      this.report.overallRisk = 'high';
    } else if (highCount > 0 || mediumCount > 3) {
      this.report.overallRisk = 'medium';
    } else {
      this.report.overallRisk = 'low';
    }

    this.report.summary = `Found ${this.report.issues.length} security issues: ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${this.report.issues.filter(i => i.type === 'low').length} low`;
  }

  private generateRecommendations(): void {
    // Generate prioritized recommendations based on issues
    const criticalIssues = this.report.issues.filter(i => i.type === 'critical');
    const highIssues = this.report.issues.filter(i => i.type === 'high');

    if (criticalIssues.length > 0) {
      this.report.recommendations.push('IMMEDIATE: Fix critical security issues before deployment');
      criticalIssues.forEach(issue => {
        this.report.recommendations.push(`- ${issue.recommendation}`);
      });
    }

    if (highIssues.length > 0) {
      this.report.recommendations.push('HIGH PRIORITY: Address high-severity security issues');
      highIssues.forEach(issue => {
        this.report.recommendations.push(`- ${issue.recommendation}`);
      });
    }

    // Add general recommendations
    this.report.recommendations.push('Set up automated security scanning in CI/CD pipeline');
    this.report.recommendations.push('Implement security headers and Content Security Policy');
    this.report.recommendations.push('Regular dependency vulnerability scanning');
  }

  private assessCompliance(): void {
    const hasCSP = !this.report.issues.some(i => i.category === 'Content Security Policy');
    const hasSecurityHeaders = !this.report.issues.some(i => i.category === 'Security Headers');
    const hasSecureAuth = !this.report.issues.some(i => i.category === 'Credential Security');

    this.report.complianceStatus.owasp = hasCSP && hasSecurityHeaders && hasSecureAuth;
    this.report.complianceStatus.nist = this.report.complianceStatus.owasp && this.report.issues.length < 5;
    this.report.complianceStatus.soc2 = this.report.complianceStatus.nist && this.report.issues.filter(i => i.type === 'critical').length === 0;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json';

  const analyzer = new BuildDeploymentSecurityAnalyzer();
  const report = await analyzer.analyze();

  if (verbose) {
    console.log('\n📊 Build and Deployment Security Analysis Results:');
    console.log(`Overall Risk: ${report.overallRisk.toUpperCase()}`);
    console.log(`Summary: ${report.summary}`);
    
    if (report.issues.length > 0) {
      console.log('\n🚨 Security Issues Found:');
      report.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.type.toUpperCase()}] ${issue.title}`);
        console.log(`   Category: ${issue.category}`);
        console.log(`   Description: ${issue.description}`);
        if (issue.file) console.log(`   File: ${issue.file}`);
        console.log(`   Recommendation: ${issue.recommendation}`);
        console.log('');
      });
    }

    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`- ${rec}`);
      });
    }

    console.log('\n📋 Compliance Status:');
    console.log(`OWASP: ${report.complianceStatus.owasp ? '✅' : '❌'}`);
    console.log(`NIST: ${report.complianceStatus.nist ? '✅' : '❌'}`);
    console.log(`SOC 2: ${report.complianceStatus.soc2 ? '✅' : '❌'}`);
  }

  if (outputFile) {
    let output: string;
    if (format === 'markdown') {
      output = generateMarkdownReport(report);
    } else {
      output = JSON.stringify(report, null, 2);
    }
    
    await fs.writeFile(outputFile, output);
    console.log(`📄 Report saved to: ${outputFile}`);
  }

  // Exit with error code if critical issues found
  if (report.overallRisk === 'critical') {
    process.exit(1);
  }
}

function generateMarkdownReport(report: BuildSecurityReport): string {
  let markdown = `# Build and Deployment Security Analysis Report\n\n`;
  markdown += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n`;
  markdown += `**Overall Risk:** ${report.overallRisk.toUpperCase()}\n`;
  markdown += `**Summary:** ${report.summary}\n\n`;

  if (report.issues.length > 0) {
    markdown += `## Security Issues\n\n`;
    
    const groupedIssues = {
      critical: report.issues.filter(i => i.type === 'critical'),
      high: report.issues.filter(i => i.type === 'high'),
      medium: report.issues.filter(i => i.type === 'medium'),
      low: report.issues.filter(i => i.type === 'low')
    };

    Object.entries(groupedIssues).forEach(([severity, issues]) => {
      if (issues.length > 0) {
        markdown += `### ${severity.charAt(0).toUpperCase() + severity.slice(1)} Severity Issues\n\n`;
        issues.forEach((issue, index) => {
          markdown += `#### ${index + 1}. ${issue.title}\n\n`;
          markdown += `**Category:** ${issue.category}\n`;
          markdown += `**Description:** ${issue.description}\n`;
          if (issue.file) markdown += `**File:** \`${issue.file}\`\n`;
          markdown += `**Recommendation:** ${issue.recommendation}\n\n`;
        });
      }
    });
  }

  if (report.recommendations.length > 0) {
    markdown += `## Recommendations\n\n`;
    report.recommendations.forEach(rec => {
      markdown += `- ${rec}\n`;
    });
    markdown += '\n';
  }

  markdown += `## Compliance Status\n\n`;
  markdown += `- **OWASP:** ${report.complianceStatus.owasp ? '✅ Compliant' : '❌ Non-compliant'}\n`;
  markdown += `- **NIST:** ${report.complianceStatus.nist ? '✅ Compliant' : '❌ Non-compliant'}\n`;
  markdown += `- **SOC 2:** ${report.complianceStatus.soc2 ? '✅ Compliant' : '❌ Non-compliant'}\n`;

  return markdown;
}

// Run the analysis
main().catch(console.error);

export { BuildDeploymentSecurityAnalyzer, type BuildSecurityReport, type BuildSecurityIssue };