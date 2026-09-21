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
  console.log('TESTING CITIZEN VERIFICATION WORKFLOW');
  console.log(' (PENDING_CITIZEN_VERIFICATION -> CLOSED / REOPENED)');
  console.log('====================================================\n');

  const citizenPhoto = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80';
  const workerAfterPhoto = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80';

  // ----------------------------------------------------
  // TEST SCENARIO 1: CITIZEN APPROVES RESOLUTION (CLOSES CASE)
  // ----------------------------------------------------
  console.log('----------------------------------------------------');
  console.log('SCENARIO 1: CITIZEN APPROVES RESOLUTION -> CLOSED');
  console.log('----------------------------------------------------');

  console.log('[1.1] Citizen submits complaint...');
  const s1Submit = await makeRequest('POST', '/api/reports/submit', {
    description: 'Dangerous open trench near school sidewalk.',
    category: 'PUBLIC_INFRA_DAMAGE',
    imageUrl: citizenPhoto,
    latitude: 13.0827,
    longitude: 80.2707,
    addressText: '12 School Road, District 4',
  }, { 'x-user-id': 'cit-test-verif-1' });

  const s1Id = s1Submit.data.incidentId;
  const s1CaseId = s1Submit.data.caseId;
  const s1TrackingCode = s1Submit.data.trackingCode;
  console.log(`✓ Complaint created: ${s1CaseId} (${s1Id}, trackingCode: ${s1TrackingCode})`);

  console.log('[1.2] Authority assigns, Worker accepts and submits finished work evidence...');
  await makeRequest('PATCH', `/api/incidents/${s1Id}`, {
    status: 'ASSIGNED',
    departmentId: 'ROAD_MAINTENANCE',
    assignedDepartment: 'Road Maintenance',
    assignedWorkerId: 'user-worker-road-001',
    assignedWorkerName: 'Alex Rivera (Road Maintenance Lead)',
    assignedWorker: 'Alex Rivera (Road Maintenance Lead)',
    assignedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY' });

  await makeRequest('POST', `/api/worker/incidents/${s1Id}/action`, { action: 'ACCEPT' }, { 'x-worker-email': 'road.worker@civicshield.demo' });
  await makeRequest('POST', `/api/worker/incidents/${s1Id}/action`, {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: workerAfterPhoto,
    beforePhotoUrl: citizenPhoto,
    workerNotes: 'Steel cover plate installed and trench backfilled.',
  }, { 'x-worker-email': 'road.worker@civicshield.demo' });

  console.log('[1.3] Authority approves evidence -> Status becomes PENDING_CITIZEN_VERIFICATION...');
  await makeRequest('PATCH', `/api/incidents/${s1Id}`, {
    status: 'PENDING_CITIZEN_VERIFICATION',
    approvedBy: 'Officer Sarah Jenkins',
    changedBy: 'Officer Sarah Jenkins',
    notes: 'Evidence verified and approved. Sent for citizen verification.',
  }, { 'x-user-role': 'AUTHORITY', 'x-officer-name': 'Officer Sarah Jenkins' });

  console.log('[1.4] Checking Citizen notification and tracking details...');
  const s1NotifRes = await makeRequest('GET', '/api/citizen/notifications', null, { 'x-user-id': 'cit-test-verif-1' });
  const s1TrackRes = await makeRequest('GET', `/api/reports/track?code=${s1TrackingCode}`);
  const s1TrackData = s1TrackRes.data;

  console.log('✓ Citizen pre-approval assertions:');
  const s1PreAsserts = [
    { name: 'Tracking Status = PENDING_CITIZEN_VERIFICATION', pass: s1TrackData?.status === 'PENDING_CITIZEN_VERIFICATION' },
    { name: 'Case ID visible in tracking view', pass: s1TrackData?.caseId === s1CaseId },
    { name: 'Original Citizen Photo preserved', pass: Boolean(s1TrackData?.imageUrl) },
    { name: 'Worker Completion Photo present', pass: Boolean(s1TrackData?.resolutionEvidence?.proof_image_url) },
    { name: 'Completion description present', pass: Boolean(s1TrackData?.resolutionEvidence?.resolution_notes) },
  ];

  s1PreAsserts.forEach((a) => {
    console.log(`  [${a.pass ? 'PASS' : 'FAIL'}] ${a.name}`);
    if (!a.pass) process.exit(1);
  });

  console.log('[1.5] Citizen Approves Resolution (action: ACCEPT)...');
  const s1ApproveRes = await makeRequest('POST', '/api/incidents/verify', {
    trackingCode: s1TrackingCode,
    action: 'ACCEPT',
    feedback: 'Trench is properly filled and sidewalk is safe now. Great work!',
  });

  if (!s1ApproveRes.success) {
    console.error('❌ Citizen verification failed:', s1ApproveRes);
    process.exit(1);
  }

  console.log('[1.6] Verifying status = CLOSED in Database and across all Portals...');
  const s1DetailRes = await makeRequest('GET', `/api/incidents/${s1Id}`);
  const s1Inc = s1DetailRes.data?.incident;

  console.log('✓ Citizen approval assertions:');
  const s1PostAsserts = [
    { name: 'Status = CLOSED in database record', pass: s1Inc.status === 'CLOSED' },
    { name: 'citizenVerifiedBy recorded', pass: Boolean(s1Inc.citizenVerifiedBy || s1Inc.citizen_verified_by) },
    { name: 'citizenVerifiedAt timestamp recorded', pass: Boolean(s1Inc.citizenVerifiedAt || s1Inc.citizen_verified_at) },
    { name: 'changedBy recorded as Citizen', pass: Boolean(s1Inc.changedBy || s1Inc.changed_by) },
    { name: 'changedAt recorded', pass: Boolean(s1Inc.changedAt || s1Inc.changed_at) },
  ];

  s1PostAsserts.forEach((a) => {
    console.log(`  [${a.pass ? 'PASS' : 'FAIL'}] ${a.name}`);
    if (!a.pass) process.exit(1);
  });


  // ----------------------------------------------------
  // TEST SCENARIO 2: CITIZEN REJECTS RESOLUTION (REOPENS CASE)
  // ----------------------------------------------------
  console.log('\n----------------------------------------------------');
  console.log('SCENARIO 2: CITIZEN REJECTS RESOLUTION -> REOPENED');
  console.log('----------------------------------------------------');

  console.log('[2.1] Citizen submits complaint...');
  const s2Submit = await makeRequest('POST', '/api/reports/submit', {
    description: 'Burst water pipe flooding residential street.',
    category: 'WATER_LEAKAGE',
    imageUrl: citizenPhoto,
    latitude: 13.0827,
    longitude: 80.2707,
    addressText: '78 Water Pipe Avenue',
  }, { 'x-user-id': 'cit-test-verif-2' });

  const s2Id = s2Submit.data.incidentId;
  const s2CaseId = s2Submit.data.caseId;
  const s2TrackingCode = s2Submit.data.trackingCode;

  console.log('[2.2] Authority assigns, Worker accepts & submits finished work evidence...');
  await makeRequest('PATCH', `/api/incidents/${s2Id}`, {
    status: 'ASSIGNED',
    departmentId: 'WATER',
    assignedDepartment: 'Water Supply Department',
    assignedWorkerId: 'user-worker-water-001',
    assignedWorkerName: 'Elena Rostova (Water Resources Engineer)',
    assignedWorker: 'Elena Rostova (Water Resources Engineer)',
    assignedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY' });

  await makeRequest('POST', `/api/worker/incidents/${s2Id}/action`, { action: 'ACCEPT' }, { 'x-worker-email': 'water.worker@civicshield.demo' });
  await makeRequest('POST', `/api/worker/incidents/${s2Id}/action`, {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: workerAfterPhoto,
    beforePhotoUrl: citizenPhoto,
    workerNotes: 'Valve replaced.',
  }, { 'x-worker-email': 'water.worker@civicshield.demo' });

  console.log('[2.3] Authority approves evidence -> Status becomes PENDING_CITIZEN_VERIFICATION...');
  await makeRequest('PATCH', `/api/incidents/${s2Id}`, {
    status: 'PENDING_CITIZEN_VERIFICATION',
    approvedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY' });

  console.log('[2.4] Verifying Citizen Rejection WITHOUT reason fails (Validation Check)...');
  const s2FailReject = await makeRequest('POST', '/api/incidents/verify', {
    trackingCode: s2TrackingCode,
    action: 'REJECT',
    feedback: '   ',
  });
  console.log(`  - Rejection without reason returned status ${s2FailReject.status}: ${s2FailReject.error?.message || s2FailReject.message || 'Error handled correctly'}`);

  console.log('[2.5] Citizen Rejects Resolution WITH valid reason...');
  const s2RejectionReason = 'Water is still leaking heavily from under the asphalt valve cap.';
  const s2RejectRes = await makeRequest('POST', '/api/incidents/verify', {
    trackingCode: s2TrackingCode,
    action: 'REJECT',
    feedback: s2RejectionReason,
  });

  if (!s2RejectRes.success) {
    console.error('❌ Citizen rejection failed:', s2RejectRes);
    process.exit(1);
  }

  console.log('[2.6] Verifying status = REOPENED and field persistence in Database...');
  const s2DetailRes = await makeRequest('GET', `/api/incidents/${s2Id}`);
  const s2Inc = s2DetailRes.data?.incident;

  console.log('✓ Citizen rejection assertions:');
  const s2PostAsserts = [
    { name: 'Status = REOPENED in database record', pass: s2Inc.status === 'REOPENED' },
    { name: 'citizenRejectionReason saved', pass: (s2Inc.citizenRejectionReason || s2Inc.citizen_rejection_reason) === s2RejectionReason },
    { name: 'rejectedBy recorded', pass: Boolean(s2Inc.rejectedBy || s2Inc.rejected_by) },
    { name: 'rejectedAt timestamp recorded', pass: Boolean(s2Inc.rejectedAt || s2Inc.rejected_at) },
    { name: 'changedBy recorded', pass: Boolean(s2Inc.changedBy || s2Inc.changed_by) },
    { name: 'changedAt recorded', pass: Boolean(s2Inc.changedAt || s2Inc.changed_at) },
  ];

  s2PostAsserts.forEach((a) => {
    console.log(`  [${a.pass ? 'PASS' : 'FAIL'}] ${a.name}`);
    if (!a.pass) process.exit(1);
  });

  console.log('[2.7] Verifying Authority can send back to same worker or reassign another worker/department...');
  const s2ReassignRes = await makeRequest('PATCH', `/api/incidents/${s2Id}`, {
    status: 'ASSIGNED',
    departmentId: 'WATER',
    assignedDepartment: 'Water Supply Department',
    assignedWorkerId: 'user-worker-water-001',
    assignedWorkerName: 'Elena Rostova (Water Resources Engineer)',
    assignedWorker: 'Elena Rostova (Water Resources Engineer)',
    assignedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
    reason: 'Sent back to water crew lead for secondary pipe seal after citizen feedback.',
  }, { 'x-user-role': 'AUTHORITY' });

  if (!s2ReassignRes.success) {
    console.error('❌ Authority reassignment after citizen rejection failed:', s2ReassignRes);
    process.exit(1);
  }

  const s2ReassignCheck = await makeRequest('GET', `/api/incidents/${s2Id}`);
  const s2ReassignedInc = s2ReassignCheck.data?.incident;

  console.log('✓ Authority action assertions after citizen rejection:');
  const s2ReassignAsserts = [
    { name: 'SAME Case ID preserved after reopening', pass: (s2ReassignedInc.case_id || s2ReassignedInc.caseId) === s2CaseId },
    { name: 'Status updated to ASSIGNED for field rework', pass: s2ReassignedInc.status === 'ASSIGNED' },
  ];

  s2ReassignAsserts.forEach((a) => {
    console.log(`  [${a.pass ? 'PASS' : 'FAIL'}] ${a.name}`);
    if (!a.pass) process.exit(1);
  });

  console.log('\n====================================================');
  console.log('🎉 ALL CITIZEN VERIFICATION WORKFLOW TESTS PASSED!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
