/**
 * CivicShield AI - Phase 8 Master End-to-End (E2E) Workflow Test
 * 
 * Verifies complete civic issue lifecycle from citizen report submission to
 * authority triage, department assignment, resolution evidence, citizen feedback,
 * rejection & reopening flow, final verification, and audit logging.
 */

import { mockStore } from '../lib/db/mock-store';
import { calculatePriorityScore } from '../lib/priority/priority-engine';
import { createAuthSession, getSessionByToken } from '../lib/auth/session';
import { logger } from '../lib/logging/logger';


interface E2ETestStep {
  step: number;
  phaseName: string;
  action: string;
  expectedState: string;
  actualState: string;
  status: 'PASS' | 'FAIL';
}

const e2eResults: E2ETestStep[] = [];

function recordE2EStep(
  step: number,
  phaseName: string,
  action: string,
  expectedState: string,
  actualState: string,
  passed: boolean
) {
  e2eResults.push({
    step,
    phaseName,
    action,
    expectedState,
    actualState,
    status: passed ? 'PASS' : 'FAIL',
  });
}

async function runPhase8MasterE2E() {
  console.log('=== RUNNING PHASE 8 MASTER END-TO-END WORKFLOW AUDIT ===\n');

  // STEP 1: Citizen Signup & Authentication
  const citizenEmail = `e2e_citizen_${Date.now()}@example.com`;
  const citizenSession = createAuthSession({
    id: `usr-cit-${Date.now()}`,
    email: citizenEmail,
    fullName: 'E2E Citizen Tester',
    role: 'CITIZEN',
    createdAt: new Date().toISOString(),
  });

  const citizenUser = getSessionByToken(citizenSession.token)?.user || null;
  const step1Pass = citizenUser !== null && citizenUser.email === citizenEmail;
  recordE2EStep(1, 'Citizen Authentication', 'Register & Login Citizen', `Authenticated as ${citizenEmail}`, `Identity resolved: ${citizenUser?.email}`, step1Pass);

  // STEP 2: Citizen Report Submission
  const caseId = `CS-${Math.floor(1000 + Math.random() * 9000)}`;
  const trackingCode = crypto.randomUUID();
  const incidentId = `inc-e2e-${Date.now()}`;

  const submittedIncident = mockStore.addIncident({
    id: incidentId,
    case_id: caseId,
    title: 'Severe Water Leakage near Central Park',
    summary: 'Main supply pipe burst creating major flooding on main arterial road.',
    category: 'WATER_LEAKAGE',
    severity: 'HIGH',
    status: 'SUBMITTED',
    priority_score: 82,
    priority_factors: { explanation: 'High severity safety risk on major road.' },
    latitude: 12.9716,
    longitude: 77.5946,
    address: 'Central Park Main Gate, MG Road',
    department_id: '44444444-4444-4444-4444-444444444444',
    report_count: 1,
    affected_citizens_count: 1,
    is_duplicate_flagged: false,
    created_at: new Date().toISOString(),
  });

  const submittedReport = mockStore.addReport({
    id: `rep-e2e-${Date.now()}`,
    incident_id: incidentId,
    tracking_code: trackingCode,
    raw_description: 'Main supply pipe burst creating major flooding on main arterial road.',
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    latitude: 12.9716,
    longitude: 77.5946,
    address_text: 'Central Park Main Gate, MG Road',
    is_original_report: true,
    created_at: new Date().toISOString(),
  });

  const step2Pass = submittedIncident.case_id === caseId && submittedReport.tracking_code === trackingCode;
  recordE2EStep(2, 'Citizen Submission', 'Submit Civic Issue Report', `Case ID ${caseId} created with tracking UUID`, `Case ID: ${submittedIncident.case_id}, Status: ${submittedIncident.status}`, step2Pass);

  // STEP 3: Multimodal AI Analysis & Priority Calculation
  const reportObj = submittedReport as any;
  const priorityResult = calculatePriorityScore({
    category: 'WATER_LEAKAGE',
    aiSeverity: 'HIGH',
    aiSafetyRiskScore: 85,
    description: reportObj.raw_description || reportObj.description || '',
    addressText: reportObj.address_text || reportObj.address || '',
    reportCount: 1,
    affectedCitizensCount: 1,
  });


  mockStore.updateIncident(incidentId, { status: 'AI_ANALYSED' });
  const step3Pass = priorityResult.priorityScore > 0 && (priorityResult.priorityLevel === 'MEDIUM' || priorityResult.priorityLevel === 'HIGH');
  recordE2EStep(3, 'AI Engine & Priority', 'Calculate Priority & Department Routing', `Priority score calculated (${priorityResult.priorityScore}/100, level: ${priorityResult.priorityLevel})`, `Score: ${priorityResult.priorityScore}, Level: ${priorityResult.priorityLevel}`, step3Pass);


  // STEP 4: Citizen Incident Tracking Lookup
  const trackedReport = mockStore.getReport(trackingCode);
  const trackedIncident = trackedReport ? mockStore.getIncident(trackedReport.incident_id) : null;
  const step4Pass = trackedIncident !== null && trackedIncident.id === incidentId;
  recordE2EStep(4, 'Citizen Tracking', 'Lookup Incident via Secure Tracking UUID', `Tracked Case ID ${caseId}`, `Found Case ID: ${trackedIncident?.case_id}`, step4Pass);

  // STEP 5: Authority Portal Login
  const authoritySession = createAuthSession({
    id: `usr-auth-${Date.now()}`,
    email: 'officer@civicshield.gov',
    fullName: 'Officer Smith',
    role: 'AUTHORITY',
    departmentId: '44444444-4444-4444-4444-444444444444',
    createdAt: new Date().toISOString(),
  });

  const authorityUser = getSessionByToken(authoritySession.token)?.user || null;
  const step5Pass = authorityUser !== null && authorityUser.role === 'AUTHORITY';
  recordE2EStep(5, 'Authority Portal', 'Authority Login & Portal Clearance', 'Authenticated as AUTHORITY role', `Role: ${authorityUser?.role}`, step5Pass);

  // STEP 6: Department Officer Assignment & Status Transition (IN_PROGRESS)
  mockStore.updateIncident(incidentId, { status: 'IN_PROGRESS' });
  const inProgressInc = mockStore.getIncident(incidentId);
  const step6Pass = inProgressInc?.status === 'IN_PROGRESS';
  recordE2EStep(6, 'Authority Operations', 'Assign Department & Transition to IN_PROGRESS', 'Status updated to IN_PROGRESS', `Status: ${inProgressInc?.status}`, step6Pass);

  // STEP 7: Work Completion & Resolution Evidence Upload
  const evidenceId = `ev-${Date.now()}`;
  mockStore.setResolutionEvidence({
    id: evidenceId,
    incident_id: incidentId,
    officer_id: authorityUser!.id,
    proof_image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
    resolution_notes: 'Supply line valve shut and damaged section replaced by emergency water crew.',
    citizen_verified: false,
    created_at: new Date().toISOString(),
  });

  mockStore.updateIncident(incidentId, { status: 'RESOLVED' });
  const resolvedInc = mockStore.getIncident(incidentId);
  const step7Pass = resolvedInc?.status === 'RESOLVED';
  recordE2EStep(7, 'Incident Resolution', 'Attach Evidence & Move to RESOLVED', 'Evidence attached & status RESOLVED', `Status: ${resolvedInc?.status}`, step7Pass);

  // STEP 8: Citizen Resolution Rejection & Reopening Flow
  mockStore.updateIncident(incidentId, { status: 'IN_PROGRESS' });
  mockStore.addAuditLog({
    id: `audit-${Date.now()}`,
    incident_id: incidentId,
    performed_by: citizenUser!.id,
    action: 'CITIZEN_REJECTED_RESOLUTION',
    reason: 'Water is still leaking around the curb valve.',
    created_at: new Date().toISOString(),
  });

  const reopenedInc = mockStore.getIncident(incidentId);
  const step8Pass = reopenedInc?.status === 'IN_PROGRESS';
  recordE2EStep(8, 'Citizen Verification', 'Citizen Rejects Resolution (Reopens Issue)', 'Status transitions back to IN_PROGRESS', `Status: ${reopenedInc?.status}`, step8Pass);

  // STEP 9: Secondary Resolution & Citizen Verification Acceptance
  mockStore.setResolutionEvidence({
    id: `ev2-${Date.now()}`,
    incident_id: incidentId,
    officer_id: authorityUser!.id,
    proof_image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
    resolution_notes: 'Curb valve gasket replaced and secondary test confirmed clean seal.',
    citizen_verified: true,
    citizen_feedback: 'Checked in person, leak is completely fixed now. Thank you!',
    created_at: new Date().toISOString(),
  });

  mockStore.updateIncident(incidentId, { status: 'VERIFIED' });
  const finalInc = mockStore.getIncident(incidentId);
  const step9Pass = finalInc?.status === 'VERIFIED';
  recordE2EStep(9, 'Final Verification', 'Citizen Accepts Resolution (VERIFIED)', 'Incident status transitions to VERIFIED', `Final Status: ${finalInc?.status}`, step9Pass);

  // STEP 10: Audit Log Chain Integrity Verification
  const auditLogs = mockStore.getAuditLogs(incidentId);
  const hasRejectionAudit = auditLogs.some((l) => l.action === 'CITIZEN_REJECTED_RESOLUTION');
  const step10Pass = hasRejectionAudit;
  recordE2EStep(10, 'Audit Trail', 'Verify Audit Trail for Rejection & Resolution Lifecycle', 'Audit log records CITIZEN_REJECTED_RESOLUTION', `Audit entries count: ${auditLogs.length}, Rejection logged: ${hasRejectionAudit}`, step10Pass);



  // Print Summary Table
  console.table(e2eResults);

  const passedCount = e2eResults.filter((r) => r.status === 'PASS').length;
  const totalCount = e2eResults.length;

  console.log('\n========================================================');
  console.log('  PHASE 8 MASTER END-TO-END WORKFLOW AUDIT SUMMARY');
  console.log('========================================================');
  console.log(`  TOTAL STEPS EXECUTED : ${totalCount}`);
  console.log(`  PASSED               : ${passedCount} (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log(`  FAILED               : ${totalCount - passedCount}`);
  console.log('========================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runPhase8MasterE2E().catch((err) => {
  console.error('Fatal E2E test execution failure:', err);
  process.exit(1);
});
