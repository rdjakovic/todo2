/**
 * User Data Isolation Analysis Script
 * 
 * Script to run comprehensive user data isolation and access control analysis
 * on the Todo2 application, including RLS policy analysis, data segregation testing,
 * and data retention assessment.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { UserDataIsolationChecker, runQuickUserDataCheck } from '../user-data-isolation-checker';

interface AnalysisOptions {
  quick?: boolean;
  runTests?: boolean;
  includeRetention?: boolean;
  outputFormat?: 'json' | 'markdown' | 'csv';
  outputFile?: string;
  verbose?: boolean;
}

class UserDataIsolationAnalysisScript {
  private checker: UserDataIsolationChecker;
  private options: AnalysisOptions;

  constructor(options: AnalysisOptions = {}) {
    this.checker = new UserDataIsolationChecker();
    this.options = {
      quick: false,
      runTests: false,
      includeRetention: true,
      outputFormat: 'markdown',
      verbose: false,
      ...options
    };
  }

  /**
   * Runs the user data isolation analysis
   */
  async runAnalysis(): Promise<void> {
    try {
      console.log('🔍 Starting User Data Isolation Analysis...\n');

      // Load migration files
      const migrationFiles = await this.loadMigrationFiles();
      console.log(`📁 Loaded ${migrationFiles.length} migration files`);

      // Load code files
      const codeFiles = await this.loadCodeFiles();
      console.log(`📁 Loaded ${codeFiles.length} code files`);

      if (this.options.quick) {
        await this.runQuickAnalysis(migrationFiles, codeFiles);
      } else {
        await this.runComprehensiveAnalysis(migrationFiles, codeFiles);
      }

      console.log('\n✅ Analysis completed successfully!');
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  }

  /**
   * Runs quick analysis
   */
  private async runQuickAnalysis(migrationFiles: string[], codeFiles: { path: string; content: string }[]): Promise<void> {
    console.log('\n🚀 Running Quick User Data Isolation Check...\n');

    const result = await runQuickUserDataCheck(migrationFiles, codeFiles);

    console.log('📊 Quick Analysis Results:');
    console.log(`   Security Status: ${result.secure ? '✅ SECURE' : '⚠️  NEEDS ATTENTION'}`);
    console.log(`   Critical Issues: ${result.criticalIssues}`);
    console.log(`   Compliance Score: ${result.complianceScore}/100`);
    console.log(`   Summary: ${result.summary}`);

    // Additional quick checks
    const rlsValidation = await this.checker.validateRLSPolicies(migrationFiles);
    console.log('\n🛡️  RLS Policy Validation:');
    console.log(`   All Tables Protected: ${rlsValidation.allTablesProtected ? '✅ YES' : '❌ NO'}`);
    console.log(`   Weak Policies: ${rlsValidation.weakPolicies.length}`);
    console.log(`   Missing Policies: ${rlsValidation.missingPolicies.length}`);

    if (this.options.includeRetention) {
      const retentionCheck = await this.checker.checkDataRetentionCompliance(codeFiles);
      console.log('\n📋 Data Retention Compliance:');
      console.log(`   Compliant: ${retentionCheck.compliant ? '✅ YES' : '❌ NO'}`);
      console.log(`   Compliance Score: ${retentionCheck.complianceScore}%`);
      console.log(`   User Deletion: ${retentionCheck.hasUserDeletion ? '✅ YES' : '❌ NO'}`);
      console.log(`   Data Export: ${retentionCheck.hasDataExport ? '✅ YES' : '❌ NO'}`);
    }

    // Save quick results if output file specified
    if (this.options.outputFile) {
      const quickReport = {
        timestamp: new Date().toISOString(),
        analysisType: 'quick',
        results: {
          security: result,
          rlsValidation,
          retentionCheck: this.options.includeRetention ? 
            await this.checker.checkDataRetentionCompliance(codeFiles) : undefined
        }
      };

      await this.saveReport(quickReport, this.options.outputFile);
    }
  }

  /**
   * Runs comprehensive analysis
   */
  private async runComprehensiveAnalysis(migrationFiles: string[], codeFiles: { path: string; content: string }[]): Promise<void> {
    console.log('\n🔬 Running Comprehensive User Data Isolation Analysis...\n');

    const config = {
      migrationFiles,
      codeFiles,
      runTests: this.options.runTests || false,
      includeRetentionAnalysis: this.options.includeRetention || true
    };

    const report = await this.checker.runComprehensiveAnalysis(config);

    // Display results
    console.log('📊 Comprehensive Analysis Results:');
    console.log(`   Overall Security Score: ${report.overallSecurityScore}/100`);
    console.log(`   Critical Findings: ${report.criticalFindings}`);
    console.log(`   GDPR Compliant: ${report.complianceStatus.gdpr ? '✅ YES' : '❌ NO'}`);
    console.log(`   CCPA Compliant: ${report.complianceStatus.ccpa ? '✅ YES' : '❌ NO'}`);
    console.log(`   SOC 2 Compliant: ${report.complianceStatus.soc2 ? '✅ YES' : '❌ NO'}`);
    console.log(`   Overall Compliant: ${report.complianceStatus.overallCompliant ? '✅ YES' : '❌ NO'}`);

    console.log('\n🛡️  RLS Policy Assessment:');
    report.isolationAnalysis.rlsPolicyAssessments.forEach(policy => {
      const status = policy.securityLevel === 'SECURE' ? '✅' : 
                    policy.securityLevel === 'WEAK' ? '⚠️' : '❌';
      console.log(`   ${status} ${policy.tableName}.${policy.policyName} - ${policy.securityLevel}`);
    });

    if (report.segregationTests) {
      console.log('\n🧪 Data Segregation Tests:');
      console.log(`   Overall Result: ${report.segregationTests.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Critical Failures: ${report.segregationTests.criticalFailures}`);
      console.log(`   High Failures: ${report.segregationTests.highFailures}`);
    }

    if (report.retentionAnalysis) {
      console.log('\n📋 Data Retention Analysis:');
      console.log(`   Compliance Score: ${report.retentionAnalysis.overallComplianceScore}%`);
      console.log(`   Critical Findings: ${report.retentionAnalysis.criticalFindings.length}`);
    }

    console.log('\n🚨 Immediate Actions Required:');
    if (report.recommendations.immediate.length === 0) {
      console.log('   ✅ No immediate actions required');
    } else {
      report.recommendations.immediate.slice(0, 5).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('\n📝 Summary:');
    console.log(report.summary.split('\n').map(line => `   ${line}`).join('\n'));

    // Save comprehensive report
    if (this.options.outputFile) {
      await this.saveReport(report, this.options.outputFile);
    }
  }

  /**
   * Loads database migration files
   */
  private async loadMigrationFiles(): Promise<string[]> {
    const migrationFiles: string[] = [];
    const migrationDir = join(process.cwd(), 'supabase', 'migrations');

    if (!existsSync(migrationDir)) {
      console.warn('⚠️  Migration directory not found. RLS analysis will be limited.');
      return migrationFiles;
    }

    try {
      const fs = await import('fs');
      const files = fs.readdirSync(migrationDir);
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filePath = join(migrationDir, file);
          const content = readFileSync(filePath, 'utf-8');
          migrationFiles.push(content);
          
          if (this.options.verbose) {
            console.log(`   📄 Loaded migration: ${file}`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Failed to load migration files:', error);
    }

    return migrationFiles;
  }

  /**
   * Loads application code files
   */
  private async loadCodeFiles(): Promise<{ path: string; content: string }[]> {
    const codeFiles: { path: string; content: string }[] = [];
    
    // Define files to analyze
    const filesToAnalyze = [
      'src/store/todoStore.ts',
      'src/store/authStore.ts',
      'src/lib/supabase.ts',
      'src/lib/indexedDB.ts',
      'src/components/TodoItem.tsx',
      'src/components/LoginForm.tsx'
    ];

    for (const filePath of filesToAnalyze) {
      const fullPath = join(process.cwd(), filePath);
      
      if (existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          codeFiles.push({ path: filePath, content });
          
          if (this.options.verbose) {
            console.log(`   📄 Loaded code file: ${filePath}`);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to load ${filePath}:`, error);
        }
      } else {
        console.warn(`⚠️  File not found: ${filePath}`);
      }
    }

    return codeFiles;
  }

  /**
   * Saves analysis report to file
   */
  private async saveReport(report: any, outputFile: string): Promise<void> {
    try {
      let content: string;
      const format = this.options.outputFormat || 'markdown';

      if (format === 'json') {
        content = JSON.stringify(report, null, 2);
      } else if (format === 'csv' && typeof report === 'object' && 'isolationAnalysis' in report) {
        content = await this.checker.exportReport(report, 'csv');
      } else if (format === 'markdown' && typeof report === 'object' && 'isolationAnalysis' in report) {
        content = await this.checker.exportReport(report, 'markdown');
      } else {
        // Fallback to JSON for quick reports
        content = JSON.stringify(report, null, 2);
      }

      writeFileSync(outputFile, content, 'utf-8');
      console.log(`💾 Report saved to: ${outputFile}`);
    } catch (error) {
      console.error('❌ Failed to save report:', error);
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: AnalysisOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--quick':
        options.quick = true;
        break;
      case '--run-tests':
        options.runTests = true;
        break;
      case '--no-retention':
        options.includeRetention = false;
        break;
      case '--format':
        options.outputFormat = args[++i] as 'json' | 'markdown' | 'csv';
        break;
      case '--output':
        options.outputFile = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.warn(`⚠️  Unknown option: ${arg}`);
        }
        break;
    }
  }

  // Set default output file if not specified
  if (!options.outputFile) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const analysisType = options.quick ? 'quick' : 'comprehensive';
    const format = options.outputFormat || 'markdown';
    options.outputFile = `security-reports/user-data-isolation-${analysisType}-${timestamp}.${format}`;
  }

  const script = new UserDataIsolationAnalysisScript(options);
  await script.runAnalysis();
}

/**
 * Prints help information
 */
function printHelp(): void {
  console.log(`
🔍 User Data Isolation Analysis Script

Usage: npm run security:user-data-isolation [options]

Options:
  --quick              Run quick analysis only (faster, less comprehensive)
  --run-tests          Include data segregation tests (requires test environment)
  --no-retention       Skip data retention analysis
  --format <format>    Output format: json, markdown, csv (default: markdown)
  --output <file>      Output file path (default: auto-generated)
  --verbose            Enable verbose logging
  --help               Show this help message

Examples:
  npm run security:user-data-isolation --quick
  npm run security:user-data-isolation --run-tests --format json
  npm run security:user-data-isolation --output my-report.md --verbose
  `);
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

export { UserDataIsolationAnalysisScript, main as runUserDataIsolationAnalysis };