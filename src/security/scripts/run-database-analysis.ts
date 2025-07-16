#!/usr/bin/env node

/**
 * Database Security Analysis Runner
 * 
 * This script runs a comprehensive database security analysis and generates a report.
 */

// Set up environment for Node.js execution
if (typeof global !== 'undefined') {
  (global as any).import = {
    meta: {
      env: {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
      }
    }
  };
}

import { analyzeDatabaseSecurity, generateDatabaseSecurityReport } from '../data-storage-security-analyzer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function runDatabaseSecurityAnalysis() {
  console.log('🔍 Starting Database Security Analysis...');
  console.log('=====================================');

  try {
    // Run the analysis
    const analysis = await analyzeDatabaseSecurity();
    
    // Display summary
    console.log('\n📊 Analysis Summary:');
    console.log(`Overall Risk Level: ${analysis.summary.overallRisk.toUpperCase()}`);
    console.log(`Critical Findings: ${analysis.summary.criticalCount}`);
    console.log(`High Findings: ${analysis.summary.highCount}`);
    console.log(`Medium Findings: ${analysis.summary.mediumCount}`);
    console.log(`Low Findings: ${analysis.summary.lowCount}`);
    console.log(`Info Findings: ${analysis.summary.infoCount}`);
    console.log(`Total Findings: ${analysis.findings.length}`);

    // Display RLS analysis
    console.log('\n🛡️ Row Level Security Analysis:');
    console.log(`Tables with RLS: ${analysis.rlsAnalysis.tablesWithRLS.join(', ') || 'None'}`);
    console.log(`Tables without RLS: ${analysis.rlsAnalysis.tablesWithoutRLS.join(', ') || 'None'}`);
    console.log(`Total RLS Policies: ${analysis.rlsAnalysis.policyCount}`);

    // Display SQL injection analysis
    console.log('\n💉 SQL Injection Protection:');
    console.log(`Parameterized Queries: ${analysis.sqlInjectionAnalysis.parameterizedQueries ? 'Yes' : 'No'}`);
    console.log(`Raw Query Usage: ${analysis.sqlInjectionAnalysis.rawQueryUsage.length} instances`);
    console.log(`Input Validation: ${analysis.sqlInjectionAnalysis.inputValidation ? 'Yes' : 'No'}`);

    // Display permissions analysis
    console.log('\n🔐 Permissions Analysis:');
    console.log(`Principle of Least Privilege: ${analysis.permissionsAnalysis.principleOfLeastPrivilege ? 'Applied' : 'Not Applied'}`);
    console.log(`Anonymous Access Tables: ${analysis.permissionsAnalysis.anonymousAccess.length}`);
    console.log(`Authenticated Access Tables: ${analysis.permissionsAnalysis.authenticatedAccess.length}`);

    // Display data integrity analysis
    console.log('\n🔗 Data Integrity Analysis:');
    console.log(`Foreign Key Constraints: ${analysis.dataIntegrityAnalysis.foreignKeyConstraints.length}`);
    console.log(`Check Constraints: ${analysis.dataIntegrityAnalysis.checkConstraints.length}`);
    console.log(`NOT NULL Constraints: ${analysis.dataIntegrityAnalysis.notNullConstraints.length}`);

    // Display critical and high severity findings
    const criticalFindings = analysis.findings.filter(f => f.severity === 'critical');
    const highFindings = analysis.findings.filter(f => f.severity === 'high');

    if (criticalFindings.length > 0) {
      console.log('\n🚨 CRITICAL Findings:');
      criticalFindings.forEach(finding => {
        console.log(`  • ${finding.title}`);
        console.log(`    Location: ${finding.location}`);
        console.log(`    CWE: ${finding.cweId || 'N/A'}`);
        if (finding.cvssScore) {
          console.log(`    CVSS Score: ${finding.cvssScore}`);
        }
        console.log(`    Recommendation: ${finding.recommendation}`);
        console.log('');
      });
    }

    if (highFindings.length > 0) {
      console.log('\n⚠️ HIGH Severity Findings:');
      highFindings.forEach(finding => {
        console.log(`  • ${finding.title}`);
        console.log(`    Location: ${finding.location}`);
        console.log(`    CWE: ${finding.cweId || 'N/A'}`);
        console.log(`    Recommendation: ${finding.recommendation}`);
        console.log('');
      });
    }

    // Generate and save detailed report
    console.log('\n📄 Generating detailed report...');
    const report = await generateDatabaseSecurityReport();
    
    // Ensure security-reports directory exists
    const reportsDir = join(process.cwd(), 'security-reports');
    try {
      mkdirSync(reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Save report
    const reportPath = join(reportsDir, 'database-security-analysis.md');
    writeFileSync(reportPath, report, 'utf8');
    
    console.log(`✅ Detailed report saved to: ${reportPath}`);

    // Save JSON analysis data
    const jsonPath = join(reportsDir, 'database-security-analysis.json');
    writeFileSync(jsonPath, JSON.stringify(analysis, null, 2), 'utf8');
    
    console.log(`📊 Analysis data saved to: ${jsonPath}`);

    // Exit with appropriate code
    if (analysis.summary.criticalCount > 0) {
      console.log('\n❌ Analysis completed with CRITICAL findings. Immediate action required!');
      process.exit(1);
    } else if (analysis.summary.highCount > 0) {
      console.log('\n⚠️ Analysis completed with HIGH severity findings. Action recommended.');
      process.exit(0);
    } else {
      console.log('\n✅ Database security analysis completed successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Database security analysis failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the analysis if this script is executed directly
if (require.main === module) {
  runDatabaseSecurityAnalysis();
}

export { runDatabaseSecurityAnalysis };