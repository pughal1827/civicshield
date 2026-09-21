const http = require('http');

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, ...parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSingleExampleAudit() {
  console.log('================================================================');
  console.log(' CIVICSHIELD AI: SINGLE EXAMPLE CLEANUP AUDIT (CASE-001)');
  console.log('================================================================\n');

  // 1. Verify Database contains ONLY ONE incident CASE-001
  console.log('[1] Fetching all incidents from database...');
  const allIncRes = await makeRequest('GET', '/api/incidents');
  const incidents = allIncRes.data?.incidents || allIncRes.incidents || [];

  console.log(`✓ Total Incidents in DB: ${incidents.length}`);
  if (incidents.length !== 1) {
    console.error(`❌ Expected exactly 1 incident (CASE-001), found ${incidents.length}`);
    process.exit(1);
  }

  const inc = incidents[0];
  console.log(`  - ID: ${inc.id}`);
  console.log(`  - Case ID: ${inc.case_id || inc.caseId}`);
  console.log(`  - Issue/Category: ${inc.category}`);
  console.log(`  - Department: ${inc.departmentName || inc.department_id}`);
  console.log(`  - Assigned Worker: ${inc.assignedWorker || inc.assigned_worker_id}`);
  console.log(`  - Current Status: ${inc.status}`);

  if ((inc.case_id || inc.caseId) !== 'CASE-001') {
    console.error(`❌ Expected Case ID 'CASE-001', got '${inc.case_id || inc.caseId}'`);
    process.exit(1);
  }

  // 2. Verify Citizen, Authority & Worker view the SAME record
  console.log('\n[2] Verifying Citizen, Authority & Worker read the SAME record...');
  const authRes = await makeRequest('GET', `/api/incidents/${inc.id}`);
  const workerRes = await makeRequest('GET', `/api/worker/incidents/${inc.id}`, null, { 'x-worker-email': 'road.worker@civicshield.demo' });
  const trackRes = await makeRequest('GET', `/api/reports/track?code=case-001-tracking-uuid`);

  const authCaseId = authRes.data?.incident?.caseId || authRes.data?.incident?.case_id;
  const workerCaseId = workerRes.data?.incident?.caseId || workerRes.data?.incident?.case_id;
  const trackCaseId = trackRes.data?.caseId;

  console.log(`  - Authority View Case ID: ${authCaseId}`);
  console.log(`  - Worker View Case ID: ${workerCaseId}`);
  console.log(`  - Citizen View Case ID: ${trackCaseId}`);

  const sameRecord = authCaseId === 'CASE-001' && workerCaseId === 'CASE-001' && trackCaseId === 'CASE-001';
  if (!sameRecord) {
    console.error('❌ Mismatch in Case IDs across portals!');
    process.exit(1);
  }
  console.log('✓ Citizen, Authority and Worker portals read the SAME record (CASE-001)!');

  // 3. Test E2E State Progression of CASE-001 through all 6 stages
  console.log('\n[3] Testing E2E Workflow Progression of CASE-001...');
  const stages = [
    'SUBMITTED',
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING_FOR_APPROVAL',
    'PENDING_CITIZEN_VERIFICATION',
    'CLOSED',
  ];

  // Stage: ASSIGNED
  console.log('  -> Authority assigns CASE-001 to Road Maintenance...');
  await makeRequest('PATCH', `/api/incidents/${inc.id}`, {
    status: 'ASSIGNED',
    departmentId: 'ROAD_MAINTENANCE',
    assignedDepartment: 'Road Maintenance',
    assignedWorkerId: 'user-worker-road-001',
    assignedWorkerName: 'Alex Rivera (Road Maintenance Lead)',
    assignedWorker: 'Alex Rivera (Road Maintenance Lead)',
    assignedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY' });

  // Stage: IN_PROGRESS
  console.log('  -> Worker accepts CASE-001 (IN_PROGRESS)...');
  await makeRequest('POST', `/api/worker/incidents/${inc.id}/action`, { action: 'ACCEPT' }, { 'x-worker-email': 'road.worker@civicshield.demo' });

  // Stage: WAITING_FOR_APPROVAL
  console.log('  -> Worker submits evidence for CASE-001 (WAITING_FOR_APPROVAL)...');
  await makeRequest('POST', `/api/worker/incidents/${inc.id}/action`, {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    workerNotes: 'Asphalt filled and leveled.',
  }, { 'x-worker-email': 'road.worker@civicshield.demo' });

  // Stage: PENDING_CITIZEN_VERIFICATION
  console.log('  -> Authority approves evidence for CASE-001 (PENDING_CITIZEN_VERIFICATION)...');
  await makeRequest('PATCH', `/api/incidents/${inc.id}`, {
    status: 'PENDING_CITIZEN_VERIFICATION',
    approvedBy: 'Officer Sarah Jenkins',
  }, { 'x-user-role': 'AUTHORITY' });

  // Stage: CLOSED
  console.log('  -> Citizen confirms resolution for CASE-001 (CLOSED)...');
  await makeRequest('POST', '/api/incidents/verify', {
    trackingCode: 'case-001-tracking-uuid',
    action: 'ACCEPT',
    feedback: 'Pothole fixed perfectly!',
  });

  // Verify final status in DB
  const finalCheck = await makeRequest('GET', `/api/incidents/${inc.id}`);
  const finalInc = finalCheck.data?.incident;

  console.log(`\n✓ Final CASE-001 Status in Database: ${finalInc.status}`);
  if (finalInc.status !== 'CLOSED') {
    console.error(`❌ Expected final status 'CLOSED', got '${finalInc.status}'`);
    process.exit(1);
  }

  // Verify DB still contains ONLY 1 incident
  const postCheckAll = await makeRequest('GET', '/api/incidents');
  const postIncs = postCheckAll.data?.incidents || postCheckAll.incidents || [];
  console.log(`✓ Total Incidents in DB after workflow run: ${postIncs.length}`);

  if (postIncs.length !== 1) {
    console.error(`❌ Duplicate complaints were created! Expected 1, found ${postIncs.length}`);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 SINGLE EXAMPLE CLEANUP & WORKFLOW VERIFICATION PASSED 100%!');
  console.log('================================================================');
}

runSingleExampleAudit().catch((err) => {
  console.error('Fatal single example audit error:', err);
  process.exit(1);
});
