import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig, ProductionDatabaseError } from '@/lib/db/storage-config';
import { calculatePriorityScore } from '@/lib/priority/priority-engine';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

const updateIncidentSchema = z.object({
  status: z.enum([
    'SUBMITTED',
    'AI_ANALYSED',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'CITIZEN_VERIFICATION',
    'VERIFIED',
  ]).optional(),
  departmentId: z.string().uuid().optional(),
  assignedOfficerId: z.string().uuid().optional(),
  reason: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const config = getStorageConfig();
    const resolvedParams = await params;
    const incidentId = resolvedParams.id;

    if (!incidentId) {
      return createErrorResponse('Incident ID parameter is required.', 'VALIDATION_ERROR', 400);
    }

    let incident: any = null;
    let reports: any[] = [];
    let aiAnalysis: any = null;
    let duplicates: any[] = [];
    let resolutionEvidence: any = null;
    let auditLogs: any[] = [];

    if (config.isMock) {
      // EXPLICIT DEMO MODE
      incident = mockStore.getIncident(incidentId);
      if (incident) {
        const rep = mockStore.getReport(incidentId);
        if (rep) reports = [rep];
        aiAnalysis = mockStore.getAiAnalysis(incidentId);
        duplicates = mockStore.getDuplicateRelations(incidentId);
        resolutionEvidence = mockStore.getResolutionEvidence(incidentId);
        auditLogs = mockStore.getAuditLogs(incidentId);
      }
    } else {
      // EXPLICIT SUPABASE / PRODUCTION MODE (Fail closed if database fails)
      const supabase = createAdminClient();

      try {
        const { data: incData, error: incErr } = await supabase
          .from('incidents')
          .select('*, departments(id, name, code), users:assigned_officer_id(id, full_name, email)')
          .eq('id', incidentId)
          .single();

        if (incErr || !incData) {
          return createErrorResponse('Incident not found.', 'NOT_FOUND', 404);
        }
        incident = incData;

        const { data: reps } = await supabase.from('reports').select('*').eq('incident_id', incidentId).order('created_at', { ascending: true });
        reports = reps || [];

        const { data: ai } = await supabase.from('ai_analyses').select('*').eq('incident_id', incidentId).maybeSingle();
        aiAnalysis = ai || null;

        const { data: dups } = await supabase
          .from('duplicate_relations')
          .select('*, candidate_incident:candidate_incident_id(id, case_id, title, category, status, latitude, longitude), target_incident:target_incident_id(id, case_id, title)')
          .or(`target_incident_id.eq.${incidentId},candidate_incident_id.eq.${incidentId}`)
          .order('created_at', { ascending: false });
        duplicates = dups || [];

        const { data: resEv } = await supabase.from('resolution_evidence').select('*, users:officer_id(full_name)').eq('incident_id', incidentId).maybeSingle();
        resolutionEvidence = resEv || null;

        const { data: logs } = await supabase.from('audit_logs').select('*, users:performed_by(full_name, role)').eq('incident_id', incidentId).order('created_at', { ascending: false });
        auditLogs = logs || [];
      } catch (dbErr) {
        return createErrorResponse('Service temporarily unavailable. Database connection failed.', 'SERVICE_UNAVAILABLE', 503);
      }
    }

    if (!incident) {
      return createErrorResponse('Incident not found.', 'NOT_FOUND', 404);
    }

    // Calculate Priority Engine Factor Breakdown
    const priorityEngineResult = calculatePriorityScore({
      category: incident.category,
      aiSeverity: incident.severity,
      aiSafetyRiskScore: incident.priority_factors?.safetyRisk || 50,
      description: incident.summary,
      addressText: incident.address,
      reportCount: incident.report_count || 1,
      affectedCitizensCount: incident.affected_citizens_count || 1,
      recurrenceCountInArea: 0,
      isNearSensitiveLocation: incident.address?.toLowerCase().includes('school') || incident.address?.toLowerCase().includes('hospital'),
    });

    return createSuccessResponse({
      incident,
      reports: reports || [],
      aiAnalysis: aiAnalysis || null,
      duplicates: duplicates || [],
      resolutionEvidence: resolutionEvidence || null,
      auditLogs: auditLogs || [],
      priorityBreakdown: priorityEngineResult,
    });
  } catch (error) {
    if (error instanceof ProductionDatabaseError) {
      return createErrorResponse('Service temporarily unavailable. Database is unconfigured.', 'SERVICE_UNAVAILABLE', 503);
    }
    console.error('[API /api/incidents/[id]] Unhandled exception:', error);
    return createErrorResponse('An unexpected error occurred while fetching incident details.', 'INTERNAL_ERROR', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const config = getStorageConfig();
    const resolvedParams = await params;
    const incidentId = resolvedParams.id;

    const userRoleHeader = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id') || 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    // 1. Authorization check
    if (userRoleHeader === 'CITIZEN') {
      return createErrorResponse(
        'Access denied: Only municipal authority officers can modify incident status or department assignment.',
        'FORBIDDEN',
        403
      );
    }

    const body = await req.json();
    const parseResult = updateIncidentSchema.safeParse(body);

    if (!parseResult.success) {
      return createErrorResponse('Invalid update payload.', 'VALIDATION_ERROR', 400, parseResult.error.format());
    }

    const { status, departmentId, assignedOfficerId, reason } = parseResult.data;

    let existingIncident: any = null;

    if (config.isMock) {
      existingIncident = mockStore.getIncident(incidentId);
      if (!existingIncident) {
        return createErrorResponse('Incident not found.', 'NOT_FOUND', 404);
      }
    } else {
      const supabase = createAdminClient();
      try {
        const { data: incData, error: incErr } = await supabase.from('incidents').select('*').eq('id', incidentId).single();
        if (incErr || !incData) {
          return createErrorResponse('Incident not found.', 'NOT_FOUND', 404);
        }
        existingIncident = incData;
      } catch (dbErr) {
        return createErrorResponse('Service temporarily unavailable. Database connection failed.', 'SERVICE_UNAVAILABLE', 503);
      }
    }

    // Guard: Prevent modification if incident is VERIFIED unless Admin
    if (existingIncident.status === 'VERIFIED' && userRoleHeader !== 'ADMIN') {
      return createErrorResponse('VERIFIED incidents are closed and cannot be modified.', 'INVALID_STATE', 400);
    }

    const updatePayload: Record<string, unknown> = {};
    const auditActions: string[] = [];

    if (status && status !== existingIncident.status) {
      updatePayload.status = status;
      auditActions.push(`STATUS_CHANGED_TO_${status}`);
      if (status === 'RESOLVED' || status === 'VERIFIED') {
        updatePayload.resolved_at = new Date().toISOString();
      }
    }

    if (departmentId && departmentId !== existingIncident.department_id) {
      updatePayload.department_id = departmentId;
      auditActions.push('DEPARTMENT_REASSIGNED');
    }

    if (assignedOfficerId && assignedOfficerId !== existingIncident.assigned_officer_id) {
      updatePayload.assigned_officer_id = assignedOfficerId;
      auditActions.push('OFFICER_ASSIGNED');
    }

    if (Object.keys(updatePayload).length === 0) {
      return createSuccessResponse({ incident: existingIncident, message: 'No changes required.' });
    }

    let updatedIncident: any = null;

    if (config.isMock) {
      updatedIncident = mockStore.updateIncident(incidentId, updatePayload);
      for (const actionName of auditActions) {
        mockStore.addAuditLog({
          id: `audit-${Date.now()}-${Math.random()}`,
          incident_id: incidentId,
          performed_by: userId,
          action: actionName,
          old_value: { status: existingIncident.status, department_id: existingIncident.department_id, assigned_officer_id: existingIncident.assigned_officer_id },
          new_value: updatePayload,
          reason: reason || 'Authority operational update via dashboard.',
          created_at: new Date().toISOString(),
        });
      }
    } else {
      const supabase = createAdminClient();
      try {
        const { data: updated, error: updateErr } = await supabase.from('incidents').update(updatePayload).eq('id', incidentId).select().single();
        if (updateErr || !updated) {
          return createErrorResponse('Failed to update incident record.', 'DATABASE_ERROR', 500);
        }
        updatedIncident = updated;

        for (const actionName of auditActions) {
          await supabase.from('audit_logs').insert({
            incident_id: incidentId,
            action: actionName,
            old_value: { status: existingIncident.status, department_id: existingIncident.department_id, assigned_officer_id: existingIncident.assigned_officer_id },
            new_value: updatePayload,
            reason: reason || 'Authority operational update via dashboard.',
          });
        }
      } catch (dbErr) {
        return createErrorResponse('Service temporarily unavailable. Database update failed.', 'SERVICE_UNAVAILABLE', 503);
      }
    }

    return createSuccessResponse({
      incident: updatedIncident,
      updatedFields: Object.keys(updatePayload),
    });
  } catch (error) {
    if (error instanceof ProductionDatabaseError) {
      return createErrorResponse('Service temporarily unavailable. Database is unconfigured.', 'SERVICE_UNAVAILABLE', 503);
    }
    console.error('[API /api/incidents/[id]] Exception:', error);
    return createErrorResponse('An unexpected error occurred while updating the incident.', 'INTERNAL_ERROR', 500);
  }
}
