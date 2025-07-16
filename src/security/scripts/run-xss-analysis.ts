#!/usr/bin/env node

/**
 * XSS and Input Validation Analysis Runner
 * 
 * This script runs the XSS and input validation analyzer on the frontend components
 * and generates a comprehensive security report.
 */

import { XSSInputValidationAnalyzer } from '../xss-input-validation-analyzer';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function runXSSAnalysis() {
  console.log('🔍 Starting XSS and Input Validation Analysis...\n');

  const analyzer = new XSSInputValidationAnalyzer();
  
  try {
    // Analyze components directory
    const result = await analyzer.analyzeComponents('src/components');
    
    // Display summary
    console.log('📊 Analysis Summary:');
    console.log(`   Components Analyzed: ${result.summary.componentsAnalyzed}`);
    console.log(`   Input Fields Analyzed: ${result.summary.inputFieldsAnalyzed}`);
    console.log(`   Total Issues Found: ${result.summary.totalVulnerabilities}`);
    console.log(`   Critical: ${result.summary.criticalCount}`);
    console.log(`   High: ${result.summary.highCount}`);
    console.log(`   Medium: ${result.summary.mediumCount}`);
    console.log(`   Low: ${result.summary.lowCount}\n`);

    // Display vulnerabilities
    if (result.vulnerabilities.length > 0) {
      console.log('🚨 XSS Vulnerabilities Found:');
      result.vulnerabilities.forEach((vuln, index) => {
        console.log(`\n${index + 1}. ${vuln.description}`);
        console.log(`   Severity: ${vuln.severity.toUpperCase()}`);
        console.log(`   Component: ${vuln.component}`);
        console.log(`   File: ${vuln.file}${vuln.line ? `:${vuln.line}` : ''}`);
        console.log(`   Type: ${vuln.type}`);
        console.log(`   Evidence: ${vuln.evidence}`);
        console.log(`   CWE: ${vuln.cweId}`);
        console.log(`   Recommendation: ${vuln.recommendation}`);
      });
    } else {
      console.log('✅ No XSS vulnerabilities detected!');
    }

    // Display input validation issues
    if (result.inputValidationIssues.length > 0) {
      console.log('\n⚠️  Input Validation Issues Found:');
      result.inputValidationIssues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.description}`);
        console.log(`   Severity: ${issue.severity.toUpperCase()}`);
        console.log(`   Component: ${issue.component}`);
        console.log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`   Type: ${issue.type}`);
        console.log(`   Input Field: ${issue.inputField}`);
        console.log(`   Evidence: ${issue.evidence}`);
        console.log(`   Recommendation: ${issue.recommendation}`);
      });
    } else {
      console.log('\n✅ No input validation issues detected!');
    }

    // Display recommendations
    console.log('\n💡 Security Recommendations:');
    result.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // Generate detailed report
    const reportPath = join('security-reports', 'xss-input-validation-analysis.json');
    const detailedReport = {
      timestamp: new Date().toISOString(),
      analysis: 'XSS and Input Validation Security Analysis',
      ...result
    };

    writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Generate markdown report
    const markdownReport = generateMarkdownReport(detailedReport);
    const markdownPath = join('security-reports', 'xss-input-validation-analysis.md');
    writeFileSync(markdownPath, markdownReport);
    console.log(`📄 Markdown report saved to: ${markdownPath}`);

    console.log('\n✨ XSS and Input Validation Analysis Complete!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

function generateMarkdownReport(report: any): string {
  const { timestamp, vulnerabilities, inputValidationIssues, summary, recommendations } = report;

  let markdown = `# XSS and Input Validation Security Analysis Report

**Generated:** ${new Date(timestamp).toLocaleString()}

## Executive Summary

This report presents the findings of a comprehensive XSS (Cross-Site Scripting) and input validation security analysis performed on the frontend React components.

### Analysis Statistics
- **Components Analyzed:** ${summary.componentsAnalyzed}
- **Input Fields Analyzed:** ${summary.inputFieldsAnalyzed}
- **Total Security Issues:** ${summary.totalVulnerabilities}

### Severity Breakdown
- **Critical:** ${summary.criticalCount}
- **High:** ${summary.highCount}
- **Medium:** ${summary.mediumCount}
- **Low:** ${summary.lowCount}

## Risk Assessment

`;

  if (summary.criticalCount > 0) {
    markdown += `🔴 **CRITICAL RISK**: ${summary.criticalCount} critical vulnerabilities require immediate attention.\n\n`;
  } else if (summary.highCount > 0) {
    markdown += `🟠 **HIGH RISK**: ${summary.highCount} high-severity issues should be addressed promptly.\n\n`;
  } else if (summary.mediumCount > 0) {
    markdown += `🟡 **MEDIUM RISK**: ${summary.mediumCount} medium-severity issues should be planned for remediation.\n\n`;
  } else {
    markdown += `🟢 **LOW RISK**: Only low-severity issues detected or no issues found.\n\n`;
  }

  // XSS Vulnerabilities Section
  if (vulnerabilities.length > 0) {
    markdown += `## XSS Vulnerabilities

The following XSS vulnerabilities were identified:

`;

    vulnerabilities.forEach((vuln: any, index: number) => {
      markdown += `### ${index + 1}. ${vuln.description}

- **Severity:** ${vuln.severity.toUpperCase()}
- **Type:** ${vuln.type.replace(/_/g, ' ').toUpperCase()}
- **Component:** ${vuln.component}
- **File:** \`${vuln.file}\`${vuln.line ? ` (Line ${vuln.line})` : ''}
- **CWE ID:** ${vuln.cweId}

**Evidence:**
\`\`\`
${vuln.evidence}
\`\`\`

**Recommendation:**
${vuln.recommendation}

---

`;
    });
  } else {
    markdown += `## XSS Vulnerabilities

✅ **No XSS vulnerabilities detected!**

The analysis found no direct XSS vulnerabilities in the examined components. This indicates good security practices in handling user input and output encoding.

`;
  }

  // Input Validation Issues Section
  if (inputValidationIssues.length > 0) {
    markdown += `## Input Validation Issues

The following input validation issues were identified:

`;

    inputValidationIssues.forEach((issue: any, index: number) => {
      markdown += `### ${index + 1}. ${issue.description}

- **Severity:** ${issue.severity.toUpperCase()}
- **Type:** ${issue.type.replace(/_/g, ' ').toUpperCase()}
- **Component:** ${issue.component}
- **File:** \`${issue.file}\`${issue.line ? ` (Line ${issue.line})` : ''}
- **Input Field:** ${issue.inputField}

**Evidence:**
\`\`\`
${issue.evidence}
\`\`\`

**Recommendation:**
${issue.recommendation}

---

`;
    });
  } else {
    markdown += `## Input Validation Issues

✅ **No significant input validation issues detected!**

The analysis found that input fields have appropriate validation measures in place.

`;
  }

  // Recommendations Section
  markdown += `## Security Recommendations

To maintain and improve the security posture of the application, consider implementing the following recommendations:

`;

  recommendations.forEach((rec: string, index: number) => {
    markdown += `${index + 1}. ${rec}\n`;
  });

  markdown += `
## Technical Details

### Analysis Methodology

This analysis examined React components for:

1. **XSS Vulnerabilities:**
   - Direct HTML injection patterns
   - Unsafe use of dangerouslySetInnerHTML
   - User-controlled URL construction
   - Unsafe event handler implementations
   - Missing output encoding

2. **Input Validation Issues:**
   - Missing validation attributes
   - Client-side only validation
   - Insufficient input sanitization
   - Unsafe regular expressions

### Tools and Techniques

- Static code analysis of React/TypeScript components
- Pattern matching for common vulnerability signatures
- Input field enumeration and validation assessment
- Security best practices verification

### Limitations

This automated analysis provides a comprehensive baseline security assessment but should be complemented with:
- Manual security testing
- Dynamic application security testing (DAST)
- Penetration testing
- Code review by security experts

## Next Steps

1. **Immediate Actions:**
   - Address any critical and high-severity vulnerabilities
   - Implement missing input validation
   - Review and secure any flagged components

2. **Short-term Improvements:**
   - Implement Content Security Policy (CSP)
   - Add comprehensive server-side validation
   - Update security dependencies

3. **Long-term Security:**
   - Establish regular security assessments
   - Implement security training for developers
   - Create security coding standards

---

*This report was generated by the XSS and Input Validation Security Analyzer*
`;

  return markdown;
}

// Run the analysis
runXSSAnalysis().catch(console.error);

export { runXSSAnalysis };