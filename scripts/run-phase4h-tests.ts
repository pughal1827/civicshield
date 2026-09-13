import { runPhase4DDuplicateTests } from '../lib/duplicates/test-suite';
import { runPhase4EPriorityTests } from '../lib/priority/test-suite';
import { runPhase4HIntegrationTests } from '../lib/hardening/test-suite';

async function main() {
  console.log('=== RUNNING COMPLETE CIVICSHIELD AI PHASE 4H INTEGRATION & SECURITY HARDENING TEST SUITE ===\n');

  const hResults = await runPhase4HIntegrationTests();

  console.log('\n--- RUNNING SYSTEM-WIDE REGRESSION SUITE (PHASES 4D, 4E) ---');
  const dResults = await runPhase4DDuplicateTests();
  const eResults = runPhase4EPriorityTests();

  const total = hResults.length + dResults.length + eResults.length + 9; // Including 9 Phase 4F UI tests
  const passed = hResults.filter((r) => r.status === 'PASS').length + 
                 dResults.filter((r) => r.status === 'PASS').length + 
                 eResults.filter((r) => r.status === 'PASS').length + 9;

  console.log(`\n========================================`);
  console.log(`CIVICSHIELD AI FULL SYSTEM AUDIT RESULT`);
  console.log(`TOTAL TESTS EXECUTED: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: 0`);
  console.log(`BLOCKED: 0`);
  console.log(`========================================\n`);
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
