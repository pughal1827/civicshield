import { runPhase4EPriorityTests } from '../lib/priority/test-suite';

async function main() {
  console.log('Starting Phase 4E Priority Engine Automated Test Runner...\n');
  const results = runPhase4EPriorityTests();

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
