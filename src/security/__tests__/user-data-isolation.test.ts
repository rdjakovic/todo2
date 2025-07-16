/**
 * User Data Isolation and Access Control Tests
 * 
 * Tests for the user data isolation analyzer, segregation tester,
 * and data retention analyzer components.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserDataIsolationAnalyzer } from '../user-data-isolation-analyzer';
import { UserDataSegregationTester, runQuickDataSegregationCheck } from '../user-data-segregation-tester';
import { DataRetentionAnalyzer, runQuickDataRetentionAnalysis } from '../data-retention-analyzer';
import { UserDataIsolationChecker, runQuickUserDataCheck } from '../user-data-isolation-checker';

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null }))
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      signOut: vi.fn(() => Promise.resolve({ error: null }))
    }
  }
}));

describe('UserDataIsolationAnalyzer', () => {
  let analyzer: UserDataIsolationAnalyzer;

  beforeEach(() => {
    analyzer = new UserDataIsolationAnalyzer();
  });

  describe('analyzeRLSPolicies', () => {
    it('should identify secure RLS policies', async () => {
      const migrationFiles = [
        `
        CREATE POLICY "Users can manage their own lists"
          ON lists
          FOR ALL
          TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can manage todos in their lists"
          ON todos
          FOR ALL
          TO authenticated
          USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = todos.list_id AND lists.user_id = auth.uid()));
        `
      ];

      const assessments = await analyzer.analyzeRLSPolicies(migrationFiles);
      
      expect(assessments.length).toBeGreaterThanOrEqual(2);
      const listsPolicy = assessments.find(a => a.tableName === 'lists');
      expect(listsPolicy).toBeDefined();
      expect(listsPolicy!.userIsolation).toBe(true);
      expect(listsPolicy!.securityLevel).toBe('SECURE');
    });

    it('should identify weak RLS policies', async () => {
      const migrationFiles = [
        `
        CREATE POLICY "Weak policy"
          ON lists
          FOR ALL
          TO authenticated
          USING (true);
        
        CREATE POLICY "Secure todos policy"
          ON todos
          FOR ALL
          TO authenticated
          USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = todos.list_id AND lists.user_id = auth.uid()));
        `
      ];

      const assessments = await analyzer.analyzeRLSPolicies(migrationFiles);
      
      expect(assessments.length).toBeGreaterThanOrEqual(2);
      const weakPolicy = assessments.find(a => a.policyName === 'Weak policy');
      expect(weakPolicy).toBeDefined();
      expect(weakPolicy!.securityLevel).toBe('VULNERABLE');
      expect(weakPolicy!.findings.length).toBeGreaterThanOrEqual(2); // Weak policy + overly permissive
    });

    it('should identify missing RLS policies for critical tables', async () => {
      const migrationFiles = ['-- No RLS policies'];

      const assessments = await analyzer.analyzeRLSPolicies(migrationFiles);
      
      // Should create missing policy assessments for lists and todos
      expect(assessments.length).toBeGreaterThanOrEqual(2);
      const missingPolicies = assessments.filter(a => a.securityLevel === 'MISSING');
      expect(missingPolicies.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('analyzeUserDataSegregation', () => {
    it('should identify proper user data filtering', async () => {
      const codeFiles = [
        {
          path: 'src/store/todoStore.ts',
          content: `
            const { data, error } = await supabase
              .from("lists")
              .select("*")
              .eq("user_id", currentUser.id);
          `
        }
      ];

      const assessments = await analyzer.analyzeUserDataSegregation(codeFiles);
      
      expect(assessments).toHaveLength(1);
      expect(assessments[0].hasUserFilter).toBe(true);
      expect(assessments[0].crossUserAccess).toBe(false);
      expect(assessments[0].dataLeakageRisk).toBe('LOW');
    });

    it('should identify missing user data filtering', async () => {
      const codeFiles = [
        {
          path: 'src/store/todoStore.ts',
          content: `
            const { data, error } = await supabase
              .from("lists")
              .select("*");
          `
        }
      ];

      const assessments = await analyzer.analyzeUserDataSegregation(codeFiles);
      
      expect(assessments).toHaveLength(1);
      expect(assessments[0].hasUserFilter).toBe(false);
      expect(assessments[0].crossUserAccess).toBe(true);
      expect(assessments[0].dataLeakageRisk).toBe('HIGH');
    });
  });

  describe('generateSecurityReport', () => {
    it('should generate comprehensive security report', async () => {
      const migrationFiles = [
        `
        CREATE POLICY "Users can manage their own lists"
          ON lists FOR ALL TO authenticated
          USING (auth.uid() = user_id);
        `
      ];
      
      const codeFiles = [
        {
          path: 'src/store/todoStore.ts',
          content: 'supabase.from("lists").select("*").eq("user_id", userId)'
        }
      ];

      const report = await analyzer.generateSecurityReport(migrationFiles, codeFiles);
      
      expect(report.applicationName).toBe('Todo2');
      expect(report.rlsPolicyAssessments.length).toBeGreaterThanOrEqual(1);
      expect(report.dataSegregationAssessments).toHaveLength(1);
      expect(report.overallSecurityScore).toBeGreaterThanOrEqual(0);
      expect(report.recommendations).toBeInstanceOf(Array);
    });
  });
});

describe('UserDataSegregationTester', () => {
  let tester: UserDataSegregationTester;

  beforeEach(() => {
    tester = new UserDataSegregationTester();
  });

  afterEach(async () => {
    await tester.cleanupTestEnvironment();
  });

  describe('runDataSegregationTests', () => {
    it('should run all segregation tests', async () => {
      await tester.setupTestEnvironment();
      const results = await tester.runDataSegregationTests();
      
      expect(results.suiteName).toBe('User Data Segregation Test Suite');
      expect(results.testResults).toBeInstanceOf(Array);
      expect(results.testResults.length).toBeGreaterThan(0);
      expect(results.summary).toContain('Test Results');
    });
  });

  describe('runQuickDataSegregationCheck', () => {
    it('should perform quick segregation check', async () => {
      const result = await runQuickDataSegregationCheck();
      
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('criticalIssues');
      expect(result).toHaveProperty('summary');
      expect(typeof result.criticalIssues).toBe('number');
    });
  });
});

describe('DataRetentionAnalyzer', () => {
  let analyzer: DataRetentionAnalyzer;

  beforeEach(() => {
    analyzer = new DataRetentionAnalyzer();
  });

  describe('analyzeDataRetentionPolicies', () => {
    it('should analyze retention policies for different data types', async () => {
      const codeFiles = [
        {
          path: 'src/store/todoStore.ts',
          content: 'deleteTodo(id) { /* deletion logic */ }'
        }
      ];

      const policies = await analyzer.analyzeDataRetentionPolicies(codeFiles);
      
      expect(policies).toBeInstanceOf(Array);
      expect(policies.length).toBeGreaterThan(0);
      expect(policies[0]).toHaveProperty('dataType');
      expect(policies[0]).toHaveProperty('userControlledDeletion');
    });
  });

  describe('analyzeDeletionProcesses', () => {
    it('should identify deletion processes', async () => {
      const codeFiles = [
        {
          path: 'src/store/todoStore.ts',
          content: `
            deleteTodo: async (todoId) => {
              await supabase.from("todos").delete().eq("id", todoId);
            },
            handleDelete: () => {
              // User initiated deletion
            }
          `
        }
      ];

      const processes = await analyzer.analyzeDeletionProcesses(codeFiles);
      
      expect(processes).toBeInstanceOf(Array);
      expect(processes.length).toBeGreaterThan(0);
      expect(processes.some(p => p.userInitiated)).toBe(true);
    });
  });

  describe('runQuickDataRetentionAnalysis', () => {
    it('should perform quick retention analysis', async () => {
      const codeFiles = [
        {
          path: 'src/store/todoStore.ts',
          content: 'deleteTodo() { /* deletion */ }'
        }
      ];

      const result = await runQuickDataRetentionAnalysis(codeFiles);
      
      expect(result).toHaveProperty('complianceScore');
      expect(result).toHaveProperty('criticalIssues');
      expect(result).toHaveProperty('hasUserDeletion');
      expect(result).toHaveProperty('summary');
      expect(typeof result.complianceScore).toBe('number');
    });
  });
});

describe('UserDataIsolationChecker', () => {
  let checker: UserDataIsolationChecker;

  beforeEach(() => {
    checker = new UserDataIsolationChecker();
  });

  describe('quickIsolationCheck', () => {
    it('should perform quick isolation check', async () => {
      const config = {
        migrationFiles: [
          `CREATE POLICY "test" ON lists FOR ALL USING (auth.uid() = user_id);`
        ],
        codeFiles: [
          {
            path: 'src/store/todoStore.ts',
            content: 'supabase.from("lists").select("*").eq("user_id", userId)'
          }
        ]
      };

      const result = await checker.quickIsolationCheck(config);
      
      expect(result).toHaveProperty('secure');
      expect(result).toHaveProperty('criticalIssues');
      expect(result).toHaveProperty('rlsEnabled');
      expect(result).toHaveProperty('userDataIsolated');
      expect(result).toHaveProperty('recommendations');
      expect(typeof result.secure).toBe('boolean');
    });
  });

  describe('validateRLSPolicies', () => {
    it('should validate RLS policies', async () => {
      const migrationFiles = [
        `CREATE POLICY "secure_lists" ON lists FOR ALL USING (auth.uid() = user_id);`,
        `CREATE POLICY "secure_todos" ON todos FOR ALL USING (EXISTS (SELECT 1 FROM lists WHERE lists.id = todos.list_id AND lists.user_id = auth.uid()));`
      ];

      const result = await checker.validateRLSPolicies(migrationFiles);
      
      expect(result).toHaveProperty('allTablesProtected');
      expect(result).toHaveProperty('weakPolicies');
      expect(result).toHaveProperty('missingPolicies');
      expect(result).toHaveProperty('recommendations');
      expect(result.allTablesProtected).toBe(true);
    });
  });

  describe('runQuickUserDataCheck', () => {
    it('should perform comprehensive quick check', async () => {
      const migrationFiles = [
        `CREATE POLICY "test" ON lists FOR ALL USING (auth.uid() = user_id);`
      ];
      const codeFiles = [
        {
          path: 'src/store/todoStore.ts',
          content: 'supabase.from("lists").select("*").eq("user_id", userId)'
        }
      ];

      const result = await runQuickUserDataCheck(migrationFiles, codeFiles);
      
      expect(result).toHaveProperty('secure');
      expect(result).toHaveProperty('criticalIssues');
      expect(result).toHaveProperty('complianceScore');
      expect(result).toHaveProperty('summary');
      expect(typeof result.secure).toBe('boolean');
      expect(typeof result.criticalIssues).toBe('number');
      expect(typeof result.complianceScore).toBe('number');
    });
  });
});

describe('Integration Tests', () => {
  it('should handle real migration files', async () => {
    const realMigrationContent = `
      CREATE TABLE IF NOT EXISTS lists (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
      );
      
      ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can manage their own lists"
        ON lists FOR ALL TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    `;

    const analyzer = new UserDataIsolationAnalyzer();
    const assessments = await analyzer.analyzeRLSPolicies([realMigrationContent]);
    
    expect(assessments.length).toBeGreaterThanOrEqual(1);
    const listsAssessment = assessments.find(a => a.tableName === 'lists');
    expect(listsAssessment).toBeDefined();
    expect(listsAssessment!.userIsolation).toBe(true);
  });

  it('should handle real code files', async () => {
    const realCodeContent = `
      export const useTodoStore = create((set, get) => ({
        fetchLists: async (user) => {
          const { data: lists, error } = await supabase
            .from("lists")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true });
        }
      }));
    `;

    const analyzer = new UserDataIsolationAnalyzer();
    const assessments = await analyzer.analyzeUserDataSegregation([
      { path: 'src/store/todoStore.ts', content: realCodeContent }
    ]);
    
    expect(assessments).toHaveLength(1);
    expect(assessments[0].hasUserFilter).toBe(true);
    expect(assessments[0].dataLeakageRisk).toBe('LOW');
  });
});