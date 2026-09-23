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

export async function POST(
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

    if (config.isMock) {
      incident = mockStore.getIncident(id);
    } else {
      const supabase = createAdminClient();
      try {
        const { data: incData } = await supabase
          .from('incidents')
          .select('*, departments(id, name, code)')
          .or(`id.eq.${id},case_id.eq.${id}`)
          .maybeSingle();

        incident = incData || mockStore.getIncident(id);
      } catch {
        incident = mockStore.getIncident(id);
      }
    }

    if (!incident) {
      return createErrorResponse(`Complaint with ID '${id}' not found.`, 'NOT_FOUND', 404);
    }

    // STRICT DEPARTMENT AUTHORIZATION CHECK
    if (!isIncidentAssignedToWorkerDept(incident, user)) {
      const assignedDept = incident.departmentName || incident.departments?.name || incident.category?.replace(/_/g, ' ') || 'Other';
      return createErrorResponse(
        `Access Denied: Complaint '${id}' belongs to ${assignedDept}. Your account is locked to ${user.departmentName || user.departmentCode}.`,
        'FORBIDDEN',
        403
      );
    }

    const body = await req.json();
    const { action, beforePhotoUrl, afterPhotoUrl, workerNotes, latitude, longitude, status } = body;

    let updatedIncident = null;
    const serverNow = new Date().toISOString();

    if (action === 'ACCEPT' || action === 'START_WORK') {
      const actionName = action === 'ACCEPT' ? 'WORKER_ACCEPTED_JOB' : 'WORKER_STARTED_WORK';
      const actionReason = action === 'ACCEPT'
        ? `Worker ${user.fullName} (${user.departmentName}) accepted the job assignment. Status updated to IN_PROGRESS.`
        : `Worker ${user.fullName} started field repairs.`;

      if (!config.isMock) {
        try {
          const supabase = createAdminClient();
          const { data } = await supabase
            .from('incidents')
            .update({
              status: 'IN_PROGRESS',
              updated_at: serverNow,
            })
            .eq('id', incident.id)
            .select()
            .maybeSingle();

          if (data) updatedIncident = data;

          await supabase.from('audit_logs').insert({
            incident_id: incident.id,
            performed_by: user.fullName,
            action: actionName,
            reason: actionReason,
            created_at: serverNow,
          });
        } catch (dbErr) {
          console.error('[Worker Action] Supabase update error:', dbErr);
        }
      }

      updatedIncident = updatedIncident || await mockStore.updateIncident(incident.id, {
        status: 'IN_PROGRESS',
        accepted_at: serverNow,
        accepted_by: user.fullName,
        started_at: serverNow,
        started_by: user.fullName,
        changed_by: user.fullName,
        changed_at: serverNow,
      });

      await mockStore.addAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        incident_id: incident.id,
        performed_by: user.fullName,
        action: actionName,
        reason: actionReason,
        created_at: serverNow,
      });
    } else if (action === 'SUBMIT_EVIDENCE' || action === 'COMPLETE') {
      const existingEv = mockStore.getResolutionEvidence(incident.id);
      const prevAttempts = existingEv?.attempts || [];
      const attemptNum = prevAttempts.length + 1;
      const proofUrl = afterPhotoUrl || beforePhotoUrl || '/images/officer_command.jpg';
      const notes = workerNotes || `Work completed by ${user.fullName} (${user.departmentName}).`;

      const currentAttempt = {
        attemptNumber: attemptNum,
        submittedAt: serverNow,
        proofImageUrl: proofUrl,
        notes,
        status: 'PENDING',
      };

      if (!config.isMock) {
        try {
          const supabase = createAdminClient();
          const { data } = await supabase
            .from('incidents')
            .update({
              status: 'WAITING_FOR_APPROVAL',
              updated_at: serverNow,
            })
            .eq('id', incident.id)
            .select()
            .maybeSingle();

          if (data) updatedIncident = data;

          await supabase
            .from('resolution_evidence')
            .upsert({
              incident_id: incident.id,
              proof_image_url: proofUrl,
              resolution_notes: notes,
              created_at: serverNow,
            }, { onConflict: 'incident_id' });

          await supabase.from('audit_logs').insert({
            incident_id: incident.id,
            performed_by: user.fullName,
            action: 'WORKER_SUBMITTED_EVIDENCE',
            reason: `Field evidence submitted by ${user.fullName}. Awaiting Authority Approval.`,
            created_at: serverNow,
          });
        } catch (dbErr) {
          console.error('[Worker Action] Supabase evidence submission error:', dbErr);
        }
      }

      await mockStore.setResolutionEvidence({
        id: existingEv?.id || `ev-${Date.now()}`,
        incident_id: incident.id,
        officer_id: user.id,
        proof_image_url: proofUrl,
        resolution_notes: notes,
        citizen_verified: false,
        status: 'PENDING',
        created_at: serverNow,
        attempts: [...prevAttempts, currentAttempt],
      });

      updatedIncident = updatedIncident || await mockStore.updateIncident(incident.id, {
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
          proof_image_url: proofUrl,
          notes,
          gps: { latitude, longitude },
          timestamp: serverNow,
        },
        created_at: serverNow,
      });
    } else if (action === 'CONTINUE_WORK') {
      if (!config.isMock) {
        try {
          const supabase = createAdminClient();
          const { data } = await supabase
            .from('incidents')
            .update({
              status: 'IN_PROGRESS',
              updated_at: serverNow,
            })
            .eq('id', incident.id)
            .select()
            .maybeSingle();

          if (data) updatedIncident = data;

          await supabase.from('audit_logs').insert({
            incident_id: incident.id,
            performed_by: user.fullName,
            action: 'WORKER_CONTINUED_WORK',
            reason: `Worker ${user.fullName} resumed field repairs after evidence feedback.`,
            created_at: serverNow,
          });
        } catch (dbErr) {
          console.error('[Worker Action] Supabase continue work error:', dbErr);
        }
      }

      updatedIncident = updatedIncident || await mockStore.updateIncident(incident.id, {
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
      if (!config.isMock) {
        try {
          const supabase = createAdminClient();
          const { data } = await supabase
            .from('incidents')
            .update({ status, updated_at: serverNow })
            .eq('id', incident.id)
            .select()
            .maybeSingle();
          if (data) updatedIncident = data;
        } catch {}
      }
      updatedIncident = updatedIncident || await mockStore.updateIncident(incident.id, { status });
    } else {
      return createErrorResponse('Invalid action specified.', 'VALIDATION_ERROR', 400);
    }

    return createSuccessResponse({
      success: true,
      message: `Action '${action}' executed successfully on complaint ${incident.case_id || incident.caseId || incident.id}.`,
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
