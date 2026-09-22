import { NextRequest } from 'next/server';
import { getSessionByToken, getUserByEmail } from '@/lib/auth/session';
import { mockStore } from '@/lib/db/mock-store';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';
import { normalizeDepartmentCode } from '@/lib/constants/departments';
import { getStorageConfig } from '@/lib/db/storage-config';
import { createAdminClient } from '@/lib/db/supabase-admin';

// Helper to normalize department matching
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

export async function GET(req: NextRequest) {
  try {
    const config = getStorageConfig();
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

    let allIncidents: any[] = [];
    
    if (config.isMock) {
      allIncidents = mockStore.getAllIncidents();
    } else {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('incidents')
        .select('*, departments(name, code), users:assigned_officer_id(full_name)')
        .is('master_incident_id', null)
        .order('priority_score', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Supabase fetch error:', error);
        return createErrorResponse('Database query failed.', 'SERVICE_UNAVAILABLE', 503);
      }
      allIncidents = data || [];
    }

    // STRICT DEPARTMENT ISOLATION AT BACKEND LEVEL
    const workerIncidents = allIncidents.filter((inc) => isIncidentAssignedToWorkerDept(inc, user));

    // Enrich incidents with resolution evidence records if present
    const enrichedIncidents = workerIncidents.map((inc) => {
      const ev = mockStore.getResolutionEvidence(inc.id);
      return {
        ...inc,
        evidence: ev || null,
      };
    });

    const stats = {
      totalAssigned: enrichedIncidents.length,
      assignedCount: enrichedIncidents.filter((i) => i.status === 'ASSIGNED' || i.status === 'SUBMITTED' || i.status === 'AI_ANALYSED').length,
      inProgressCount: enrichedIncidents.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'WORKER_ACCEPTED').length,
      completedCount: enrichedIncidents.filter((i) => i.status === 'COMPLETED' || i.status === 'WORK_COMPLETED' || i.status === 'VERIFIED' || i.status === 'RESOLVED').length,
      highPriorityCount: enrichedIncidents.filter((i) => (i.priority_score || i.priorityScore || 0) >= 70).length,
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
      incidents: enrichedIncidents,
      stats,
    });
  } catch (error) {
    console.error('[API /api/worker/incidents] Exception:', error);
    return createErrorResponse('Failed to fetch department worker incidents.', 'SERVER_ERROR', 500);
  }
}
