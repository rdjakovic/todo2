/**
 * Tests for Supabase Authentication Security Analyzer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment variables


vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      onAuthStateChange: vi.fn()
    } as any
  }
}));

import { SupabaseSecurityAnalyzer, analyzeSupabaseAuthSecurity } from '../supabaseSecurityAnalyzer';
import { supabase } from '../../lib/supabase';

// Get the mocked supabase for type safety
const mockSupabase = vi.mocked(supabase);

describe('SupabaseSecurityAnalyzer', () => {
  let analyzer: SupabaseSecurityAnalyzer;

  beforeEach(() => {
    analyzer = new SupabaseSecurityAnalyzer();
    vi.clearAllMocks();
    
    // Reset environment variables
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Configuration Analysis', () => {
    it('should detect missing Supabase URL', async () => {
      // Mock environment with empty URL
      vi.stubEnv('VITE_SUPABASE_URL', '');
      
      const analysis = await analyzer.analyze();
      
      const urlFinding = analysis.findings.find(f => f.title.includes('Invalid Supabase URL'));
      expect(urlFinding).toBeDefined();
      expect(urlFinding?.severity).toBe('critical');
    });

    it('should detect missing anonymous key', async () => {
      // Mock environment with empty key
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      
      const analysis = await analyzer.analyze();
      
      const keyFinding = analysis.findings.find(f => f.title.includes('Missing Supabase Anonymous Key'));
      expect(keyFinding).toBeDefined();
      expect(keyFinding?.severity).toBe('critical');
    });

    it('should detect development URL in production', async () => {
      // Mock environment with localhost URL
      vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');
      
      const analysis = await analyzer.analyze();
      
      const devFinding = analysis.findings.find(f => f.title.includes('Development URL'));
      expect(devFinding).toBeDefined();
      expect(devFinding?.severity).toBe('medium');
    });

    it('should note session persistence configuration', async () => {
      const analysis = await analyzer.analyze();
      
      expect(analysis.configuration.persistSession).toBe(true);
      expect(analysis.configuration.autoRefreshToken).toBe(true);
    });
  });

  describe('Token Analysis', () => {
    it('should handle no active session', async () => {
      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const analysis = await analyzer.analyze();
      
      expect(analysis.tokenAnalysis.hasValidSession).toBe(false);
      const noSessionFinding = analysis.findings.find(f => f.title.includes('No Active Session'));
      expect(noSessionFinding?.severity).toBe('info');
    });

    it('should analyze valid JWT token', async () => {
      // Create a mock JWT token
      const mockPayload = {
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
        role: 'authenticated'
      };
      
      const mockToken = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // header
        btoa(JSON.stringify(mockPayload)), // payload
        'signature' // signature
      ].join('.');

      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            access_token: mockToken,
            refresh_token: 'refresh-token-123',
            user: { id: 'user-123' }
          }
        },
        error: null
      });

      const analysis = await analyzer.analyze();
      
      expect(analysis.tokenAnalysis.hasValidSession).toBe(true);
      expect(analysis.tokenAnalysis.jwtStructureValid).toBe(true);
      expect(analysis.tokenAnalysis.refreshTokenPresent).toBe(true);
      expect(analysis.tokenAnalysis.tokenClaims).toEqual(mockPayload);
    });

    it('should detect expired JWT token', async () => {
      const expiredPayload = {
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200
      };
      
      const expiredToken = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        btoa(JSON.stringify(expiredPayload)),
        'signature'
      ].join('.');

      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            access_token: expiredToken,
            refresh_token: 'refresh-token-123'
          }
        },
        error: null
      });

      const analysis = await analyzer.analyze();
      
      const expiredFinding = analysis.findings.find(f => f.title.includes('Expired JWT Token'));
      expect(expiredFinding).toBeDefined();
      expect(expiredFinding?.severity).toBe('high');
    });

    it('should detect token near expiry', async () => {
      const nearExpiryPayload = {
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
        iat: Math.floor(Date.now() / 1000)
      };
      
      const nearExpiryToken = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        btoa(JSON.stringify(nearExpiryPayload)),
        'signature'
      ].join('.');

      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            access_token: nearExpiryToken,
            refresh_token: 'refresh-token-123'
          }
        },
        error: null
      });

      const analysis = await analyzer.analyze();
      
      const nearExpiryFinding = analysis.findings.find(f => f.title.includes('JWT Token Near Expiry'));
      expect(nearExpiryFinding).toBeDefined();
      expect(nearExpiryFinding?.severity).toBe('medium');
    });

    it('should detect sensitive data in JWT claims', async () => {
      const sensitivePayload = {
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        password: 'should-not-be-here',
        secret_key: 'also-should-not-be-here'
      };
      
      const sensitiveToken = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        btoa(JSON.stringify(sensitivePayload)),
        'signature'
      ].join('.');

      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            access_token: sensitiveToken,
            refresh_token: 'refresh-token-123'
          }
        },
        error: null
      });

      const analysis = await analyzer.analyze();
      
      const sensitiveFinding = analysis.findings.find(f => f.title.includes('Sensitive Data in JWT Claims'));
      expect(sensitiveFinding).toBeDefined();
      expect(sensitiveFinding?.severity).toBe('medium');
    });

    it('should detect invalid JWT structure', async () => {
      const invalidToken = 'invalid.jwt'; // Only 2 parts instead of 3

      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            access_token: invalidToken,
            refresh_token: 'refresh-token-123'
          }
        },
        error: null
      });

      const analysis = await analyzer.analyze();
      
      const invalidStructureFinding = analysis.findings.find(f => f.title.includes('Invalid JWT Structure'));
      expect(invalidStructureFinding).toBeDefined();
      expect(invalidStructureFinding?.severity).toBe('high');
    });

    it('should detect missing refresh token', async () => {
      const mockToken = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        btoa(JSON.stringify({ sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 })),
        'signature'
      ].join('.');

      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            access_token: mockToken,
            refresh_token: null // Missing refresh token
          }
        },
        error: null
      });

      const analysis = await analyzer.analyze();
      
      const missingRefreshFinding = analysis.findings.find(f => f.title.includes('Missing Refresh Token'));
      expect(missingRefreshFinding).toBeDefined();
      expect(missingRefreshFinding?.severity).toBe('medium');
    });
  });

  describe('Authentication Flow Testing', () => {
    it('should detect sign out errors', async () => {
      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null
      });
      
      (mockSupabase.auth.signOut as any).mockResolvedValue({
        error: { message: 'Sign out failed' }
      });

      const analysis = await analyzer.analyze();
      
      const signOutFinding = analysis.findings.find(f => f.title.includes('Sign Out Error'));
      expect(signOutFinding).toBeDefined();
      expect(signOutFinding?.severity).toBe('medium');
    });

    it('should detect token refresh errors', async () => {
      const mockToken = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        btoa(JSON.stringify({ sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 })),
        'signature'
      ].join('.');

      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: {
          session: {
            access_token: mockToken,
            refresh_token: 'refresh-token-123'
          }
        },
        error: null
      });

      (mockSupabase.auth.signOut as any).mockResolvedValue({ error: null });
      (mockSupabase.auth.refreshSession as any).mockResolvedValue({
        error: { message: 'Refresh failed' }
      });

      const analysis = await analyzer.analyze();
      
      const refreshFinding = analysis.findings.find(f => f.title.includes('Token Refresh Error'));
      expect(refreshFinding).toBeDefined();
      expect(refreshFinding?.severity).toBe('high');
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate critical risk for critical findings', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      
      const analysis = await analyzer.analyze();
      
      expect(analysis.summary.overallRisk).toBe('critical');
      expect(analysis.summary.criticalCount).toBeGreaterThan(0);
    });

    it('should calculate low risk for minimal findings', async () => {
      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null
      });
      (mockSupabase.auth.signOut as any).mockResolvedValue({ error: null });

      const analysis = await analyzer.analyze();
      
      // Should have minimal findings (mostly info level)
      expect(analysis.summary.criticalCount).toBe(0);
      expect(analysis.summary.highCount).toBe(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', async () => {
      const analysis = await analyzer.analyze();
      const report = analyzer.generateReport(analysis);
      
      expect(report).toContain('# Supabase Authentication Security Analysis Report');
      expect(report).toContain('## Executive Summary');
      expect(report).toContain('## Configuration Analysis');
      expect(report).toContain('## Token Analysis');
      expect(report).toContain('## State Management Analysis');
      expect(report).toContain('## Detailed Findings');
    });

    it('should include finding details in report', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      
      const analysis = await analyzer.analyze();
      const report = analyzer.generateReport(analysis);
      
      expect(report).toContain('CRITICAL Severity Findings');
      expect(report).toContain('Invalid Supabase URL Configuration');
    });
  });

  describe('Convenience Functions', () => {
    it('should export analyzeSupabaseAuthSecurity function', async () => {
      (mockSupabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const analysis = await analyzeSupabaseAuthSecurity();
      
      expect(analysis).toBeDefined();
      expect(analysis.findings).toBeDefined();
      expect(analysis.summary).toBeDefined();
      expect(analysis.configuration).toBeDefined();
      expect(analysis.tokenAnalysis).toBeDefined();
      expect(analysis.stateManagement).toBeDefined();
    });
  });
});

describe('Error Handling', () => {
  let analyzer: SupabaseSecurityAnalyzer;

  beforeEach(() => {
    analyzer = new SupabaseSecurityAnalyzer();
    vi.clearAllMocks();
  });

  it('should handle session retrieval errors gracefully', async () => {
    (mockSupabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: { message: 'Session retrieval failed' }
    });

    const analysis = await analyzer.analyze();
    
    const sessionErrorFinding = analysis.findings.find(f => f.title.includes('Session Retrieval Error'));
    expect(sessionErrorFinding).toBeDefined();
    expect(sessionErrorFinding?.severity).toBe('medium');
  });

  it('should handle JWT parsing errors', async () => {
    const malformedToken = 'not.a.valid.jwt.token';

    (mockSupabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          access_token: malformedToken,
          refresh_token: 'refresh-token-123'
        }
      },
      error: null
    });

    const analysis = await analyzer.analyze();
    
    // Should handle the parsing error gracefully
    expect(analysis.tokenAnalysis.jwtStructureValid).toBe(false);
  });

  it('should handle authentication flow test errors', async () => {
    (mockSupabase.auth.getSession as any).mockRejectedValue(new Error('Network error'));

    const analysis = await analyzer.analyze();
    
    const testErrorFinding = analysis.findings.find(f => f.title.includes('Token Analysis Error'));
    expect(testErrorFinding).toBeDefined();
  });
});