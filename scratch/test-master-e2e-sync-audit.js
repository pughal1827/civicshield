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

async function runMasterSyncAudit() {
  console.log('================================================================');
  console.log(' CIVICSHIELD AI: MASTER STATUS SYNCHRONIZATION AUDIT (CASE-001)');
  console.log('================================================================\n');

  // 1. Assign and Worker submits evidence
  console.log('[1] Worker submits resolution evidence...');
  await makeRequest('PATCH', '/api/incidents/inc-case-001', {
    status: 'ASSIGNED',
    departmentId: 'ROAD_MAINTENANCE',
    assignedDepartment: 'Road Maintenance',
    assignedWorkerId: 'user-worker-road-001',
    assignedWorkerName: 'Alex Rivera (Road Maintenance Lead)',
    assignedWorker: 'Alex Rivera (Road Maintenance Lead)',
    assignedBy: 'Officer Robert Chen',
  }, { 'x-user-role': 'AUTHORITY' });

  await makeRequest('POST', '/api/worker/incidents/inc-case-001/action', { action: 'ACCEPT' }, { 'x-worker-email': 'road.worker@civicshield.demo' });

  await makeRequest('POST', '/api/worker/incidents/inc-case-001/action', {
    action: 'SUBMIT_EVIDENCE',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    workerNotes: 'Asphalt repair completed.',
  }, { 'x-worker-email': 'road.worker@civicshield.demo' });

  let incRes = await makeRequest('GET', '/api/incidents/inc-case-001');
  let inc = incRes.data?.incident || incRes.incident;
  console.log(`  - Status after worker submission: ${inc.status}`);

  if (inc.status !== 'WAITING_FOR_APPROVAL') {
    console.error(`❌ Expected WAITING_FOR_APPROVAL, got '${inc.status}'`);
    process.exit(1);
  }

  // 2. Authority Approves Evidence from Complaint Detail page
  console.log('\n[2] Authority Approves Evidence from Detail Page...');
  const appRes = await makeRequest('PATCH', '/api/incidents/inc-case-001', {
    status: 'PENDING_CITIZEN_VERIFICATION',
    approvedBy: 'Officer Robert Chen',
    changedBy: 'Officer Robert Chen',
    reason: 'Officer reviewed and approved worker field evidence.',
  }, { 'x-officer-name': 'Officer Robert Chen' });

  console.log(`  - PATCH Response Code: ${appRes.status}`);
  
  incRes = await makeRequest('GET', '/api/incidents/inc-case-001');
  inc = incRes.data?.incident || incRes.incident;
  console.log(`  - Status after Authority approval: ${inc.status}`);
  console.log(`  - Approved By: ${inc.approved_by || inc.approvedBy}`);

  if (inc.status !== 'PENDING_CITIZEN_VERIFICATION') {
    console.error(`❌ Expected PENDING_CITIZEN_VERIFICATION, got '${inc.status}'`);
    process.exit(1);
  }
  console.log('✓ Authority approval updated status to PENDING_CITIZEN_VERIFICATION in DB!');

  // 3. Verify Citizen, Worker, Authority view PENDING_CITIZEN_VERIFICATION
  console.log('\n[3] Checking Portal Views for PENDING_CITIZEN_VERIFICATION...');
  const citRes = await makeRequest('GET', '/api/reports/track?code=case-001-tracking-uuid');
  const wrkRes = await makeRequest('GET', '/api/worker/incidents/inc-case-001', null, { 'x-worker-email': 'road.worker@civicshield.demo' });

  console.log(`  - Citizen Portal Status: ${citRes.data?.status}`);
  console.log(`  - Worker Portal Status: ${wrkRes.data?.incident?.status}`);
  console.log(`  - Authority Portal Status: ${inc.status}`);

  if (citRes.data?.status !== 'PENDING_CITIZEN_VERIFICATION' || wrkRes.data?.incident?.status !== 'PENDING_CITIZEN_VERIFICATION') {
    console.error('❌ Portal status sync mismatch during PENDING_CITIZEN_VERIFICATION!');
    process.exit(1);
  }
  console.log('✓ All 3 portals report PENDING_CITIZEN_VERIFICATION!');

  // 4. Citizen Approves Resolution
  console.log('\n[4] Citizen Approves Resolution...');
  const verRes = await makeRequest('POST', '/api/incidents/verify', {
    trackingCode: 'case-001-tracking-uuid',
    action: 'ACCEPT',
    feedback: 'Pothole fixed perfectly!',
  });

  console.log(`  - Verification Response Code: ${verRes.status}`);
  console.log(`  - Returned Status: ${verRes.data?.status || verRes.status}`);

  // 5. Verify ALL Portals Report CLOSED
  console.log('\n[5] Verifying Global CLOSED Synchronization...');
  incRes = await makeRequest('GET', '/api/incidents/inc-case-001');
  const finalAuthInc = incRes.data?.incident || incRes.incident;
  const finalCitRes = await makeRequest('GET', '/api/reports/track?code=case-001-tracking-uuid');
  const finalWrkRes = await makeRequest('GET', '/api/worker/incidents/inc-case-001', null, { 'x-worker-email': 'road.worker@civicshield.demo' });

  console.log(`  - Authority Portal Status: ${finalAuthInc.status}`);
  console.log(`  - Citizen Portal Status: ${finalCitRes.data?.status}`);
  console.log(`  - Worker Portal Status: ${finalWrkRes.data?.incident?.status}`);

  if (
    finalAuthInc.status !== 'CLOSED' ||
    finalCitRes.data?.status !== 'CLOSED' ||
    finalWrkRes.data?.incident?.status !== 'CLOSED'
  ) {
    console.error('❌ Mismatch in CLOSED status synchronization across portals!');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 MASTER STATUS SYNCHRONIZATION AUDIT PASSED 100%!');
  console.log('================================================================');
}

runMasterSyncAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
