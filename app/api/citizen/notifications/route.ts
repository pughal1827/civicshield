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
      const allReports = mockStore.getReports();
      let userReports = session?.user
        ? allReports.filter(r => r.citizen_id === session.user.id || r.citizenId === session.user.id)
        : [];
      
      // Fallback: If no specific user reports exist yet, show demo incidents for notifications
      if (userReports.length === 0) {
        userIncidents = mockStore.getAllIncidents();
      } else {
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
      let title = `Report ${inc.case_id || inc.caseId} Status Update`;
      let statusName = (inc.status || 'SUBMITTED').replace('_', ' ');
      let message = `Your report for "${inc.title}" is currently ${statusName}.`;
      let type: 'info' | 'action' | 'success' = 'info';

      if (inc.status === 'ASSIGNED') {
        title = `Report Assigned: ${inc.case_id || inc.caseId}`;
        message = `Your report ${inc.case_id || inc.caseId} has been assigned to ${inc.departments?.name || 'Department'}.`;
      } else if (inc.status === 'IN_PROGRESS') {
        title = `Work Started: ${inc.case_id || inc.caseId}`;
        message = `Field teams have started repair work on ${inc.case_id || inc.caseId}.`;
      } else if (inc.status === 'RESOLVED' || inc.status === 'CITIZEN_VERIFICATION') {
        title = `Action Required: Verify ${inc.case_id || inc.caseId}`;
        message = `Repair completed! Please confirm if the issue was resolved to your satisfaction.`;
        type = 'action';
        statusName = 'Resolved (Verification Needed)';
      } else if (inc.status === 'VERIFIED') {
        title = `Report ${inc.case_id || inc.caseId} Closed`;
        message = `Thank you! Your verification was confirmed and the report is now closed.`;
        type = 'success';
        statusName = 'Verified & Closed';
      }

      return {
        id: `notif-${inc.id}`,
        caseId: inc.case_id || inc.caseId || 'CS-2026-1001',
        incidentId: inc.id,
        title,
        message,
        type,
        status: inc.status,
        statusName,
        createdAt: inc.created_at || inc.createdAt || new Date().toISOString(),
        read: false,
      };
    });

    const unreadCount = notifications.filter((n) => n.type === 'action' || n.status === 'CITIZEN_VERIFICATION' || n.status === 'SUBMITTED').length;

    return createSuccessResponse({
      notifications,
      unreadCount,
    });
  } catch (error) {
    if (error instanceof ProductionDatabaseError) {
      return createErrorResponse('Service temporarily unavailable.', 'SERVICE_UNAVAILABLE', 503);
    }
    return createErrorResponse('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
  }
}
