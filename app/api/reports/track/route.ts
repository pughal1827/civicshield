import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig, ProductionDatabaseError } from '@/lib/db/storage-config';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

export async function GET(req: NextRequest) {
  try {
    const config = getStorageConfig();
    const { searchParams } = new URL(req.url);
    const queryCode = searchParams.get('code') || searchParams.get('trackingCode') || searchParams.get('caseId') || '';

    if (!queryCode.trim()) {
      return createErrorResponse('Tracking Code or Case ID query parameter is required.', 'VALIDATION_ERROR', 400);
    }

    const cleanCode = queryCode.trim();

    let incidentId: string | null = null;
    let reportRecord: any = null;
    let isPossessionOfSecretUUID = false;
    let incident: any = null;
    let resolutionInfo: any = null;

    if (config.isMock) {
      // EXPLICIT DEMO / MOCK MODE
      const mockRep = mockStore.getReport(cleanCode);
      if (mockRep) {
        incidentId = mockRep.incident_id;
        reportRecord = mockRep;
        isPossessionOfSecretUUID = true;
      } else {
        const mockInc = mockStore.getIncident(cleanCode);
        if (mockInc) {
          incidentId = mockInc.id;
          isPossessionOfSecretUUID = cleanCode.length > 20;
        }
      }

      if (!incidentId) {
        return createErrorResponse('No matching complaint found for the provided Tracking Code or Case ID.', 'NOT_FOUND', 404);
      }

      incident = mockStore.getIncident(incidentId);
      if (!incident) {
        return createErrorResponse('Incident record not found.', 'NOT_FOUND', 404);
      }

      if (!reportRecord) {
        reportRecord = mockStore.getReport(incidentId);
      }

      if (['RESOLVED', 'CITIZEN_VERIFICATION', 'VERIFIED'].includes(incident.status)) {
        resolutionInfo = mockStore.getResolutionEvidence(incidentId);
      }
    } else {
      // EXPLICIT SUPABASE / PRODUCTION MODE (Fail closed if unavailable)
      const supabase = createAdminClient();

      try {
        // 1. Match by secret UUID tracking_code in reports table
        if (cleanCode.length > 20 && cleanCode.includes('-')) {
          const { data: rep } = await supabase
            .from('reports')
            .select('*')
            .eq('tracking_code', cleanCode)
            .single();

          if (rep) {
            incidentId = rep.incident_id;
            reportRecord = rep;
            isPossessionOfSecretUUID = true;
          }
        }

        // 2. Fallback check by Case ID (e.g. CS-1042)
        if (!incidentId) {
          const { data: inc } = await supabase
            .from('incidents')
            .select('id')
            .ilike('case_id', cleanCode)
            .single();

          if (inc) {
            incidentId = inc.id;
            isPossessionOfSecretUUID = false;
          }
        }

        if (!incidentId) {
          return createErrorResponse('No matching complaint found for the provided Tracking Code or Case ID.', 'NOT_FOUND', 404);
        }

        // 3. Fetch Master Incident Record
        const { data: incData, error: incErr } = await supabase
          .from('incidents')
          .select('id, case_id, title, summary, category, status, priority_score, address, latitude, longitude, created_at, resolved_at, departments(name)')
          .eq('id', incidentId)
          .single();

        if (incErr || !incData) {
          return createErrorResponse('Incident record not found.', 'NOT_FOUND', 404);
        }
        incident = incData;

        // 4. Fetch Report Record if not already fetched
        if (!reportRecord) {
          const { data: rep } = await supabase
            .from('reports')
            .select('tracking_code, raw_description, image_url, created_at')
            .eq('incident_id', incidentId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          reportRecord = rep || null;
        }

        // 5. Fetch Resolution Evidence if applicable
        if (['RESOLVED', 'CITIZEN_VERIFICATION', 'VERIFIED'].includes(incident.status)) {
          const { data: resEv } = await supabase
            .from('resolution_evidence')
            .select('proof_image_url, resolution_notes, citizen_verified, citizen_feedback, created_at')
            .eq('incident_id', incidentId)
            .maybeSingle();
          resolutionInfo = resEv || null;
        }
      } catch (dbErr) {
        return createErrorResponse('Service temporarily unavailable. Database connection failed.', 'SERVICE_UNAVAILABLE', 503);
      }
    }

    // 6. Build Progress Timeline
    const sanitizedTimeline = [
      { step: 'SUBMITTED', label: 'Report Submitted', completed: true },
      { step: 'AI_ANALYSED', label: 'AI Classified', completed: ['AI_ANALYSED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CITIZEN_VERIFICATION', 'VERIFIED'].includes(incident.status) },
      { step: 'ASSIGNED', label: 'Department Assigned', completed: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CITIZEN_VERIFICATION', 'VERIFIED'].includes(incident.status) },
      { step: 'IN_PROGRESS', label: 'Field Repair In Progress', completed: ['IN_PROGRESS', 'RESOLVED', 'CITIZEN_VERIFICATION', 'VERIFIED'].includes(incident.status) },
      { step: 'RESOLVED', label: 'Repair Completed', completed: ['RESOLVED', 'CITIZEN_VERIFICATION', 'VERIFIED'].includes(incident.status) },
      { step: 'CITIZEN_VERIFICATION', label: 'Awaiting Citizen Verification', completed: ['CITIZEN_VERIFICATION', 'VERIFIED'].includes(incident.status) },
      { step: 'VERIFIED', label: 'Verified & Closed', completed: incident.status === 'VERIFIED' },
    ];

    const departmentName = incident.departments ? (incident.departments as any).name : 'Road Maintenance & Infrastructure';

    return createSuccessResponse({
      trackingCode: isPossessionOfSecretUUID ? (reportRecord?.tracking_code || cleanCode) : undefined,
      caseId: incident.case_id,
      category: incident.category,
      title: incident.title,
      summary: incident.summary,
      rawDescription: isPossessionOfSecretUUID ? (reportRecord?.raw_description || incident.summary) : 'Access restricted: Full description requires secret tracking code.',
      imageUrl: isPossessionOfSecretUUID ? (reportRecord?.image_url || null) : null,
      status: incident.status,
      departmentName,
      address: incident.address,
      latitude: Number(incident.latitude),
      longitude: Number(incident.longitude),
      submittedAt: incident.created_at,
      resolvedAt: incident.resolved_at || null,
      resolutionEvidence: resolutionInfo,
      timeline: sanitizedTimeline,
      isPossessionOfSecretUUID,
    });
  } catch (error) {
    if (error instanceof ProductionDatabaseError) {
      return createErrorResponse('Service temporarily unavailable. Database is unconfigured.', 'SERVICE_UNAVAILABLE', 503);
    }
    console.error('[API /api/reports/track] Exception:', error);
    return createErrorResponse('An unexpected error occurred while looking up tracking status.', 'INTERNAL_ERROR', 500);
  }
}
