const http = require('http');

async function runTest() {
  console.log('====================================================');
  console.log('TESTING WORKER COMPLETION EVIDENCE WORKFLOW');
  console.log('====================================================');

  const citizenPhoto = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80';
  const workerAfterPhoto = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80';

  // STEP 1: Submit Citizen Complaint
  console.log('\n[1] Submitting Citizen Complaint...');
  const submitRes = await makeRequest('POST', '/api/reports/submit', {
    description: 'Cracked drainage pipe leaking water onto sidewalk.',
    category: 'DRAINAGE_BLOCKAGE',
    imageUrl: citizenPhoto,
    latitude: 13.0827,
    longitude: 80.2707,
    addressText: 'Water Works Road, Sector 3, Gummidipoondi',
  }, { 'x-user-id': 'cit-test-303' });

  if (!submitRes.success || !submitRes.data) {
    console.error('❌ Citizen submission failed:', submitRes);
    process.exit(1);
  }

  const { caseId, incidentId, trackingCode } = submitRes.data;
  console.log(`✓ Created Incident #${caseId} (ID: ${incidentId})`);

  // STEP 2: Authority assigns to Drainage Worker
  console.log('\n[2] Authority Assigning to Drainage Worker (David O\'Connor)...');
  await makeRequest('PATCH', `/api/incidents/${incidentId}`, {
    status: 'ASSIGNED',
    departmentId: 'DRAINAGE',
    assignedDepartment: 'Drainage & Sewerage Department',
    assignedWorkerId: 'user-worker-drainage-001',
    assignedWorkerName: 'David O\'Connor (Drainage Crew Lead)',
    assignedWorker: 'David O\'Connor (Drainage Crew Lead)',
    assignedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
    reason: 'Assigned for pipe repair.',
  }, { 'x-user-role': 'AUTHORITY' });

  // STEP 3: Worker accepts job -> Status becomes IN_PROGRESS
  console.log('\n[3] Drainage Worker Accepting Job (Setting Status to IN_PROGRESS)...');
  await makeRequest('POST', `/api/worker/incidents/${incidentId}/action`, {
    action: 'ACCEPT',
  }, { 'x-worker-email': 'drainage.worker@civicshield.demo' });

  const inProgressCheck = await makeRequest('GET', `/api/incidents/${incidentId}`);
  if (inProgressCheck.data?.incident?.status !== 'IN_PROGRESS') {
    console.error(`❌ Expected status 'IN_PROGRESS', got '${inProgressCheck.data?.incident?.status}'`);
    process.exit(1);
  }
  console.log(`✓ Status is now IN_PROGRESS`);

  // STEP 4: Worker submits finished work evidence photo & notes
  console.log('\n[4] Worker Submitting Finished-Work Photo Evidence & Field Notes...');
  const submitEvPayload = {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: workerAfterPhoto,
    beforePhotoUrl: citizenPhoto,
    workerNotes: 'Replaced cracked PVC pipe section with reinforced cast iron coupling. Leak fully sealed and tested.',
    latitude: 13.0827,
    longitude: 80.2707,
  };

  const submitEvRes = await makeRequest('POST', `/api/worker/incidents/${incidentId}/action`, submitEvPayload, {
    'x-worker-email': 'drainage.worker@civicshield.demo',
  });

  if (!submitEvRes.success) {
    console.error('❌ Evidence submission failed:', submitEvRes);
    process.exit(1);
  }
  console.log(`✓ Worker SUBMIT_EVIDENCE Action Executed Successfully!`);

  // STEP 5: Verify Evidence Persistence & Database Record
  console.log('\n[5] Verifying Database Record Fields & Evidence Persistence...');
  const detailRes = await makeRequest('GET', `/api/incidents/${incidentId}`);
  const inc = detailRes.data?.incident;
  const reports = detailRes.data?.reports || [];
  const resolutionEv = detailRes.data?.resolutionEvidence;

  console.log(`  - Case ID: ${inc.case_id || inc.caseId}`);
  console.log(`  - Status: ${inc.status}`);
  console.log(`  - Original Citizen Photo (Preserved): ${reports[0]?.image_url || reports[0]?.imageUrl || inc.imageUrl}`);
  console.log(`  - Worker After Photo: ${resolutionEv?.proof_image_url}`);
  console.log(`  - Field Notes: ${resolutionEv?.resolution_notes}`);
  console.log(`  - Submitted At: ${inc.evidence_submitted_at || inc.submittedAt}`);
  console.log(`  - Changed By: ${inc.changedBy || inc.changed_by}`);

  const asserts = [
    { name: 'SAME Case ID preserved', pass: (inc.case_id || inc.caseId) === caseId },
    { name: 'Status = WAITING_FOR_APPROVAL', pass: inc.status === 'WAITING_FOR_APPROVAL' },
    { name: 'Original Citizen Photo NOT replaced', pass: (reports[0]?.image_url || reports[0]?.imageUrl || inc.imageUrl) === citizenPhoto },
    { name: 'Worker After Photo stored separately', pass: resolutionEv?.proof_image_url === workerAfterPhoto },
    { name: 'Field Notes & Description saved', pass: Boolean(resolutionEv?.resolution_notes) },
    { name: 'Submitted At timestamp saved', pass: Boolean(inc.evidence_submitted_at || inc.submittedAt) },
    { name: 'Changed By recorded', pass: Boolean(inc.changedBy || inc.changed_by) },
    { name: 'Evidence Attempt History preserved', pass: Array.isArray(resolutionEv?.attempts) && resolutionEv.attempts.length >= 1 },
  ];

  let evPassed = true;
  for (const check of asserts) {
    if (check.pass) console.log(`  ✓ PASSED: ${check.name}`);
    else { console.error(`  ✕ FAILED: ${check.name}`); evPassed = false; }
  }
  if (!evPassed) process.exit(1);

  // STEP 6: Verify Multi-Portal Synchronization to WAITING_FOR_APPROVAL
  console.log('\n[6] Verifying Multi-Portal Status Synchronization...');
  
  // Citizen tracking API
  const citizenTrackRes = await makeRequest('GET', `/api/reports/track?code=${trackingCode}`);
  const citizenStatus = citizenTrackRes.data?.incident?.status || citizenTrackRes.data?.status;
  console.log(`  - Citizen Portal Status: ${citizenStatus}`);

  // Authority API
  const authorityCheckRes = await makeRequest('GET', `/api/incidents/${incidentId}`);
  const authorityStatus = authorityCheckRes.data?.incident?.status;
  const authorityEv = authorityCheckRes.data?.resolutionEvidence;
  console.log(`  - Authority Portal Status: ${authorityStatus}`);

  // Worker API
  const workerCheckRes = await makeRequest('GET', `/api/worker/incidents/${incidentId}`, null, {
    'x-worker-email': 'drainage.worker@civicshield.demo',
  });
  const workerStatus = workerCheckRes.data?.incident?.status;
  console.log(`  - Worker Portal Status: ${workerStatus}`);

  if (citizenStatus !== 'WAITING_FOR_APPROVAL' || authorityStatus !== 'WAITING_FOR_APPROVAL' || workerStatus !== 'WAITING_FOR_APPROVAL') {
    console.error('❌ Portal status synchronization failed:', { citizenStatus, authorityStatus, workerStatus });
    process.exit(1);
  }

  console.log(`✓ All 3 Portals simultaneously show WAITING_FOR_APPROVAL!`);
  console.log(`✓ Authority Portal has access to BEFORE (${citizenPhoto}) and AFTER (${authorityEv?.proof_image_url}) evidence!`);

  console.log('====================================================');
  console.log('🎉 WORKER COMPLETION EVIDENCE WORKFLOW FULLY VERIFIED 100%');
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
