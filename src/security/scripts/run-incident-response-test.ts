#!/usr/bin/env node

/**
 * Incident Response Testing Script
 * 
 * This script runs comprehensive incident response testing to validate
 * the effectiveness of security incident response procedures.
 */

import { runIncidentResponseTesting, runSpecificSimulation } from '../incident-response-tester';

async function main() {
  console.log('🚨 Security Incident Response Testing Framework');
  console.log('='.repeat(50));
  console.log();

  const args = process.argv.slice(2);
  const command = args[0];
  const simulationId = args[1];

  try {
    if (command === 'run' && simulationId) {
      // Run specific simulation
      console.log(`🎯 Running specific simulation: ${simulationId}`);
      const result = await runSpecificSimulation(simulationId);
      
      console.log('\n📊 Simulation Results:');
      console.log(`   Success: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Score: ${result.score}/100`);
      console.log(`   Duration: ${result.duration.toFixed(1)} minutes`);
      
      if (result.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        result.recommendations.forEach(rec => console.log(`   - ${rec}`));
      }
      
    } else if (command === 'list') {
      // List available simulations
      const { IncidentResponseTester } = await import('../incident-response-tester');
      const tester = new IncidentResponseTester();
      const simulations = tester.getAvailableSimulations();
      
      console.log('📋 Available Incident Simulations:');
      console.log();
      
      simulations.forEach(sim => {
        console.log(`🔸 ${sim.id}: ${sim.name}`);
        console.log(`   Category: ${sim.category}`);
        console.log(`   Severity: ${sim.severity}`);
        console.log(`   Description: ${sim.description}`);
        console.log(`   Expected Duration: ${sim.timeoutMinutes} minutes`);
        console.log();
      });
      
    } else {
      // Run all simulations (default)
      console.log('🚀 Running comprehensive incident response testing...');
      console.log('This will test all incident response scenarios and procedures.');
      console.log();
      
      const results = await runIncidentResponseTesting();
      
      // Display summary
      const totalTests = results.length;
      const successfulTests = results.filter(r => r.success).length;
      const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalTests;
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      
      console.log('\n🏁 Testing Complete!');
      console.log('='.repeat(30));
      console.log(`📊 Overall Results:`);
      console.log(`   Success Rate: ${successfulTests}/${totalTests} (${Math.round((successfulTests/totalTests)*100)}%)`);
      console.log(`   Average Score: ${averageScore.toFixed(1)}/100`);
      console.log(`   Total Duration: ${totalDuration.toFixed(1)} minutes`);
      console.log(`   Assessment: ${averageScore >= 80 ? '🟢 EXCELLENT' : averageScore >= 70 ? '🟡 GOOD' : averageScore >= 60 ? '🟠 FAIR' : '🔴 NEEDS IMPROVEMENT'}`);
      
      console.log('\n📋 Individual Results:');
      results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${status} ${result.simulationId}: ${result.score}/100 (${result.duration.toFixed(1)}m)`);
      });
      
      // Show key recommendations
      const allRecommendations = new Set<string>();
      results.forEach(result => {
        result.recommendations.forEach(rec => allRecommendations.add(rec));
      });
      
      if (allRecommendations.size > 0) {
        console.log('\n💡 Key Recommendations:');
        Array.from(allRecommendations).slice(0, 5).forEach(rec => {
          console.log(`   - ${rec}`);
        });
      }
      
      console.log('\n📄 Detailed report saved to: security-reports/incident-response-test-report.md');
    }
    
  } catch (error) {
    console.error('\n❌ Testing failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
  
  console.log('\n✅ Incident response testing completed successfully!');
  console.log();
  console.log('📚 Next Steps:');
  console.log('   1. Review the detailed test report');
  console.log('   2. Address any failed test scenarios');
  console.log('   3. Implement recommended improvements');
  console.log('   4. Schedule regular testing (quarterly recommended)');
  console.log('   5. Update incident response procedures based on findings');
}

// Display usage information
function showUsage() {
  console.log('Usage:');
  console.log('  npm run test:incident-response              # Run all simulations');
  console.log('  npm run test:incident-response list         # List available simulations');
  console.log('  npm run test:incident-response run <id>     # Run specific simulation');
  console.log();
  console.log('Examples:');
  console.log('  npm run test:incident-response');
  console.log('  npm run test:incident-response list');
  console.log('  npm run test:incident-response run SIM-AUTH-001');
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});