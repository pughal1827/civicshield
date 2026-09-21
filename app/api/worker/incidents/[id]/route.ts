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

export async function GET(
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

    // CRITICAL BACKEND DEPARTMENT ISOLATION ENFORCEMENT
    const isAllowed = isIncidentAssignedToWorkerDept(incident, user);
    if (!isAllowed) {
      return createErrorResponse(
        `Access Denied: Complaint '${id}' is assigned to a different department (${incident.departmentName || incident.departments?.name || 'Other'}). Your account is locked to ${user.departmentName || user.departmentCode}.`,
        'FORBIDDEN',
        403
      );
    }

    const reports = await mockStore.getReportsByIncident(incident.id);
    const aiAnalysis = await mockStore.getAiAnalysis(incident.id);
    const evidence = await mockStore.getResolutionEvidence(incident.id);

    return createSuccessResponse({
      incident,
      reports,
      aiAnalysis,
      evidence,
      workerDepartment: {
        id: user.departmentId,
        code: user.departmentCode,
        name: user.departmentName,
      },
    });
  } catch (error) {
    console.error('[API /api/worker/incidents/[id]] Exception:', error);
    return createErrorResponse('Failed to fetch complaint detail.', 'SERVER_ERROR', 500);
  }
}
