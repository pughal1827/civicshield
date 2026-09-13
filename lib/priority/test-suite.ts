import { calculatePriorityScore, PriorityEngineInputs } from './priority-engine';

export interface Phase4ETestResult {
  testId: number;
  name: string;
  expectedTier: string;
  actualScore: number;
  actualTier: string;
  status: 'PASS' | 'FAIL';
  explanationSummary: string;
}

export function runPhase4EPriorityTests(): Phase4ETestResult[] {
  console.log('=== RUNNING PHASE 4E PRIORITY ENGINE TEST SUITE ===');
  const results: Phase4ETestResult[] = [];

  // TEST 1: Open manhole near school (Expected: CRITICAL >= 80)
  try {
    const inputs: PriorityEngineInputs = {
      category: 'DRAINAGE_BLOCKAGE',
      aiSeverity: 'CRITICAL',
      aiSafetyRiskScore: 90,
      description: 'Open manhole near school main gate creating severe hazard for children.',
      addressText: 'St. Jude High School Gate 4th Main Road',
      reportCount: 2,
      isNearSensitiveLocation: true,
    };
    const res = calculatePriorityScore(inputs);
    const pass = res.priorityLevel === 'CRITICAL' && res.priorityScore >= 80;
    results.push({
      testId: 1,
      name: 'Open manhole near school',
      expectedTier: 'CRITICAL (>= 80)',
      actualScore: res.priorityScore,
      actualTier: res.priorityLevel,
      status: pass ? 'PASS' : 'FAIL',
      explanationSummary: res.explanationSummary,
    });
  } catch (err) {
    results.push({ testId: 1, name: 'Open manhole near school', expectedTier: 'CRITICAL', actualScore: 0, actualTier: String(err), status: 'FAIL', explanationSummary: '' });
  }

  // TEST 2: Broken streetlight in residential lane (Expected: LOW < 40)
  try {
    const inputs: PriorityEngineInputs = {
      category: 'BROKEN_STREETLIGHT',
      aiSeverity: 'LOW',
      aiSafetyRiskScore: 30,
      description: 'Lamp fixture on pole #12 is flickering.',
      addressText: 'Quiet Residential Cross Lane 5',
      reportCount: 1,
    };
    const res = calculatePriorityScore(inputs);
    const pass = res.priorityLevel === 'LOW' && res.priorityScore < 40;
    results.push({
      testId: 2,
      name: 'Broken streetlight in residential lane',
      expectedTier: 'LOW (< 40)',
      actualScore: res.priorityScore,
      actualTier: res.priorityLevel,
      status: pass ? 'PASS' : 'FAIL',
      explanationSummary: res.explanationSummary,
    });
  } catch (err) {
    results.push({ testId: 2, name: 'Broken streetlight in residential lane', expectedTier: 'LOW', actualScore: 0, actualTier: String(err), status: 'FAIL', explanationSummary: '' });
  }

  // TEST 3: Garbage overflow in market (Expected: HIGH 60-79)
  try {
    const inputs: PriorityEngineInputs = {
      category: 'GARBAGE_OVERFLOW',
      aiSeverity: 'HIGH',
      aiSafetyRiskScore: 65,
      description: 'Uncollected waste pile blocking sidewalk in busy commercial zone.',
      addressText: 'Central Market Square Main Junction',
      reportCount: 2,
    };
    const res = calculatePriorityScore(inputs);
    const pass = res.priorityLevel === 'HIGH' && res.priorityScore >= 60 && res.priorityScore <= 79;
    results.push({
      testId: 3,
      name: 'Garbage overflow in market',
      expectedTier: 'HIGH (60 - 79)',
      actualScore: res.priorityScore,
      actualTier: res.priorityLevel,
      status: pass ? 'PASS' : 'FAIL',
      explanationSummary: res.explanationSummary,
    });
  } catch (err) {
    results.push({ testId: 3, name: 'Garbage overflow in market', expectedTier: 'HIGH', actualScore: 0, actualTier: String(err), status: 'FAIL', explanationSummary: '' });
  }

  // TEST 4: Water leak in park (Expected: MEDIUM 40-59)
  try {
    const inputs: PriorityEngineInputs = {
      category: 'WATER_LEAKAGE',
      aiSeverity: 'MEDIUM',
      aiSafetyRiskScore: 50,
      description: 'Water pipe oozing near park boundary fence.',
      addressText: 'Community Park Side Lane',
      reportCount: 1,
    };
    const res = calculatePriorityScore(inputs);
    const pass = res.priorityLevel === 'MEDIUM' && res.priorityScore >= 40 && res.priorityScore <= 59;
    results.push({
      testId: 4,
      name: 'Water leak in park',
      expectedTier: 'MEDIUM (40 - 59)',
      actualScore: res.priorityScore,
      actualTier: res.priorityLevel,
      status: pass ? 'PASS' : 'FAIL',
      explanationSummary: res.explanationSummary,
    });
  } catch (err) {
    results.push({ testId: 4, name: 'Water leak in park', expectedTier: 'MEDIUM', actualScore: 0, actualTier: String(err), status: 'FAIL', explanationSummary: '' });
  }

  // TEST 5: Sewage overflow near hospital with multiple reports (Expected: CRITICAL >= 80)
  try {
    const inputs: PriorityEngineInputs = {
      category: 'DRAINAGE_BLOCKAGE',
      aiSeverity: 'CRITICAL',
      aiSafetyRiskScore: 95,
      description: 'Sewage overflowing near emergency ward entrance.',
      addressText: 'City General Hospital Entrance Gate',
      reportCount: 4,
      affectedCitizensCount: 4,
      recurrenceCountInArea: 2,
      isNearSensitiveLocation: true,
    };
    const res = calculatePriorityScore(inputs);
    const pass = res.priorityLevel === 'CRITICAL' && res.priorityScore >= 80;
    results.push({
      testId: 5,
      name: 'Sewage overflow near hospital with multiple reports',
      expectedTier: 'CRITICAL (>= 80)',
      actualScore: res.priorityScore,
      actualTier: res.priorityLevel,
      status: pass ? 'PASS' : 'FAIL',
      explanationSummary: res.explanationSummary,
    });
  } catch (err) {
    results.push({ testId: 5, name: 'Sewage overflow near hospital', expectedTier: 'CRITICAL', actualScore: 0, actualTier: String(err), status: 'FAIL', explanationSummary: '' });
  }

  // TEST 6: Exact Weight Formula Verification (30/25/20/15/10)
  try {
    const inputs: PriorityEngineInputs = {
      category: 'ROAD_POTHOLE',
      aiSeverity: 'HIGH', // 75
      aiSafetyRiskScore: 100, // 100 * 0.30 = 30
      reportCount: 1, // log2(1) = 0 => (30) * 0.25 = 7.5
      recurrenceCountInArea: 0, // baseline (30) * 0.15 = 4.5
      addressText: 'School Gate', // sensitivity 90 * 0.10 = 9.0
    };
    const res = calculatePriorityScore(inputs);
    const expectedRaw = 100 * 0.30 + 30 * 0.25 + 75 * 0.20 + 30 * 0.15 + 90 * 0.10; // 30 + 7.5 + 15 + 4.5 + 9 = 66
    const pass = Math.abs(res.priorityScore - Math.round(expectedRaw)) <= 1;

    results.push({
      testId: 6,
      name: 'Exact Weight Formula Check (30/25/20/15/10)',
      expectedTier: `Exact Score ~ ${Math.round(expectedRaw)}`,
      actualScore: res.priorityScore,
      actualTier: res.priorityLevel,
      status: pass ? 'PASS' : 'FAIL',
      explanationSummary: `Calculated exact sum: ${res.priorityScore} (Matches formula 30%+25%+20%+15%+10%)`,
    });
  } catch (err) {
    results.push({ testId: 6, name: 'Exact Weight Formula Check', expectedTier: 'Exact Math', actualScore: 0, actualTier: String(err), status: 'FAIL', explanationSummary: '' });
  }

  console.table(results);
  return results;
}
