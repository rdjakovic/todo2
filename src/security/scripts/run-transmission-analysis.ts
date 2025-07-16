#!/usr/bin/env node

/**
 * Data Transmission Security Analysis CLI Script
 * 
 * Command-line utility to run data transmission security analysis
 * and generate security reports for the Todo2 application
 */

import { TransmissionSecurityChecker } from '../transmission-security-checker';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface CLIOptions {
  url?: string;
  key?: string;
  output?: string;
  format?: 'json' | 'markdown' | 'csv';
  quick?: boolean;
  verbose?: boolean;
}

class TransmissionAnalysisCLI {
  private checker: TransmissionSecurityChecker;

  constructor() {
    this.checker = new TransmissionSecurityChecker();
  }

  async run(options: CLIOptions): Promise<void> {
    try {
      console.log('🔒 Todo2 Data Transmission Security Analysis');
      console.log('============================================\n');

      // Get configuration
      const config = this.getConfiguration(options);
      
      if (options.verbose) {
        console.log('Configuration:');
        console.log(`- Supabase URL: ${config.supabaseUrl}`);
        console.log(`- API Key: ${config.supabaseKey.substring(0, 10)}...`);
        console.log('');
      }

      if (options.quick) {
        await this.runQuickAnalysis(config.supabaseUrl);
      } else {
        await this.runFullAnalysis(config, options);
      }

    } catch (error) {
      console.error('❌ Analysis failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  private async runQuickAnalysis(url: string): Promise<void> {
    console.log('🚀 Running quick TLS security check...\n');
    
    const result = await this.checker.quickTLSCheck(url);
    
    console.log(`✅ TLS Security Status: ${result.secure ? 'SECURE' : 'INSECURE'}`);
    
    if (result.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      result.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      result.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  }

  private async runFullAnalysis(config: any, options: CLIOptions): Promise<void> {
    console.log('🔍 Running comprehensive security analysis...\n');
    
    // Run full security analysis
    const report = await this.checker.runSecurityAnalysis(config);
    
    // Display summary
    this.displaySummary(report);
    
    // Display detailed findings
    if (options.verbose) {
      this.displayDetailedFindings(report);
    }
    
    // Export report if requested
    if (options.output) {
      await this.exportReport(report, options);
    }
    
    // Display recommendations
    await this.displayRecommendations(config);
  }

  private displaySummary(report: any): void {
    console.log('📊 Security Analysis Summary');
    console.log('============================');
    console.log(`Overall Risk Score: ${report.overallRiskScore}/100`);
    console.log(`Critical Findings: ${report.criticalFindings.length}`);
    console.log(`TLS Risk Level: ${report.tlsAssessment.riskLevel}`);
    console.log(`API Endpoints Analyzed: ${report.apiAssessments.length}`);
    console.log('');
    
    // Compliance status
    console.log('🏛️  Compliance Status:');
    console.log(`  GDPR: ${report.complianceStatus.gdpr ? '✅' : '❌'}`);
    console.log(`  SOC 2: ${report.complianceStatus.soc2 ? '✅' : '❌'}`);
    console.log(`  PCI DSS: ${report.complianceStatus.pciDss ? '✅' : '❌'}`);
    console.log('');
  }

  private displayDetailedFindings(report: any): void {
    if (report.criticalFindings.length > 0) {
      console.log('🚨 Critical Security Findings');
      console.log('=============================');
      report.criticalFindings.forEach((finding: any, index: number) => {
        console.log(`${index + 1}. ${finding.title}`);
        console.log(`   Severity: ${finding.severity}`);
        console.log(`   Category: ${finding.category}`);
        console.log(`   Description: ${finding.description}`);
        console.log(`   Recommendation: ${finding.recommendation}`);
        if (finding.cweId) {
          console.log(`   CWE ID: ${finding.cweId}`);
        }
        console.log('');
      });
    }
    
    // TLS Assessment Details
    console.log('🔐 TLS/SSL Assessment Details');
    console.log('=============================');
    console.log(`Protocol: ${report.tlsAssessment.protocol}`);
    console.log(`TLS Version: ${report.tlsAssessment.version}`);
    console.log(`Certificate Valid: ${report.tlsAssessment.certificateValid}`);
    console.log(`HSTS Enabled: ${report.tlsAssessment.hsts}`);
    console.log(`Mixed Content: ${report.tlsAssessment.mixedContent}`);
    console.log('');
    
    // API Assessment Details
    console.log('🌐 API Security Assessment Details');
    console.log('==================================');
    report.apiAssessments.forEach((api: any, index: number) => {
      console.log(`${index + 1}. ${api.endpoint}`);
      console.log(`   Method: ${api.method}`);
      console.log(`   HTTPS Enforced: ${api.httpsEnforced}`);
      console.log(`   Authentication Required: ${api.authenticationRequired}`);
      console.log(`   Risk Level: ${api.riskLevel}`);
      console.log('');
    });
  }

  private async displayRecommendations(config: any): Promise<void> {
    console.log('💡 Security Recommendations');
    console.log('===========================');
    
    const recommendations = await this.checker.getSecurityRecommendations(config);
    
    if (recommendations.immediate.length > 0) {
      console.log('🚨 IMMEDIATE ACTION REQUIRED:');
      recommendations.immediate.forEach(rec => console.log(`  - ${rec}`));
      console.log('');
    }
    
    if (recommendations.important.length > 0) {
      console.log('⚠️  IMPORTANT:');
      recommendations.important.forEach(rec => console.log(`  - ${rec}`));
      console.log('');
    }
    
    if (recommendations.general.length > 0) {
      console.log('📋 GENERAL IMPROVEMENTS:');
      recommendations.general.forEach(rec => console.log(`  - ${rec}`));
      console.log('');
    }
  }

  private async exportReport(report: any, options: CLIOptions): Promise<void> {
    const format = options.format || 'json';
    const outputPath = options.output!;
    
    console.log(`📄 Exporting report to ${outputPath} (${format} format)...`);
    
    // Ensure output directory exists
    const outputDir = join(process.cwd(), 'security-reports');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    const fullPath = join(outputDir, outputPath);
    const reportContent = await this.checker.exportSecurityReport(report, format);
    
    writeFileSync(fullPath, reportContent, 'utf8');
    console.log(`✅ Report exported to: ${fullPath}`);
    console.log('');
  }

  private getConfiguration(options: CLIOptions): any {
    // Try to get from command line options first
    if (options.url && options.key) {
      return {
        supabaseUrl: options.url,
        supabaseKey: options.key
      };
    }
    
    // Try to get from environment variables
    const envUrl = process.env.VITE_SUPABASE_URL;
    const envKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (envUrl && envKey) {
      return {
        supabaseUrl: envUrl,
        supabaseKey: envKey
      };
    }
    
    // Use default/placeholder values with warning
    console.warn('⚠️  Warning: Using placeholder configuration. Set environment variables or use --url and --key options.');
    return {
      supabaseUrl: 'https://your-project-url.supabase.co',
      supabaseKey: 'your-project-anon-key'
    };
  }
}

// CLI argument parsing
function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--url':
        options.url = args[++i];
        break;
      case '--key':
        options.key = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--format':
        const format = args[++i] as 'json' | 'markdown' | 'csv';
        if (['json', 'markdown', 'csv'].includes(format)) {
          options.format = format;
        } else {
          console.error('Invalid format. Use: json, markdown, or csv');
          process.exit(1);
        }
        break;
      case '--quick':
        options.quick = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        displayHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }
  
  return options;
}

function displayHelp(): void {
  console.log(`
Todo2 Data Transmission Security Analysis Tool

Usage: npm run security:transmission [options]

Options:
  --url <url>           Supabase URL to analyze
  --key <key>           Supabase API key
  --output <filename>   Export report to file
  --format <format>     Export format (json, markdown, csv)
  --quick              Run quick TLS check only
  --verbose            Show detailed output
  --help               Show this help message

Examples:
  npm run security:transmission --quick
  npm run security:transmission --verbose --output transmission-report.md --format markdown
  npm run security:transmission --url https://your-project.supabase.co --key your-key

Environment Variables:
  VITE_SUPABASE_URL     Supabase project URL
  VITE_SUPABASE_ANON_KEY Supabase anonymous key
`);
}

// Main execution
if (require.main === module) {
  const options = parseArguments();
  const cli = new TransmissionAnalysisCLI();
  cli.run(options).catch(console.error);
}

export { TransmissionAnalysisCLI };