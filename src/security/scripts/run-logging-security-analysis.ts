#!/usr/bin/env tsx

/**
 * Logging Security Analysis Runner
 * 
 * This script runs a comprehensive security analysis of the application's
 * logging implementation, checking for sensitive data exposure, monitoring
 * capabilities, and security best practices.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { runLoggingSecurityAnalysis } from '../logging-security-analyzer';

/**
 * Format analysis results as markdown report
 */
function formatMarkdownReport(analysis: any): string {
  const { timestamp, summary, findings, recommendations, complianceStatus } = analysis;

  let report = `# Logging Security Analysis Report

**Generated**: ${timestamp.toISOString()}
**Analysis Type**: Comprehensive Logging Security Assessment

## Executive Summary

**Overall Risk Level**: ${summary.overallRisk}
**Total Findings**: ${summary.totalFindings}

### Findings by Severity
- **Critical**: ${summary.criticalCount}
- **High**: ${summary.highCount}
- **Medium**: ${summary.mediumCount}
- **Low**: ${summary.lowCount}
- **Info**: ${summary.infoCount}

### Compliance Status
- **GDPR**: ${complianceStatus.gdpr}
- **SOC 2**: ${complianceStatus.soc2}
- **PCI DSS**: ${complianceStatus.pci}

## Detailed Findings

`;

  // Group findings by severity
  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  
  for (const severity of severityOrder) {
    const severityFindings = findings.filter((f: any) => f.severity === severity);
    
    if (severityFindings.length > 0) {
      report += `### ${severity} Severity Findings\n\n`;
      
      for (const finding of severityFindings) {
        report += `#### ${finding.id}: ${finding.title}\n\n`;
        report += `**Severity**: ${finding.severity}  \n`;
        report += `**Category**: ${finding.category}  \n`;
        report += `**Location**: ${finding.location}  \n`;
        if (finding.cweId) {
          report += `**CWE**: ${finding.cweId}  \n`;
        }
        report += `\n**Description**: ${finding.description}\n\n`;
        
        if (finding.evidence.length > 0) {
          report += `**Evidence**:\n`;
          for (const evidence of finding.evidence) {
            report += `- ${evidence}\n`;
          }
          report += `\n`;
        }
        
        report += `**Recommendations**:\n`;
        for (const rec of finding.recommendations) {
          report += `- ${rec}\n`;
        }
        report += `\n---\n\n`;
      }
    }
  }

  report += `## Security Recommendations

### Immediate Actions Required
`;

  for (let i = 0; i < Math.min(5, recommendations.length); i++) {
    report += `${i + 1}. ${recommendations[i]}\n`;
  }

  report += `
### Additional Recommendations
`;

  for (let i = 5; i < recommendations.length; i++) {
    report += `${i + 1}. ${recommendations[i]}\n`;
  }

  report += `
## Risk Assessment

| Category | Findings | Risk Level | Priority |
|----------|----------|------------|----------|
`;

  const categories = ['SENSITIVE_DATA', 'INFORMATION_DISCLOSURE', 'MONITORING', 'CONFIGURATION', 'ERROR_HANDLING'];
  
  for (const category of categories) {
    const categoryFindings = findings.filter((f: any) => f.category === category);
    const highRiskCount = categoryFindings.filter((f: any) => f.severity === 'HIGH' || f.severity === 'CRITICAL').length;
    const riskLevel = highRiskCount > 0 ? 'HIGH' : categoryFindings.length > 2 ? 'MEDIUM' : 'LOW';
    const priority = riskLevel === 'HIGH' ? 'P1' : riskLevel === 'MEDIUM' ? 'P2' : 'P3';
    
    report += `| ${category.replace('_', ' ')} | ${categoryFindings.length} | ${riskLevel} | ${priority} |\n`;
  }

  report += `
## Implementation Roadmap

### Phase 1: Critical Issues (Week 1-2)
- Address all CRITICAL and HIGH severity findings
- Implement environment-based logging configuration
- Remove sensitive data from console logs
- Create error message sanitization

### Phase 2: Security Infrastructure (Week 3-4)
- Deploy structured logging framework
- Implement security event logging
- Create basic monitoring capabilities
- Standardize error handling patterns

### Phase 3: Advanced Monitoring (Week 5-8)
- Build security monitoring dashboard
- Implement alerting and notification system
- Create audit trail capabilities
- Develop incident response procedures

### Phase 4: Compliance and Optimization (Week 9-12)
- Ensure compliance with GDPR, SOC 2, PCI DSS
- Optimize logging performance
- Create comprehensive documentation
- Conduct effectiveness review

## Conclusion

This analysis identified ${summary.totalFindings} security findings related to logging and monitoring. 
${summary.criticalCount + summary.highCount > 0 ? 
  `Immediate attention is required for ${summary.criticalCount + summary.highCount} high-priority issues.` : 
  'No critical issues were identified, but improvements are recommended.'}

The application would benefit from implementing a structured logging framework, 
removing sensitive data from logs, and establishing proper security monitoring capabilities.

---

*This report was generated automatically by the Logging Security Analyzer*
*For questions or clarifications, please review the source code and findings*
`;

  return report;
}

/**
 * Format analysis results as JSON
 */
function formatJsonReport(analysis: any): string {
  return JSON.stringify(analysis, null, 2);
}

/**
 * Format analysis results as CSV
 */
function formatCsvReport(analysis: any): string {
  const { findings } = analysis;
  
  let csv = 'ID,Title,Severity,Category,Location,CWE,Description\n';
  
  for (const finding of findings) {
    const description = finding.description.replace(/"/g, '""').replace(/\n/g, ' ');
    csv += `"${finding.id}","${finding.title}","${finding.severity}","${finding.category}","${finding.location}","${finding.cweId || ''}","${description}"\n`;
  }
  
  return csv;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'markdown';
  const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1];

  console.log('🔍 Starting Logging Security Analysis...\n');

  try {
    // Run the analysis
    const analysis = await runLoggingSecurityAnalysis();

    // Display summary
    console.log('📊 Analysis Summary:');
    console.log(`   Overall Risk: ${analysis.summary.overallRisk}`);
    console.log(`   Total Findings: ${analysis.summary.totalFindings}`);
    console.log(`   Critical: ${analysis.summary.criticalCount}`);
    console.log(`   High: ${analysis.summary.highCount}`);
    console.log(`   Medium: ${analysis.summary.mediumCount}`);
    console.log(`   Low: ${analysis.summary.lowCount}`);
    console.log('');

    // Display compliance status
    console.log('📋 Compliance Status:');
    console.log(`   GDPR: ${analysis.complianceStatus.gdpr}`);
    console.log(`   SOC 2: ${analysis.complianceStatus.soc2}`);
    console.log(`   PCI DSS: ${analysis.complianceStatus.pci}`);
    console.log('');

    if (verbose) {
      // Display detailed findings
      console.log('🔍 Detailed Findings:');
      
      const criticalFindings = analysis.findings.filter((f: any) => f.severity === 'CRITICAL');
      const highFindings = analysis.findings.filter((f: any) => f.severity === 'HIGH');
      
      if (criticalFindings.length > 0) {
        console.log('\n🚨 CRITICAL FINDINGS:');
        criticalFindings.forEach((finding: any, index: number) => {
          console.log(`   ${index + 1}. ${finding.title}`);
          console.log(`      Location: ${finding.location}`);
          console.log(`      Description: ${finding.description}`);
          console.log('');
        });
      }
      
      if (highFindings.length > 0) {
        console.log('⚠️  HIGH PRIORITY FINDINGS:');
        highFindings.forEach((finding: any, index: number) => {
          console.log(`   ${index + 1}. ${finding.title}`);
          console.log(`      Location: ${finding.location}`);
          console.log(`      Description: ${finding.description}`);
          console.log('');
        });
      }
    }

    // Generate report
    let report: string;
    let extension: string;

    switch (format.toLowerCase()) {
      case 'json':
        report = formatJsonReport(analysis);
        extension = 'json';
        break;
      case 'csv':
        report = formatCsvReport(analysis);
        extension = 'csv';
        break;
      case 'markdown':
      default:
        report = formatMarkdownReport(analysis);
        extension = 'md';
        break;
    }

    // Save or display report
    if (outputFile) {
      const fullPath = outputFile.endsWith(`.${extension}`) ? outputFile : `${outputFile}.${extension}`;
      writeFileSync(fullPath, report, 'utf8');
      console.log(`📄 Report saved to: ${fullPath}`);
    } else {
      const defaultPath = join(process.cwd(), 'security-reports', `logging-security-analysis.${extension}`);
      writeFileSync(defaultPath, report, 'utf8');
      console.log(`📄 Report saved to: ${defaultPath}`);
    }

    // Display recommendations
    console.log('\n💡 Key Recommendations:');
    analysis.recommendations.slice(0, 5).forEach((rec: string, index: number) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    console.log('\n✅ Logging security analysis completed successfully!');
    console.log('\nNext Steps:');
    console.log('   1. Review the generated report');
    console.log('   2. Prioritize findings by severity and impact');
    console.log('   3. Implement recommended security improvements');
    console.log('   4. Re-run analysis to verify fixes');
    console.log('   5. Integrate into CI/CD pipeline for continuous monitoring');

  } catch (error) {
    console.error('\n❌ Error during logging security analysis:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    console.error('\nPlease check your configuration and try again.');
    process.exit(1);
  }
}

// Handle command line help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Logging Security Analysis Tool

Usage: tsx run-logging-security-analysis.ts [options]

Options:
  --verbose            Show detailed findings and analysis
  --format <format>    Output format: json, markdown, csv (default: markdown)
  --output <file>      Output file path (default: auto-generated)
  --help               Show this help message

Examples:
  tsx run-logging-security-analysis.ts
  tsx run-logging-security-analysis.ts --verbose
  tsx run-logging-security-analysis.ts --format=json --output=report.json
  tsx run-logging-security-analysis.ts --verbose --format=markdown --output=security-reports/logging-analysis.md
`);
  process.exit(0);
}

// Run the analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}