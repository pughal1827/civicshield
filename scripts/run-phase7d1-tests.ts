import { getTimeWindow } from '../lib/intelligence/time-windows';
import { calculateTrend } from '../lib/intelligence/trends';
import { isValidCoordinates, formatPostGISPoint } from '../lib/intelligence/geographic';
import { getIntelligenceOverview } from '../lib/intelligence/aggregations';
import { GET as intelligenceOverviewHandler } from '../app/api/authority/intelligence/overview/route';
import { createAuthSession, getUserByEmail } from '../lib/auth/session';
import { NextRequest } from 'next/server';

interface TestResult {
  testId: number;
  category: string;
  name: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

export async function runPhase7D1Tests(): Promise<TestResult[]> {
  console.log('=== RUNNING PHASE 7D.1 CIVIC INTELLIGENCE DATA FOUNDATION SUITE ===\n');
  const results: TestResult[] = [];

  // TEST 1: Time Window Generation
  try {
    const tw = getTimeWindow('last30Days');
    const pass = Boolean(tw.startDate) && Boolean(tw.endDate) && new Date(tw.startDate).getTime() < new Date(tw.endDate).getTime();
    results.push({
      testId: 1,
      category: 'Time Windows',
      name: 'Time Window Boundary Generation',
      expected: 'Generates valid ISO UTC start and end timestamps',
      actual: pass ? `Start: ${tw.startDate.slice(0, 10)}, End: ${tw.endDate.slice(0, 10)}` : 'Invalid timestamps',
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 1, category: 'Time Windows', name: 'Time Window Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 2: Trend Calculation (Normal Case)
  try {
    const trend = calculateTrend(50, 40);
    const pass = trend.percentageChange === 25 && trend.absoluteChange === 10;
    results.push({
      testId: 2,
      category: 'Trend Metrics',
      name: 'Standard Trend Percentage Calculation',
      expected: '+25% change for 40 -> 50 increase',
      actual: pass ? `Calculated ${trend.percentageChange}% change` : `Failed: ${JSON.stringify(trend)}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 2, category: 'Trend Metrics', name: 'Trend Calculation Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 3: Trend Calculation (Zero Baseline Protection)
  try {
    const trend = calculateTrend(10, 0);
    const pass = trend.percentageChange === null && !isNaN(trend.absoluteChange) && trend.explanation.includes('No previous-period baseline');
    results.push({
      testId: 3,
      category: 'Trend Metrics',
      name: 'Zero Baseline Infinity Protection',
      expected: 'percentageChange is null (No Infinity/NaN) when previousCount === 0',
      actual: pass ? `percentageChange=${trend.percentageChange}, explanation="${trend.explanation}"` : `Failed: ${JSON.stringify(trend)}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 3, category: 'Trend Metrics', name: 'Zero Baseline Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 4: Coordinate Bounds Validation
  try {
    const valid = isValidCoordinates(12.9715, 77.5945);
    const invalidLat = isValidCoordinates(95.0, 77.5945);
    const invalidLng = isValidCoordinates(12.9715, -195.0);
    const pass = valid && !invalidLat && !invalidLng;

    results.push({
      testId: 4,
      category: 'Geographic Integrity',
      name: 'Coordinate Bounds & Validation',
      expected: 'Validates lat [-90,90] and lng [-180,180]',
      actual: pass ? 'Coordinates validated accurately' : 'Validation failed',
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 4, category: 'Geographic Integrity', name: 'Coordinate Bounds Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 5: PostGIS WKT Point Formatting
  try {
    const wkt = formatPostGISPoint(77.5945, 12.9715);
    const pass = wkt === 'POINT(77.5945 12.9715)';
    results.push({
      testId: 5,
      category: 'Geographic Integrity',
      name: 'PostGIS WKT Point Ordering (X=lng, Y=lat)',
      expected: 'POINT(77.5945 12.9715)',
      actual: pass ? `Formatted ${wkt}` : `Failed: ${wkt}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 5, category: 'Geographic Integrity', name: 'PostGIS Formatting Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 6: Aggregation Engine Master Incidents vs Citizen Reports
  try {
    const overview = await getIntelligenceOverview('last30Days');
    const pass = typeof overview.metrics.totalIncidents === 'number' &&
                 typeof overview.metrics.totalReports === 'number' &&
                 overview.metrics.totalReports >= overview.metrics.totalIncidents;

    results.push({
      testId: 6,
      category: 'Aggregation Engine',
      name: 'Master Incidents vs Citizen Reports Count Distinction',
      expected: 'Distinguishes master incidents from citizen reports volume',
      actual: pass ? `Incidents: ${overview.metrics.totalIncidents}, Reports: ${overview.metrics.totalReports}` : 'Count mismatch',
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 6, category: 'Aggregation Engine', name: 'Incidents vs Reports Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 7: Category Aggregation Completeness
  try {
    const overview = await getIntelligenceOverview('last30Days');
    const pass = Array.isArray(overview.categories) && overview.categories.length === 7;

    results.push({
      testId: 7,
      category: 'Aggregation Engine',
      name: 'Category Aggregation Metrics',
      expected: 'Returns metrics across all 7 civic categories',
      actual: pass ? `Aggregated ${overview.categories.length} categories` : `Failed: ${overview.categories?.length}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 7, category: 'Aggregation Engine', name: 'Category Aggregation Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 8: Department Workload Aggregation
  try {
    const overview = await getIntelligenceOverview('last30Days');
    const pass = Array.isArray(overview.departments) && overview.departments.length > 0;

    results.push({
      testId: 8,
      category: 'Aggregation Engine',
      name: 'Department Workload Metrics',
      expected: 'Calculates active, critical, and resolved counts per department',
      actual: pass ? `Aggregated ${overview.departments.length} departments` : 'Failed department aggregation',
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 8, category: 'Aggregation Engine', name: 'Department Aggregation Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 9: Unauthenticated Authorization Prohibition on Intelligence API
  try {
    const req = new NextRequest('http://localhost:3000/api/authority/intelligence/overview');
    const res = await intelligenceOverviewHandler(req);
    const pass = res.status === 401;

    results.push({
      testId: 9,
      category: 'Server Authorization',
      name: 'Unauthenticated Request Rejection (401)',
      expected: 'Returns 401 Unauthorized',
      actual: pass ? '401 Unauthorized returned correctly' : `Failed status: ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 9, category: 'Server Authorization', name: 'Unauthenticated Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 10: Citizen Authorization Prohibition on Intelligence API
  try {
    const citizenUser = getUserByEmail('citizen@civicshield.org')!;
    const session = createAuthSession(citizenUser);

    const req = new NextRequest('http://localhost:3000/api/authority/intelligence/overview', {
      headers: {
        'Cookie': `civicshield_session=${session.token}`,
      },
    });

    const res = await intelligenceOverviewHandler(req);
    const pass = res.status === 403;

    results.push({
      testId: 10,
      category: 'Server Authorization',
      name: 'Citizen Role Access Prohibition (403)',
      expected: 'Returns 403 Forbidden when citizen invokes intelligence endpoint',
      actual: pass ? '403 Forbidden returned correctly' : `Failed status: ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 10, category: 'Server Authorization', name: 'Citizen Prohibition Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 11: Official Authority Access Authorization
  try {
    const officerUser = getUserByEmail('officer@civicshield.gov')!;
    const session = createAuthSession(officerUser);

    const req = new NextRequest('http://localhost:3000/api/authority/intelligence/overview', {
      headers: {
        'Cookie': `civicshield_session=${session.token}`,
      },
    });

    const res = await intelligenceOverviewHandler(req);
    const json = await res.json();
    const pass = res.status === 200 && json.success && Boolean(json.data?.metrics);

    results.push({
      testId: 11,
      category: 'Server Authorization',
      name: 'Official Authority Role Intelligence Overview Authorization',
      expected: 'Returns 200 OK with aggregated intelligence payload',
      actual: pass ? `Authorized authority session (Calculated mode: ${json.data?.storageMode})` : `Failed status: ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 11, category: 'Server Authorization', name: 'Authority Authorization Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 12: Privacy & PII Isolation Check
  try {
    const officerUser = getUserByEmail('officer@civicshield.gov')!;
    const session = createAuthSession(officerUser);

    const req = new NextRequest('http://localhost:3000/api/authority/intelligence/overview', {
      headers: {
        'Cookie': `civicshield_session=${session.token}`,
      },
    });

    const res = await intelligenceOverviewHandler(req);
    const json = await res.json();
    const str = JSON.stringify(json);
    const hasPii = str.includes('password') || str.includes('citizen@civicshield.org') || str.includes('trackingCode');

    results.push({
      testId: 12,
      category: 'Privacy Protection',
      name: 'Aggregated Intelligence PII & Secret Isolation',
      expected: 'Contains 0 citizen passwords, emails, or secret tracking UUIDs',
      actual: !hasPii ? 'Verified 0 PII or citizen identity leak in analytics payload' : 'PII exposed!',
      status: !hasPii ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 12, category: 'Privacy Protection', name: 'Privacy Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  console.table(results);
  return results;
}

if (require.main === module) {
  runPhase7D1Tests()
    .then((res) => {
      const failed = res.filter((r) => r.status === 'FAIL');
      if (failed.length > 0) {
        console.error(`\n${failed.length} Phase 7D.1 Data Foundation Tests Failed!`);
        process.exit(1);
      }
      console.log('\nALL PHASE 7D.1 CIVIC INTELLIGENCE DATA FOUNDATION TESTS PASSED 100% ✓\n');
    })
    .catch((err) => {
      console.error('Phase 7D.1 test execution error:', err);
      process.exit(1);
    });
}
