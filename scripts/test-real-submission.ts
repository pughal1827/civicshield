import { POST } from '../app/api/reports/submit/route';
import { NextRequest } from 'next/server';

async function runRealSubmissionTest() {
  console.log('=== TESTING REAL CITIZEN REPORT SUBMISSION ===\n');

  // Test A: Report with photo + GPS
  console.log('--- TEST A: Report with Photo + GPS ---');
  const reqA = new NextRequest('http://localhost:3000/api/reports/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Large deep pothole outside St. Jude High School gate. Bikes are falling.',
      category: 'ROAD_POTHOLE',
      imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
      latitude: 12.9715987,
      longitude: 77.5945627,
      addressText: 'St. Jude High School 4th Main Road, Central Zone',
    }),
  });

  const resA = await POST(reqA);
  const jsonA = await resA.json();
  console.log('Test A HTTP Status:', resA.status);
  console.log('Test A Response Body:', jsonA);

  if (!jsonA.success || !jsonA.data?.caseId || !jsonA.data?.trackingCode) {
    throw new Error('Test A failed to generate Case ID or Tracking Code!');
  }

  // Test B: Report without photo + GPS
  console.log('\n--- TEST B: Report WITHOUT Photo + GPS ---');
  const reqB = new NextRequest('http://localhost:3000/api/reports/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Garbage has not been collected for four days in central market area.',
      latitude: 12.9725,
      longitude: 77.5955,
      addressText: 'Central Market Gate 3',
    }),
  });

  const resB = await POST(reqB);
  const jsonB = await resB.json();
  console.log('Test B HTTP Status:', resB.status);
  console.log('Test B Response Body:', jsonB);

  if (!jsonB.success || !jsonB.data?.caseId || !jsonB.data?.trackingCode) {
    throw new Error('Test B failed to generate Case ID or Tracking Code!');
  }

  // Test C: Tracking Lookup Verification
  console.log('\n--- TEST C: Tracking Lookup Verification ---');
  const { GET: getTrack } = await import('../app/api/reports/track/route');
  const trackReq = new NextRequest(`http://localhost:3000/api/reports/track?code=${jsonA.data.trackingCode}`);
  const trackRes = await getTrack(trackReq);
  const trackJson = await trackRes.json();
  console.log('Tracking Lookup HTTP Status:', trackRes.status);
  console.log('Tracking Lookup Data:', trackJson);

  if (!trackJson.success || trackJson.data.caseId !== jsonA.data.caseId) {
    throw new Error('Tracking lookup failed to retrieve submitted report!');
  }

  console.log('\n========================================================');
  console.log('  ALL SUBMISSION & TRACKING SCENARIOS PASSED 100%');
  console.log(`  GENERATED CASE ID: ${jsonA.data.caseId}`);
  console.log(`  GENERATED TRACKING CODE: ${jsonA.data.trackingCode}`);
  console.log('========================================================\n');
}

runRealSubmissionTest().catch(console.error);
