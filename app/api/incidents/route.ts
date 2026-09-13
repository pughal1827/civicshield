import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig, ProductionDatabaseError } from '@/lib/db/storage-config';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

export async function GET(req: NextRequest) {
  try {
    const config = getStorageConfig();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const category = searchParams.get('category') || '';
    const departmentId = searchParams.get('departmentId') || '';

    let filteredIncidents: any[] = [];

    if (config.isMock) {
      // EXPLICIT DEMO MODE
      filteredIncidents = mockStore.getAllIncidents();
    } else {
      // EXPLICIT SUPABASE MODE (Fail closed in production)
      const supabase = createAdminClient();

      try {
        let query = supabase
          .from('incidents')
          .select('*, departments(name, code), users:assigned_officer_id(full_name)')
          .is('master_incident_id', null)
          .order('priority_score', { ascending: false })
          .order('created_at', { ascending: false });

        if (status && status !== 'ALL') query = query.eq('status', status);
        if (category && category !== 'ALL') query = query.eq('category', category);
        if (departmentId && departmentId !== 'ALL') query = query.eq('department_id', departmentId);

        if (priority && priority !== 'ALL') {
          if (priority === 'CRITICAL') query = query.gte('priority_score', 80);
          else if (priority === 'HIGH') query = query.gte('priority_score', 60).lt('priority_score', 80);
          else if (priority === 'MEDIUM') query = query.gte('priority_score', 40).lt('priority_score', 60);
          else if (priority === 'LOW') query = query.lt('priority_score', 40);
        }

        const { data, error } = await query;
        if (error) {
          return createErrorResponse('Service temporarily unavailable. Database query failed.', 'SERVICE_UNAVAILABLE', 503);
        }
        filteredIncidents = data || [];
      } catch (dbErr) {
        return createErrorResponse('Service temporarily unavailable. Database connection failed.', 'SERVICE_UNAVAILABLE', 503);
      }
    }

    // Apply memory filters for mock mode or search queries
    if (config.isMock) {
      if (status && status !== 'ALL') {
        filteredIncidents = filteredIncidents.filter((i) => i.status === status);
      }
      if (category && category !== 'ALL') {
        filteredIncidents = filteredIncidents.filter((i) => i.category === category);
      }
      if (departmentId && departmentId !== 'ALL') {
        filteredIncidents = filteredIncidents.filter((i) => i.department_id === departmentId);
      }
      if (priority && priority !== 'ALL') {
        if (priority === 'CRITICAL') filteredIncidents = filteredIncidents.filter((i) => i.priority_score >= 80);
        else if (priority === 'HIGH') filteredIncidents = filteredIncidents.filter((i) => i.priority_score >= 60 && i.priority_score < 80);
        else if (priority === 'MEDIUM') filteredIncidents = filteredIncidents.filter((i) => i.priority_score >= 40 && i.priority_score < 60);
        else if (priority === 'LOW') filteredIncidents = filteredIncidents.filter((i) => i.priority_score < 40);
      }
    }

    // Search Filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filteredIncidents = filteredIncidents.filter(
        (inc: any) =>
          (inc.case_id && inc.case_id.toLowerCase().includes(q)) ||
          (inc.title && inc.title.toLowerCase().includes(q)) ||
          (inc.summary && inc.summary.toLowerCase().includes(q)) ||
          (inc.address && inc.address.toLowerCase().includes(q))
      );
    }

    filteredIncidents.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

    // Compute Metrics Stats
    const totalCount = filteredIncidents.length;
    const criticalCount = filteredIncidents.filter((i: any) => i.priority_score >= 80).length;
    const highCount = filteredIncidents.filter((i: any) => i.priority_score >= 60 && i.priority_score < 80).length;
    const pendingAssignmentCount = filteredIncidents.filter((i: any) => i.status === 'SUBMITTED' || i.status === 'AI_ANALYSED').length;
    const inProgressCount = filteredIncidents.filter((i: any) => i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS').length;
    const resolvedCount = filteredIncidents.filter((i: any) => i.status === 'RESOLVED' || i.status === 'VERIFIED').length;

    return createSuccessResponse({
      incidents: filteredIncidents,
      stats: {
        totalCount,
        criticalCount,
        highCount,
        pendingAssignmentCount,
        inProgressCount,
        resolvedCount,
      },
    });
  } catch (error) {
    if (error instanceof ProductionDatabaseError) {
      return createErrorResponse('Service temporarily unavailable. Database is unconfigured.', 'SERVICE_UNAVAILABLE', 503);
    }
    console.error('[API /api/incidents] Unhandled exception:', error);
    return createErrorResponse('An unexpected error occurred while fetching incidents.', 'INTERNAL_ERROR', 500);
  }
}
