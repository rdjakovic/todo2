/**
 * Database Security Analyzer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseSecurityAnalyzer, analyzeDatabaseSecurity, generateDatabaseSecurityReport } from '../data-storage-security-analyzer';

// Mock Supabase
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn()
    }
  }
}));

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('DatabaseSecurityAnalyzer', () => {
  let analyzer: DatabaseSecurityAnalyzer;

  beforeEach(() => {
    analyzer = new DatabaseSecurityAnalyzer();
    vi.clearAllMocks();
  });

  describe('RLS Analysis', () => {
    it('should detect RLS enabled tables', async () => {
      // Mock RLS error (indicates RLS is working)
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.rlsAnalysis.tablesWithRLS).toContain('lists');
      expect(analysis.rlsAnalysis.tablesWithRLS).toContain('todos');
      expect(analysis.findings.some(f => f.title.includes('RLS Enabled'))).toBe(true);
    });

    it('should detect tables without RLS', async () => {
      // Mock successful query (indicates RLS is not working)
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.rlsAnalysis.tablesWithoutRLS).toContain('lists');
      expect(analysis.rlsAnalysis.tablesWithoutRLS).toContain('todos');
      expect(analysis.findings.some(f => f.severity === 'critical' && f.title.includes('RLS Not Enforced'))).toBe(true);
    });

    it('should analyze RLS policies from migrations', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.rlsAnalysis.policies.length).toBeGreaterThan(0);
      expect(analysis.rlsAnalysis.policies.some(p => p.tableName === 'lists')).toBe(true);
      expect(analysis.rlsAnalysis.policies.some(p => p.tableName === 'todos')).toBe(true);
    });
  });

  describe('SQL Injection Analysis', () => {
    it('should detect parameterized query usage', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.sqlInjectionAnalysis.parameterizedQueries).toBe(true);
      expect(analysis.findings.some(f => f.title.includes('Parameterized Queries Used'))).toBe(true);
    });

    it('should detect absence of raw SQL usage', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.sqlInjectionAnalysis.rawQueryUsage).toHaveLength(0);
      expect(analysis.findings.some(f => f.title.includes('No Raw SQL Usage Detected'))).toBe(true);
    });
  });

  describe('Permissions Analysis', () => {
    it('should analyze database permissions', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.permissionsAnalysis.principleOfLeastPrivilege).toBe(true);
      expect(analysis.permissionsAnalysis.authenticatedAccess).toContain('lists');
      expect(analysis.permissionsAnalysis.authenticatedAccess).toContain('todos');
    });

    it('should detect demo user security concern', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.findings.some(f => f.title.includes('Demo User in Database'))).toBe(true);
      expect(analysis.findings.some(f => f.severity === 'medium' && f.cweId === 'CWE-798')).toBe(true);
    });
  });

  describe('Data Integrity Analysis', () => {
    it('should analyze foreign key constraints', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.dataIntegrityAnalysis.foreignKeyConstraints).toContain('lists.user_id -> auth.users(id)');
      expect(analysis.dataIntegrityAnalysis.foreignKeyConstraints).toContain('todos.list_id -> lists(id)');
      expect(analysis.findings.some(f => f.title.includes('Foreign Key Constraints Implemented'))).toBe(true);
    });

    it('should analyze check constraints', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.dataIntegrityAnalysis.checkConstraints).toContain('todos.priority CHECK (priority IN (\'low\', \'medium\', \'high\'))');
      expect(analysis.findings.some(f => f.title.includes('Check Constraints for Data Validation'))).toBe(true);
    });

    it('should analyze NOT NULL constraints', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.dataIntegrityAnalysis.notNullConstraints).toContain('lists.name NOT NULL');
      expect(analysis.dataIntegrityAnalysis.notNullConstraints).toContain('todos.title NOT NULL');
      expect(analysis.findings.some(f => f.title.includes('NOT NULL Constraints Applied'))).toBe(true);
    });
  });

  describe('Database Security Testing', () => {
    it('should test authenticated database access', async () => {
      // Mock authenticated session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } }
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.findings.some(f => f.title.includes('Authenticated Database Access Working'))).toBe(true);
    });

    it('should handle database connection errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'Connection failed' }
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.findings.some(f => f.title.includes('Database Connection Issue'))).toBe(true);
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate overall risk correctly', async () => {
      // Mock scenario with critical findings
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [], // This will trigger critical RLS findings
            error: null
          })
        })
      });

      const analysis = await analyzer.analyze();

      expect(analysis.summary.overallRisk).toBe('critical');
      expect(analysis.summary.criticalCount).toBeGreaterThan(0);
    });

    it('should generate comprehensive report', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzer.analyze();
      const report = analyzer.generateReport(analysis);

      expect(report).toContain('Database Security Analysis Report');
      expect(report).toContain('Executive Summary');
      expect(report).toContain('Row Level Security Analysis');
      expect(report).toContain('SQL Injection Protection Analysis');
      expect(report).toContain('Permissions Analysis');
      expect(report).toContain('Data Integrity Analysis');
      expect(report).toContain('Detailed Findings');
    });
  });

  describe('Convenience Functions', () => {
    it('should provide analyzeDatabaseSecurity function', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const analysis = await analyzeDatabaseSecurity();

      expect(analysis).toBeDefined();
      expect(analysis.findings).toBeDefined();
      expect(analysis.summary).toBeDefined();
    });

    it('should provide generateDatabaseSecurityReport function', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'row-level security policy violation' }
          })
        })
      });

      const report = await generateDatabaseSecurityReport();

      expect(typeof report).toBe('string');
      expect(report).toContain('Database Security Analysis Report');
    });
  });
});