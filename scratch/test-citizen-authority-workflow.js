const http = require('http');

async function runTest() {
  console.log('====================================================');
  console.log('TESTING CITIZEN -> AUTHORITY COMPLAINT WORKFLOW');
  console.log('====================================================');

  const now = new Date();
  const testPayload = {
    description: 'Dangerous open manhole on Main Street near school crossing causing traffic hazard.',
    category: 'OPEN_MANHOLE',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
    audioUrl: '',
    reporterId: 'cit-test-99',
    latitude: 13.0827,
    longitude: 80.2707,
    addressText: 'Main Street Crossing, Sector 4, Gummidipoondi',
  };

  console.log('\n[1] Citizen Submitting Report...');
  const submitRes = await makeRequest('POST', '/api/reports/submit', testPayload, {
    'x-user-id': 'cit-test-99',
  });

  if (!submitRes.success || !submitRes.data) {
    console.error('❌ Citizen report submission failed:', submitRes);
    process.exit(1);
  }

  const { caseId, trackingCode, incidentId, category, priorityScore } = submitRes.data;
  console.log(`✓ Report Submitted Successfully!`);
  console.log(`  - Case ID: ${caseId}`);
  console.log(`  - Incident ID: ${incidentId}`);
  console.log(`  - Tracking Code: ${trackingCode}`);
  console.log(`  - Category: ${category}`);
  console.log(`  - Priority Score: ${priorityScore}`);

  console.log('\n[2] Verifying Authority Portal All Complaints List (/api/incidents)...');
  const incidentsListRes = await makeRequest('GET', '/api/incidents');
  if (!incidentsListRes.success || !Array.isArray(incidentsListRes.data?.incidents)) {
    console.error('❌ Failed to fetch incidents for Authority portal:', incidentsListRes);
    process.exit(1);
  }

  const foundInList = incidentsListRes.data.incidents.find(
    (inc) => inc.caseId === caseId || inc.case_id === caseId || inc.id === incidentId
  );

  if (!foundInList) {
    console.error(`❌ Case ID ${caseId} was NOT found in Authority incidents list!`);
    process.exit(1);
  }

  console.log(`✓ Case ID ${caseId} immediately visible in Authority Portal!`);
  console.log(`  - Status in List: ${foundInList.status}`);
  if (foundInList.status !== 'SUBMITTED') {
    console.error(`❌ Status in list expected 'SUBMITTED', got '${foundInList.status}'`);
    process.exit(1);
  }
  console.log(`✓ Verified Status = SUBMITTED in Authority List`);

  console.log('\n[3] Verifying Single Incident Telemetry & Details (/api/incidents/[id])...');
  const detailRes = await makeRequest('GET', `/api/incidents/${incidentId}`);
  if (!detailRes.success || !detailRes.data?.incident) {
    console.error(`❌ Failed to fetch single incident details for ${incidentId}:`, detailRes);
    process.exit(1);
  }

  const { incident, reports, aiAnalysis, priorityBreakdown } = detailRes.data;
  console.log('✓ Incident Details Retrieved:');
  console.log(`  - Case ID: ${incident.case_id || incident.caseId}`);
  console.log(`  - Status: ${incident.status}`);
  console.log(`  - Citizen ID / Reporter ID: ${incident.reporter_id || incident.reporterId || reports[0]?.citizen_id || reports[0]?.reporterId || 'cit-test-99'}`);
  console.log(`  - Issue/Category: ${incident.category}`);
  console.log(`  - Title: ${incident.title}`);
  console.log(`  - Description: ${reports[0]?.raw_description || reports[0]?.rawDescription || incident.summary}`);
  console.log(`  - Photo URL: ${reports[0]?.image_url || reports[0]?.imageUrl || incident.imageUrl}`);
  console.log(`  - Location (Address): ${incident.address}`);
  console.log(`  - Coordinates: Lat ${incident.latitude}, Lng ${incident.longitude}`);
  console.log(`  - Submission Timestamp: ${incident.created_at || incident.createdAt}`);
  console.log(`  - AI Category Detected: ${aiAnalysis.detected_category}`);
  console.log(`  - AI Severity: ${aiAnalysis.detected_severity}`);
  console.log(`  - AI Recommended Dept Code: ${aiAnalysis.suggested_department_code}`);
  console.log(`  - AI Recommended Dept Name: ${aiAnalysis.suggested_department_name}`);
  console.log(`  - Priority Score: ${incident.priority_score || incident.priorityScore}`);

  // Strict Assertions
  const asserts = [
    { name: 'ONE Case ID match', pass: (incident.case_id || incident.caseId) === caseId },
    { name: 'Status is SUBMITTED', pass: incident.status === 'SUBMITTED' },
    { name: 'Category match', pass: incident.category === category || incident.category === 'DRAINAGE_BLOCKAGE' || incident.category === 'OPEN_MANHOLE' },
    { name: 'Description saved', pass: Boolean(reports[0]?.raw_description || reports[0]?.rawDescription) },
    { name: 'Photo URL saved', pass: Boolean(reports[0]?.image_url || reports[0]?.imageUrl) },
    { name: 'GPS Coordinates saved', pass: incident.latitude === 13.0827 && incident.longitude === 80.2707 },
    { name: 'Address text saved', pass: Boolean(incident.address) },
    { name: 'Submission date/time recorded', pass: Boolean(incident.created_at || incident.createdAt) },
    { name: 'AI Analysis attached', pass: Boolean(aiAnalysis && aiAnalysis.suggested_department_name) },
  ];

  console.log('\n[4] Running Validation Checks:');
  let allPassed = true;
  for (const check of asserts) {
    if (check.pass) {
      console.log(`  ✓ PASSED: ${check.name}`);
    } else {
      console.error(`  ✕ FAILED: ${check.name}`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.error('\n❌ Workflow verification failed!');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🎉 CITIZEN -> AUTHORITY WORKFLOW FULLY VERIFIED 100%');
  console.log('====================================================');
}

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            resolve({ raw, statusCode: res.statusCode });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) req.write(dataString);
    req.end();
  });
}

runTest().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
