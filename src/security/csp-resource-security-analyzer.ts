/**
 * Content Security Policy and Resource Security Analyzer
 * 
 * This module analyzes the Content Security Policy implementation and resource security
 * of the application, focusing on:
 * 1. CSP configuration in Tauri
 * 2. Resource integrity checks
 * 3. Third-party script inclusion security
 * 4. Subresource Integrity (SRI) implementation
 */

import fs from 'fs';
import path from 'path';
import { SecurityAnalyzer, SecurityReport } from './types';

export interface CSPResourceSecurityReport extends SecurityReport {
  timestamp: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'info';
  summary: string;
  cspImplementation: {
    enabled: boolean;
    policy: string | null;
    issues: string[];
  };
  resourceIntegrity: {
    implementsSRI: boolean;
    externalResources: {
      url: string;
      hasSRI: boolean;
      type: string;
    }[];
  };
  thirdPartyScripts: {
    count: number;
    domains: string[];
    riskyDomains: string[];
  };
  recommendations: string[];
}

export class CSPResourceSecurityAnalyzer implements SecurityAnalyzer<CSPResourceSecurityReport> {
  private tauriConfigPath: string;
  private htmlFilePath: string;
  private report: CSPResourceSecurityReport;

  constructor(workspaceRoot: string) {
    this.tauriConfigPath = path.join(workspaceRoot, 'src-tauri', 'tauri.conf.json');
    this.htmlFilePath = path.join(workspaceRoot, 'index.html');
    
    this.report = {
      timestamp: new Date().toISOString(),
      name: 'Content Security Policy and Resource Security Analysis',
      riskLevel: 'medium',
      summary: '',
      cspImplementation: {
        enabled: false,
        policy: null,
        issues: []
      },
      resourceIntegrity: {
        implementsSRI: false,
        externalResources: []
      },
      thirdPartyScripts: {
        count: 0,
        domains: [],
        riskyDomains: []
      },
      recommendations: []
    };
  }

  async analyze(): Promise<CSPResourceSecurityReport> {
    try {
      await this.analyzeTauriCSP();
      await this.analyzeResourceIntegrity();
      await this.analyzeThirdPartyScripts();
      this.generateRecommendations();
      this.calculateRiskLevel();
      this.generateSummary();
      
      return this.report;
    } catch (error) {
      console.error('Error analyzing CSP and resource security:', error);
      this.report.summary = 'Error occurred during analysis';
      this.report.riskLevel = 'high';
      return this.report;
    }
  }

  private async analyzeTauriCSP(): Promise<void> {
    try {
      const tauriConfigContent = await fs.promises.readFile(this.tauriConfigPath, 'utf-8');
      const tauriConfig = JSON.parse(tauriConfigContent);
      
      // Check if CSP is configured in Tauri
      if (tauriConfig.app && tauriConfig.app.security && tauriConfig.app.security.csp !== undefined) {
        const cspValue = tauriConfig.app.security.csp;
        
        if (cspValue === null) {
          this.report.cspImplementation.enabled = false;
          this.report.cspImplementation.issues.push('CSP is explicitly disabled in Tauri configuration');
        } else {
          this.report.cspImplementation.enabled = true;
          this.report.cspImplementation.policy = cspValue;
          
          // Analyze CSP policy strength
          this.analyzeCSPStrength(cspValue);
        }
      } else {
        this.report.cspImplementation.enabled = false;
        this.report.cspImplementation.issues.push('CSP configuration not found in Tauri config');
      }
    } catch (error) {
      console.error('Error analyzing Tauri CSP:', error);
      this.report.cspImplementation.issues.push('Error reading or parsing Tauri configuration');
    }
  }

  private analyzeCSPStrength(cspPolicy: string): void {
    // Check for unsafe CSP directives
    if (cspPolicy.includes("'unsafe-inline'")) {
      this.report.cspImplementation.issues.push("CSP uses 'unsafe-inline' which reduces XSS protection");
    }
    
    if (cspPolicy.includes("'unsafe-eval'")) {
      this.report.cspImplementation.issues.push("CSP uses 'unsafe-eval' which allows potentially dangerous code execution");
    }
    
    // Check for default-src or script-src
    if (!cspPolicy.includes('default-src') && !cspPolicy.includes('script-src')) {
      this.report.cspImplementation.issues.push('CSP missing critical script-src or default-src directive');
    }
    
    // Check for wildcard sources
    if (cspPolicy.includes('*')) {
      this.report.cspImplementation.issues.push('CSP uses wildcard (*) source which reduces security');
    }
  }

  private async analyzeResourceIntegrity(): Promise<void> {
    try {
      const htmlContent = await fs.promises.readFile(this.htmlFilePath, 'utf-8');
      
      // Check for external resources (scripts, stylesheets)
      const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/g;
      const linkRegex = /<link[^>]*href=["']([^"']+)["'][^>]*>/g;
      
      let match;
      let hasAnySRI = false;
      
      // Check scripts
      while ((match = scriptRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        if (this.isExternalResource(src)) {
          const hasSRI = match[0].includes('integrity=');
          if (hasSRI) hasAnySRI = true;
          
          this.report.resourceIntegrity.externalResources.push({
            url: src,
            hasSRI,
            type: 'script'
          });
        }
      }
      
      // Check stylesheets
      while ((match = linkRegex.exec(htmlContent)) !== null) {
        const href = match[1];
        if (this.isExternalResource(href) && match[0].includes('stylesheet')) {
          const hasSRI = match[0].includes('integrity=');
          if (hasSRI) hasAnySRI = true;
          
          this.report.resourceIntegrity.externalResources.push({
            url: href,
            hasSRI,
            type: 'stylesheet'
          });
        }
      }
      
      this.report.resourceIntegrity.implementsSRI = hasAnySRI;
    } catch (error) {
      console.error('Error analyzing resource integrity:', error);
    }
  }

  private isExternalResource(url: string): boolean {
    return url.startsWith('http://') || 
           url.startsWith('https://') || 
           url.startsWith('//');
  }

  private async analyzeThirdPartyScripts(): Promise<void> {
    try {
      const htmlContent = await fs.promises.readFile(this.htmlFilePath, 'utf-8');
      
      // Extract all script sources
      const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/g;
      const domains = new Set<string>();
      const riskyDomains = new Set<string>();
      
      let match;
      let count = 0;
      
      while ((match = scriptRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        if (this.isExternalResource(src)) {
          count++;
          try {
            const url = new URL(src.startsWith('//') ? `https:${src}` : src);
            const domain = url.hostname;
            domains.add(domain);
            
            // Check for potentially risky domains
            if (this.isRiskyDomain(domain)) {
              riskyDomains.add(domain);
            }
          } catch (e) {
            console.error(`Invalid URL: ${src}`);
          }
        }
      }
      
      this.report.thirdPartyScripts = {
        count,
        domains: Array.from(domains),
        riskyDomains: Array.from(riskyDomains)
      };
    } catch (error) {
      console.error('Error analyzing third-party scripts:', error);
    }
  }

  private isRiskyDomain(domain: string): boolean {
    // List of domains that might be considered risky
    const riskyDomainPatterns = [
      'cdn.jsdelivr.net',
      'unpkg.com',
      'cdnjs.cloudflare.com',
      'stats.',
      'tracker.',
      'analytics.',
      'ads.',
      'ad.',
    ];
    
    return riskyDomainPatterns.some(pattern => domain.includes(pattern));
  }

  private generateRecommendations(): void {
    const recommendations = new Set<string>();
    
    // CSP recommendations
    if (!this.report.cspImplementation.enabled) {
      recommendations.add('Enable Content Security Policy in Tauri configuration');
      recommendations.add('Implement a strict CSP that restricts script sources to trusted domains');
    } else if (this.report.cspImplementation.issues.length > 0) {
      recommendations.add('Strengthen CSP by removing unsafe directives and restricting sources');
    }
    
    // Resource integrity recommendations
    if (!this.report.resourceIntegrity.implementsSRI && this.report.resourceIntegrity.externalResources.length > 0) {
      recommendations.add('Implement Subresource Integrity (SRI) for all external scripts and stylesheets');
    }
    
    const resourcesWithoutSRI = this.report.resourceIntegrity.externalResources.filter(r => !r.hasSRI);
    if (resourcesWithoutSRI.length > 0) {
      recommendations.add(`Add integrity attributes to ${resourcesWithoutSRI.length} external resources`);
    }
    
    // Third-party script recommendations
    if (this.report.thirdPartyScripts.riskyDomains.length > 0) {
      recommendations.add('Review and potentially remove scripts from risky domains');
    }
    
    if (this.report.thirdPartyScripts.count > 5) {
      recommendations.add('Consider reducing the number of third-party scripts to minimize attack surface');
    }
    
    // General recommendations
    recommendations.add('Implement HTTP Strict Transport Security (HSTS) headers');
    recommendations.add('Add X-Content-Type-Options: nosniff header to prevent MIME type sniffing');
    recommendations.add('Add X-Frame-Options header to prevent clickjacking attacks');
    recommendations.add('Consider implementing a Feature-Policy/Permissions-Policy to restrict browser features');
    
    this.report.recommendations = Array.from(recommendations);
  }

  private calculateRiskLevel(): void {
    let riskScore = 0;
    
    // CSP risks
    if (!this.report.cspImplementation.enabled) {
      riskScore += 30; // Significant risk for no CSP
    } else if (this.report.cspImplementation.issues.length > 0) {
      riskScore += 15; // Moderate risk for weak CSP
    }
    
    // Resource integrity risks
    const resourcesWithoutSRI = this.report.resourceIntegrity.externalResources.filter(r => !r.hasSRI).length;
    riskScore += resourcesWithoutSRI * 5; // 5 points per resource without SRI
    
    // Third-party script risks
    riskScore += this.report.thirdPartyScripts.riskyDomains.length * 10; // 10 points per risky domain
    
    // Determine risk level
    if (riskScore >= 50) {
      this.report.riskLevel = 'high';
    } else if (riskScore >= 20) {
      this.report.riskLevel = 'medium';
    } else {
      this.report.riskLevel = 'low';
    }
  }

  private generateSummary(): void {
    const issues = [];
    
    if (!this.report.cspImplementation.enabled) {
      issues.push('Content Security Policy is disabled');
    } else if (this.report.cspImplementation.issues.length > 0) {
      issues.push(`CSP has ${this.report.cspImplementation.issues.length} security issues`);
    }
    
    const resourcesWithoutSRI = this.report.resourceIntegrity.externalResources.filter(r => !r.hasSRI).length;
    if (resourcesWithoutSRI > 0) {
      issues.push(`${resourcesWithoutSRI} external resources lack Subresource Integrity protection`);
    }
    
    if (this.report.thirdPartyScripts.riskyDomains.length > 0) {
      issues.push(`${this.report.thirdPartyScripts.riskyDomains.length} potentially risky third-party script domains detected`);
    }
    
    if (issues.length === 0) {
      this.report.summary = 'No significant resource security issues detected';
    } else {
      this.report.summary = `Found ${issues.length} resource security issues: ${issues.join('; ')}`;
    }
  }
}