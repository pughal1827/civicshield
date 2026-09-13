import { NextRequest } from 'next/server';
import { getSessionByToken } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig, ProductionDatabaseError } from '@/lib/db/storage-config';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

export async function GET(req: NextRequest) {
  try {
    const config = getStorageConfig();
    const tokenCookie = req.cookies.get('civicshield_session')?.value;
    const headerToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || headerToken;

    const session = getSessionByToken(token);

    let userIncidents: any[] = [];

    if (config.isMock) {
      if (session?.user) {
        const allReports = mockStore.getReports();
        const userReports = allReports.filter(r => r.citizen_id === session.user.id || r.citizenId === session.user.id);
        const userIncidentIds = new Set(userReports.map(r => r.incident_id || r.incidentId));
        
        userIncidents = mockStore.getAllIncidents().filter(inc => userIncidentIds.has(inc.id));
      }
    } else {
      if (session?.user) {
        const supabase = createAdminClient();
        try {
          const { data: userReports, error: repErr } = await supabase
            .from('reports')
            .select('incident_id')
            .eq('reporter_id', session.user.id);

          if (!repErr && userReports && userReports.length > 0) {
            const incIds = userReports.map(r => r.incident_id);
            const { data: incs, error: incErr } = await supabase
              .from('incidents')
              .select('*, departments(name)')
              .in('id', incIds)
              .order('created_at', { ascending: false });

            if (!incErr && incs) {
              userIncidents = incs;
            }
          }
        } catch (dbErr) {
          return createErrorResponse('Service temporarily unavailable.', 'SERVICE_UNAVAILABLE', 503);
        }
      }
    }

    const notifications = userIncidents.map((inc) => {
      let title = `Report ${inc.case_id} Status Update`;
      let message = `Your report for "${inc.title}" is currently ${inc.status.replace('_', ' ')}.`;
      let type: 'info' | 'action' | 'success' = 'info';

      if (inc.status === 'ASSIGNED') {
        message = `Your report ${inc.case_id} has been assigned to ${inc.departments?.name || 'Department'}.`;
      } else if (inc.status === 'IN_PROGRESS') {
        message = `Field teams have started repair work on ${inc.case_id}.`;
      } else if (inc.status === 'RESOLVED' || inc.status === 'CITIZEN_VERIFICATION') {
        title = `Action Required: Verify ${inc.case_id}`;
        message = `Repair completed! Please confirm if the issue was resolved to your satisfaction.`;
        type = 'action';
      } else if (inc.status === 'VERIFIED') {
        title = `Report ${inc.case_id} Closed`;
        message = `Thank you! Your verification was confirmed and the report is now closed.`;
        type = 'success';
      }

      return {
        id: `notif-${inc.id}`,
        caseId: inc.case_id,
        incidentId: inc.id,
        title,
        message,
        type,
        status: inc.status,
        createdAt: inc.created_at || new Date().toISOString(),
        read: false,
      };
    });

    return createSuccessResponse({
      notifications,
      unreadCount: notifications.filter((n) => n.type === 'action').length,
    });
  } catch (error) {
    if (error instanceof ProductionDatabaseError) {
      return createErrorResponse('Service temporarily unavailable.', 'SERVICE_UNAVAILABLE', 503);
    }
    return createErrorResponse('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
}
