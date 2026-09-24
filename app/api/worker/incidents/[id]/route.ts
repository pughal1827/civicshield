import { NextRequest } from 'next/server';
import { getSessionByToken, getUserByEmail } from '@/lib/auth/session';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig } from '@/lib/db/storage-config';
import { createAdminClient } from '@/lib/db/supabase-admin';
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
    const config = getStorageConfig();
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

    let incident: any = null;
    let reports: any[] = [];
    let aiAnalysis: any = null;
    let evidence: any = null;

    if (config.isMock) {
      incident = mockStore.getIncident(id);
      if (incident) {
        reports = mockStore.getReportsByIncident(incident.id);
        aiAnalysis = mockStore.getAiAnalysis(incident.id);
        evidence = mockStore.getResolutionEvidence(incident.id);
      }
    } else {
      const supabase = createAdminClient();
      try {
        const { data: incData, error: incErr } = await supabase
          .from('incidents')
          .select('*, departments(id, name, code), users:assigned_officer_id(id, full_name, email)')
          .or(`id.eq.${id},case_id.eq.${id}`)
          .maybeSingle();

        if (incData) {
          incident = incData;

          const { data: reps } = await supabase
            .from('reports')
            .select('*')
            .eq('incident_id', incident.id)
            .order('created_at', { ascending: true });
          reports = reps || [];

          const { data: ai } = await supabase
            .from('ai_analyses')
            .select('*')
            .eq('incident_id', incident.id)
            .maybeSingle();
          aiAnalysis = ai || null;

          const { data: resEv } = await supabase
            .from('resolution_evidence')
            .select('*')
            .eq('incident_id', incident.id)
            .maybeSingle();
          evidence = resEv || mockStore.getResolutionEvidence(incident.id) || null;
        } else {
          // Fallback to local store
          incident = mockStore.getIncident(id);
          if (incident) {
            reports = mockStore.getReportsByIncident(incident.id);
            aiAnalysis = mockStore.getAiAnalysis(incident.id);
            evidence = mockStore.getResolutionEvidence(incident.id);
          }
        }
      } catch (dbErr) {
        console.error('[API /api/worker/incidents/[id]] Supabase query error, falling back to mock:', dbErr);
        incident = mockStore.getIncident(id);
        if (incident) {
          reports = mockStore.getReportsByIncident(incident.id);
          aiAnalysis = mockStore.getAiAnalysis(incident.id);
          evidence = mockStore.getResolutionEvidence(incident.id);
        }
      }
    }

    if (!incident) {
      return createErrorResponse(`Complaint with ID '${id}' not found.`, 'NOT_FOUND', 404);
    }

    // CRITICAL BACKEND DEPARTMENT ISOLATION ENFORCEMENT
    const isAllowed = isIncidentAssignedToWorkerDept(incident, user);
    if (!isAllowed) {
      const assignedDept = incident.departmentName || incident.departments?.name || incident.category?.replace(/_/g, ' ') || 'Other';
      return createErrorResponse(
        `Access Denied: Complaint '${id}' belongs to ${assignedDept}. Your account is locked to ${user.departmentName || user.departmentCode}.`,
        'FORBIDDEN',
        403
      );
    }

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
