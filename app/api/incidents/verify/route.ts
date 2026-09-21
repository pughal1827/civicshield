import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig, ProductionDatabaseError } from '@/lib/db/storage-config';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

const verifySchema = z.object({
  trackingCode: z.string().min(1, 'Tracking code or Case ID is required.'),
  action: z.enum(['ACCEPT', 'REJECT']),
  feedback: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const config = getStorageConfig();
    const body = await req.json();
    const parseResult = verifySchema.safeParse(body);

    if (!parseResult.success) {
      return createErrorResponse('Invalid verification request payload.', 'VALIDATION_ERROR', 400, parseResult.error.format());
    }

    const { trackingCode, action, feedback } = parseResult.data;

    let targetIncidentId: string | null = null;
    let incident: any = null;

    if (config.isMock) {
      const foundRep = mockStore.getReport(trackingCode);
      const foundInc = mockStore.getIncident(trackingCode);

      if (foundRep && (foundRep.incident_id || foundRep.incidentId)) {
        targetIncidentId = String(foundRep.incident_id || foundRep.incidentId);
        incident = mockStore.getIncident(targetIncidentId);
      } else if (foundInc) {
        incident = foundInc;
        targetIncidentId = foundInc.id;
      }
    } else {
      const supabase = createAdminClient();
      try {
        // 1. Try matching by tracking_code
        let repId: string | null = null;
        const { data: repData } = await supabase.from('reports').select('id, incident_id').eq('tracking_code', trackingCode).maybeSingle();
        if (repData && repData.incident_id) {
          repId = repData.incident_id;
        }

        // 2. Try matching by Case ID or incident ID if report not found directly
        if (repId) {
          targetIncidentId = repId;
          const { data: incData } = await supabase.from('incidents').select('id, case_id, status').eq('id', targetIncidentId).maybeSingle();
          incident = incData;
        } else {
          const { data: incData } = await supabase.from('incidents').select('id, case_id, status').or(`id.eq.${trackingCode},case_id.ilike.${trackingCode}`).maybeSingle();
          if (incData) {
            incident = incData;
            targetIncidentId = incData.id;
          }
        }
      } catch (dbErr) {
        return createErrorResponse('Service temporarily unavailable. Database query failed.', 'SERVICE_UNAVAILABLE', 503);
      }
    }

    if (!targetIncidentId || !incident) {
      return createErrorResponse('Associated incident record not found.', 'NOT_FOUND', 404);
    }

    const validIncidentId: string = targetIncidentId;
    const serverNow = new Date().toISOString();

    if (action === 'ACCEPT') {
      const updateData = {
        status: 'CLOSED',
        citizenVerifiedBy: 'Citizen (Case Owner)',
        citizen_verified_by: 'Citizen (Case Owner)',
        citizenVerifiedAt: serverNow,
        citizen_verified_at: serverNow,
        changedBy: 'Citizen',
        changed_by: 'Citizen',
        changedAt: serverNow,
        changed_at: serverNow,
        resolved_at: serverNow,
        resolvedAt: serverNow,
      };

      if (config.isMock) {
        mockStore.updateIncident(validIncidentId, updateData);
        const existingEv = mockStore.getResolutionEvidence(validIncidentId);
        if (existingEv) {
          mockStore.setResolutionEvidence({
            ...existingEv,
            citizen_verified: true,
            status: 'CLOSED',
            citizen_feedback: feedback || 'Citizen confirmed issue resolution.',
          });
        }
        mockStore.addAuditLog({
          id: `audit_${Date.now()}`,
          incident_id: validIncidentId,
          performed_by: 'Citizen',
          action: 'CITIZEN_APPROVED_RESOLUTION',
          old_value: { status: incident.status },
          new_value: { status: 'CLOSED', citizenVerifiedBy: 'Citizen (Case Owner)' },
          reason: feedback || 'Citizen confirmed issue was resolved to satisfaction.',
          created_at: serverNow,
        });
      } else {
        const supabase = createAdminClient();
        try {
          await supabase.from('incidents').update(updateData).eq('id', validIncidentId);
          await supabase.from('resolution_evidence').update({ citizen_verified: true, citizen_feedback: feedback || 'Citizen confirmed issue resolution.' }).eq('incident_id', validIncidentId);
          await supabase.from('audit_logs').insert({
            incident_id: validIncidentId,
            action: 'CITIZEN_APPROVED_RESOLUTION',
            old_value: { status: incident.status },
            new_value: { status: 'CLOSED', citizen_verified: true },
            reason: feedback || 'Citizen confirmed issue was resolved to satisfaction.',
          });
        } catch (dbErr) {
          return createErrorResponse('Service temporarily unavailable. Database update failed.', 'SERVICE_UNAVAILABLE', 503);
        }
      }

      return createSuccessResponse({
        action: 'ACCEPT',
        caseId: incident.case_id || incident.caseId,
        status: 'CLOSED',
        message: 'Thank you! Your civic issue has been verified as resolved and closed.',
      });
    } else {
      // REJECT ACTION
      const rejectionReasonText = feedback?.trim();
      if (!rejectionReasonText) {
        return createErrorResponse('Citizen rejection reason is required.', 'VALIDATION_ERROR', 400);
      }

      const updateData = {
        status: 'REOPENED',
        citizenRejectionReason: rejectionReasonText,
        citizen_rejection_reason: rejectionReasonText,
        rejectedBy: 'Citizen',
        rejected_by: 'Citizen',
        rejectedAt: serverNow,
        rejected_at: serverNow,
        changedBy: 'Citizen',
        changed_by: 'Citizen',
        changedAt: serverNow,
        changed_at: serverNow,
      };

      if (config.isMock) {
        mockStore.updateIncident(validIncidentId, updateData);
        const existingEv = mockStore.getResolutionEvidence(validIncidentId);
        if (existingEv) {
          mockStore.setResolutionEvidence({
            ...existingEv,
            citizen_verified: false,
            status: 'REOPENED',
            citizen_feedback: rejectionReasonText,
          });
        }
        mockStore.addAuditLog({
          id: `audit_${Date.now()}`,
          incident_id: validIncidentId,
          performed_by: 'Citizen',
          action: 'CITIZEN_REJECTED_RESOLUTION_REOPENED',
          old_value: { status: incident.status },
          new_value: { status: 'REOPENED', citizenRejectionReason: rejectionReasonText },
          reason: `Citizen rejected resolution: "${rejectionReasonText}". Reopened for Authority and Worker action.`,
          created_at: serverNow,
        });
      } else {
        const supabase = createAdminClient();
        try {
          await supabase.from('incidents').update(updateData).eq('id', validIncidentId);
          await supabase.from('resolution_evidence').update({ citizen_verified: false, citizen_feedback: rejectionReasonText }).eq('incident_id', validIncidentId);
          await supabase.from('audit_logs').insert({
            incident_id: validIncidentId,
            action: 'CITIZEN_REJECTED_RESOLUTION_REOPENED',
            old_value: { status: incident.status },
            new_value: { status: 'REOPENED', citizen_verified: false },
            reason: `Citizen rejected resolution: "${rejectionReasonText}". Reopened for Authority and Worker action.`,
          });
        } catch (dbErr) {
          return createErrorResponse('Service temporarily unavailable. Database update failed.', 'SERVICE_UNAVAILABLE', 503);
        }
      }

      return createSuccessResponse({
        action: 'REJECT',
        caseId: incident.case_id || incident.caseId,
        status: 'REOPENED',
        rejectionReason: rejectionReasonText,
        message: 'Your feedback has been recorded. The issue has been reopened for Authority and field team action.',
      });
    }
  } catch (error) {
    if (error instanceof ProductionDatabaseError) {
      return createErrorResponse('Service temporarily unavailable. Database is unconfigured.', 'SERVICE_UNAVAILABLE', 503);
    }
    console.error('[API /api/incidents/verify] Exception:', error);
    return createErrorResponse('An unexpected error occurred during resolution verification.', 'INTERNAL_ERROR', 500);
  }
}
