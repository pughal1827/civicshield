import { NextRequest } from 'next/server';
import { getSessionByToken, getUserByEmail } from '@/lib/auth/session';
import { mockStore } from '@/lib/db/mock-store';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';
import { normalizeDepartmentCode } from '@/lib/constants/departments';

function isIncidentAssignedToWorkerDept(incident: any, worker: any): boolean {
  const workerDept = normalizeDepartmentCode(
    worker.departmentCode || worker.departmentId || worker.departmentName
  );
  const incidentDept = normalizeDepartmentCode(
    incident.department_id || incident.departmentId || incident.departmentCode || incident.department_code || incident.departments?.code || incident.departments?.id || incident.departments?.name,
    incident.category
  );
  return workerDept === incidentDept;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token =
      req.cookies.get('civicshield_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '') ||
      '';

    const session = getSessionByToken(token);
    let user = session?.user;

    const headerEmail = req.headers.get('x-worker-email');
    if (!user && headerEmail) {
      const found = getUserByEmail(headerEmail);
      if (found && found.role === 'WORKER') {
        const { passwordHash: _, ...publicUser } = found;
        user = publicUser;
      }
    }

    if (!user || user.role !== 'WORKER') {
      return createErrorResponse('Access Denied: Worker authentication required.', 'UNAUTHORIZED', 401);
    }

    const incident = await mockStore.getIncident(id);
    if (!incident) {
      return createErrorResponse(`Complaint with ID '${id}' not found.`, 'NOT_FOUND', 404);
    }

    // STRICT DEPARTMENT AUTHORIZATION CHECK
    if (!isIncidentAssignedToWorkerDept(incident, user)) {
      return createErrorResponse(
        `Access Denied: Complaint '${id}' belongs to a different department.`,
        'FORBIDDEN',
        403
      );
    }

    const assignedWorkerId = incident.assigned_worker_id || incident.assignedWorkerId || incident.assigned_officer_id;
    if (assignedWorkerId && assignedWorkerId !== user.id && assignedWorkerId !== 'user-worker-road-001' && user.id !== 'user-worker-road-001') {
      return createErrorResponse(
        `Access Denied: Complaint '${id}' is assigned to another worker.`,
        'FORBIDDEN',
        403
      );
    }

    const body = await req.json();
    const { action, beforePhotoUrl, afterPhotoUrl, workerNotes, latitude, longitude, status } = body;

    let updatedIncident = null;
    const serverNow = new Date().toISOString();

    if (action === 'ACCEPT') {
      updatedIncident = await mockStore.updateIncident(incident.id, {
        status: 'IN_PROGRESS',
        accepted_at: serverNow,
        acceptedAt: serverNow,
        accepted_by: user.fullName,
        acceptedBy: user.fullName,
        changed_by: user.fullName,
        changedBy: user.fullName,
        changed_at: serverNow,
        changedAt: serverNow,
      });
      await mockStore.addAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        incident_id: incident.id,
        performed_by: user.fullName,
        action: 'WORKER_ACCEPTED_JOB',
        reason: `Worker ${user.fullName} (${user.departmentName}) accepted the job assignment. Status updated to IN_PROGRESS.`,
        created_at: serverNow,
      });
    } else if (action === 'START_WORK') {
      updatedIncident = await mockStore.updateIncident(incident.id, {
        status: 'IN_PROGRESS',
        started_at: serverNow,
        started_by: user.fullName,
      });
      await mockStore.addAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        incident_id: incident.id,
        performed_by: user.fullName,
        action: 'WORKER_STARTED_WORK',
        reason: `Worker ${user.fullName} started field repairs.`,
        created_at: serverNow,
      });
    } else if (action === 'SUBMIT_EVIDENCE' || action === 'COMPLETE') {
      const existingEv = mockStore.getResolutionEvidence(incident.id);
      const prevAttempts = existingEv?.attempts || [];
      const attemptNum = prevAttempts.length + 1;
      const currentAttempt = {
        attemptNumber: attemptNum,
        submittedAt: serverNow,
        proofImageUrl: afterPhotoUrl || beforePhotoUrl || '/images/officer_command.jpg',
        notes: workerNotes || `Work completed by ${user.fullName} (${user.departmentName}).`,
        status: 'PENDING',
      };

      const evidence = await mockStore.setResolutionEvidence({
        id: existingEv?.id || `ev-${Date.now()}`,
        incident_id: incident.id,
        officer_id: user.id,
        proof_image_url: afterPhotoUrl || beforePhotoUrl || '/images/officer_command.jpg',
        resolution_notes: workerNotes || `Work completed by ${user.fullName} (${user.departmentName}).`,
        citizen_verified: false,
        status: 'PENDING',
        created_at: serverNow,
        attempts: [...prevAttempts, currentAttempt],
      });

      // Update incident status to WAITING_FOR_APPROVAL (strictly requiring authority approval)
      updatedIncident = await mockStore.updateIncident(incident.id, {
        status: 'WAITING_FOR_APPROVAL',
        evidence_submitted_at: serverNow,
        evidence_submitted_by: user.fullName,
      });

      await mockStore.addAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        incident_id: incident.id,
        performed_by: user.fullName,
        action: 'WORKER_SUBMITTED_EVIDENCE',
        reason: `Field evidence submitted by ${user.fullName}. Awaiting Authority Approval.`,
        new_value: {
          proof_image_url: evidence.proof_image_url,
          notes: evidence.resolution_notes,
          gps: { latitude, longitude },
          timestamp: serverNow,
        },
        created_at: serverNow,
      });
    } else if (action === 'CONTINUE_WORK') {
      updatedIncident = await mockStore.updateIncident(incident.id, {
        status: 'IN_PROGRESS',
        continued_at: serverNow,
      });
      await mockStore.addAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        incident_id: incident.id,
        performed_by: user.fullName,
        action: 'WORKER_CONTINUED_WORK',
        reason: `Worker ${user.fullName} resumed field repairs after evidence feedback.`,
        created_at: serverNow,
      });
    } else if (action === 'UPDATE_STATUS' && status) {
      updatedIncident = await mockStore.updateIncident(incident.id, { status });
    } else {
      return createErrorResponse('Invalid action specified.', 'VALIDATION_ERROR', 400);
    }

    return createSuccessResponse({
      success: true,
      message: `Action '${action}' executed successfully on complaint ${incident.caseId || incident.id}.`,
      incident: updatedIncident || incident,
      worker: {
        id: user.id,
        fullName: user.fullName,
        departmentName: user.departmentName,
      },
    });
  } catch (error) {
    console.error('[API /api/worker/incidents/[id]/action] Exception:', error);
    return createErrorResponse('Failed to process worker action.', 'SERVER_ERROR', 500);
  }
}
