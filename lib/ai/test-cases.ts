import { analyzeCivicIssue } from './gemini';
import { IncidentCategory } from '@/types/incident';

export interface TestCase {
  id: number;
  description: string;
  expectedCategory: IncidentCategory;
  imageUrl?: string;
}

export const CIVIC_AI_TEST_CASES: TestCase[] = [
  {
    id: 1,
    description: 'Huge pothole near school gate',
    expectedCategory: 'ROAD_POTHOLE',
  },
  {
    id: 2,
    description: 'Garbage has been dumped near apartment entrance',
    expectedCategory: 'GARBAGE_OVERFLOW',
  },
  {
    id: 3,
    description: 'Street light has been broken for three days',
    expectedCategory: 'BROKEN_STREETLIGHT',
  },
  {
    id: 4,
    description: 'Water is leaking continuously from the roadside pipe',
    expectedCategory: 'WATER_LEAKAGE',
  },
  {
    id: 5,
    description: 'Drain is blocked and sewage is overflowing',
    expectedCategory: 'DRAINAGE_BLOCKAGE',
  },
  {
    id: 6,
    description: 'Traffic signal is not working at the junction',
    expectedCategory: 'TRAFFIC_SIGNAL_DAMAGED',
  },
  {
    id: 7,
    description: 'Public park bench and railing are badly damaged',
    expectedCategory: 'PUBLIC_INFRA_DAMAGE',
  },
];

export async function runAIEngineTestCases() {
  console.log('=== CIVICSHIELD AI ENGINE TEST RUNNER ===');
  const results = [];

  for (const test of CIVIC_AI_TEST_CASES) {
    console.log(`\n--- TEST #${test.id}: "${test.description}" ---`);
    console.log(`Expected Category: ${test.expectedCategory}`);

    const startTime = Date.now();
    const { analysis, isFallback } = await analyzeCivicIssue(test.description, test.imageUrl);
    const duration = Date.now() - startTime;

    const matched = analysis.category === test.expectedCategory;

    console.log(`Result Category: ${analysis.category} [${matched ? 'MATCH' : 'MISMATCH'}]`);
    console.log(`Summary: "${analysis.summary}"`);
    console.log(`Severity: ${analysis.severity} | Safety Risk: ${analysis.safetyRiskScore}/100`);
    console.log(`Recommended Dept: ${analysis.recommendedDepartmentCode} | Confidence: ${analysis.confidenceScore}`);
    console.log(`Fallback Used: ${isFallback} | Processing Time: ${duration}ms`);

    results.push({
      testId: test.id,
      description: test.description,
      expected: test.expectedCategory,
      received: analysis.category,
      matched,
      isFallback,
      durationMs: duration,
    });
  }

  console.log('\n=== TEST RUNNER SUMMARY ===');
  console.table(results);
  return results;
}
