import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig, ProductionDatabaseError } from '@/lib/db/storage-config';
import { calculatePriorityScore } from '@/lib/priority/priority-engine';
import { smartClassifyComplaint, DEPARTMENT_NAMES } from '@/lib/ai/smart-categorizer';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';
import { normalizeDepartmentCode, DEPARTMENT_DISPLAY_NAMES } from '@/lib/constants/departments';

const updateIncidentSchema = z.object({
  status: z.enum([
    'SUBMITTED',
    'AI_ANALYSED',
    'ASSIGNED',
    'ACCEPTED',
    'IN_PROGRESS',
    'WAITING_FOR_APPROVAL',
    'PENDING_CITIZEN_VERIFICATION',
    'WORK_COMPLETED',
    'AWAITING_VERIFICATION',
    'EVIDENCE_REJECTED',
    'RESOLVED',
    'CITIZEN_VERIFICATION',
    'VERIFIED',
    'CLOSED',
    'REOPENED',
  ]).optional(),
  departmentId: z.string().optional(),
  assignedDepartment: z.string().optional(),
  assignedOfficerId: z.string().optional(),
  assignedWorkerId: z.string().optional(),
  assignedWorkerName: z.string().optional(),
  assignedWorker: z.string().optional(),
  assignedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  rejectedBy: z.string().optional(),
  changedBy: z.string().optional(),
  reason: z.string().optional(),
  rejectionReason: z.string().optional(),
  previousDepartment: z.string().optional(),
  previousWorker: z.string().optional(),
  oldAssignedAt: z.string().optional(),
  newDepartment: z.string().optional(),
  newWorker: z.string().optional(),
  newAssignedAt: z.string().optional(),
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
        const repList = mockStore.getReportsByIncident(incident.id || incidentId);
        reports = repList.length > 0 ? repList : (mockStore.getReport(incidentId) ? [mockStore.getReport(incidentId)] : []);
        aiAnalysis = mockStore.getAiAnalysis(incident.id || incidentId);
        duplicates = mockStore.getDuplicateRelations(incident.id || incidentId);
        resolutionEvidence = mockStore.getResolutionEvidence(incident.id || incidentId);
        auditLogs = mockStore.getAuditLogs(incident.id || incidentId);
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

    // Combine text from citizen reports, title, and summary for high-fidelity AI classification
    const combinedText = [
      incident.title,
      incident.summary,
      ...reports.map((r: any) => r.raw_description || r.rawDescription || ''),
      incident.address,
    ]
      .filter(Boolean)
      .join(' ');

    const dynamicAiMatch = smartClassifyComplaint(combinedText);

    // Build enriched real AI Analysis object
    const finalAiAnalysis = {
      id: aiAnalysis?.id || `ai-${incident.id}`,
      incident_id: incident.id,
      confidence_score: aiAnalysis?.confidence_score ?? aiAnalysis?.confidence ?? dynamicAiMatch.confidence,
      confidence: aiAnalysis?.confidence_score ?? aiAnalysis?.confidence ?? dynamicAiMatch.confidence,
      detected_category: aiAnalysis?.detected_category || aiAnalysis?.category || dynamicAiMatch.category,
      category: aiAnalysis?.detected_category || aiAnalysis?.category || dynamicAiMatch.category,
      detected_severity: incident.severity || aiAnalysis?.detected_severity || dynamicAiMatch.severity,
      severity: incident.severity || aiAnalysis?.detected_severity || dynamicAiMatch.severity,
      suggested_department_code:
        aiAnalysis?.suggested_department_code ||
        aiAnalysis?.recommended_department_code ||
        dynamicAiMatch.departmentCode,
      suggested_department_name:
        DEPARTMENT_NAMES[dynamicAiMatch.departmentCode] ||
        incident.departments?.name ||
        incident.departmentName ||
        'Road Maintenance & Infrastructure',
      safety_risk_score:
        aiAnalysis?.extracted_features?.safetyRiskScore ||
        incident.priority_factors?.safetyRisk ||
        dynamicAiMatch.safetyRiskScore,
      public_impact: dynamicAiMatch.publicImpact,
      extracted_keywords:
        aiAnalysis?.extracted_features?.keywords && aiAnalysis.extracted_features.keywords.length > 0
          ? aiAnalysis.extracted_features.keywords
          : dynamicAiMatch.extractedKeywords,
      reasoning: dynamicAiMatch.reasoning,
      created_at: aiAnalysis?.created_at || incident.created_at || new Date().toISOString(),
    };

    // Calculate Priority Engine Factor Breakdown
    const priorityEngineResult = calculatePriorityScore({
      category: incident.category || finalAiAnalysis.detected_category,
      aiSeverity: incident.severity || finalAiAnalysis.detected_severity,
      aiSafetyRiskScore: finalAiAnalysis.safety_risk_score,
      description: incident.summary,
      addressText: incident.address,
      reportCount: incident.report_count || 1,
      affectedCitizensCount: incident.affected_citizens_count || 1,
      recurrenceCountInArea: 0,
      isNearSensitiveLocation:
        incident.address?.toLowerCase().includes('school') ||
        incident.address?.toLowerCase().includes('hospital'),
    });

    return createSuccessResponse({
      incident,
      reports: reports || [],
      aiAnalysis: finalAiAnalysis,
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

    const {
      status,
      departmentId,
      assignedDepartment,
      assignedOfficerId,
      assignedWorkerId,
      assignedWorkerName,
      assignedWorker,
      assignedBy,
      approvedBy,
      rejectedBy,
      changedBy,
      reason,
      rejectionReason,
      previousDepartment,
      previousWorker,
      oldAssignedAt,
      newDepartment,
      newWorker,
      newAssignedAt,
    } = parseResult.data;

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
    const serverNow = new Date().toISOString();
    const officerName = req.headers.get('x-officer-name') || approvedBy || rejectedBy || assignedBy || changedBy || 'Officer Robert Chen';

    const isReassigning = Boolean(
      departmentId ||
      newDepartment ||
      (assignedWorkerId && assignedWorkerId !== existingIncident.assigned_worker_id) ||
      (assignedWorkerName && assignedWorkerName !== existingIncident.assignedWorker)
    );

    if (isReassigning) {
      const prevDept = previousDepartment || existingIncident.departmentName || existingIncident.department_id || 'Previous Department';
      const prevWorker = previousWorker || existingIncident.assignedWorker || existingIncident.assignedWorkerName || existingIncident.assigned_worker_id || 'Previous Worker';
      const oldAssignedAtVal = oldAssignedAt || existingIncident.assigned_at || existingIncident.assignedAt || existingIncident.created_at;

      const targetDeptInput = departmentId || newDepartment || assignedDepartment || existingIncident.department_id || 'ROAD_MAINT';
      const normCode = normalizeDepartmentCode(targetDeptInput);
      const deptName = DEPARTMENT_DISPLAY_NAMES[normCode] || targetDeptInput;

      const newWorkerIdVal = assignedWorkerId || assignedOfficerId || 'user-worker-new-001';
      const newWorkerNameVal = newWorker || assignedWorkerName || assignedWorker || newWorkerIdVal;

      updatePayload.status = 'ASSIGNED';

      // Previous & New Assignment Tracking
      updatePayload.previous_department = prevDept;
      updatePayload.previousDepartment = prevDept;
      updatePayload.previous_worker = prevWorker;
      updatePayload.previousWorker = prevWorker;
      updatePayload.old_assigned_at = oldAssignedAtVal;
      updatePayload.oldAssignedAt = oldAssignedAtVal;

      updatePayload.new_department = deptName;
      updatePayload.newDepartment = deptName;
      updatePayload.new_worker = newWorkerNameVal;
      updatePayload.newWorker = newWorkerNameVal;
      updatePayload.new_assigned_at = newAssignedAt || serverNow;
      updatePayload.newAssignedAt = newAssignedAt || serverNow;

      // Active Department & Worker
      updatePayload.department_id = normCode;
      updatePayload.departmentId = normCode;
      updatePayload.departmentCode = normCode;
      updatePayload.departmentName = deptName;
      updatePayload.assignedDepartment = deptName;
      updatePayload.departments = { id: normCode, code: normCode, name: deptName };

      updatePayload.assigned_officer_id = newWorkerIdVal;
      updatePayload.assigned_worker_id = newWorkerIdVal;
      updatePayload.assignedWorkerId = newWorkerIdVal;
      updatePayload.assignedWorker = newWorkerNameVal;
      updatePayload.assignedWorkerName = newWorkerNameVal;

      updatePayload.assigned_by = officerName;
      updatePayload.assignedBy = officerName;
      updatePayload.assigned_at = serverNow;
      updatePayload.assignedAt = serverNow;

      updatePayload.changed_by = officerName;
      updatePayload.changedBy = officerName;
      updatePayload.changed_at = serverNow;
      updatePayload.changedAt = serverNow;

      auditActions.push('DEPARTMENT_REASSIGNED');
    } else if (status === 'PENDING_CITIZEN_VERIFICATION' || status === 'RESOLVED') {
      const targetStatus = status || 'PENDING_CITIZEN_VERIFICATION';
      updatePayload.status = targetStatus;
      updatePayload.approved_by = officerName;
      updatePayload.approvedBy = officerName;
      updatePayload.approved_at = serverNow;
      updatePayload.approvedAt = serverNow;
      updatePayload.changed_by = officerName;
      updatePayload.changedBy = officerName;
      updatePayload.changed_at = serverNow;
      updatePayload.changedAt = serverNow;
      auditActions.push('EVIDENCE_APPROVED');

      if (config.isMock) {
        const existingEv = mockStore.getResolutionEvidence(incidentId);
        if (existingEv) {
          mockStore.setResolutionEvidence({
            ...existingEv,
            status: 'APPROVED',
            reviewed_by: officerName,
            reviewed_at: serverNow,
          });
        }
      }
    } else if (status === 'EVIDENCE_REJECTED') {
      const finalRejectionReason = rejectionReason || reason || 'Field repair evidence was rejected by authority officer.';
      updatePayload.status = 'EVIDENCE_REJECTED';
      updatePayload.rejection_reason = finalRejectionReason;
      updatePayload.rejectionReason = finalRejectionReason;
      updatePayload.rejected_by = officerName;
      updatePayload.rejectedBy = officerName;
      updatePayload.rejected_at = serverNow;
      updatePayload.rejectedAt = serverNow;
      updatePayload.changed_by = officerName;
      updatePayload.changedBy = officerName;
      updatePayload.changed_at = serverNow;
      updatePayload.changedAt = serverNow;
      auditActions.push('EVIDENCE_REJECTED');

      if (config.isMock) {
        const existingEv = mockStore.getResolutionEvidence(incidentId);
        if (existingEv) {
          mockStore.setResolutionEvidence({
            ...existingEv,
            status: 'REJECTED',
            rejection_reason: finalRejectionReason,
            reviewed_by: officerName,
            reviewed_at: serverNow,
          });
        }
      }
    } else if (status && status !== existingIncident.status) {
      updatePayload.status = status;
      updatePayload.changed_by = officerName;
      updatePayload.changedBy = officerName;
      updatePayload.changed_at = serverNow;
      updatePayload.changedAt = serverNow;
      auditActions.push(`STATUS_CHANGED_TO_${status}`);
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
