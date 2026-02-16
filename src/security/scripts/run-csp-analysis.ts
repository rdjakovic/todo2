/**
 * Script to run Content Security Policy and Resource Security Analysis
 * 
 * This script analyzes the CSP implementation and resource security of the application
 * and generates a detailed report.
 * 
 * Usage:
 *   npm run security:csp
 *   npm run security:csp -- --verbose
 *   npm run security:csp -- --output csp-security-report.md --format markdown
 */

import path from 'path';
import fs from 'fs';
import { CSPResourceSecurityAnalyzer } from '../csp-resource-security-analyzer';

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const outputIndex = args.indexOf('--output');
const formatIndex = args.indexOf('--format');

const outputFile = outputIndex !== -1 && outputIndex + 1 < args.length 
  ? args[outputIndex + 1] 
  : 'csp-resource-security-analysis.json';

const format = formatIndex !== -1 && formatIndex + 1 < args.length 
  ? args[formatIndex + 1] 
  : 'json';

// Get workspace root
const workspaceRoot = path.resolve(__dirname, '../../../');

async function runAnalysis() {
  console.log('Starting Content Security Policy and Resource Security Analysis...');
  
  try {
    // Create analyzer
    const analyzer = new CSPResourceSecurityAnalyzer(workspaceRoot);
    
    // Run analysis
    const report = await analyzer.analyze();
    
    // Output results
    if (verbose) {
      console.log('\nAnalysis Results:');
      console.log('=================');
      console.log(`Risk Level: ${report.riskLevel.toUpperCase()}`);
      console.log(`Summary: ${report.summary}`);
      
      console.log('\nCSP Implementation:');
      console.log(`  Enabled: ${report.cspImplementation.enabled}`);
      console.log(`  Policy: ${report.cspImplementation.policy || 'Not configured'}`);
      
      if (report.cspImplementation.issues.length > 0) {
        console.log('\nCSP Issues:');
        report.cspImplementation.issues.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue}`);
        });
      }
      
      console.log('\nResource Integrity:');
      console.log(`  Implements SRI: ${report.resourceIntegrity.implementsSRI}`);
      console.log(`  External Resources: ${report.resourceIntegrity.externalResources.length}`);
      
      if (report.resourceIntegrity.externalResources.length > 0) {
        console.log('\nExternal Resources:');
        report.resourceIntegrity.externalResources.forEach((resource, i) => {
          console.log(`  ${i + 1}. ${resource.url} (${resource.type}) - SRI: ${resource.hasSRI ? 'Yes' : 'No'}`);
        });
      }
      
      console.log('\nThird-Party Scripts:');
      console.log(`  Count: ${report.thirdPartyScripts.count}`);
      console.log(`  Domains: ${report.thirdPartyScripts.domains.join(', ') || 'None'}`);
      console.log(`  Risky Domains: ${report.thirdPartyScripts.riskyDomains.join(', ') || 'None'}`);
      
      console.log('\nRecommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    } else {
      console.log(`Analysis complete. Risk level: ${report.riskLevel.toUpperCase()}`);
      console.log(`Summary: ${report.summary}`);
      console.log(`Found ${report.recommendations.length} recommendations.`);
    }
    
    // Save report to file
    const outputPath = path.join(workspaceRoot, 'security-reports', outputFile);
    
    // Create directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    if (format === 'markdown') {
      const markdownContent = generateMarkdownReport(report);
      fs.writeFileSync(outputPath, markdownContent);
    } else {
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    }
    
    console.log(`\nReport saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error running CSP analysis:', error);
    process.exit(1);
  }
}

function generateMarkdownReport(report: any) {
  const riskEmoji = {
    'high': '🔴',
    'medium': '🟠',
    'low': '🟢'
  }[report.riskLevel] || '⚪';
  
  let markdown = `# Content Security Policy and Resource Security Analysis\n\n`;
  markdown += `**Date:** ${new Date().toLocaleDateString()}\n`;
  markdown += `**Risk Level:** ${riskEmoji} ${report.riskLevel.toUpperCase()}\n\n`;
  
  markdown += `## Summary\n\n${report.summary}\n\n`;
  
  markdown += `## CSP Implementation\n\n`;
  markdown += `- **Enabled:** ${report.cspImplementation.enabled ? 'Yes' : 'No'}\n`;
  markdown += `- **Policy:** ${report.cspImplementation.policy || 'Not configured'}\n\n`;
  
  if (report.cspImplementation.issues.length > 0) {
    markdown += `### CSP Issues\n\n`;
    report.cspImplementation.issues.forEach((issue: string) => {
      markdown += `- ${issue}\n`;
    });
    markdown += '\n';
  }
  
  markdown += `## Resource Integrity\n\n`;
  markdown += `- **Implements SRI:** ${report.resourceIntegrity.implementsSRI ? 'Yes' : 'No'}\n`;
  markdown += `- **External Resources:** ${report.resourceIntegrity.externalResources.length}\n\n`;
  
  if (report.resourceIntegrity.externalResources.length > 0) {
    markdown += `### External Resources\n\n`;
    markdown += `| URL | Type | SRI Implemented |\n`;
    markdown += `| --- | ---- | -------------- |\n`;
    report.resourceIntegrity.externalResources.forEach((resource: any) => {
      markdown += `| ${resource.url} | ${resource.type} | ${resource.hasSRI ? '✅' : '❌'} |\n`;
    });
    markdown += '\n';
  }
  
  markdown += `## Third-Party Scripts\n\n`;
  markdown += `- **Count:** ${report.thirdPartyScripts.count}\n`;
  markdown += `- **Domains:** ${report.thirdPartyScripts.domains.join(', ') || 'None'}\n`;
  
  if (report.thirdPartyScripts.riskyDomains.length > 0) {
    markdown += `- **Risky Domains:** ${report.thirdPartyScripts.riskyDomains.join(', ')}\n`;
  }
  markdown += '\n';
  
  markdown += `## Recommendations\n\n`;
  report.recommendations.forEach((rec: string) => {
    markdown += `- ${rec}\n`;
  });
  markdown += '\n';
  
  markdown += `## Next Steps\n\n`;
  markdown += `1. Review and implement the recommended security improvements\n`;
  markdown += `2. Enable Content Security Policy with appropriate directives\n`;
  markdown += `3. Add Subresource Integrity for all external resources\n`;
  markdown += `4. Regularly audit third-party scripts and resources\n`;
  
  return markdown;
}

// Run the analysis
runAnalysis();