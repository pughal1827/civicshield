import { getStorageConfig } from '@/lib/db/storage-config';
import { mockStore } from '@/lib/db/mock-store';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { getTimeWindow } from './time-windows';
import { calculateTrend } from './trends';
import {
  IntelligenceOverview,
  IncidentMetrics,
  CategoryMetrics,
  DepartmentMetrics,
  TimeWindowType,
} from './types';
import { IncidentCategory } from '@/types/incident';

const ALL_CATEGORIES: IncidentCategory[] = [
  'ROAD_POTHOLE',
  'GARBAGE_OVERFLOW',
  'BROKEN_STREETLIGHT',
  'WATER_LEAKAGE',
  'DRAINAGE_BLOCKAGE',
  'TRAFFIC_SIGNAL_DAMAGED',
  'PUBLIC_INFRA_DAMAGE',
];

const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  ROAD_POTHOLE: 'Road / Pothole',
  GARBAGE_OVERFLOW: 'Garbage & Waste',
  BROKEN_STREETLIGHT: 'Streetlight / Electrical',
  WATER_LEAKAGE: 'Water Supply Leakage',
  DRAINAGE_BLOCKAGE: 'Drainage & Sewerage',
  TRAFFIC_SIGNAL_DAMAGED: 'Traffic Signals',
  PUBLIC_INFRA_DAMAGE: 'Public Infrastructure',
};

export async function getIntelligenceOverview(
  windowType: TimeWindowType = 'last30Days'
): Promise<IntelligenceOverview> {
  const config = getStorageConfig();
  const timeWindow = getTimeWindow(windowType);

  if (config.isMock) {
    return getMockIntelligenceOverview(timeWindow);
  } else {
    return getSupabaseIntelligenceOverview(timeWindow);
  }
}

function getMockIntelligenceOverview(timeWindow: ReturnType<typeof getTimeWindow>): IntelligenceOverview {
  const incidents = mockStore.getIncidents();
  const reports = mockStore.getReports();
  const departments = mockStore.getDepartments();

  // Filter incidents created within window
  const startTime = new Date(timeWindow.startDate).getTime();
  const endTime = new Date(timeWindow.endDate).getTime();

  const windowIncidents = incidents.filter((inc: any) => {
    const t = new Date(inc.created_at || inc.createdAt).getTime();
    return t >= startTime && t <= endTime;
  });

  const totalIncidents = windowIncidents.length;
  const totalReports = reports.length;

  let activeIncidents = 0;
  let criticalIncidents = 0;
  let highPriorityIncidents = 0;
  let mediumPriorityIncidents = 0;
  let lowPriorityIncidents = 0;
  let resolvedIncidents = 0;
  let verifiedIncidents = 0;
  let unassignedIncidents = 0;

  for (const inc of windowIncidents) {
    if (['SUBMITTED', 'AI_ANALYSED', 'ASSIGNED', 'IN_PROGRESS'].includes(inc.status)) {
      activeIncidents++;
    }
    if (inc.status === 'RESOLVED') resolvedIncidents++;
    if (inc.status === 'VERIFIED') verifiedIncidents++;
    if (!inc.department_id && !inc.departmentId) unassignedIncidents++;

    const score = Number(inc.priority_score || inc.priorityScore) || 0;
    if (score >= 80) criticalIncidents++;
    else if (score >= 60) highPriorityIncidents++;
    else if (score >= 40) mediumPriorityIncidents++;
    else lowPriorityIncidents++;
  }

  const metrics: IncidentMetrics = {
    totalIncidents,
    totalReports,
    activeIncidents,
    criticalIncidents,
    highPriorityIncidents,
    mediumPriorityIncidents,
    lowPriorityIncidents,
    resolvedIncidents,
    verifiedIncidents,
    unassignedIncidents,
  };

  // Trend calculation comparing with previous baseline period of equal duration
  const durationMs = endTime - startTime;
  const prevStartTime = startTime - durationMs;
  const prevWindowIncidents = incidents.filter((inc: any) => {
    const t = new Date(inc.created_at || inc.createdAt).getTime();
    return t >= prevStartTime && t < startTime;
  });

  const trend = calculateTrend(totalIncidents, prevWindowIncidents.length);

  // Category Aggregation
  const categories: CategoryMetrics[] = ALL_CATEGORIES.map((cat) => {
    const catIncidents = windowIncidents.filter((inc: any) => inc.category === cat);
    const catReports = reports.filter((r: any) => {
      const inc = mockStore.getIncident(r.incident_id || r.incidentId);
      return inc && inc.category === cat;
    });

    return {
      category: cat,
      categoryLabel: CATEGORY_LABELS[cat] || cat,
      incidentCount: catIncidents.length,
      reportCount: catReports.length,
      activeCount: catIncidents.filter((i: any) => ['SUBMITTED', 'AI_ANALYSED', 'ASSIGNED', 'IN_PROGRESS'].includes(i.status)).length,
      criticalCount: catIncidents.filter((i: any) => (Number(i.priority_score || i.priorityScore) || 0) >= 80).length,
      resolvedCount: catIncidents.filter((i: any) => ['RESOLVED', 'VERIFIED'].includes(i.status)).length,
    };
  });

  // Department Aggregation
  const departmentMetrics: DepartmentMetrics[] = departments.map((dept: any) => {
    const deptIncidents = windowIncidents.filter((inc: any) => (inc.department_id || inc.departmentId) === dept.id);

    return {
      departmentId: dept.id,
      departmentCode: dept.code,
      departmentName: dept.name,
      activeIncidents: deptIncidents.filter((i: any) => ['SUBMITTED', 'AI_ANALYSED', 'ASSIGNED', 'IN_PROGRESS'].includes(i.status)).length,
      criticalIncidents: deptIncidents.filter((i: any) => (Number(i.priority_score || i.priorityScore) || 0) >= 80).length,
      highPriorityIncidents: deptIncidents.filter((i: any) => {
        const score = Number(i.priority_score || i.priorityScore) || 0;
        return score >= 60 && score < 80;
      }).length,
      resolvedIncidents: deptIncidents.filter((i: any) => ['RESOLVED', 'VERIFIED'].includes(i.status)).length,
      pendingVerificationCount: deptIncidents.filter((i: any) => i.status === 'CITIZEN_VERIFICATION').length,
    };
  });


  return {
    timeWindow,
    metrics,
    trend,
    categories,
    departments: departmentMetrics,
    storageMode: 'mock',
    calculatedAt: new Date().toISOString(),
  };
}

async function getSupabaseIntelligenceOverview(timeWindow: ReturnType<typeof getTimeWindow>): Promise<IntelligenceOverview> {
  const supabase = createAdminClient();

  // 1. Query Incidents within time window
  const { data: windowIncidents, error: incError } = await supabase
    .from('incidents')
    .select('*')
    .gte('created_at', timeWindow.startDate)
    .lte('created_at', timeWindow.endDate);

  if (incError) {
    throw new Error(`Database error querying incidents: ${incError.message}`);
  }

  // 2. Query Total Citizen Reports Count
  const { count: reportCount, error: repError } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true });

  if (repError) {
    throw new Error(`Database error querying reports count: ${repError.message}`);
  }

  // 3. Query Departments
  const { data: depts, error: deptError } = await supabase
    .from('departments')
    .select('*');

  if (deptError) {
    throw new Error(`Database error querying departments: ${deptError.message}`);
  }

  const incidentsList = windowIncidents || [];
  const totalIncidents = incidentsList.length;

  let activeIncidents = 0;
  let criticalIncidents = 0;
  let highPriorityIncidents = 0;
  let mediumPriorityIncidents = 0;
  let lowPriorityIncidents = 0;
  let resolvedIncidents = 0;
  let verifiedIncidents = 0;
  let unassignedIncidents = 0;

  for (const inc of incidentsList) {
    if (['SUBMITTED', 'AI_ANALYSED', 'ASSIGNED', 'IN_PROGRESS'].includes(inc.status)) {
      activeIncidents++;
    }
    if (inc.status === 'RESOLVED') resolvedIncidents++;
    if (inc.status === 'VERIFIED') verifiedIncidents++;
    if (!inc.department_id) unassignedIncidents++;

    const score = Number(inc.priority_score) || 0;
    if (score >= 80) criticalIncidents++;
    else if (score >= 60) highPriorityIncidents++;
    else if (score >= 40) mediumPriorityIncidents++;
    else lowPriorityIncidents++;
  }

  const metrics: IncidentMetrics = {
    totalIncidents,
    totalReports: reportCount || 0,
    activeIncidents,
    criticalIncidents,
    highPriorityIncidents,
    mediumPriorityIncidents,
    lowPriorityIncidents,
    resolvedIncidents,
    verifiedIncidents,
    unassignedIncidents,
  };

  // Previous period count query for trend calculation
  const startTimeMs = new Date(timeWindow.startDate).getTime();
  const endTimeMs = new Date(timeWindow.endDate).getTime();
  const durationMs = endTimeMs - startTimeMs;
  const prevStartIso = new Date(startTimeMs - durationMs).toISOString();

  const { count: prevCount, error: prevError } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', prevStartIso)
    .lt('created_at', timeWindow.startDate);

  if (prevError) {
    throw new Error(`Database error querying baseline trend: ${prevError.message}`);
  }

  const trend = calculateTrend(totalIncidents, prevCount || 0);

  // Category Aggregations
  const categories: CategoryMetrics[] = ALL_CATEGORIES.map((cat) => {
    const catIncidents = incidentsList.filter((i) => i.category === cat);
    return {
      category: cat,
      categoryLabel: CATEGORY_LABELS[cat] || cat,
      incidentCount: catIncidents.length,
      reportCount: catIncidents.reduce((sum, i) => sum + (Number(i.report_count) || 1), 0),
      activeCount: catIncidents.filter((i) => ['SUBMITTED', 'AI_ANALYSED', 'ASSIGNED', 'IN_PROGRESS'].includes(i.status)).length,
      criticalCount: catIncidents.filter((i) => (Number(i.priority_score) || 0) >= 80).length,
      resolvedCount: catIncidents.filter((i) => ['RESOLVED', 'VERIFIED'].includes(i.status)).length,
    };
  });

  // Department Aggregations
  const departmentMetrics: DepartmentMetrics[] = (depts || []).map((dept) => {
    const deptIncidents = incidentsList.filter((i) => i.department_id === dept.id);
    return {
      departmentId: dept.id,
      departmentCode: dept.code,
      departmentName: dept.name,
      activeIncidents: deptIncidents.filter((i) => ['SUBMITTED', 'AI_ANALYSED', 'ASSIGNED', 'IN_PROGRESS'].includes(i.status)).length,
      criticalIncidents: deptIncidents.filter((i) => (Number(i.priority_score) || 0) >= 80).length,
      highPriorityIncidents: deptIncidents.filter((i) => (Number(i.priority_score) || 0) >= 60 && (Number(i.priority_score) || 0) < 80).length,
      resolvedIncidents: deptIncidents.filter((i) => ['RESOLVED', 'VERIFIED'].includes(i.status)).length,
      pendingVerificationCount: deptIncidents.filter((i) => i.status === 'CITIZEN_VERIFICATION').length,
    };
  });

  return {
    timeWindow,
    metrics,
    trend,
    categories,
    departments: departmentMetrics,
    storageMode: 'supabase',
    calculatedAt: new Date().toISOString(),
  };
}
