/**
 * API Security Analysis Runner
 */

import { analyzeAPISecurity, generateAPISecurityReport } from '../api-security-analyzer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function runAPISecurityAnalysis() {
  console.log('🔍 Starting API Security Analysis...');
  console.log('====================================');

  try {
    // Run the analysis
    const analysis = await analyzeAPISecurity();
    
    // Display summary
    console.log('\n📊 Analysis Summary:');
    console.log(`Overall Risk Level: ${analysis.summary.overallRisk.toUpperCase()}`);
    console.log(`Critical Findings: ${analysis.summary.criticalCount}`);
    console.log(`High Findings: ${analysis.summary.highCount}`);
    console.log(`Medium Findings: ${analysis.summary.mediumCount}`);
    console.log(`Low Findings: ${analysis.summary.lowCount}`);
    console.log(`Info Findings: ${analysis.summary.infoCount}`);
    console.log(`Total Findings: ${analysis.findings.length}`);

    // Display authorization analysis
    console.log('\n🔐 Authorization Analysis:');
    console.log(`RLS Policies: ${analysis.authorizationAnalysis.rlsPoliciesImplemented ? 'Implemented' : 'Missing'}`);
    console.log(`User Data Isolation: ${analysis.authorizationAnalysis.userDataIsolation ? 'Yes' : 'No'}`);
    console.log(`Authentication Required: ${analysis.authorizationAnalysis.authenticationRequired ? 'Yes' : 'No'}`);
    console.log(`Bypass Vulnerabilities: ${analysis.authorizationAnalysis.bypassVulnerabilities.length}`);

    // Display data access analysis
    console.log('\n📊 Data Access Analysis:');
    console.log(`Parameterized Queries: ${analysis.dataAccessAnalysis.parameterizedQueries ? 'Yes' : 'No'}`);
    console.log(`User Filtering: ${analysis.dataAccessAnalysis.userFiltering ? 'Yes' : 'No'}`);
    console.log(`Cross-User Access Prevention: ${analysis.dataAccessAnalysis.crossUserAccessPrevention ? 'Yes' : 'No'}`);
    console.log(`Data Leakage Risks: ${analysis.dataAccessAnalysis.dataLeakageRisks.length}`);

    // Display error handling analysis
    console.log('\n⚠️ Error Handling Analysis:');
    console.log(`Information Disclosure: ${analysis.errorHandlingAnalysis.informationDisclosure ? 'Yes' : 'No'}`);
    console.log(`Consistent Error Handling: ${analysis.errorHandlingAnalysis.consistentErrorHandling ? 'Yes' : 'No'}`);

    // Display rate limiting analysis
    console.log('\n🚦 Rate Limiting Analysis:');
    console.log(`Implemented: ${analysis.rateLimitingAnalysis.implemented ? 'Yes' : 'No'}`);
    console.log(`Abuse Protection: ${analysis.rateLimitingAnalysis.abuseProtection ? 'Yes' : 'No'}`);

    // Display critical and high severity findings
    const criticalFindings = analysis.findings.filter(f => f.severity === 'critical');
    const highFindings = analysis.findings.filter(f => f.severity === 'high');
    const mediumFindings = analysis.findings.filter(f => f.severity === 'medium');

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

    if (mediumFindings.length > 0) {
      console.log('\n🔶 MEDIUM Severity Findings:');
      mediumFindings.forEach(finding => {
        console.log(`  • ${finding.title}`);
        console.log(`    Location: ${finding.location}`);
        console.log(`    CWE: ${finding.cweId || 'N/A'}`);
        console.log(`    Recommendation: ${finding.recommendation}`);
        console.log('');
      });
    }

    // Generate and save detailed report
    console.log('\n📄 Generating detailed report...');
    const report = await generateAPISecurityReport();
    
    // Ensure security-reports directory exists
    const reportsDir = join(process.cwd(), 'security-reports');
    try {
      mkdirSync(reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Save report
    const reportPath = join(reportsDir, 'api-security-analysis.md');
    writeFileSync(reportPath, report, 'utf8');
    
    console.log(`✅ Detailed report saved to: ${reportPath}`);

    // Save JSON analysis data
    const jsonPath = join(reportsDir, 'api-security-analysis.json');
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
      console.log('\n✅ API security analysis completed successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ API security analysis failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the analysis
runAPISecurityAnalysis();