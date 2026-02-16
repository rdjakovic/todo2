/**
 * Test script to demonstrate Supabase Security Analyzer functionality
 * This can be run to see the analyzer in action
 */

import { analyzeSupabaseAuthSecurity, generateSupabaseSecurityReport } from './supabaseSecurityAnalyzer';

export async function testSupabaseSecurityAnalyzer(): Promise<void> {
  console.log('🔍 Testing Supabase Authentication Security Analyzer');
  console.log('=' .repeat(60));
  console.log('');

  try {
    // Run the security analysis
    console.log('📊 Running security analysis...');
    const analysis = await analyzeSupabaseAuthSecurity();
    
    // Display summary
    console.log('');
    console.log('📋 Analysis Summary:');
    console.log(`   Timestamp: ${analysis.timestamp.toISOString()}`);
    console.log(`   Overall Risk: ${analysis.summary.overallRisk.toUpperCase()}`);
    console.log(`   Total Findings: ${analysis.findings.length}`);
    console.log('');
    
    console.log('🔢 Findings by Severity:');
    console.log(`   Critical: ${analysis.summary.criticalCount}`);
    console.log(`   High: ${analysis.summary.highCount}`);
    console.log(`   Medium: ${analysis.summary.mediumCount}`);
    console.log(`   Low: ${analysis.summary.lowCount}`);
    console.log(`   Info: ${analysis.summary.infoCount}`);
    console.log('');

    // Display configuration analysis
    console.log('⚙️  Configuration Analysis:');
    console.log(`   Supabase URL Valid: ${analysis.configuration.hasValidUrl}`);
    console.log(`   Anonymous Key Present: ${analysis.configuration.hasAnonKey}`);
    console.log(`   Session Persistence: ${analysis.configuration.persistSession}`);
    console.log(`   Auto Token Refresh: ${analysis.configuration.autoRefreshToken}`);
    console.log('');

    // Display token analysis
    console.log('🔐 Token Analysis:');
    console.log(`   Valid Session: ${analysis.tokenAnalysis.hasValidSession}`);
    console.log(`   JWT Structure Valid: ${analysis.tokenAnalysis.jwtStructureValid}`);
    console.log(`   Refresh Token Present: ${analysis.tokenAnalysis.refreshTokenPresent}`);
    if (analysis.tokenAnalysis.tokenExpiry) {
      const now = Math.floor(Date.now() / 1000);
      const timeToExpiry = analysis.tokenAnalysis.tokenExpiry - now;
      console.log(`   Token Expires In: ${timeToExpiry} seconds`);
    }
    console.log('');

    // Display state management analysis
    console.log('🔄 State Management Analysis:');
    console.log(`   Auth State Listener: ${analysis.stateManagement.authStateListenerActive}`);
    console.log(`   User Persistence: ${analysis.stateManagement.userPersistence}`);
    console.log(`   Session Recovery: ${analysis.stateManagement.sessionRecovery}`);
    console.log(`   Error Handling Patterns: ${analysis.stateManagement.errorHandling.length}`);
    console.log('');

    // Display critical and high findings
    const criticalFindings = analysis.findings.filter(f => f.severity === 'critical');
    const highFindings = analysis.findings.filter(f => f.severity === 'high');
    
    if (criticalFindings.length > 0) {
      console.log('🚨 CRITICAL FINDINGS:');
      criticalFindings.forEach((finding, index) => {
        console.log(`   ${index + 1}. ${finding.title}`);
        console.log(`      Location: ${finding.location}`);
        console.log(`      Description: ${finding.description}`);
        console.log(`      Recommendation: ${finding.recommendation}`);
        if (finding.evidence && finding.evidence.length > 0) {
          console.log(`      Evidence: ${finding.evidence.join(', ')}`);
        }
        console.log('');
      });
    }
    
    if (highFindings.length > 0) {
      console.log('⚠️  HIGH PRIORITY FINDINGS:');
      highFindings.forEach((finding, index) => {
        console.log(`   ${index + 1}. ${finding.title}`);
        console.log(`      Location: ${finding.location}`);
        console.log(`      Description: ${finding.description}`);
        console.log(`      Recommendation: ${finding.recommendation}`);
        if (finding.evidence && finding.evidence.length > 0) {
          console.log(`      Evidence: ${finding.evidence.join(', ')}`);
        }
        console.log('');
      });
    }

    // Display all findings summary
    if (analysis.findings.length > 0) {
      console.log('📝 All Findings Summary:');
      analysis.findings.forEach((finding) => {
        const severityIcon = {
          critical: '🚨',
          high: '⚠️',
          medium: '⚡',
          low: '💡',
          info: 'ℹ️'
        }[finding.severity];
        
        console.log(`   ${severityIcon} ${finding.id}: ${finding.title} (${finding.severity.toUpperCase()})`);
        console.log(`      Category: ${finding.category}`);
        console.log(`      Location: ${finding.location}`);
        if (finding.cweId) {
          console.log(`      CWE: ${finding.cweId}`);
        }
        console.log('');
      });
    }

    // Generate and display report sample
    console.log('📄 Generating detailed report...');
    const report = await generateSupabaseSecurityReport();
    
    console.log('');
    console.log('📊 Report Preview (first 500 characters):');
    console.log('-'.repeat(60));
    console.log(report.substring(0, 500) + '...');
    console.log('-'.repeat(60));
    console.log('');

    console.log('✅ Security analysis completed successfully!');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Review critical and high priority findings');
    console.log('   2. Implement recommended security measures');
    console.log('   3. Run analysis regularly to monitor security posture');
    console.log('   4. Save the full report for documentation');
    
  } catch (error) {
    console.error('❌ Error running security analysis:', error);
    throw error;
  }
}

// Allow direct execution
if (require.main === module) {
  testSupabaseSecurityAnalyzer().catch(console.error);
}