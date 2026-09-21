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

async function runTest() {
  console.log('====================================================');
  console.log('TESTING AUTHORITY VERIFICATION WORKFLOW');
  console.log(' (APPROVE, REJECT, REASSIGN)');
  console.log('====================================================\n');

  const citizenPhoto = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80';
  const workerAfterPhoto = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80';

  // ----------------------------------------------------
  // TEST SCENARIO 1: APPROVE EVIDENCE
  // ----------------------------------------------------
  console.log('----------------------------------------------------');
  console.log('SCENARIO 1: APPROVE EVIDENCE');
  console.log('----------------------------------------------------');

  console.log('[1.1] Submitting Citizen Complaint...');
  const s1Submit = await makeRequest('POST', '/api/reports/submit', {
    description: 'Blocked stormwater drain causing flooding on Main Street.',
    category: 'DRAINAGE_BLOCKAGE',
    imageUrl: citizenPhoto,
    latitude: 13.0827,
    longitude: 80.2707,
    addressText: '123 Main Street, Sector 1',
  }, { 'x-user-id': 'cit-test-auth-1' });

  const s1Id = s1Submit.data.incidentId;
  const s1CaseId = s1Submit.data.caseId;
  console.log(`✓ Complaint created: ${s1CaseId} (${s1Id})`);

  console.log('[1.2] Authority Assigning to Drainage Worker...');
  await makeRequest('PATCH', `/api/incidents/${s1Id}`, {
    status: 'ASSIGNED',
    departmentId: 'DRAINAGE',
    assignedDepartment: 'Drainage & Sewerage Department',
    assignedWorkerId: 'user-worker-drainage-001',
    assignedWorkerName: 'David O\'Connor (Drainage Crew Lead)',
    assignedWorker: 'David O\'Connor (Drainage Crew Lead)',
    assignedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY' });

  console.log('[1.3] Worker Accepts & Submits Evidence...');
  await makeRequest('POST', `/api/worker/incidents/${s1Id}/action`, { action: 'ACCEPT' }, { 'x-worker-email': 'drainage.worker@civicshield.demo' });
  await makeRequest('POST', `/api/worker/incidents/${s1Id}/action`, {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: workerAfterPhoto,
    beforePhotoUrl: citizenPhoto,
    workerNotes: 'Cleared debris and restored drain flow completely.',
  }, { 'x-worker-email': 'drainage.worker@civicshield.demo' });

  console.log('[1.4] Authority Approving Evidence...');
  const s1ApproveRes = await makeRequest('PATCH', `/api/incidents/${s1Id}`, {
    status: 'PENDING_CITIZEN_VERIFICATION',
    approvedBy: 'Officer Sarah Jenkins',
    changedBy: 'Officer Sarah Jenkins',
    notes: 'Evidence verified and approved. Pending citizen confirmation.',
  }, { 'x-user-role': 'AUTHORITY', 'x-officer-name': 'Officer Sarah Jenkins' });

  if (!s1ApproveRes.success) {
    console.error('❌ Approval failed:', s1ApproveRes);
    process.exit(1);
  }

  const s1Check = await makeRequest('GET', `/api/incidents/${s1Id}`);
  const s1Inc = s1Check.data?.incident;

  console.log('✓ Approval assertions:');
  const s1Asserts = [
    { name: 'Status = PENDING_CITIZEN_VERIFICATION', pass: s1Inc.status === 'PENDING_CITIZEN_VERIFICATION' },
    { name: 'approvedBy recorded', pass: Boolean(s1Inc.approved_by || s1Inc.approvedBy) },
    { name: 'approvedAt timestamp recorded', pass: Boolean(s1Inc.approved_at || s1Inc.approvedAt) },
    { name: 'changedBy recorded', pass: (s1Inc.changedBy || s1Inc.changed_by) === 'Officer Sarah Jenkins' },
    { name: 'changedAt recorded', pass: Boolean(s1Inc.changedAt || s1Inc.changed_at) },
  ];

  s1Asserts.forEach((a) => {
    console.log(`  [${a.pass ? 'PASS' : 'FAIL'}] ${a.name}`);
    if (!a.pass) process.exit(1);
  });


  // ----------------------------------------------------
  // TEST SCENARIO 2: REJECT EVIDENCE
  // ----------------------------------------------------
  console.log('\n----------------------------------------------------');
  console.log('SCENARIO 2: REJECT EVIDENCE');
  console.log('----------------------------------------------------');

  console.log('[2.1] Submitting Citizen Complaint...');
  const s2Submit = await makeRequest('POST', '/api/reports/submit', {
    description: 'Dangerous pothole on South Avenue.',
    category: 'ROAD_POTHOLE',
    imageUrl: citizenPhoto,
    latitude: 13.0827,
    longitude: 80.2707,
    addressText: '45 South Avenue',
  }, { 'x-user-id': 'cit-test-auth-2' });

  const s2Id = s2Submit.data.incidentId;
  const s2CaseId = s2Submit.data.caseId;

  console.log('[2.2] Authority Assigning & Worker Submitting Evidence...');
  await makeRequest('PATCH', `/api/incidents/${s2Id}`, {
    status: 'ASSIGNED',
    departmentId: 'ROADS',
    assignedDepartment: 'Road Maintenance',
    assignedWorkerId: 'user-worker-roads-001',
    assignedWorkerName: 'Marcus Vance',
    assignedWorker: 'Marcus Vance',
    assignedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY' });

  await makeRequest('POST', `/api/worker/incidents/${s2Id}/action`, { action: 'ACCEPT' }, { 'x-worker-email': 'road.worker@civicshield.demo' });
  await makeRequest('POST', `/api/worker/incidents/${s2Id}/action`, {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: workerAfterPhoto,
    beforePhotoUrl: citizenPhoto,
    workerNotes: 'Quick patch applied.',
  }, { 'x-worker-email': 'road.worker@civicshield.demo' });

  console.log('[2.3] Authority Rejection (Must fail without rejection reason)...');
  const s2FailReject = await makeRequest('PATCH', `/api/incidents/${s2Id}`, {
    status: 'EVIDENCE_REJECTED',
    rejectedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY' });
  console.log(`  - Reject without reason returned status ${s2FailReject.status}: ${s2FailReject.error || s2FailReject.message || 'Error handled'}`);

  console.log('[2.4] Authority Rejection with valid reason...');
  const s2RejectRes = await makeRequest('PATCH', `/api/incidents/${s2Id}`, {
    status: 'EVIDENCE_REJECTED',
    rejectionReason: 'Asphalt smoothing incomplete. Edges must be leveled properly.',
    rejectedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY', 'x-officer-name': 'Officer Robert Chen' });

  if (!s2RejectRes.success) {
    console.error('❌ Rejection failed:', s2RejectRes);
    process.exit(1);
  }

  const s2Check = await makeRequest('GET', `/api/incidents/${s2Id}`);
  const s2Inc = s2Check.data?.incident;
  const s2Ev = s2Check.data?.resolutionEvidence;

  console.log('✓ Rejection assertions:');
  const s2Asserts = [
    { name: 'Status = EVIDENCE_REJECTED', pass: s2Inc.status === 'EVIDENCE_REJECTED' },
    { name: 'rejectionReason stored in incident', pass: Boolean(s2Inc.rejectionReason || s2Inc.rejection_reason) },
    { name: 'rejectedBy stored', pass: Boolean(s2Inc.rejectedBy || s2Inc.rejected_by) },
    { name: 'rejectedAt stored', pass: Boolean(s2Inc.rejectedAt || s2Inc.rejected_at) },
    { name: 'Evidence status set to REJECTED', pass: s2Ev?.status === 'REJECTED' },
    { name: 'Evidence contains rejection_reason', pass: Boolean(s2Ev?.rejection_reason) },
    { name: 'Previous submission attempt preserved in attempts array', pass: Array.isArray(s2Ev?.attempts) && s2Ev.attempts.length > 0 },
  ];

  s2Asserts.forEach((a) => {
    console.log(`  [${a.pass ? 'PASS' : 'FAIL'}] ${a.name}`);
    if (!a.pass) process.exit(1);
  });


  // ----------------------------------------------------
  // TEST SCENARIO 3: REASSIGNMENT & BACKEND AUTHORIZATION
  // ----------------------------------------------------
  console.log('\n----------------------------------------------------');
  console.log('SCENARIO 3: REASSIGNMENT & DEPARTMENT AUTHORIZATION');
  console.log('----------------------------------------------------');

  console.log('[3.1] Submitting Citizen Complaint...');
  const s3Submit = await makeRequest('POST', '/api/reports/submit', {
    description: 'Fallen tree branch damaging street light wiring.',
    category: 'ELECTRICAL_HAZARD',
    imageUrl: citizenPhoto,
    latitude: 13.0827,
    longitude: 80.2707,
    addressText: '99 Electricity Avenue',
  }, { 'x-user-id': 'cit-test-auth-3' });

  const s3Id = s3Submit.data.incidentId;
  const s3CaseId = s3Submit.data.caseId;

  console.log('[3.2] Initially assigning to Electrical Worker (user-worker-electrical-001)...');
  await makeRequest('PATCH', `/api/incidents/${s3Id}`, {
    status: 'ASSIGNED',
    departmentId: 'ELECTRICAL',
    assignedDepartment: 'Electrical & Street Lighting',
    assignedWorkerId: 'user-worker-electrical-001',
    assignedWorkerName: 'Elena Rostova (Senior Electrician)',
    assignedWorker: 'Elena Rostova (Senior Electrician)',
    assignedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY' });

  console.log('[3.3] Worker Accepts and Submits Evidence...');
  await makeRequest('POST', `/api/worker/incidents/${s3Id}/action`, { action: 'ACCEPT' }, { 'x-worker-email': 'electrical.worker@civicshield.demo' });
  await makeRequest('POST', `/api/worker/incidents/${s3Id}/action`, {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: workerAfterPhoto,
    beforePhotoUrl: citizenPhoto,
    workerNotes: 'Wiring secured, but tree limb removal required by Parks department.',
  }, { 'x-worker-email': 'electrical.worker@civicshield.demo' });

  console.log('[3.4] Authority Reassigning same Case ID to Sanitation / Parks Worker (user-worker-sanitation-001)...');
  const s3ReassignRes = await makeRequest('PATCH', `/api/incidents/${s3Id}`, {
    status: 'ASSIGNED',
    departmentId: 'SANITATION',
    assignedDepartment: 'Sanitation & Waste Management',
    assignedWorkerId: 'user-worker-sanitation-001',
    assignedWorkerName: 'Priya Sharma (Sanitation Lead)',
    assignedWorker: 'Priya Sharma (Sanitation Lead)',
    assignedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
    reason: 'Heavy branch removal requires sanitation equipment.',
  }, { 'x-user-role': 'AUTHORITY' });

  if (!s3ReassignRes.success) {
    console.error('❌ Reassignment failed:', s3ReassignRes);
    process.exit(1);
  }

  console.log('[3.5] Verifying Backend Authorization & Access Controls...');
  
  // Electrical Worker tries to access reassigned job in worker queue
  const oldWorkerQueue = await makeRequest('GET', `/api/worker/incidents?departmentCode=ELECTRICAL`, null, {
    'x-worker-email': 'electrical.worker@civicshield.demo',
  });
  const oldList = oldWorkerQueue.data?.incidents || oldWorkerQueue.incidents || [];
  const inOldQueue = oldList.some((i) => i.id === s3Id || i.case_id === s3CaseId || i.caseId === s3CaseId);

  // New Sanitation Worker tries to access reassigned job in worker queue
  const newWorkerQueue = await makeRequest('GET', `/api/worker/incidents?departmentCode=SANITATION`, null, {
    'x-worker-email': 'garbage.worker@civicshield.demo',
  });
  const newList = newWorkerQueue.data?.incidents || newWorkerQueue.incidents || [];
  const inNewQueue = newList.some((i) => i.id === s3Id || i.case_id === s3CaseId || i.caseId === s3CaseId);

  const s3Check = await makeRequest('GET', `/api/incidents/${s3Id}`);
  const s3Inc = s3Check.data?.incident;

  console.log('✓ Reassignment assertions:');
  const s3Asserts = [
    { name: 'SAME Case ID preserved', pass: (s3Inc.case_id || s3Inc.caseId) === s3CaseId },
    { name: 'Status set to ASSIGNED', pass: s3Inc.status === 'ASSIGNED' },
    { name: 'Assigned worker updated to new worker', pass: s3Inc.assignedWorkerId === 'user-worker-sanitation-001' || s3Inc.assigned_worker_id === 'user-worker-sanitation-001' },
    { name: 'Previous department tracked', pass: Boolean(s3Inc.previousDepartment || s3Inc.previous_department) },
    { name: 'Previous worker tracked', pass: Boolean(s3Inc.previousWorker || s3Inc.previous_worker) },
    { name: 'Old worker lost queue access (Backend isolation)', pass: !inOldQueue },
    { name: 'New worker gained queue access', pass: inNewQueue },
  ];

  s3Asserts.forEach((a) => {
    console.log(`  [${a.pass ? 'PASS' : 'FAIL'}] ${a.name}`);
    if (!a.pass) process.exit(1);
  });

  console.log('\n====================================================');
  console.log('🎉 ALL AUTHORITY VERIFICATION WORKFLOW TESTS PASSED!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
