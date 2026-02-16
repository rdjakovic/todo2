/**
 * CSP Resource Security Report Generator
 * 
 * This module generates comprehensive reports based on the CSP and resource security analysis.
 */

import { CSPResourceSecurityReport } from './csp-resource-security-analyzer';

export class CSPResourceSecurityReportGenerator {
  /**
   * Generate a detailed HTML report from the CSP analysis results
   */
  static generateHTMLReport(report: CSPResourceSecurityReport): string {
    const riskColorClass = {
      'high': 'text-red-600',
      'medium': 'text-orange-500',
      'low': 'text-green-600'
    }[report.riskLevel] || 'text-gray-600';
    
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CSP and Resource Security Analysis</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3 {
            color: #2d3748;
          }
          .summary {
            background-color: #f7fafc;
            border-left: 4px solid #4299e1;
            padding: 12px 24px;
            margin-bottom: 24px;
          }
          .risk-high {
            color: #e53e3e;
          }
          .risk-medium {
            color: #ed8936;
          }
          .risk-low {
            color: #38a169;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background-color: #edf2f7;
          }
          .recommendations {
            background-color: #ebf8ff;
            padding: 16px;
            border-radius: 4px;
          }
          .recommendations h2 {
            margin-top: 0;
          }
          .recommendations ul {
            margin-bottom: 0;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          .badge-success {
            background-color: #c6f6d5;
            color: #22543d;
          }
          .badge-danger {
            background-color: #fed7d7;
            color: #742a2a;
          }
        </style>
      </head>
      <body>
        <h1>Content Security Policy and Resource Security Analysis</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <h2>Summary</h2>
          <p>${report.summary}</p>
          <p>Risk Level: <span class="risk-${report.riskLevel}">${report.riskLevel.toUpperCase()}</span></p>
        </div>
        
        <h2>CSP Implementation</h2>
        <table>
          <tr>
            <th>Enabled</th>
            <td>${report.cspImplementation.enabled ? 
              '<span class="badge badge-success">Yes</span>' : 
              '<span class="badge badge-danger">No</span>'}</td>
          </tr>
          <tr>
            <th>Policy</th>
            <td><code>${report.cspImplementation.policy || 'Not configured'}</code></td>
          </tr>
        </table>
    `;
    
    if (report.cspImplementation.issues.length > 0) {
      html += `
        <h3>CSP Issues</h3>
        <ul>
          ${report.cspImplementation.issues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
      `;
    }
    
    html += `
      <h2>Resource Integrity</h2>
      <table>
        <tr>
          <th>Implements SRI</th>
          <td>${report.resourceIntegrity.implementsSRI ? 
            '<span class="badge badge-success">Yes</span>' : 
            '<span class="badge badge-danger">No</span>'}</td>
        </tr>
        <tr>
          <th>External Resources</th>
          <td>${report.resourceIntegrity.externalResources.length}</td>
        </tr>
      </table>
    `;
    
    if (report.resourceIntegrity.externalResources.length > 0) {
      html += `
        <h3>External Resources</h3>
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Type</th>
              <th>SRI Implemented</th>
            </tr>
          </thead>
          <tbody>
            ${report.resourceIntegrity.externalResources.map(resource => `
              <tr>
                <td><code>${resource.url}</code></td>
                <td>${resource.type}</td>
                <td>${resource.hasSRI ? 
                  '<span class="badge badge-success">Yes</span>' : 
                  '<span class="badge badge-danger">No</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    html += `
      <h2>Third-Party Scripts</h2>
      <table>
        <tr>
          <th>Count</th>
          <td>${report.thirdPartyScripts.count}</td>
        </tr>
        <tr>
          <th>Domains</th>
          <td>${report.thirdPartyScripts.domains.length > 0 ? 
            report.thirdPartyScripts.domains.join(', ') : 
            'None'}</td>
        </tr>
    `;
    
    if (report.thirdPartyScripts.riskyDomains.length > 0) {
      html += `
        <tr>
          <th>Risky Domains</th>
          <td class="risk-high">${report.thirdPartyScripts.riskyDomains.join(', ')}</td>
        </tr>
      `;
    }
    
    html += `
      </table>
      
      <div class="recommendations">
        <h2>Recommendations</h2>
        <ul>
          ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
      
      <h2>Next Steps</h2>
      <ol>
        <li>Review and implement the recommended security improvements</li>
        <li>Enable Content Security Policy with appropriate directives</li>
        <li>Add Subresource Integrity for all external resources</li>
        <li>Regularly audit third-party scripts and resources</li>
      </ol>
      
      </body>
      </html>
    `;
    
    return html;
  }
  
  /**
   * Generate a markdown report from the CSP analysis results
   */
  static generateMarkdownReport(report: CSPResourceSecurityReport): string {
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
  
  /**
   * Generate a JSON report from the CSP analysis results
   */
  static generateJSONReport(report: CSPResourceSecurityReport): string {
    return JSON.stringify(report, null, 2);
  }
}