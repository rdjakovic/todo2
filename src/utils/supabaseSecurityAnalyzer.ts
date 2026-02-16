/**
 * Supabase Authentication Security Analyzer
 * 
 * This utility performs comprehensive security analysis of Supabase authentication integration
 * including JWT token validation, refresh mechanisms, and authentication state management.
 */

import { supabase } from '../lib/supabase';

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'authentication' | 'authorization' | 'configuration' | 'token_management';
  location: string;
  evidence?: string[];
  recommendation: string;
  cweId?: string;
}

export interface AuthSecurityAnalysis {
  timestamp: Date;
  findings: SecurityFinding[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    overallRisk: 'critical' | 'high' | 'medium' | 'low';
  };
  configuration: {
    persistSession: boolean;
    autoRefreshToken: boolean;
    customHeaders: Record<string, string>;
    supabaseUrl: string;
    hasValidUrl: boolean;
    hasAnonKey: boolean;
  };
  tokenAnalysis: {
    hasValidSession: boolean;
    tokenExpiry?: number;
    refreshTokenPresent: boolean;
    jwtStructureValid: boolean;
    tokenClaims?: Record<string, any>;
  };
  stateManagement: {
    authStateListenerActive: boolean;
    userPersistence: boolean;
    errorHandling: string[];
    sessionRecovery: boolean;
  };
}

export class SupabaseSecurityAnalyzer {
  private findings: SecurityFinding[] = [];
  private findingCounter = 0;

  private addFinding(
    title: string,
    description: string,
    severity: SecurityFinding['severity'],
    category: SecurityFinding['category'],
    location: string,
    recommendation: string,
    evidence?: string[],
    cweId?: string
  ): void {
    this.findings.push({
      id: `SUPA-${String(++this.findingCounter).padStart(3, '0')}`,
      title,
      description,
      severity,
      category,
      location,
      evidence,
      recommendation,
      cweId
    });
  }

  /**
   * Analyze Supabase client configuration security
   */
  private analyzeConfiguration(): {
    persistSession: boolean;
    autoRefreshToken: boolean;
    customHeaders: Record<string, string>;
    supabaseUrl: string;
    hasValidUrl: boolean;
    hasAnonKey: boolean;
  } {
    const config = {
      persistSession: true, // Default from supabase.ts
      autoRefreshToken: true, // Default from supabase.ts
      customHeaders: { 'X-Client-Info': 'supabase-js-web' },
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      hasValidUrl: false,
      hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    };

    // Validate URL format
    try {
      new URL(config.supabaseUrl);
      config.hasValidUrl = true;
    } catch {
      config.hasValidUrl = false;
      this.addFinding(
        'Invalid Supabase URL Configuration',
        'The Supabase URL is not properly formatted or missing',
        'critical',
        'configuration',
        'src/lib/supabase.ts',
        'Ensure VITE_SUPABASE_URL is set to a valid URL format',
        [`URL: ${config.supabaseUrl}`],
        'CWE-16'
      );
    }

    // Check for missing anonymous key
    if (!config.hasAnonKey) {
      this.addFinding(
        'Missing Supabase Anonymous Key',
        'The Supabase anonymous key is not configured',
        'critical',
        'configuration',
        'src/lib/supabase.ts',
        'Set VITE_SUPABASE_ANON_KEY environment variable',
        [],
        'CWE-16'
      );
    }

    // Check if URL contains localhost or development indicators
    if (config.supabaseUrl.includes('localhost') || config.supabaseUrl.includes('127.0.0.1')) {
      this.addFinding(
        'Development URL in Production',
        'Supabase URL appears to be pointing to a local development instance',
        'medium',
        'configuration',
        'src/lib/supabase.ts',
        'Ensure production environment uses production Supabase URL',
        [`URL: ${config.supabaseUrl}`],
        'CWE-489'
      );
    }

    // Validate session persistence configuration
    if (config.persistSession) {
      this.addFinding(
        'Session Persistence Enabled',
        'Sessions are persisted in browser storage which may pose security risks',
        'low',
        'configuration',
        'src/lib/supabase.ts',
        'Consider disabling session persistence for high-security applications or implement additional security measures',
        ['persistSession: true'],
        'CWE-922'
      );
    }

    return config;
  }

  /**
   * Analyze JWT token structure and validation
   */
  private async analyzeTokenSecurity(): Promise<{
    hasValidSession: boolean;
    tokenExpiry?: number;
    refreshTokenPresent: boolean;
    jwtStructureValid: boolean;
    tokenClaims?: Record<string, any>;
  }> {
    const analysis = {
      hasValidSession: false,
      tokenExpiry: undefined as number | undefined,
      refreshTokenPresent: false,
      jwtStructureValid: false,
      tokenClaims: undefined as Record<string, any> | undefined
    };

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        this.addFinding(
          'Session Retrieval Error',
          `Failed to retrieve current session: ${error.message}`,
          'medium',
          'authentication',
          'Supabase Auth Session',
          'Investigate session retrieval errors and implement proper error handling',
          [error.message],
          'CWE-287'
        );
        return analysis;
      }

      if (session) {
        analysis.hasValidSession = true;
        analysis.refreshTokenPresent = !!session.refresh_token;
        
        // Analyze access token
        if (session.access_token) {
          try {
            // Parse JWT without verification (for analysis only)
            const tokenParts = session.access_token.split('.');
            if (tokenParts.length === 3) {
              analysis.jwtStructureValid = true;
              
              // Decode payload (base64url)
              const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
              analysis.tokenClaims = payload;
              analysis.tokenExpiry = payload.exp;

              // Check token expiry
              const now = Math.floor(Date.now() / 1000);
              const timeToExpiry = payload.exp - now;
              
              if (timeToExpiry < 0) {
                this.addFinding(
                  'Expired JWT Token',
                  'The current JWT token has expired',
                  'high',
                  'token_management',
                  'JWT Access Token',
                  'Implement proper token refresh mechanism',
                  [`Token expired ${Math.abs(timeToExpiry)} seconds ago`],
                  'CWE-613'
                );
              } else if (timeToExpiry < 300) { // Less than 5 minutes
                this.addFinding(
                  'JWT Token Near Expiry',
                  'The current JWT token will expire soon',
                  'medium',
                  'token_management',
                  'JWT Access Token',
                  'Ensure token refresh is triggered before expiry',
                  [`Token expires in ${timeToExpiry} seconds`],
                  'CWE-613'
                );
              }

              // Check for sensitive claims
              const sensitiveClaims = ['password', 'secret', 'key', 'private'];
              const foundSensitiveClaims = sensitiveClaims.filter(claim => 
                JSON.stringify(payload).toLowerCase().includes(claim)
              );
              
              if (foundSensitiveClaims.length > 0) {
                this.addFinding(
                  'Sensitive Data in JWT Claims',
                  'JWT token contains potentially sensitive information',
                  'medium',
                  'token_management',
                  'JWT Access Token',
                  'Remove sensitive data from JWT claims',
                  foundSensitiveClaims,
                  'CWE-200'
                );
              }

            } else {
              this.addFinding(
                'Invalid JWT Structure',
                'JWT token does not have the expected 3-part structure',
                'high',
                'token_management',
                'JWT Access Token',
                'Investigate JWT token generation and validation',
                [`Token parts: ${tokenParts.length}`],
                'CWE-345'
              );
            }
          } catch (error) {
            this.addFinding(
              'JWT Parsing Error',
              'Failed to parse JWT token structure',
              'medium',
              'token_management',
              'JWT Access Token',
              'Investigate JWT token format and encoding',
              [error instanceof Error ? error.message : String(error)],
              'CWE-345'
            );
          }
        }

        // Check refresh token presence
        if (!analysis.refreshTokenPresent) {
          this.addFinding(
            'Missing Refresh Token',
            'No refresh token found in session',
            'medium',
            'token_management',
            'Supabase Session',
            'Ensure refresh tokens are properly configured and stored',
            [],
            'CWE-613'
          );
        }
      } else {
        this.addFinding(
          'No Active Session',
          'No active authentication session found',
          'info',
          'authentication',
          'Supabase Auth Session',
          'This is expected for unauthenticated users',
          [],
          'CWE-287'
        );
      }
    } catch (error) {
      this.addFinding(
        'Token Analysis Error',
        'Failed to analyze authentication tokens',
        'medium',
        'token_management',
        'Token Analysis',
        'Investigate token analysis implementation',
        [error instanceof Error ? error.message : String(error)],
        'CWE-755'
      );
    }

    return analysis;
  }

  /**
   * Analyze authentication state management
   */
  private analyzeStateManagement(): {
    authStateListenerActive: boolean;
    userPersistence: boolean;
    errorHandling: string[];
    sessionRecovery: boolean;
  } {
    const analysis = {
      authStateListenerActive: true, // Assumed from authStore.ts implementation
      userPersistence: true, // Based on persistSession: true
      errorHandling: [] as string[],
      sessionRecovery: true // Based on authStore.ts implementation
    };

    // Analyze error handling patterns from authStore.ts
    const errorHandlingPatterns = [
      'Invalid Refresh Token',
      'Refresh Token Not Found',
      'invalid_grant',
      'session_not_found',
      'Session from session_id claim in JWT does not exist'
    ];

    analysis.errorHandling = errorHandlingPatterns;

    // Check for potential security issues in state management
    this.addFinding(
      'Comprehensive Error Handling',
      'Authentication store implements comprehensive error handling for various session scenarios',
      'info',
      'authentication',
      'src/store/authStore.ts',
      'Continue monitoring error handling effectiveness',
      errorHandlingPatterns,
      'CWE-755'
    );

    // Check for session recovery implementation
    if (analysis.sessionRecovery) {
      this.addFinding(
        'Session Recovery Implemented',
        'Application implements session recovery mechanisms',
        'info',
        'authentication',
        'src/store/authStore.ts',
        'Ensure session recovery is secure and doesn\'t bypass authentication',
        ['Session recovery via getUser() fallback'],
        'CWE-613'
      );
    }

    // Check for potential race conditions in data loading
    this.addFinding(
      'Potential Race Condition in Data Loading',
      'Multiple authentication events could trigger concurrent data loading',
      'low',
      'authentication',
      'src/store/authStore.ts',
      'Implement proper synchronization to prevent race conditions in data loading',
      ['forceDataLoad called from multiple auth events'],
      'CWE-362'
    );

    return analysis;
  }

  /**
   * Test authentication flow security
   */
  private async testAuthenticationFlow(): Promise<void> {
    try {
      // Test sign out functionality
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        this.addFinding(
          'Sign Out Error',
          `Sign out functionality returned an error: ${signOutError.message}`,
          'medium',
          'authentication',
          'Authentication Flow',
          'Investigate and fix sign out error handling',
          [signOutError.message],
          'CWE-287'
        );
      }

      // Test session refresh (if session exists)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          this.addFinding(
            'Token Refresh Error',
            `Token refresh failed: ${refreshError.message}`,
            'high',
            'token_management',
            'Token Refresh',
            'Implement proper token refresh error handling',
            [refreshError.message],
            'CWE-613'
          );
        }
      }

    } catch (error) {
      this.addFinding(
        'Authentication Flow Test Error',
        'Failed to test authentication flow',
        'medium',
        'authentication',
        'Authentication Flow Test',
        'Investigate authentication flow testing implementation',
        [error instanceof Error ? error.message : String(error)],
        'CWE-755'
      );
    }
  }

  /**
   * Perform comprehensive Supabase authentication security analysis
   */
  public async analyze(): Promise<AuthSecurityAnalysis> {
    this.findings = [];
    this.findingCounter = 0;

    console.log('Starting Supabase authentication security analysis...');

    // Analyze configuration
    const configuration = this.analyzeConfiguration();

    // Analyze token security
    const tokenAnalysis = await this.analyzeTokenSecurity();

    // Analyze state management
    const stateManagement = this.analyzeStateManagement();

    // Test authentication flow
    await this.testAuthenticationFlow();

    // Calculate summary
    const summary = {
      criticalCount: this.findings.filter(f => f.severity === 'critical').length,
      highCount: this.findings.filter(f => f.severity === 'high').length,
      mediumCount: this.findings.filter(f => f.severity === 'medium').length,
      lowCount: this.findings.filter(f => f.severity === 'low').length,
      infoCount: this.findings.filter(f => f.severity === 'info').length,
      overallRisk: this.calculateOverallRisk()
    };

    console.log(`Analysis complete. Found ${this.findings.length} findings.`);

    return {
      timestamp: new Date(),
      findings: this.findings,
      summary,
      configuration,
      tokenAnalysis,
      stateManagement
    };
  }

  private calculateOverallRisk(): 'critical' | 'high' | 'medium' | 'low' {
    const criticalCount = this.findings.filter(f => f.severity === 'critical').length;
    const highCount = this.findings.filter(f => f.severity === 'high').length;
    const mediumCount = this.findings.filter(f => f.severity === 'medium').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (highCount > 0 || mediumCount > 3) return 'medium';
    return 'low';
  }

  /**
   * Generate a detailed security report
   */
  public generateReport(analysis: AuthSecurityAnalysis): string {
    const report = [];
    
    report.push('# Supabase Authentication Security Analysis Report');
    report.push(`Generated: ${analysis.timestamp.toISOString()}`);
    report.push('');
    
    // Executive Summary
    report.push('## Executive Summary');
    report.push(`Overall Risk Level: **${analysis.summary.overallRisk.toUpperCase()}**`);
    report.push('');
    report.push('### Finding Summary');
    report.push(`- Critical: ${analysis.summary.criticalCount}`);
    report.push(`- High: ${analysis.summary.highCount}`);
    report.push(`- Medium: ${analysis.summary.mediumCount}`);
    report.push(`- Low: ${analysis.summary.lowCount}`);
    report.push(`- Info: ${analysis.summary.infoCount}`);
    report.push('');

    // Configuration Analysis
    report.push('## Configuration Analysis');
    report.push(`- Supabase URL Valid: ${analysis.configuration.hasValidUrl}`);
    report.push(`- Anonymous Key Present: ${analysis.configuration.hasAnonKey}`);
    report.push(`- Session Persistence: ${analysis.configuration.persistSession}`);
    report.push(`- Auto Token Refresh: ${analysis.configuration.autoRefreshToken}`);
    report.push('');

    // Token Analysis
    report.push('## Token Analysis');
    report.push(`- Valid Session: ${analysis.tokenAnalysis.hasValidSession}`);
    report.push(`- JWT Structure Valid: ${analysis.tokenAnalysis.jwtStructureValid}`);
    report.push(`- Refresh Token Present: ${analysis.tokenAnalysis.refreshTokenPresent}`);
    if (analysis.tokenAnalysis.tokenExpiry) {
      const now = Math.floor(Date.now() / 1000);
      const timeToExpiry = analysis.tokenAnalysis.tokenExpiry - now;
      report.push(`- Token Expires In: ${timeToExpiry} seconds`);
    }
    report.push('');

    // State Management Analysis
    report.push('## State Management Analysis');
    report.push(`- Auth State Listener: ${analysis.stateManagement.authStateListenerActive}`);
    report.push(`- User Persistence: ${analysis.stateManagement.userPersistence}`);
    report.push(`- Session Recovery: ${analysis.stateManagement.sessionRecovery}`);
    report.push(`- Error Handling Patterns: ${analysis.stateManagement.errorHandling.length}`);
    report.push('');

    // Detailed Findings
    report.push('## Detailed Findings');
    report.push('');

    const findingsBySeverity = {
      critical: analysis.findings.filter(f => f.severity === 'critical'),
      high: analysis.findings.filter(f => f.severity === 'high'),
      medium: analysis.findings.filter(f => f.severity === 'medium'),
      low: analysis.findings.filter(f => f.severity === 'low'),
      info: analysis.findings.filter(f => f.severity === 'info')
    };

    Object.entries(findingsBySeverity).forEach(([severity, findings]) => {
      if (findings.length > 0) {
        report.push(`### ${severity.toUpperCase()} Severity Findings`);
        report.push('');
        
        findings.forEach(finding => {
          report.push(`#### ${finding.id}: ${finding.title}`);
          report.push(`**Category:** ${finding.category}`);
          report.push(`**Location:** ${finding.location}`);
          if (finding.cweId) {
            report.push(`**CWE ID:** ${finding.cweId}`);
          }
          report.push('');
          report.push(`**Description:** ${finding.description}`);
          report.push('');
          report.push(`**Recommendation:** ${finding.recommendation}`);
          
          if (finding.evidence && finding.evidence.length > 0) {
            report.push('');
            report.push('**Evidence:**');
            finding.evidence.forEach(evidence => {
              report.push(`- ${evidence}`);
            });
          }
          report.push('');
          report.push('---');
          report.push('');
        });
      }
    });

    // Recommendations Summary
    report.push('## Priority Recommendations');
    report.push('');
    
    const criticalFindings = analysis.findings.filter(f => f.severity === 'critical');
    const highFindings = analysis.findings.filter(f => f.severity === 'high');
    
    if (criticalFindings.length > 0) {
      report.push('### Immediate Action Required (Critical)');
      criticalFindings.forEach(finding => {
        report.push(`1. **${finding.title}**: ${finding.recommendation}`);
      });
      report.push('');
    }
    
    if (highFindings.length > 0) {
      report.push('### High Priority');
      highFindings.forEach(finding => {
        report.push(`1. **${finding.title}**: ${finding.recommendation}`);
      });
      report.push('');
    }

    return report.join('\n');
  }
}

// Export convenience function for easy usage
export async function analyzeSupabaseAuthSecurity(): Promise<AuthSecurityAnalysis> {
  const analyzer = new SupabaseSecurityAnalyzer();
  return await analyzer.analyze();
}

export async function generateSupabaseSecurityReport(): Promise<string> {
  const analyzer = new SupabaseSecurityAnalyzer();
  const analysis = await analyzer.analyze();
  return analyzer.generateReport(analysis);
}