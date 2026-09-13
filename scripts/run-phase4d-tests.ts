import { runPhase4DDuplicateTests } from '../lib/duplicates/test-suite';

async function main() {
  console.log('Starting Phase 4D Automated Test Suite Execution...\n');
  const results = await runPhase4DDuplicateTests();

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const blocked = results.filter((r) => (r.status as string) === 'BLOCKED').length;

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`BLOCKED: ${blocked}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
