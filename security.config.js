/**
 * Security Analysis Configuration
 * Defines security scanning rules and thresholds for the application
 */

export const securityConfig = {
  // Vulnerability severity thresholds
  vulnerabilityThresholds: {
    critical: 0,  // No critical vulnerabilities allowed
    high: 2,      // Maximum 2 high severity vulnerabilities
    medium: 5,    // Maximum 5 medium severity vulnerabilities
    low: 10       // Maximum 10 low severity vulnerabilities
  },

  // Security scanning rules
  scanRules: {
    // Code analysis rules
    codeAnalysis: {
      detectHardcodedSecrets: true,
      detectSqlInjection: true,
      detectXssVulnerabilities: true,
      detectInsecureRandomness: true,
      detectWeakCryptography: true,
      detectPathTraversal: true,
      detectCommandInjection: true,
    },

    // Dependency analysis rules
    dependencyAnalysis: {
      checkKnownVulnerabilities: true,
      checkOutdatedPackages: true,
      checkLicenseCompliance: true,
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'],
    },

    // Configuration analysis rules
    configAnalysis: {
      checkTauriPermissions: true,
      checkCorsConfiguration: true,
      checkAuthenticationSetup: true,
      checkDataValidation: true,
    }
  },

  // File patterns to scan
  scanPatterns: {
    include: [
      'src/**/*.{ts,tsx,js,jsx}',
      'src-tauri/**/*.rs',
      '*.json',
      '*.toml',
      '*.md'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'src-tauri/target/**',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}'
    ]
  },

  // Report configuration
  reporting: {
    format: 'json',
    outputPath: './security-reports',
    includeFixSuggestions: true,
    includeCweMapping: true,
    includeOwasp: true
  }
};

export default securityConfig;