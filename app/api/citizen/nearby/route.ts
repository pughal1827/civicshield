import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig, ProductionDatabaseError } from '@/lib/db/storage-config';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

export async function GET(req: NextRequest) {
  try {
    const config = getStorageConfig();
    let rawIncidents: any[] = [];

    if (config.isMock) {
      rawIncidents = mockStore.getAllIncidents();
    } else {
      const supabase = createAdminClient();
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('id, case_id, title, category, status, priority_score, address, latitude, longitude, report_count, created_at')
          .is('master_incident_id', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          return createErrorResponse('Service temporarily unavailable.', 'SERVICE_UNAVAILABLE', 503);
        }
        rawIncidents = data || [];
      } catch (dbErr) {
        return createErrorResponse('Service temporarily unavailable.', 'SERVICE_UNAVAILABLE', 503);
      }
    }

    // Return sanitized public fields ONLY (0 citizen PII, 0 tracking tokens, 0 internal audit logs)
    const nearbyPublicIssues = rawIncidents.map((inc) => ({
      id: inc.id,
      caseId: inc.case_id,
      title: inc.title,
      category: inc.category,
      status: inc.status,
      priorityScore: inc.priority_score,
      address: inc.address,
      latitude: Number(inc.latitude),
      longitude: Number(inc.longitude),
      reportCount: inc.report_count || 1,
      createdAt: inc.created_at,
    }));

    return createSuccessResponse({
      issues: nearbyPublicIssues,
      count: nearbyPublicIssues.length,
    });
  } catch (error) {
    if (error instanceof ProductionDatabaseError) {
      return createErrorResponse('Service temporarily unavailable.', 'SERVICE_UNAVAILABLE', 503);
    }
    return createErrorResponse('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
}
