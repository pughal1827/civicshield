const http = require('http');

async function runTest() {
  console.log('====================================================');
  console.log('TESTING AUTHORITY -> WORKER ASSIGNMENT WORKFLOW');
  console.log('====================================================');

  // STEP 1: Submit new citizen complaint
  console.log('\n[1] Submitting New Citizen Complaint...');
  const submitRes = await makeRequest('POST', '/api/reports/submit', {
    description: 'Pothole asphalt repair needed near market junction blocking bus lane.',
    category: 'ROAD_POTHOLE',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
    latitude: 13.0827,
    longitude: 80.2707,
    addressText: 'Market Junction, Sector 2, Gummidipoondi',
  }, { 'x-user-id': 'cit-test-101' });

  if (!submitRes.success || !submitRes.data) {
    console.error('❌ Failed to submit initial complaint:', submitRes);
    process.exit(1);
  }

  const { caseId, incidentId } = submitRes.data;
  console.log(`✓ Created Incident #${caseId} (ID: ${incidentId})`);

  // Verify status is initially SUBMITTED
  const initialGet = await makeRequest('GET', `/api/incidents/${incidentId}`);
  if (initialGet.data?.incident?.status !== 'SUBMITTED') {
    console.error(`❌ Expected initial status 'SUBMITTED', got '${initialGet.data?.incident?.status}'`);
    process.exit(1);
  }
  console.log(`✓ Initial Status Verified = SUBMITTED`);

  // STEP 2: Authority assigns Department & Worker
  console.log('\n[2] Authority Assigning Department (Road Maintenance) & Worker (Alex Rivera)...');
  const assignPayload = {
    status: 'ASSIGNED',
    departmentId: 'ROAD_MAINT',
    assignedDepartment: 'Road Maintenance & Infrastructure',
    assignedWorkerId: 'user-worker-road-001',
    assignedWorkerName: 'Alex Rivera (Road Maintenance Lead)',
    assignedWorker: 'Alex Rivera (Road Maintenance Lead)',
    assignedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
    reason: 'Assigned to Road Maintenance Lead Alex Rivera for immediate field patch work.',
  };

  const assignRes = await makeRequest('PATCH', `/api/incidents/${incidentId}`, assignPayload, {
    'x-user-role': 'AUTHORITY',
    'x-officer-name': 'Officer Robert Chen',
  });

  if (!assignRes.success || !assignRes.data?.incident) {
    console.error('❌ Assignment PATCH failed:', assignRes);
    process.exit(1);
  }
  console.log(`✓ Assignment API Succeeded!`);

  // STEP 3: Verify Database Record Fields
  console.log('\n[3] Verifying Database Record Fields & Single Source of Truth...');
  const verifyGet = await makeRequest('GET', `/api/incidents/${incidentId}`);
  const inc = verifyGet.data?.incident;

  console.log(`  - Case ID: ${inc.case_id || inc.caseId}`);
  console.log(`  - Status: ${inc.status}`);
  console.log(`  - Assigned Department: ${inc.assignedDepartment || inc.departmentName}`);
  console.log(`  - Assigned Worker: ${inc.assignedWorker || inc.assignedWorkerName}`);
  console.log(`  - Assigned By: ${inc.assignedBy || inc.assigned_by}`);
  console.log(`  - Assigned At: ${inc.assignedAt || inc.assigned_at}`);
  console.log(`  - Changed By: ${inc.changedBy || inc.changed_by}`);
  console.log(`  - Changed At: ${inc.changedAt || inc.changed_at}`);

  const asserts = [
    { name: 'SAME Case ID preserved', pass: (inc.case_id || inc.caseId) === caseId },
    { name: 'SAME Incident ID preserved', pass: inc.id === incidentId },
    { name: 'Status = ASSIGNED', pass: inc.status === 'ASSIGNED' },
    { name: 'assignedDepartment saved', pass: Boolean(inc.assignedDepartment || inc.departmentName) },
    { name: 'assignedWorker saved', pass: Boolean(inc.assignedWorker || inc.assignedWorkerName) },
    { name: 'assignedBy saved', pass: Boolean(inc.assignedBy || inc.assigned_by) },
    { name: 'assignedAt timestamp saved', pass: Boolean(inc.assignedAt || inc.assigned_at) },
    { name: 'changedBy saved', pass: Boolean(inc.changedBy || inc.changed_by) },
    { name: 'changedAt timestamp saved', pass: Boolean(inc.changedAt || inc.changed_at) },
  ];

  let dbPassed = true;
  for (const check of asserts) {
    if (check.pass) console.log(`  ✓ PASSED: ${check.name}`);
    else { console.error(`  ✕ FAILED: ${check.name}`); dbPassed = false; }
  }
  if (!dbPassed) process.exit(1);

  // STEP 4: Verify Authorized Worker (Road Worker) can see the job in /api/worker/incidents
  console.log('\n[4] Verifying Authorized Road Worker Access (/api/worker/incidents)...');
  const roadWorkerRes = await makeRequest('GET', '/api/worker/incidents', null, {
    'x-worker-email': 'road.worker@civicshield.demo',
  });

  if (!roadWorkerRes.success || !Array.isArray(roadWorkerRes.data?.incidents)) {
    console.error('❌ Failed to fetch worker incidents for Road Worker:', roadWorkerRes);
    process.exit(1);
  }

  const foundJob = roadWorkerRes.data.incidents.find((i) => i.caseId === caseId || i.case_id === caseId || i.id === incidentId);
  if (!foundJob) {
    console.error(`❌ Job ${caseId} NOT found in Road Worker's assigned queue!`);
    process.exit(1);
  }
  console.log(`✓ Job #${caseId} VISIBLE in Road Worker's Assigned Queue! Status: ${foundJob.status}`);

  // STEP 5: Security Test - Unauthorized Workers (Garbage / Electrical) CANNOT access the job
  console.log('\n[5] Security Check - Testing Unauthorized Worker Isolation...');
  const garbageWorkerRes = await makeRequest('GET', '/api/worker/incidents', null, {
    'x-worker-email': 'garbage.worker@civicshield.demo',
  });

  const foundInGarbageQueue = garbageWorkerRes.data?.incidents?.find((i) => i.caseId === caseId || i.case_id === caseId);
  if (foundInGarbageQueue) {
    console.error(`❌ SECURITY VULNERABILITY: Garbage worker was able to see Road job #${caseId}!`);
    process.exit(1);
  }
  console.log(`✓ Security Enforced: Garbage Worker CANNOT see Road Job #${caseId} in queue.`);

  // Test single detail 403 HTTP enforcement
  const unauthorizedDetailRes = await makeRequest('GET', `/api/worker/incidents/${incidentId}`, null, {
    'x-worker-email': 'garbage.worker@civicshield.demo',
  });

  if (unauthorizedDetailRes.statusCode === 403 || unauthorizedDetailRes.error?.code === 'FORBIDDEN') {
    console.log(`✓ Security Enforced: Garbage Worker GET /api/worker/incidents/${incidentId} rejected with HTTP 403 FORBIDDEN!`);
  } else {
    console.error(`❌ SECURITY VULNERABILITY: Unauthorized detail request expected 403, got:`, unauthorizedDetailRes);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🎉 AUTHORITY -> WORKER ASSIGNMENT FULLY VERIFIED 100%');
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
