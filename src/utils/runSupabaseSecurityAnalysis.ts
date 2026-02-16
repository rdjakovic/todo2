/**
 * Script to run Supabase authentication security analysis
 * This can be executed to generate security reports
 */

import { analyzeSupabaseAuthSecurity, generateSupabaseSecurityReport } from './supabaseSecurityAnalyzer';
import { writeFileSync } from 'fs';
import { join } from 'path';

export async function runSupabaseSecurityAnalysis(): Promise<void> {
  try {
    console.log('🔍 Starting Supabase Authentication Security Analysis...');
    console.log('');

    // Run the analysis
    const analysis = await analyzeSupabaseAuthSecurity();
    
    // Generate the report
    const report = await generateSupabaseSecurityReport();
    
    // Display summary in console
    console.log('📊 Analysis Summary:');
    console.log(`   Overall Risk: ${analysis.summary.overallRisk.toUpperCase()}`);
    console.log(`   Critical: ${analysis.summary.criticalCount}`);
    console.log(`   High: ${analysis.summary.highCount}`);
    console.log(`   Medium: ${analysis.summary.mediumCount}`);
    console.log(`   Low: ${analysis.summary.lowCount}`);
    console.log(`   Info: ${analysis.summary.infoCount}`);
    console.log('');

    // Save report to file
    const reportPath = join(process.cwd(), 'security-reports', 'supabase-auth-security-analysis.md');
    
    try {
      writeFileSync(reportPath, report, 'utf8');
      console.log(`📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.warn('⚠️  Could not save report to file, displaying in console instead:');
      console.log('');
      console.log(report);
    }

    // Display critical and high findings immediately
    const criticalFindings = analysis.findings.filter(f => f.severity === 'critical');
    const highFindings = analysis.findings.filter(f => f.severity === 'high');
    
    if (criticalFindings.length > 0) {
      console.log('🚨 CRITICAL FINDINGS - Immediate Action Required:');
      criticalFindings.forEach(finding => {
        console.log(`   • ${finding.title}`);
        console.log(`     ${finding.description}`);
        console.log(`     Recommendation: ${finding.recommendation}`);
        console.log('');
      });
    }
    
    if (highFindings.length > 0) {
      console.log('⚠️  HIGH PRIORITY FINDINGS:');
      highFindings.forEach(finding => {
        console.log(`   • ${finding.title}`);
        console.log(`     ${finding.description}`);
        console.log(`     Recommendation: ${finding.recommendation}`);
        console.log('');
      });
    }

    console.log('✅ Supabase Authentication Security Analysis Complete');
    
  } catch (error) {
    console.error('❌ Error running security analysis:', error);
    throw error;
  }
}

// Allow direct execution
if (require.main === module) {
  runSupabaseSecurityAnalysis().catch(console.error);
}