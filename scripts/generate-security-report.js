#!/usr/bin/env node

/**
 * Security Report Generator
 * Generates comprehensive security reports from npm audit and cargo audit results
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityReportGenerator {
  constructor() {
    this.reportDir = path.join(process.cwd(), 'security-reports');
    this.ensureReportDirectory();
  }

  ensureReportDirectory() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async generateReport() {
    console.log('🔍 Generating security report...');
    
    try {
      const npmResults = await this.runNpmAudit();
      const cargoResults = await this.runCargoAudit();
      
      const report = {
        timestamp: new Date().toISOString(),
        summary: this.generateSummary(npmResults, cargoResults),
        npm: this.processNpmResults(npmResults),
        cargo: this.processCargoResults(cargoResults),
        recommendations: this.generateRecommendations(npmResults, cargoResults),
        riskAssessment: this.assessRisk(npmResults, cargoResults)
      };

      await this.saveReport(report);
      await this.generateMarkdownReport(report);
      
      console.log('✅ Security report generated successfully');
      return report;
      
    } catch (error) {
      console.error('❌ Failed to generate security report:', error.message);
      process.exit(1);
    }
  }

  async runNpmAudit() {
    try {
      const result = execSync('npm audit --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return JSON.parse(result);
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout);
        } catch (parseError) {
          console.warn('⚠️ Failed to parse npm audit output');
          return { vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } };
        }
      }
      throw error;
    }
  }

  async runCargoAudit() {
    try {
      const result = execSync('cd src-tauri && cargo audit --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return JSON.parse(result);
    } catch (error) {
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout);
        } catch (parseError) {
          console.warn('⚠️ Failed to parse cargo audit output');
          return { vulnerabilities: { found: false, list: [] }, warnings: {} };
        }
      }
      console.warn('⚠️ Cargo audit not available or failed');
      return { vulnerabilities: { found: false, list: [] }, warnings: {} };
    }
  }

  generateSummary(npmResults, cargoResults) {
    const npmVulns = npmResults.metadata?.vulnerabilities || {};
    const cargoVulns = cargoResults.vulnerabilities?.list || [];
    
    return {
      totalVulnerabilities: (npmVulns.total || 0) + cargoVulns.length,
      critical: (npmVulns.critical || 0) + cargoVulns.filter(v => v.advisory.severity === 'critical').length,
      high: (npmVulns.high || 0) + cargoVulns.filter(v => v.advisory.severity === 'high').length,
      moderate: (npmVulns.moderate || 0) + cargoVulns.filter(v => v.advisory.severity === 'moderate').length,
      low: (npmVulns.low || 0) + cargoVulns.filter(v => v.advisory.severity === 'low').length,
      npm: {
        total: npmVulns.total || 0,
        dependencies: npmResults.metadata?.dependencies?.total || 0
      },
      cargo: {
        total: cargoVulns.length,
        dependencies: cargoResults.lockfile?.['dependency-count'] || 0
      }
    };
  }

  processNpmResults(results) {
    const vulnerabilities = results.vulnerabilities || {};
    
    return {
      metadata: results.metadata || {},
      vulnerabilities: Object.entries(vulnerabilities).map(([name, vuln]) => ({
        package: name,
        severity: vuln.severity,
        isDirect: vuln.isDirect,
        range: vuln.range,
        fixAvailable: vuln.fixAvailable,
        via: vuln.via || []
      })),
      summary: {
        total: Object.keys(vulnerabilities).length,
        direct: Object.values(vulnerabilities).filter(v => v.isDirect).length,
        fixable: Object.values(vulnerabilities).filter(v => v.fixAvailable).length
      }
    };
  }

  processCargoResults(results) {
    const vulnerabilities = results.vulnerabilities?.list || [];
    const warnings = results.warnings || {};
    
    return {
      vulnerabilities: vulnerabilities.map(vuln => ({
        package: vuln.package.name,
        version: vuln.package.version,
        advisory: {
          id: vuln.advisory.id,
          title: vuln.advisory.title,
          description: vuln.advisory.description,
          severity: vuln.advisory.severity || 'unknown',
          cvss: vuln.advisory.cvss,
          url: vuln.advisory.url
        },
        versions: vuln.versions
      })),
      warnings: {
        unmaintained: warnings.unmaintained?.length || 0,
        unsound: warnings.unsound?.length || 0,
        yanked: warnings.yanked?.length || 0
      },
      summary: {
        total: vulnerabilities.length,
        hasVulnerabilities: results.vulnerabilities?.found || false
      }
    };
  }

  generateRecommendations(npmResults, cargoResults) {
    const recommendations = [];
    
    // NPM recommendations
    const npmVulns = npmResults.metadata?.vulnerabilities || {};
    if (npmVulns.critical > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Update npm dependencies immediately',
        command: 'npm audit fix --force',
        description: `${npmVulns.critical} critical vulnerabilities found in npm dependencies`
      });
    }
    
    if (npmVulns.high > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Update high-severity npm vulnerabilities',
        command: 'npm audit fix',
        description: `${npmVulns.high} high-severity vulnerabilities found`
      });
    }

    // Cargo recommendations
    const cargoVulns = cargoResults.vulnerabilities?.list || [];
    const criticalCargo = cargoVulns.filter(v => v.advisory.severity === 'critical');
    if (criticalCargo.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Update Rust dependencies immediately',
        command: 'cd src-tauri && cargo update',
        description: `${criticalCargo.length} critical vulnerabilities found in Rust dependencies`
      });
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'INFO',
        action: 'Continue regular dependency monitoring',
        command: 'npm run security:full-scan',
        description: 'No critical vulnerabilities found. Maintain regular scanning schedule.'
      });
    }

    return recommendations;
  }

  assessRisk(npmResults, cargoResults) {
    const summary = this.generateSummary(npmResults, cargoResults);
    
    let riskLevel = 'LOW';
    let riskScore = 0;
    
    // Calculate risk score
    riskScore += summary.critical * 10;
    riskScore += summary.high * 5;
    riskScore += summary.moderate * 2;
    riskScore += summary.low * 1;
    
    if (riskScore >= 50) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 20) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 10) {
      riskLevel = 'MEDIUM';
    }
    
    return {
      level: riskLevel,
      score: riskScore,
      factors: [
        summary.critical > 0 && 'Critical vulnerabilities present',
        summary.high > 0 && 'High-severity vulnerabilities present',
        summary.npm.total > 10 && 'High number of npm vulnerabilities',
        summary.cargo.total > 5 && 'Multiple Rust vulnerabilities'
      ].filter(Boolean)
    };
  }

  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `security-report-${timestamp}.json`;
    const filepath = path.join(this.reportDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    // Also save as latest
    const latestPath = path.join(this.reportDir, 'latest-security-report.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Report saved to: ${filepath}`);
  }

  async generateMarkdownReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `security-report-${timestamp}.md`;
    const filepath = path.join(this.reportDir, filename);
    
    const markdown = this.formatMarkdownReport(report);
    fs.writeFileSync(filepath, markdown);
    
    // Also save as latest
    const latestPath = path.join(this.reportDir, 'latest-security-report.md');
    fs.writeFileSync(latestPath, markdown);
    
    console.log(`📄 Markdown report saved to: ${filepath}`);
  }

  formatMarkdownReport(report) {
    const { summary, npm, cargo, recommendations, riskAssessment } = report;
    
    return `# Security Report

**Generated**: ${new Date(report.timestamp).toLocaleString()}
**Risk Level**: ${riskAssessment.level}
**Risk Score**: ${riskAssessment.score}

## Executive Summary

- **Total Vulnerabilities**: ${summary.totalVulnerabilities}
- **Critical**: ${summary.critical}
- **High**: ${summary.high}
- **Moderate**: ${summary.moderate}
- **Low**: ${summary.low}

## Node.js Dependencies (npm)

- **Total Dependencies**: ${summary.npm.dependencies}
- **Vulnerabilities Found**: ${summary.npm.total}
- **Direct Dependencies Affected**: ${npm.summary.direct}
- **Fixable Vulnerabilities**: ${npm.summary.fixable}

### Top npm Vulnerabilities

${npm.vulnerabilities.slice(0, 5).map(v => 
  `- **${v.package}** (${v.severity}): ${v.isDirect ? 'Direct' : 'Indirect'} dependency`
).join('\n') || 'No vulnerabilities found'}

## Rust Dependencies (cargo)

- **Total Dependencies**: ${summary.cargo.dependencies}
- **Vulnerabilities Found**: ${summary.cargo.total}
- **Unmaintained Packages**: ${cargo.warnings.unmaintained}
- **Unsound Packages**: ${cargo.warnings.unsound}

### Top Cargo Vulnerabilities

${cargo.vulnerabilities.slice(0, 5).map(v => 
  `- **${v.package}** v${v.version} (${v.advisory.severity}): ${v.advisory.title}`
).join('\n') || 'No vulnerabilities found'}

## Risk Assessment

**Risk Factors:**
${riskAssessment.factors.map(factor => `- ${factor}`).join('\n') || '- No significant risk factors identified'}

## Recommendations

${recommendations.map((rec, index) => 
  `### ${index + 1}. ${rec.action} (${rec.priority})

${rec.description}

\`\`\`bash
${rec.command}
\`\`\`
`).join('\n')}

## Next Steps

1. Review and prioritize recommendations based on risk level
2. Test updates in development environment
3. Deploy security updates following change management process
4. Monitor application after updates
5. Schedule next security scan

---

*This report was generated automatically. For questions, contact the security team.*
`;
  }
}

// CLI execution
if (require.main === module) {
  const generator = new SecurityReportGenerator();
  generator.generateReport().catch(error => {
    console.error('Failed to generate security report:', error);
    process.exit(1);
  });
}

module.exports = SecurityReportGenerator;