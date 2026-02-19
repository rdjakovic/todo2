/**
 * Tests for the CSP Resource Security Analyzer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

import { CSPResourceSecurityAnalyzer } from '../csp-resource-security-analyzer';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    promises: {
      readFile: vi.fn()
    }
  },
  promises: {
    readFile: vi.fn()
  }
}));

describe('CSPResourceSecurityAnalyzer', () => {
  const mockWorkspaceRoot = '/mock/workspace';
  let analyzer: CSPResourceSecurityAnalyzer;
  
  beforeEach(() => {
    vi.resetAllMocks();
    analyzer = new CSPResourceSecurityAnalyzer(mockWorkspaceRoot);
  });
  
  describe('analyze', () => {
    it('should detect disabled CSP in Tauri config', async () => {
      // Mock Tauri config with CSP disabled
      const mockTauriConfig = {
        app: {
          security: {
            csp: null
          }
        }
      };
      
      // Mock HTML file with no external resources
      const mockHtmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test App</title>
          </head>
          <body>
            <div id="root"></div>
            <script src="/local/script.js"></script>
          </body>
        </html>
      `;
      
      // Setup mocks
      (fs.promises.readFile as any).mockImplementation((filePath: string) => {
        if (filePath.includes('tauri.conf.json')) {
          return Promise.resolve(JSON.stringify(mockTauriConfig));
        } else if (filePath.includes('index.html')) {
          return Promise.resolve(mockHtmlContent);
        }
        return Promise.reject(new Error('File not found'));
      });
      
      // Run analysis
      const report = await analyzer.analyze();
      
      // Verify results
      expect(report.cspImplementation.enabled).toBe(false);
      expect(report.cspImplementation.issues).toContain('CSP is explicitly disabled in Tauri configuration');
      expect(report.riskLevel).toBe('high');
      expect(report.recommendations).toContain('Enable Content Security Policy in Tauri configuration');
    });
    
    it('should analyze weak CSP configuration', async () => {
      // Mock Tauri config with weak CSP
      const mockTauriConfig = {
        app: {
          security: {
            csp: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *;"
          }
        }
      };
      
      // Mock HTML file
      const mockHtmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test App</title>
          </head>
          <body>
            <div id="root"></div>
            <script src="/local/script.js"></script>
          </body>
        </html>
      `;
      
      // Setup mocks
      (fs.promises.readFile as any).mockImplementation((filePath: string) => {
        if (filePath.includes('tauri.conf.json')) {
          return Promise.resolve(JSON.stringify(mockTauriConfig));
        } else if (filePath.includes('index.html')) {
          return Promise.resolve(mockHtmlContent);
        }
        return Promise.reject(new Error('File not found'));
      });
      
      // Run analysis
      const report = await analyzer.analyze();
      
      // Verify results
      expect(report.cspImplementation.enabled).toBe(true);
      expect(report.cspImplementation.policy).toBe("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *;");
      expect(report.cspImplementation.issues).toContain("CSP uses 'unsafe-inline' which reduces XSS protection");
      expect(report.cspImplementation.issues).toContain("CSP uses 'unsafe-eval' which allows potentially dangerous code execution");
      expect(report.cspImplementation.issues).toContain("CSP uses wildcard (*) source which reduces security");
      expect(report.recommendations).toContain('Strengthen CSP by removing unsafe directives and restricting sources');
    });
    
    it('should detect missing SRI for external resources', async () => {
      // Mock Tauri config
      const mockTauriConfig = {
        app: {
          security: {
            csp: "default-src 'self'; script-src 'self';"
          }
        }
      };
      
      // Mock HTML file with external resources without SRI
      const mockHtmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test App</title>
            <link rel="stylesheet" href="https://cdn.example.com/style.css">
          </head>
          <body>
            <div id="root"></div>
            <script src="https://cdn.example.com/script.js"></script>
            <script src="/local/script.js"></script>
          </body>
        </html>
      `;
      
      // Setup mocks
      (fs.promises.readFile as any).mockImplementation((filePath: string) => {
        if (filePath.includes('tauri.conf.json')) {
          return Promise.resolve(JSON.stringify(mockTauriConfig));
        } else if (filePath.includes('index.html')) {
          return Promise.resolve(mockHtmlContent);
        }
        return Promise.reject(new Error('File not found'));
      });
      
      // Run analysis
      const report = await analyzer.analyze();
      
      // Verify results
      expect(report.resourceIntegrity.implementsSRI).toBe(false);
      expect(report.resourceIntegrity.externalResources).toHaveLength(2);
      expect(report.resourceIntegrity.externalResources[0].url).toBe('https://cdn.example.com/style.css');
      expect(report.resourceIntegrity.externalResources[0].hasSRI).toBe(false);
      expect(report.recommendations).toContain('Implement Subresource Integrity (SRI) for all external scripts and stylesheets');
    });
    
    it('should detect proper SRI implementation', async () => {
      // Mock Tauri config
      const mockTauriConfig = {
        app: {
          security: {
            csp: "default-src 'self'; script-src 'self';"
          }
        }
      };
      
      // Mock HTML file with external resources with SRI
      const mockHtmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test App</title>
            <link rel="stylesheet" href="https://cdn.example.com/style.css" 
                  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC" 
                  crossorigin="anonymous">
          </head>
          <body>
            <div id="root"></div>
            <script src="https://cdn.example.com/script.js" 
                    integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" 
                    crossorigin="anonymous"></script>
            <script src="/local/script.js"></script>
          </body>
        </html>
      `;
      
      // Setup mocks
      (fs.promises.readFile as any).mockImplementation((filePath: string) => {
        if (filePath.includes('tauri.conf.json')) {
          return Promise.resolve(JSON.stringify(mockTauriConfig));
        } else if (filePath.includes('index.html')) {
          return Promise.resolve(mockHtmlContent);
        }
        return Promise.reject(new Error('File not found'));
      });
      
      // Run analysis
      const report = await analyzer.analyze();
      
      // Verify results
      expect(report.resourceIntegrity.implementsSRI).toBe(true);
      expect(report.resourceIntegrity.externalResources).toHaveLength(2);
      expect(report.resourceIntegrity.externalResources[0].hasSRI).toBe(true);
      expect(report.resourceIntegrity.externalResources[1].hasSRI).toBe(true);
      // Should not recommend SRI implementation since it's already in place
      expect(report.recommendations).not.toContain('Implement Subresource Integrity (SRI) for all external scripts and stylesheets');
    });
    
    it('should detect risky third-party script domains', async () => {
      // Mock Tauri config
      const mockTauriConfig = {
        app: {
          security: {
            csp: "default-src 'self'; script-src 'self';"
          }
        }
      };
      
      // Mock HTML file with risky domains
      const mockHtmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test App</title>
          </head>
          <body>
            <div id="root"></div>
            <script src="https://analytics.example.com/tracker.js"></script>
            <script src="https://ads.example.com/ad.js"></script>
            <script src="https://cdn.example.com/script.js"></script>
          </body>
        </html>
      `;
      
      // Setup mocks
      (fs.promises.readFile as any).mockImplementation((filePath: string) => {
        if (filePath.includes('tauri.conf.json')) {
          return Promise.resolve(JSON.stringify(mockTauriConfig));
        } else if (filePath.includes('index.html')) {
          return Promise.resolve(mockHtmlContent);
        }
        return Promise.reject(new Error('File not found'));
      });
      
      // Run analysis
      const report = await analyzer.analyze();
      
      // Verify results
      expect(report.thirdPartyScripts.count).toBe(3);
      expect(report.thirdPartyScripts.domains).toHaveLength(3);
      expect(report.thirdPartyScripts.riskyDomains).toContain('analytics.example.com');
      expect(report.thirdPartyScripts.riskyDomains).toContain('ads.example.com');
      expect(report.recommendations).toContain('Review and potentially remove scripts from risky domains');
    });
    
    it('should handle errors gracefully', async () => {
      // Mock file read error
      (fs.promises.readFile as any).mockRejectedValue(new Error('File read error'));
      
      // Run analysis
      const report = await analyzer.analyze();
      
      // Verify results
      expect(report.riskLevel).toBe('high');
      expect(report.summary).toBe('Error occurred during analysis');
    });
  });
});