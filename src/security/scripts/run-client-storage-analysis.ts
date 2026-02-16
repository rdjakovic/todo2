#!/usr/bin/env node

/**
 * Client-Side Storage Security Analysis Runner
 * 
 * This script runs a comprehensive security analysis of client-side storage mechanisms
 * including IndexedDB, localStorage, sessionStorage, and data lifecycle management.
 */

import { ClientStorageSecurityAnalyzer } from '../client-storage-security-analyzer';
import { ClientStorageSecurityReportGenerator } from '../client-storage-security-report-generator';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function runClientStorageSecurityAnalysis(): Promise<void> {
  console.log('🔍 Client-Side Storage Security Analysis');
  console.log('=' .repeat(50));
  console.log('');

  try {
    // Initialize analyzer with full configuration
    const analyzer = new ClientStorageSecurityAnalyzer({
      checkIndexedDB: true,
      checkLocalStorage: true,
      checkSessionStorage: true,
      checkDataLifecycle: true,
      checkStorageQuotas: true
    });

    console.log('📊 Running comprehensive storage security analysis...');
    const assessment = await analyzer.analyzeClientStorageSecurity();

    console.log('');
    console.log('📋 Analysis Summary:');
    console.log(`   Total Findings: ${assessment.findings.length}`);
    console.log(`   Risk Score: ${assessment.riskScore}/100`);
    console.log(`   Overall Severity: ${assessment.severity}`);
    console.log(`   Status: ${assessment.status}`);
    console.log('');

    // Display findings by severity
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    severityOrder.forEach(severity => {
      const findings = assessment.findings.filter(f => f.severity === severity);
      if (findings.length > 0) {
        console.log(`🔴 ${severity} Findings (${findings.length}):`);
        findings.forEach(finding => {
          console.log(`   • ${finding.title}`);
          console.log(`     ${finding.description}`);
          console.log(`     Location: ${finding.location}`);
          if (finding.evidence && finding.evidence.length > 0) {
            console.log(`     Evidence: ${finding.evidence.join(', ')}`);
          }
          console.log('');
        });
      }
    });

    // Run protection tests
    console.log('🔒 Running storage protection tests...');
    const protectionTest = await analyzer.testStorageProtection();

    console.log('');
    console.log('🛡️  Storage Protection Test Results:');
    console.log(`   IndexedDB Protection: ${protectionTest.indexedDBProtection ? '✅ Protected' : '❌ Vulnerable'}`);
    console.log(`   localStorage Protection: ${protectionTest.localStorageProtection ? '✅ Protected' : '❌ Vulnerable'}`);
    console.log(`   sessionStorage Protection: ${protectionTest.sessionStorageProtection ? '✅ Protected' : '❌ Vulnerable'}`);
    console.log(`   Data Encryption Score: ${protectionTest.dataEncryptionScore}%`);
    console.log('');

    if (protectionTest.vulnerabilities.length > 0) {
      console.log('⚠️  Identified Vulnerabilities:');
      protectionTest.vulnerabilities.forEach(vuln => {
        console.log(`   • ${vuln}`);
      });
      console.log('');
    }

    if (protectionTest.recommendations.length > 0) {
      console.log('💡 Security Recommendations:');
      protectionTest.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      console.log('');
    }

    // Get detailed storage analysis
    console.log('📊 Getting detailed storage analysis...');
    const storageAnalysis = await analyzer.getStorageAnalysis();

    console.log('');
    console.log('💾 Storage Analysis Details:');
    
    // IndexedDB Analysis
    console.log('   IndexedDB:');
    console.log(`     Has Data: ${storageAnalysis.indexedDB.hasData}`);
    console.log(`     Is Encrypted: ${storageAnalysis.indexedDB.isEncrypted}`);
    console.log(`     Sensitive Data Exposed: ${storageAnalysis.indexedDB.sensitiveDataExposed.length} types`);
    if (storageAnalysis.indexedDB.sensitiveDataExposed.length > 0) {
      console.log(`     Types: ${storageAnalysis.indexedDB.sensitiveDataExposed.join(', ')}`);
    }
    console.log(`     Data Types: ${storageAnalysis.indexedDB.dataTypes.length}`);
    console.log(`     Has Proper Cleanup: ${storageAnalysis.indexedDB.hasProperCleanup}`);
    console.log('');

    // localStorage Analysis
    console.log('   localStorage:');
    console.log(`     Has Data: ${storageAnalysis.localStorage.hasData}`);
    console.log(`     Sensitive Data Exposed: ${storageAnalysis.localStorage.sensitiveDataExposed.length} keys`);
    if (storageAnalysis.localStorage.sensitiveDataExposed.length > 0) {
      console.log(`     Sensitive Keys: ${storageAnalysis.localStorage.sensitiveDataExposed.join(', ')}`);
    }
    console.log(`     Data Types: ${storageAnalysis.localStorage.dataTypes.length}`);
    console.log(`     Storage Size: ${storageAnalysis.localStorage.storageSize} characters`);
    console.log(`     Has Proper Cleanup: ${storageAnalysis.localStorage.hasProperCleanup}`);
    console.log('');

    // sessionStorage Analysis
    console.log('   sessionStorage:');
    console.log(`     Has Data: ${storageAnalysis.sessionStorage.hasData}`);
    console.log(`     Sensitive Data Exposed: ${storageAnalysis.sessionStorage.sensitiveDataExposed.length} keys`);
    if (storageAnalysis.sessionStorage.sensitiveDataExposed.length > 0) {
      console.log(`     Sensitive Keys: ${storageAnalysis.sessionStorage.sensitiveDataExposed.join(', ')}`);
    }
    console.log(`     Data Types: ${storageAnalysis.sessionStorage.dataTypes.length}`);
    console.log(`     Storage Size: ${storageAnalysis.sessionStorage.storageSize} characters`);
    console.log('');

    // Data Lifecycle Analysis
    console.log('   Data Lifecycle:');
    console.log(`     Has Cleanup Mechanisms: ${storageAnalysis.dataLifecycle.hasCleanupMechanisms}`);
    console.log(`     Cleanup Triggers: ${storageAnalysis.dataLifecycle.cleanupTriggers.join(', ')}`);
    console.log(`     Retention Policies: ${storageAnalysis.dataLifecycle.dataRetentionPolicies.length}`);
    console.log('');

    // Storage Quotas Analysis
    console.log('   Storage Quotas:');
    console.log(`     IndexedDB Quota: ${(storageAnalysis.storageQuotas.indexedDBQuota / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`     Usage Percentage: ${storageAnalysis.storageQuotas.usagePercentage.toFixed(2)}%`);
    console.log(`     Quota Exceeded Handling: ${storageAnalysis.storageQuotas.quotaExceededHandling}`);
    console.log('');

    // Summary and next steps
    console.log('📝 Analysis Summary:');
    console.log(assessment.summary);
    console.log('');

    if (assessment.recommendations.length > 0) {
      console.log('🎯 Key Recommendations:');
      assessment.recommendations.slice(0, 5).forEach(rec => {
        console.log(`   • ${rec}`);
      });
      console.log('');
    }

    // Generate comprehensive report
    console.log('📄 Generating comprehensive security report...');
    const reportGenerator = new ClientStorageSecurityReportGenerator(analyzer);
    const markdownReport = await reportGenerator.generateMarkdownReport();

    // Save report to file
    const reportPath = join(process.cwd(), 'security-reports', 'client-storage-security-analysis.md');
    try {
      writeFileSync(reportPath, markdownReport, 'utf8');
      console.log(`📋 Detailed report saved to: ${reportPath}`);
    } catch (writeError) {
      console.warn('⚠️  Could not save report to file, but analysis completed successfully');
      console.warn(`   Report path: ${reportPath}`);
      console.warn(`   Error: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
    }

    console.log('');
    console.log('✅ Client-side storage security analysis completed successfully!');
    console.log('');
    console.log('📄 For detailed findings and remediation steps, review the analysis results above.');
    console.log('🔧 Consider implementing the recommended security improvements.');
    console.log('📋 A comprehensive report has been generated with detailed technical analysis.');

  } catch (error) {
    console.error('❌ Error during client-side storage security analysis:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    console.error('');
    console.error('🔧 Troubleshooting steps:');
    console.error('   • Check browser compatibility');
    console.error('   • Verify storage API availability');
    console.error('   • Review application initialization');
    console.error('   • Check for storage access permissions');
    
    process.exit(1);
  }
}

// Run the analysis
runClientStorageSecurityAnalysis().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { runClientStorageSecurityAnalysis };