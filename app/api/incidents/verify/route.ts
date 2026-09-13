import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig, ProductionDatabaseError } from '@/lib/db/storage-config';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

const verifySchema = z.object({
  trackingCode: z.string().uuid('Invalid tracking code format.'),
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
      const mockRep = mockStore.getReport(trackingCode);
      if (!mockRep || !mockRep.incident_id) {
        return createErrorResponse('Unauthorized: Invalid or unknown tracking code.', 'UNAUTHORIZED', 401);
      }
      const incIdStr = String(mockRep.incident_id);
      targetIncidentId = incIdStr;
      incident = mockStore.getIncident(incIdStr);
      if (!incident) {
        return createErrorResponse('Associated incident record not found.', 'NOT_FOUND', 404);
      }
    } else {
      const supabase = createAdminClient();
      try {
        const { data: repData, error: repErr } = await supabase.from('reports').select('id, incident_id').eq('tracking_code', trackingCode).single();
        if (repErr || !repData || !repData.incident_id) {
          return createErrorResponse('Unauthorized: Invalid or unknown tracking code.', 'UNAUTHORIZED', 401);
        }
        targetIncidentId = repData.incident_id;

        const { data: incData, error: incErr } = await supabase.from('incidents').select('id, case_id, status').eq('id', targetIncidentId).single();
        if (incErr || !incData) {
          return createErrorResponse('Associated incident record not found.', 'NOT_FOUND', 404);
        }
        incident = incData;
      } catch (dbErr) {
        return createErrorResponse('Service temporarily unavailable. Database query failed.', 'SERVICE_UNAVAILABLE', 503);
      }
    }

    if (!targetIncidentId || !incident) {
      return createErrorResponse('Associated incident record not found.', 'NOT_FOUND', 404);
    }

    const validIncidentId: string = targetIncidentId;

    if (action === 'ACCEPT') {
      if (config.isMock) {
        mockStore.updateIncident(validIncidentId, { status: 'VERIFIED', resolved_at: new Date().toISOString() });
        const existingEv = mockStore.getResolutionEvidence(validIncidentId);
        if (existingEv) {
          mockStore.setResolutionEvidence({ ...existingEv, citizen_verified: true, citizen_feedback: feedback || 'Citizen confirmed issue resolution.' });
        }
      } else {
        const supabase = createAdminClient();
        try {
          await supabase.from('incidents').update({ status: 'VERIFIED', resolved_at: new Date().toISOString() }).eq('id', validIncidentId);
          await supabase.from('resolution_evidence').update({ citizen_verified: true, citizen_feedback: feedback || 'Citizen confirmed issue resolution.' }).eq('incident_id', validIncidentId);
          await supabase.from('audit_logs').insert({
            incident_id: validIncidentId,
            action: 'CITIZEN_VERIFIED_RESOLUTION',
            old_value: { status: incident.status },
            new_value: { status: 'VERIFIED', citizen_verified: true },
            reason: feedback || 'Citizen confirmed issue was resolved to satisfaction.',
          });
        } catch (dbErr) {
          return createErrorResponse('Service temporarily unavailable. Database update failed.', 'SERVICE_UNAVAILABLE', 503);
        }
      }

      return createSuccessResponse({
        action: 'ACCEPT',
        caseId: incident.case_id,
        status: 'VERIFIED',
        message: 'Thank you! Your civic issue has been verified as resolved and closed.',
      });
    } else {
      if (config.isMock) {
        mockStore.updateIncident(validIncidentId, { status: 'IN_PROGRESS' });
        const existingEv = mockStore.getResolutionEvidence(validIncidentId);
        if (existingEv) {
          mockStore.setResolutionEvidence({ ...existingEv, citizen_verified: false, citizen_feedback: feedback || 'Citizen reported issue is still not resolved.' });
        }
      } else {
        const supabase = createAdminClient();
        try {
          await supabase.from('incidents').update({ status: 'IN_PROGRESS' }).eq('id', validIncidentId);
          await supabase.from('resolution_evidence').update({ citizen_verified: false, citizen_feedback: feedback || 'Citizen reported issue is still not resolved.' }).eq('incident_id', validIncidentId);
          await supabase.from('audit_logs').insert({
            incident_id: validIncidentId,
            action: 'CITIZEN_REJECTED_RESOLUTION_REOPENED',
            old_value: { status: incident.status },
            new_value: { status: 'IN_PROGRESS', citizen_verified: false },
            reason: feedback || 'Citizen reported issue remains unresolved; work order reopened.',
          });
        } catch (dbErr) {
          return createErrorResponse('Service temporarily unavailable. Database update failed.', 'SERVICE_UNAVAILABLE', 503);
        }
      }

      return createSuccessResponse({
        action: 'REJECT',
        caseId: incident.case_id,
        status: 'IN_PROGRESS',
        message: 'Your feedback has been recorded. The issue has been reopened for field team inspection.',
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
