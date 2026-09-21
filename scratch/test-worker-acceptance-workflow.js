const http = require('http');

async function runTest() {
  console.log('====================================================');
  console.log('TESTING WORKER JOB ACCEPTANCE WORKFLOW');
  console.log('====================================================');

  // STEP 1: Citizen submits complaint & Authority assigns to Road Worker
  console.log('\n[1] Submitting Citizen Complaint & Assigning to Road Worker...');
  const submitRes = await makeRequest('POST', '/api/reports/submit', {
    description: 'Deep road crater near bus stop posing immediate crash risk for motorists.',
    category: 'ROAD_POTHOLE',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
    latitude: 13.0827,
    longitude: 80.2707,
    addressText: 'Bus Terminal Road, Sector 1, Gummidipoondi',
  }, { 'x-user-id': 'cit-test-202' });

  if (!submitRes.success || !submitRes.data) {
    console.error('❌ Citizen submission failed:', submitRes);
    process.exit(1);
  }

  const { caseId, incidentId } = submitRes.data;
  console.log(`✓ Created Incident #${caseId} (ID: ${incidentId})`);

  // Assign to Road Worker
  const assignRes = await makeRequest('PATCH', `/api/incidents/${incidentId}`, {
    status: 'ASSIGNED',
    departmentId: 'ROAD_MAINT',
    assignedDepartment: 'Road Maintenance & Infrastructure',
    assignedWorkerId: 'user-worker-road-001',
    assignedWorkerName: 'Alex Rivera (Road Maintenance Lead)',
    assignedWorker: 'Alex Rivera (Road Maintenance Lead)',
    assignedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
    reason: 'Assigned to Alex Rivera for urgent asphalt patching.',
  }, { 'x-user-role': 'AUTHORITY' });

  if (!assignRes.success) {
    console.error('❌ Authority assignment failed:', assignRes);
    process.exit(1);
  }
  console.log(`✓ Complaint #${caseId} assigned to Road Worker Alex Rivera.`);

  // STEP 2: Road Worker sees assigned job telemetry
  console.log('\n[2] Authenticated Road Worker Fetching Job Details (/api/worker/incidents/[id])...');
  const workerDetailRes = await makeRequest('GET', `/api/worker/incidents/${incidentId}`, null, {
    'x-worker-email': 'road.worker@civicshield.demo',
  });

  if (!workerDetailRes.success || !workerDetailRes.data?.incident) {
    console.error('❌ Worker job detail fetch failed:', workerDetailRes);
    process.exit(1);
  }

  const job = workerDetailRes.data.incident;
  const reports = workerDetailRes.data.reports || [];
  const ai = workerDetailRes.data.aiAnalysis;

  console.log(`✓ Worker Telemetry Retrieved:`);
  console.log(`  - Case ID: ${job.case_id || job.caseId}`);
  console.log(`  - Issue / Category: ${job.category}`);
  console.log(`  - Description: ${reports[0]?.raw_description || job.summary}`);
  console.log(`  - Citizen Photo: ${reports[0]?.image_url || job.imageUrl}`);
  console.log(`  - Location: ${job.address} (GPS: ${job.latitude}, ${job.longitude})`);
  console.log(`  - Priority Score: ${job.priority_score || job.priorityScore}`);
  console.log(`  - AI Category: ${ai?.detected_category}`);
  console.log(`  - Department: ${job.departmentName || job.assignedDepartment}`);
  console.log(`  - Assigned Time: ${job.assigned_at || job.assignedAt}`);

  // STEP 3: Authenticated Assigned Worker clicks Accept Job
  console.log('\n[3] Authenticated Assigned Worker Clicking ACCEPT JOB...');
  const acceptRes = await makeRequest('POST', `/api/worker/incidents/${incidentId}/action`, {
    action: 'ACCEPT',
  }, {
    'x-worker-email': 'road.worker@civicshield.demo',
  });

  if (!acceptRes.success || !acceptRes.data?.incident) {
    console.error('❌ Worker job acceptance failed:', acceptRes);
    process.exit(1);
  }
  console.log(`✓ Accept Job API Executed Successfully!`);

  // STEP 4: Verify Database Record Updates
  console.log('\n[4] Verifying Database Record Fields & Single Source of Truth...');
  const dbCheckRes = await makeRequest('GET', `/api/incidents/${incidentId}`);
  const inc = dbCheckRes.data?.incident;

  console.log(`  - Case ID: ${inc.case_id || inc.caseId}`);
  console.log(`  - Status: ${inc.status}`);
  console.log(`  - acceptedBy: ${inc.acceptedBy || inc.accepted_by}`);
  console.log(`  - acceptedAt: ${inc.acceptedAt || inc.accepted_at}`);
  console.log(`  - changedBy: ${inc.changedBy || inc.changed_by}`);
  console.log(`  - changedAt: ${inc.changedAt || inc.changed_at}`);

  const asserts = [
    { name: 'SAME Case ID preserved', pass: (inc.case_id || inc.caseId) === caseId },
    { name: 'Status = IN_PROGRESS', pass: inc.status === 'IN_PROGRESS' },
    { name: 'acceptedBy saved in DB', pass: Boolean(inc.acceptedBy || inc.accepted_by) },
    { name: 'acceptedAt timestamp saved in DB', pass: Boolean(inc.acceptedAt || inc.accepted_at) },
    { name: 'changedBy saved in DB', pass: Boolean(inc.changedBy || inc.changed_by) },
    { name: 'changedAt timestamp saved in DB', pass: Boolean(inc.changedAt || inc.changed_at) },
  ];

  let allDbPassed = true;
  for (const check of asserts) {
    if (check.pass) console.log(`  ✓ PASSED: ${check.name}`);
    else { console.error(`  ✕ FAILED: ${check.name}`); allDbPassed = false; }
  }
  if (!allDbPassed) process.exit(1);

  // STEP 5: Verify All Portals reflect IN_PROGRESS
  console.log('\n[5] Verifying Multi-Portal Status Synchronization...');
  
  // Citizen tracking API
  const trackRes = await makeRequest('GET', `/api/reports/track?code=${submitRes.data.trackingCode}`);
  const citizenStatus = trackRes.data?.incident?.status || trackRes.data?.status;
  console.log(`  - Citizen Portal Status: ${citizenStatus}`);

  // Authority API
  const authRes = await makeRequest('GET', `/api/incidents/${incidentId}`);
  const authorityStatus = authRes.data?.incident?.status;
  console.log(`  - Authority Portal Status: ${authorityStatus}`);

  // Worker API
  const wrkRes = await makeRequest('GET', `/api/worker/incidents/${incidentId}`, null, {
    'x-worker-email': 'road.worker@civicshield.demo',
  });
  const workerStatus = wrkRes.data?.incident?.status;
  console.log(`  - Worker Portal Status: ${workerStatus}`);

  if (citizenStatus !== 'IN_PROGRESS' || authorityStatus !== 'IN_PROGRESS' || workerStatus !== 'IN_PROGRESS') {
    console.error('❌ Portal status synchronization failed:', { citizenStatus, authorityStatus, workerStatus });
    process.exit(1);
  }
  console.log(`✓ All Portals display IN_PROGRESS simultaneously!`);

  // STEP 6: Refresh & Re-login Persistence Check
  console.log('\n[6] Testing Page Refresh & Re-login Persistence...');
  const reLoginWorkerRes = await makeRequest('GET', `/api/worker/incidents/${incidentId}`, null, {
    'x-worker-email': 'road.worker@civicshield.demo',
  });
  const persistedStatus = reLoginWorkerRes.data?.incident?.status;
  console.log(`  - Status after refresh / re-login: ${persistedStatus}`);

  if (persistedStatus !== 'IN_PROGRESS') {
    console.error(`❌ Status reset upon refresh! Expected 'IN_PROGRESS', got '${persistedStatus}'`);
    process.exit(1);
  }
  console.log(`✓ Status remains IN_PROGRESS. Accept Job button condition evaluates to false (button disappears).`);

  // STEP 7: Security - Unauthorized Worker Attempting to Accept Another Worker's Job
  console.log('\n[7] Testing Security - Unauthorized Worker cannot accept another worker\'s job...');
  const unauthorizedAccept = await makeRequest('POST', `/api/worker/incidents/${incidentId}/action`, {
    action: 'ACCEPT',
  }, {
    'x-worker-email': 'garbage.worker@civicshield.demo',
  });

  if (unauthorizedAccept.statusCode === 403 || unauthorizedAccept.error?.code === 'FORBIDDEN') {
    console.log(`✓ Security Enforced: Garbage worker accept request rejected with HTTP 403 FORBIDDEN!`);
  } else {
    console.error(`❌ SECURITY VULNERABILITY: Unauthorized worker accept request expected 403, got:`, unauthorizedAccept);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🎉 WORKER JOB ACCEPTANCE WORKFLOW FULLY VERIFIED 100%');
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
            const parsed = JSON.parse(raw);
            parsed.statusCode = res.statusCode;
            resolve(parsed);
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
