import { NextRequest } from 'next/server';
import { getSessionByToken, getUserByEmail } from '@/lib/auth/session';
import { mockStore } from '@/lib/db/mock-store';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

function isIncidentAssignedToWorkerDept(incident: any, worker: any): boolean {
  const wDeptId = worker.departmentId || '';
  const wDeptCode = worker.departmentCode || '';
  const wDeptName = (worker.departmentName || '').toLowerCase();

  const incDeptId = incident.department_id || incident.departmentId || incident.departments?.id || '';
  const incDeptCode = incident.departmentCode || incident.department_code || incident.departments?.code || '';
  const incDeptName = (incident.departmentName || incident.departments?.name || '').toLowerCase();
  const incCategory = (incident.category || '').toUpperCase();

  if (wDeptId && (incDeptId === wDeptId || incDeptId === wDeptId.toLowerCase())) return true;
  if (wDeptCode && (incDeptCode === wDeptCode || incDeptCode.includes(wDeptCode))) return true;
  if (wDeptName && incDeptName && (incDeptName.includes(wDeptName) || wDeptName.includes(incDeptName))) return true;

  const categoryDeptMap: Record<string, string[]> = {
    ROAD_MAINT: ['ROAD_POTHOLE', 'PUBLIC_INFRA_DAMAGE', 'POTHOLE', 'ROAD'],
    ELECTRICAL: ['BROKEN_STREETLIGHT', 'ELECTRICAL_HAZARD', 'STREETLIGHT'],
    SANITATION: ['GARBAGE_OVERFLOW', 'GARBAGE', 'SANITATION', 'CLEANING'],
    WATER_DEPT: ['WATER_LEAKAGE', 'WATER_SUPPLY', 'WATER'],
    DRAINAGE: ['DRAINAGE_BLOCKAGE', 'OPEN_MANHOLE', 'SEWAGE_OVERFLOW', 'DRAINAGE'],
    TRAFFIC: ['TRAFFIC_SIGNAL_DAMAGED', 'TRAFFIC_SIGNAL', 'TRAFFIC'],
    PUBLIC_WORKS: ['PUBLIC_INFRA_DAMAGE', 'ILLEGAL_CONSTRUCTION', 'BUILDING'],
  };

  const categoriesForWorker = categoryDeptMap[wDeptCode] || [];
  if (categoriesForWorker.some((cat) => incCategory.includes(cat))) return true;

  return false;
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

    const body = await req.json();
    const { action, beforePhotoUrl, afterPhotoUrl, workerNotes, latitude, longitude, status } = body;

    let updatedIncident = null;

    if (action === 'ACCEPT') {
      updatedIncident = await mockStore.updateIncident(incident.id, { status: 'IN_PROGRESS' });
      await mockStore.addAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        incident_id: incident.id,
        performed_by: user.fullName,
        action: 'WORKER_ACCEPTED_JOB',
        reason: `Worker ${user.fullName} (${user.departmentName}) accepted the job assignment.`,
        created_at: new Date().toISOString(),
      });
    } else if (action === 'SUBMIT_EVIDENCE' || action === 'COMPLETE') {
      const evidence = await mockStore.setResolutionEvidence({
        id: `ev-${Date.now()}`,
        incident_id: incident.id,
        officer_id: user.id,
        proof_image_url: afterPhotoUrl || beforePhotoUrl || '/images/officer_command.jpg',
        resolution_notes: workerNotes || `Work completed by ${user.fullName} (${user.departmentName}).`,
        citizen_verified: false,
        created_at: new Date().toISOString(),
      });

      // Update incident status to WORK_COMPLETED (awaiting authority verification)
      updatedIncident = await mockStore.updateIncident(incident.id, { status: 'WORK_COMPLETED' });

      await mockStore.addAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        incident_id: incident.id,
        performed_by: user.fullName,
        action: 'EVIDENCE_SUBMITTED_WORK_COMPLETED',
        reason: `Field evidence submitted by ${user.fullName}. Awaiting Authority Verification.`,
        new_value: {
          proof_image_url: evidence.proof_image_url,
          notes: evidence.resolution_notes,
          gps: { latitude, longitude },
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
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
