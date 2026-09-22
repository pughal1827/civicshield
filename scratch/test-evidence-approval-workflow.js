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

async function testEvidenceApprovalWorkflow() {
  console.log('================================================================');
  console.log(' CIVICSHIELD AI: AUTHORITY EVIDENCE APPROVAL WORKFLOW AUDIT');
  console.log('================================================================\n');

  // STEP 0: Reset store state to WAITING_FOR_APPROVAL with evidence submitted
  console.log('[0] Initializing complaint CASE-001 in WAITING_FOR_APPROVAL state...');
  
  // Assign job first
  await makeRequest('PATCH', '/api/incidents/inc-case-001', {
    status: 'ASSIGNED',
    departmentId: 'ROAD_MAINTENANCE',
    assignedDepartment: 'Road Maintenance',
    assignedWorkerId: 'user-worker-road-001',
    assignedWorkerName: 'Alex Rivera (Road Maintenance Lead)',
    assignedWorker: 'Alex Rivera (Road Maintenance Lead)',
    assignedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY' });

  // Worker accepts job
  await makeRequest('POST', '/api/worker/incidents/inc-case-001/action', { action: 'ACCEPT' }, { 'x-worker-email': 'road.worker@civicshield.demo' });

  // Worker submits initial field evidence
  await makeRequest('POST', '/api/worker/incidents/inc-case-001/action', {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    workerNotes: 'Pothole filled with hot-mix asphalt and compacted.',
  }, { 'x-worker-email': 'road.worker@civicshield.demo' });

  // Verify it appears in Pending Review
  console.log('\n[1] Verifying evidence appears in Pending Review...');
  let evListRes = await makeRequest('GET', '/api/authority/evidence', null, { 'x-authority-email': 'officer@civicshield.gov' });
  
  if (evListRes.status !== 200 || !evListRes.success) {
    console.error('API Error Response:', evListRes);
    process.exit(1);
  }

  const responseData = evListRes.data || evListRes;
  let items = responseData.evidenceItems || [];
  let stats = responseData.stats || {};

  console.log(`  - Total Pending Items: ${stats.pendingCount}`);
  console.log(`  - Total Approved Items: ${stats.approvedCount}`);
  console.log(`  - Total Rejected Items: ${stats.rejectedCount}`);

  const pendingItem = items.find((i) => (i.id === 'inc-case-001' || i.caseId === 'CASE-001') && i.evidenceStatus === 'PENDING');
  if (!pendingItem) {
    console.error('❌ Expected CASE-001 in Pending Review list!');
    console.error('Found items:', items);
    process.exit(1);
  }
  console.log('✓ CASE-001 found in Pending Review list!');

  // TEST 1 — APPROVE
  console.log('\n[2] TEST 1: Authority Approves Evidence...');
  const approveRes = await makeRequest('POST', '/api/authority/evidence/inc-case-001/review', {
    action: 'APPROVE',
  }, { 'x-authority-email': 'officer@civicshield.gov' });

  console.log(`  - Review API Response Code: ${approveRes.status}`);
  if (approveRes.status !== 200 || !approveRes.success) {
    console.error(`❌ Approval failed: ${approveRes.error?.message || JSON.stringify(approveRes)}`);
    process.exit(1);
  }

  // Verify DB state
  const incDetailRes = await makeRequest('GET', '/api/incidents/inc-case-001');
  const incDetail = incDetailRes.data?.incident || incDetailRes.incident || {};
  console.log(`  - Incident DB Status: ${incDetail.status}`);
  console.log(`  - Approved By: ${incDetail.approved_by || incDetail.approvedBy}`);

  if (incDetail.status !== 'PENDING_CITIZEN_VERIFICATION') {
    console.error(`❌ Expected status 'PENDING_CITIZEN_VERIFICATION', got '${incDetail.status}'`);
    process.exit(1);
  }
  console.log('✓ Incident status updated to PENDING_CITIZEN_VERIFICATION!');

  // Verify list filtering & counts after approval
  evListRes = await makeRequest('GET', '/api/authority/evidence', null, { 'x-authority-email': 'officer@civicshield.gov' });
  const appData = evListRes.data || evListRes;
  items = appData.evidenceItems || [];
  stats = appData.stats || {};

  console.log(`  - Updated Pending Count: ${stats.pendingCount}`);
  console.log(`  - Updated Approved Count: ${stats.approvedCount}`);

  const inPending = items.some((i) => (i.id === 'inc-case-001' || i.caseId === 'CASE-001') && i.evidenceStatus === 'PENDING');
  const inApproved = items.some((i) => (i.id === 'inc-case-001' || i.caseId === 'CASE-001') && i.evidenceStatus === 'APPROVED');

  if (inPending || !inApproved) {
    console.error('❌ Item did not correctly move from Pending Review to Approved!');
    process.exit(1);
  }
  console.log('✓ Item removed from Pending Review and present under Approved!');

  // TEST 2 — REJECT
  console.log('\n[3] TEST 2: Testing Rejection Workflow...');
  // Reset to WAITING_FOR_APPROVAL for rejection testing
  await makeRequest('POST', '/api/worker/incidents/inc-case-001/action', {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    workerNotes: 'Attempt 2 evidence before rejection test.',
  }, { 'x-worker-email': 'road.worker@civicshield.demo' });

  const rejectReason = 'Photo does not clearly show the completed edge sealing.';
  const rejectRes = await makeRequest('POST', '/api/authority/evidence/inc-case-001/review', {
    action: 'REJECT',
    rejectionReason: rejectReason,
  }, { 'x-authority-email': 'officer@civicshield.gov' });

  console.log(`  - Reject API Response Code: ${rejectRes.status}`);
  if (rejectRes.status !== 200 || !rejectRes.success) {
    console.error(`❌ Rejection failed: ${rejectRes.error?.message || JSON.stringify(rejectRes)}`);
    process.exit(1);
  }

  // Verify DB state after rejection
  const rejIncRes = await makeRequest('GET', '/api/incidents/inc-case-001');
  const rejData = rejIncRes.data || rejIncRes;
  const rejInc = rejData.incident || {};
  console.log(`  - Rejected Incident Status: ${rejInc.status}`);
  console.log(`  - Rejection Reason: "${rejInc.rejection_reason || rejInc.rejectionReason}"`);

  if (rejInc.status !== 'EVIDENCE_REJECTED') {
    console.error(`❌ Expected status 'EVIDENCE_REJECTED', got '${rejInc.status}'`);
    process.exit(1);
  }
  console.log('✓ Incident status updated to EVIDENCE_REJECTED with rejection reason!');

  // Verify list filtering & counts after rejection
  evListRes = await makeRequest('GET', '/api/authority/evidence', null, { 'x-authority-email': 'officer@civicshield.gov' });
  const rejListData = evListRes.data || evListRes;
  items = rejListData.evidenceItems || [];
  stats = rejListData.stats || {};

  const inRejPending = items.some((i) => (i.id === 'inc-case-001' || i.caseId === 'CASE-001') && i.evidenceStatus === 'PENDING');
  const inRejected = items.some((i) => (i.id === 'inc-case-001' || i.caseId === 'CASE-001') && i.evidenceStatus === 'REJECTED');

  console.log(`  - Updated Rejected Count: ${stats.rejectedCount}`);
  if (inRejPending || !inRejected) {
    console.error('❌ Item did not correctly move from Pending Review to Rejected!');
    process.exit(1);
  }
  console.log('✓ Item removed from Pending Review and present under Rejected!');

  // TEST 3 — RESUBMISSION & HISTORY
  console.log('\n[4] TEST 3: Worker Resubmission & Evidence History...');
  
  // Worker submits Attempt 3 (new evidence)
  await makeRequest('POST', '/api/worker/incidents/inc-case-001/action', {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    workerNotes: 'Attempt 3: Edge sealing completed and sealed.',
  }, { 'x-worker-email': 'road.worker@civicshield.demo' });

  // Verify status is WAITING_FOR_APPROVAL and evidence is PENDING again
  const resubmitIncRes = await makeRequest('GET', '/api/incidents/inc-case-001');
  const resubmitData = resubmitIncRes.data || resubmitIncRes;
  const attempts = resubmitData.resolutionEvidence?.attempts || [];

  console.log(`  - Status after resubmission: ${resubmitData.incident.status}`);
  console.log(`  - Total Evidence Attempts in History: ${attempts.length}`);

  if (resubmitData.incident.status !== 'WAITING_FOR_APPROVAL') {
    console.error(`❌ Expected status 'WAITING_FOR_APPROVAL' on resubmission, got '${resubmitData.incident.status}'`);
    process.exit(1);
  }

  if (attempts.length < 2) {
    console.error('❌ Expected multiple attempts preserved in history!');
    process.exit(1);
  }

  const prevAttempt = attempts.find((a) => a.status === 'REJECTED');
  if (!prevAttempt || !prevAttempt.rejectionReason) {
    console.error('❌ Previous rejected attempt history was lost or missing rejection reason!');
    process.exit(1);
  }
  console.log(`  - Preserved Rejected Attempt Rejection Reason: "${prevAttempt.rejectionReason}"`);
  console.log('✓ Previous rejected evidence preserved in history!');

  // Final Approval of Resubmitted Evidence
  console.log('\n[5] Authority Approves Resubmitted Evidence...');
  await makeRequest('POST', '/api/authority/evidence/inc-case-001/review', {
    action: 'APPROVE',
  }, { 'x-authority-email': 'officer@civicshield.gov' });

  const finalCheckRes = await makeRequest('GET', '/api/incidents/inc-case-001');
  const finalData = finalCheckRes.data || finalCheckRes;
  const finalInc = finalData.incident || {};
  console.log(`✓ Final Incident Status: ${finalInc.status}`);

  if (finalInc.status !== 'PENDING_CITIZEN_VERIFICATION') {
    console.error(`❌ Expected final status 'PENDING_CITIZEN_VERIFICATION', got '${finalInc.status}'`);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 AUTHORITY EVIDENCE APPROVAL WORKFLOW AUDIT PASSED 100%!');
  console.log('================================================================');
}

testEvidenceApprovalWorkflow().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
