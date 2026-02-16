/**
 * Common security types for analyzers and reporters
 */

export type Severity = 'low' | 'medium' | 'high' | 'critical' | 'info';

export interface SecurityReport {
  timestamp: string;
  name: string;
  riskLevel: Severity;
  summary: string;
}

export interface SecurityRisk {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  recommendation: string;
}

export interface SecurityRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SecurityAnalyzer<T extends SecurityReport> {
  analyze(): Promise<T>;
}
