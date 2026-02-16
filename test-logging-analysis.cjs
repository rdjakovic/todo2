// Simple test script for logging security analysis
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Logging Security Analysis...\n');

// Test 1: Check for console logging patterns
console.log('📊 Test 1: Analyzing console logging usage...');

const sourceFiles = [];
const walkDir = (dir) => {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walkDir(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
        sourceFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dir}:`, error.message);
  }
};

walkDir('src');

console.log(`   Found ${sourceFiles.length} source files to analyze`);

// Test 2: Count console logging statements
let totalConsoleStatements = 0;
const filesWithLogging = [];
const consoleLogPattern = /console\.(log|error|warn|info|debug|trace)/g;

for (const file of sourceFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(consoleLogPattern);
    
    if (matches) {
      totalConsoleStatements += matches.length;
      filesWithLogging.push(file);
    }
  } catch (error) {
    console.warn(`Could not read file ${file}:`, error.message);
  }
}

console.log(`   Found ${totalConsoleStatements} console logging statements`);
console.log(`   ${filesWithLogging.length} files contain console logging`);

// Test 3: Check for sensitive data patterns
console.log('\n📊 Test 2: Checking for sensitive data in logs...');

const sensitivePatterns = [
  { pattern: /console\.(log|error|warn|info).*user.*:/gi, type: 'User Data' },
  { pattern: /console\.(log|error|warn|info).*session/gi, type: 'Session Data' },
  { pattern: /console\.(log|error|warn|info).*token/gi, type: 'Token Data' },
  { pattern: /console\.(log|error|warn|info).*password/gi, type: 'Password Data' },
  { pattern: /console\.(log|error|warn|info).*auth/gi, type: 'Authentication Data' }
];

const sensitiveFindings = [];

for (const file of sourceFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    for (const { pattern, type } of sensitivePatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        sensitiveFindings.push({
          file,
          type,
          count: matches.length,
          examples: matches.slice(0, 3)
        });
      }
    }
  } catch (error) {
    console.warn(`Could not analyze file ${file}:`, error.message);
  }
}

console.log(`   Found ${sensitiveFindings.length} potential sensitive data exposures`);

if (sensitiveFindings.length > 0) {
  console.log('\n   🚨 Sensitive Data Findings:');
  sensitiveFindings.forEach((finding, index) => {
    console.log(`      ${index + 1}. ${finding.type} in ${finding.file}`);
    console.log(`         Count: ${finding.count}`);
    console.log(`         Examples: ${finding.examples.join(', ')}`);
  });
}

// Test 4: Check for structured logging
console.log('\n📊 Test 3: Checking for structured logging framework...');

let hasStructuredLogging = false;
const loggingFrameworks = ['winston', 'pino', 'bunyan', 'log4js'];

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  for (const framework of loggingFrameworks) {
    if (allDeps[framework]) {
      hasStructuredLogging = true;
      console.log(`   ✅ Found logging framework: ${framework}`);
      break;
    }
  }
} catch (error) {
  console.warn('   Could not read package.json:', error.message);
}

if (!hasStructuredLogging) {
  console.log('   ❌ No structured logging framework detected');
}

// Test 5: Generate summary report
console.log('\n📋 Analysis Summary:');
console.log(`   Total source files analyzed: ${sourceFiles.length}`);
console.log(`   Console logging statements: ${totalConsoleStatements}`);
console.log(`   Files with logging: ${filesWithLogging.length}`);
console.log(`   Sensitive data exposures: ${sensitiveFindings.length}`);
console.log(`   Structured logging: ${hasStructuredLogging ? 'Yes' : 'No'}`);

// Determine risk level
let riskLevel = 'LOW';
if (sensitiveFindings.length > 0) riskLevel = 'HIGH';
else if (totalConsoleStatements > 20) riskLevel = 'MEDIUM';

console.log(`   Overall Risk Level: ${riskLevel}`);

// Generate simple report
const reportContent = `# Logging Security Analysis Report

**Generated**: ${new Date().toISOString()}

## Summary
- **Total source files**: ${sourceFiles.length}
- **Console logging statements**: ${totalConsoleStatements}
- **Files with logging**: ${filesWithLogging.length}
- **Sensitive data exposures**: ${sensitiveFindings.length}
- **Structured logging**: ${hasStructuredLogging ? 'Yes' : 'No'}
- **Risk Level**: ${riskLevel}

## Key Findings

### Console Logging Usage
${totalConsoleStatements > 10 ? '⚠️ **HIGH**: Extensive console logging detected' : '✅ **LOW**: Minimal console logging'}

### Sensitive Data Exposure
${sensitiveFindings.length > 0 ? '🚨 **HIGH**: Potential sensitive data in logs' : '✅ **LOW**: No obvious sensitive data exposure'}

### Structured Logging
${!hasStructuredLogging ? '⚠️ **MEDIUM**: No structured logging framework' : '✅ **LOW**: Structured logging implemented'}

## Recommendations
1. ${totalConsoleStatements > 10 ? 'Reduce console logging in production' : 'Continue current logging practices'}
2. ${sensitiveFindings.length > 0 ? 'Remove sensitive data from logs immediately' : 'Monitor for sensitive data in future logging'}
3. ${!hasStructuredLogging ? 'Implement structured logging framework' : 'Continue using structured logging'}
4. Implement environment-based logging configuration
5. Create security event monitoring system

---
*Generated by Logging Security Analyzer*
`;

// Save report
try {
  if (!fs.existsSync('security-reports')) {
    fs.mkdirSync('security-reports', { recursive: true });
  }
  
  fs.writeFileSync('security-reports/logging-security-test-report.md', reportContent, 'utf8');
  console.log('\n📄 Test report saved to: security-reports/logging-security-test-report.md');
} catch (error) {
  console.error('Failed to save report:', error.message);
}

console.log('\n✅ Logging security analysis test completed!');