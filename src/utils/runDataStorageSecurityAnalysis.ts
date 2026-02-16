/**
 * Utility script to run data storage security analysis
 * This script can be used to perform comprehensive data storage security assessment
 */

import { DataStorageSecurityAnalyzer } from './dataStorageSecurityAnalyzer';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Run comprehensive data storage security analysis
 */
export async function runDataStorageSecurityAnalysis(): Promise<void> {
  console.log('🔍 Starting Data Storage Security Analysis...\n');

  try {
    // Initialize analyzer with full configuration
    const analyzer = new DataStorageSecurityAnalyzer({
      checkIndexedDB: true,
      checkSupabaseConfig: true,
      checkDataEncryption: true,
      checkDataRetention: true
    });

    // Perform security analysis
    console.log('📊 Analyzing data storage security...');
    const assessment = await analyzer.analyzeDataStorageSecurity();

    // Test data-at-rest protection
    console.log('🔒 Testing data-at-rest protection...');
    const protectionTest = await analyzer.testDataAtRestProtection();

    // Generate comprehensive report
    console.log('📝 Generating security report...');
    const report = analyzer.generateDataStorageReport();

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 DATA STORAGE SECURITY ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Assessment ID: ${assessment.id}`);
    console.log(`Analysis Date: ${assessment.lastAssessed.toISOString()}`);
    console.log(`Total Findings: ${assessment.findings.length}`);
    console.log(`Risk Score: ${assessment.riskScore}/100`);
    console.log(`\n${assessment.summary}\n`);

    // Display findings by severity
    const severityCounts = assessment.findings.reduce((counts, finding) => {
      counts[finding.severity] = (counts[finding.severity] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    console.log('📊 Findings by Severity:');
    Object.entries(severityCounts).forEach(([severity, count]) => {
      const emoji = getSeverityEmoji(severity);
      console.log(`   ${emoji} ${severity}: ${count}`);
    });

    // Display protection test results
    console.log('\n🔒 Data-at-Rest Protection Test Results:');
    console.log(`   IndexedDB Protection: ${protectionTest.indexedDBProtection ? '✅ Protected' : '❌ Vulnerable'}`);
    console.log(`   Supabase Protection: ${protectionTest.supabaseProtection ? '✅ Protected' : '❌ Vulnerable'}`);
    console.log(`   Encryption Effectiveness: ${protectionTest.encryptionEffectiveness}%`);
    
    if (protectionTest.vulnerabilities.length > 0) {
      console.log('\n⚠️  Identified Vulnerabilities:');
      protectionTest.vulnerabilities.forEach(vuln => {
        console.log(`   • ${vuln}`);
      });
    }

    // Display top priority findings
    const criticalFindings = assessment.findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
    if (criticalFindings.length > 0) {
      console.log('\n🚨 High Priority Findings:');
      criticalFindings.slice(0, 3).forEach((finding, index) => {
        console.log(`\n${index + 1}. ${finding.title} (${finding.severity})`);
        console.log(`   Location: ${finding.location.file || 'N/A'}`);
        console.log(`   Description: ${finding.description.substring(0, 100)}...`);
        console.log(`   Key Recommendation: ${finding.recommendations[0]}`);
      });
    }

    // Save detailed report to file
    const reportPath = join(process.cwd(), 'security-reports', 'data-storage-security-analysis.md');
    try {
      writeFileSync(reportPath, report, 'utf8');
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.log('\n📄 Detailed report:');
      console.log(report);
    }

    // Provide next steps
    console.log('\n' + '='.repeat(60));
    console.log('🎯 RECOMMENDED NEXT STEPS');
    console.log('='.repeat(60));
    
    if (assessment.riskScore > 50) {
      console.log('⚠️  HIGH RISK: Immediate action required');
      console.log('   1. Address critical and high severity findings first');
      console.log('   2. Implement client-side encryption for sensitive data');
      console.log('   3. Review and strengthen data isolation mechanisms');
    } else if (assessment.riskScore > 25) {
      console.log('⚡ MEDIUM RISK: Plan security improvements');
      console.log('   1. Prioritize medium severity findings');
      console.log('   2. Implement data retention policies');
      console.log('   3. Enhance data lifecycle management');
    } else {
      console.log('✅ LOW RISK: Maintain current security posture');
      console.log('   1. Address remaining low severity findings');
      console.log('   2. Implement regular security assessments');
      console.log('   3. Monitor for new security threats');
    }

    console.log('\n   4. Review the detailed report for specific implementation guidance');
    console.log('   5. Consider implementing automated security testing');
    console.log('   6. Schedule regular security assessments');

  } catch (error) {
    console.error('\n❌ Error during data storage security analysis:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    console.error('\nPlease check your configuration and try again.');
    process.exit(1);
  }
}

/**
 * Get emoji for severity level
 */
function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return '🔴';
    case 'HIGH': return '🟠';
    case 'MEDIUM': return '🟡';
    case 'LOW': return '🔵';
    case 'INFO': return '🟢';
    default: return '⚪';
  }
}

/**
 * Run analysis if this script is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runDataStorageSecurityAnalysis().catch(console.error);
}