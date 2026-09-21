import { NextRequest } from 'next/server';
import { getSessionByToken, getUserByEmail } from '@/lib/auth/session';
import { mockStore } from '@/lib/db/mock-store';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

// Helper to normalize department matching
function isIncidentAssignedToWorkerDept(incident: any, worker: any): boolean {
  const wDeptId = worker.departmentId || '';
  const wDeptCode = worker.departmentCode || '';
  const wDeptName = (worker.departmentName || '').toLowerCase();

  const incDeptId = incident.department_id || incident.departmentId || incident.departments?.id || '';
  const incDeptCode = incident.departmentCode || incident.department_code || incident.departments?.code || '';
  const incDeptName = (incident.departmentName || incident.departments?.name || '').toLowerCase();
  const incCategory = (incident.category || '').toUpperCase();

  // 1. Direct ID or Code match
  if (wDeptId && (incDeptId === wDeptId || incDeptId === wDeptId.toLowerCase())) return true;
  if (wDeptCode && (incDeptCode === wDeptCode || incDeptCode.includes(wDeptCode))) return true;

  // 2. Department Name substring match
  if (wDeptName && incDeptName && (incDeptName.includes(wDeptName) || wDeptName.includes(incDeptName))) return true;

  // 3. Category rule mapping fallback
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

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get('civicshield_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '') ||
      '';

    const session = getSessionByToken(token);
    let user = session?.user;

    // Development/testing fallback: read x-worker-email header if session cookie not passed
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

    const allIncidents = await mockStore.getAllIncidents();

    // STRICT DEPARTMENT ISOLATION AT BACKEND LEVEL
    const workerIncidents = allIncidents.filter((inc) => isIncidentAssignedToWorkerDept(inc, user));

    const stats = {
      totalAssigned: workerIncidents.length,
      assignedCount: workerIncidents.filter((i) => i.status === 'ASSIGNED' || i.status === 'SUBMITTED' || i.status === 'AI_ANALYSED').length,
      inProgressCount: workerIncidents.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'WORKER_ACCEPTED').length,
      completedCount: workerIncidents.filter((i) => i.status === 'COMPLETED' || i.status === 'WORK_COMPLETED' || i.status === 'VERIFIED' || i.status === 'RESOLVED').length,
      highPriorityCount: workerIncidents.filter((i) => (i.priority_score || i.priorityScore || 0) >= 70).length,
    };

    return createSuccessResponse({
      worker: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        departmentId: user.departmentId,
        departmentCode: user.departmentCode,
        departmentName: user.departmentName,
      },
      incidents: workerIncidents,
      stats,
    });
  } catch (error) {
    console.error('[API /api/worker/incidents] Exception:', error);
    return createErrorResponse('Failed to fetch department worker incidents.', 'SERVER_ERROR', 500);
  }
}
