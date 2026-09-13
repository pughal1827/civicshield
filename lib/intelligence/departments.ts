import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { IncidentCategory, IncidentStatus } from '@/types/incident';
import {
  DepartmentOperationsResponse,
  DepartmentPressureInfo,
  DepartmentResolutionMetrics,
  DepartmentVerificationMetrics,
  DepartmentWorkloadDetail,
  PressureClassification,
  UnassignedIncidentItem,
} from './types';
import { calculateIncidentSLA, getPriorityTierFromScore, SLA_CONFIG } from './sla';
import { detectRecurringProblems } from './recurring';
import { calculateTrendMetrics } from './trends';

const DEPARTMENTS = [
  { id: 'dept_roads', code: 'PWD_ROAD', name: 'Road Maintenance' },
  { id: 'dept_sanitation', code: 'SAN_DEPT', name: 'Sanitation Department' },
  { id: 'dept_electrical', code: 'ELEC_DEPT', name: 'Electrical Works' },
  { id: 'dept_water', code: 'WATER_DEPT', name: 'Water Resources' },
  { id: 'dept_drainage', code: 'DRAIN_DEPT', name: 'Drainage Department' },
  { id: 'dept_traffic', code: 'TRAFF_DEPT', name: 'Traffic Management' },
];

const CATEGORY_LABELS: Record<string, string> = {
  ROAD_POTHOLE: 'Roads & Potholes',
  GARBAGE: 'Garbage & Sanitation',
  STREETLIGHT: 'Street Lighting',
  WATER_LEAKAGE: 'Water Leakage',
  DRAINAGE_BLOCKAGE: 'Drainage Blockage',
  TRAFFIC_SIGNAL: 'Traffic Signals',
  PUBLIC_INFRA_DAMAGE: 'Public Infrastructure',
};

const CATEGORY_TO_DEPT: Record<string, string> = {
  ROAD_POTHOLE: 'dept_roads',
  GARBAGE: 'dept_sanitation',
  STREETLIGHT: 'dept_electrical',
  WATER_LEAKAGE: 'dept_water',
  DRAINAGE_BLOCKAGE: 'dept_drainage',
  TRAFFIC_SIGNAL: 'dept_traffic',
  PUBLIC_INFRA_DAMAGE: 'dept_roads',
};

const ACTIVE_STATUSES: IncidentStatus[] = [
  'SUBMITTED',
  'AI_ANALYSED',
  'ASSIGNED',
  'IN_PROGRESS',
  'CITIZEN_VERIFICATION',
];

/**
 * Deterministically computes operational pressure for a department (0-100 score).
 */
export function calculateDepartmentPressure(params: {
  activeCount: number;
  criticalCount: number;
  highCount: number;
  slaAtRiskCount: number;
  slaBreachedCount: number;
  recurringProblemCount: number;
  assignedCount: number;
  inProgressCount: number;
  resolvedCount: number;
}): DepartmentPressureInfo {
  const activeScore = Math.min(100, (params.activeCount / 20) * 100);
  const criticalScore = Math.min(100, ((params.criticalCount * 2 + params.highCount) / 10) * 100);
  const slaScore = Math.min(100, ((params.slaBreachedCount * 2 + params.slaAtRiskCount) / 5) * 100);
  const recurringScore = Math.min(100, (params.recurringProblemCount / 3) * 100);

  const rawScore = 0.40 * activeScore + 0.25 * criticalScore + 0.20 * slaScore + 0.15 * recurringScore;
  const pressureScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let classification: PressureClassification = 'NORMAL';
  if (pressureScore >= 75) classification = 'HIGH';
  else if (pressureScore >= 50) classification = 'ELEVATED';
  else if (pressureScore >= 25) classification = 'MODERATE';

  const reasons: string[] = [];
  if (params.activeCount > 0) reasons.push(`${params.activeCount} active incident(s)`);
  if (params.criticalCount + params.highCount > 0) {
    reasons.push(`${params.criticalCount + params.highCount} critical/high priority incident(s)`);
  }
  if (params.slaAtRiskCount + params.slaBreachedCount > 0) {
    reasons.push(`${params.slaAtRiskCount + params.slaBreachedCount} SLA risk/breach(es)`);
  }
  if (params.recurringProblemCount > 0) {
    reasons.push(`${params.recurringProblemCount} recurring problem location(s)`);
  }
  if (reasons.length === 0) {
    reasons.push('Low overall operational workload');
  }

  const inFlight = params.assignedCount + params.inProgressCount;
  const hasBottleneck = inFlight >= 10 && params.resolvedCount < Math.ceil(inFlight * 0.2);
  const bottleneckExplanation = hasBottleneck
    ? `High active queue (${inFlight} in-flight) relative to resolution throughput`
    : undefined;

  return {
    pressureScore,
    classification,
    reasons,
    hasBottleneck,
    bottleneckExplanation,
  };
}

/**
 * Calculates department workload analytics and unassigned critical queues.
 */
export async function getDepartmentOperations(
  rawParams: { departmentId?: string; days?: number } = {}
): Promise<DepartmentOperationsResponse> {
  const mode = process.env.CIVICSHIELD_STORAGE_MODE || 'mock';
  const days = rawParams.days || 7;

  const now = new Date();
  const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

  let rawIncidents: any[] = [];
  let rawReports: any[] = [];
  let rawAudits: any[] = [];

  if (mode === 'supabase') {
    try {
      const supabase = createAdminClient();

      const { data: incData, error: incErr } = await supabase
        .from('incidents')
        .select('*')
        .is('master_incident_id', null);

      if (incErr) throw new Error(`Database error querying incidents: ${incErr.message}`);
      rawIncidents = incData || [];

      const { data: repData } = await supabase.from('reports').select('incident_id');
      rawReports = repData || [];

      const { data: auditData } = await supabase.from('audit_logs').select('*');
      rawAudits = auditData || [];
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' || process.env.CIVICSHIELD_STORAGE_MODE === 'supabase') {
        console.error('[Department Operations] Supabase Database Error:', err);
        throw err; // Triggers HTTP 503
      }
    }
  } else {
    // Explicit MOCK Mode
    rawIncidents = mockStore.getIncidents().filter((i) => !i.masterIncidentId && !i.master_incident_id);
    rawReports = mockStore.getReports();
  }

  // Report counts per master incident
  const reportCountsMap = new Map<string, number>();
  rawReports.forEach((r) => {
    const incId = r.incident_id || r.incidentId;
    if (incId) {
      reportCountsMap.set(incId, (reportCountsMap.get(incId) || 0) + 1);
    }
  });

  // Recurrence problems by category
  let recurringClustersByCategory = new Map<string, number>();
  try {
    const recRes = await detectRecurringProblems({ days: 180 });
    recRes.recurrences.forEach((r) => {
      recurringClustersByCategory.set(r.category, (recurringClustersByCategory.get(r.category) || 0) + 1);
    });
  } catch (err) {
    // Graceful fallback for demo mode
  }

  // 1. Build Department Workload Details
  const deptDetails: DepartmentWorkloadDetail[] = DEPARTMENTS.map((dept) => {
    // Filter incidents assigned to department
    const deptIncidents = rawIncidents.filter((i) => {
      const assignedDept = i.department_id || i.departmentId;
      return assignedDept === dept.id;
    });


    let activeCount = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    let submittedCount = 0;
    let assignedCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;
    let pendingVerificationCount = 0;
    let verifiedCount = 0;

    let slaAtRiskCount = 0;
    let slaBreachedCount = 0;
    let citizenReportCount = 0;

    let currPeriodNewCount = 0;
    let prevPeriodNewCount = 0;
    let currPeriodResolvedCount = 0;
    let prevPeriodResolvedCount = 0;

    const resolutionDurationsHours: number[] = [];
    let rejectedVerificationCount = 0;

    deptIncidents.forEach((i) => {
      const status = i.status as IncidentStatus;
      const score = i.priority_score ?? i.priorityScore ?? 50;
      const tier = getPriorityTierFromScore(score);

      const createdAt = new Date(i.created_at || i.createdAt);
      const resolvedAt = i.resolved_at || i.resolvedAt ? new Date(i.resolved_at || i.resolvedAt) : null;

      // Status counters
      if (status === 'SUBMITTED') submittedCount++;
      else if (status === 'AI_ANALYSED') submittedCount++;
      else if (status === 'ASSIGNED') assignedCount++;
      else if (status === 'IN_PROGRESS') inProgressCount++;
      else if (status === 'RESOLVED') resolvedCount++;
      else if (status === 'CITIZEN_VERIFICATION') pendingVerificationCount++;
      else if (status === 'VERIFIED') verifiedCount++;

      // Active vs Priority counters
      if (ACTIVE_STATUSES.includes(status)) {
        activeCount++;
        if (tier === 'CRITICAL') criticalCount++;
        else if (tier === 'HIGH') highCount++;
        else if (tier === 'MEDIUM') mediumCount++;
        else lowCount++;

        // SLA Check
        const sla = calculateIncidentSLA(i);
        if (sla.slaStatus === 'BREACHED') slaBreachedCount++;
        else if (sla.slaStatus === 'AT_RISK') slaAtRiskCount++;
      }

      // Citizen Report Submissions for master incidents
      const reps = reportCountsMap.get(i.id) || 1;
      citizenReportCount += Math.max(1, reps);

      // Resolution Durations & Verification Metrics
      if ((status === 'RESOLVED' || status === 'VERIFIED') && (resolvedAt || createdAt)) {
        const assignedAt = i.assigned_at || i.assignedAt ? new Date(i.assigned_at || i.assignedAt) : createdAt;
        const endTime = resolvedAt || now;
        const durHours = Math.max(0.1, (endTime.getTime() - assignedAt.getTime()) / (1000 * 60 * 60));
        resolutionDurationsHours.push(durHours);
      }

      // Rejection / Reopen count from audit log or flag
      if (i.reopen_count || i.reopenCount || i.rejected_verification) {
        rejectedVerificationCount += i.reopen_count || i.reopenCount || 1;
      }

      // 7-day Trend metrics
      if (createdAt >= currentStart) currPeriodNewCount++;
      else if (createdAt >= previousStart && createdAt < currentStart) prevPeriodNewCount++;

      if (resolvedAt) {
        if (resolvedAt >= currentStart) currPeriodResolvedCount++;
        else if (resolvedAt >= previousStart && resolvedAt < currentStart) prevPeriodResolvedCount++;
      }
    });

    // Count recurring problems matching department categories
    let recurringProblemCount = 0;
    Object.entries(CATEGORY_TO_DEPT).forEach(([cat, deptId]) => {
      if (deptId === dept.id) {
        recurringProblemCount += recurringClustersByCategory.get(cat) || 0;
      }
    });

    // Resolution Metrics
    let averageResolutionHours: number | null = null;
    let minResolutionHours: number | null = null;
    let maxResolutionHours: number | null = null;

    if (resolutionDurationsHours.length > 0) {
      const sum = resolutionDurationsHours.reduce((a, b) => a + b, 0);
      averageResolutionHours = Math.round((sum / resolutionDurationsHours.length) * 10) / 10;
      minResolutionHours = Math.round(Math.min(...resolutionDurationsHours) * 10) / 10;
      maxResolutionHours = Math.round(Math.max(...resolutionDurationsHours) * 10) / 10;
    }

    // Verification & Reopen Rates
    const totalCompleted = resolvedCount + verifiedCount;
    const verificationRate =
      totalCompleted > 0
        ? Math.round((verifiedCount / totalCompleted) * 1000) / 10
        : null;

    const reopenRate =
      totalCompleted > 0
        ? Math.round((rejectedVerificationCount / totalCompleted) * 1000) / 10
        : null;

    // Pressure Info
    const pressure = calculateDepartmentPressure({
      activeCount,
      criticalCount,
      highCount,
      slaAtRiskCount,
      slaBreachedCount,
      recurringProblemCount,
      assignedCount,
      inProgressCount,
      resolvedCount,
    });

    // Trends
    const newIncidentsTrend = calculateTrendMetrics(currPeriodNewCount, prevPeriodNewCount);
    const resolvedIncidentsTrend = calculateTrendMetrics(currPeriodResolvedCount, prevPeriodResolvedCount);

    return {
      departmentId: dept.id,
      departmentCode: dept.code,
      departmentName: dept.name,
      activeCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      submittedCount,
      assignedCount,
      inProgressCount,
      resolvedCount,
      pendingVerificationCount,
      verifiedCount,
      slaAtRiskCount,
      slaBreachedCount,
      recurringProblemCount,
      citizenReportCount,
      pressure,
      resolution: {
        resolvedCount,
        averageResolutionHours,
        minResolutionHours,
        maxResolutionHours,
      },
      verification: {
        verifiedCount,
        rejectedVerificationCount,
        verificationRate,
        reopenRate,
      },
      newIncidentsTrend,
      resolvedIncidentsTrend,
    };
  });

  // Filter if departmentId query param is set
  let filteredDeptDetails = deptDetails;
  if (rawParams.departmentId) {
    filteredDeptDetails = deptDetails.filter((d) => d.departmentId === rawParams.departmentId);
  }

  // 2. Unassigned Critical & High Priority Queues
  const unassignedIncidents = rawIncidents.filter((i) => {
    const dept = i.department_id || i.departmentId;
    const status = i.status as IncidentStatus;
    return !dept && ACTIVE_STATUSES.includes(status);
  });

  const unassignedCritical: UnassignedIncidentItem[] = [];
  const unassignedHigh: UnassignedIncidentItem[] = [];

  unassignedIncidents.forEach((i) => {
    const score = i.priority_score ?? i.priorityScore ?? 50;
    const tier = getPriorityTierFromScore(score);
    const createdAtIso = i.created_at || i.createdAt || now.toISOString();
    const createdAt = new Date(createdAtIso);

    const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60)));
    const hours = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    const timeText = hours > 0 ? `${hours}h ${mins}m ago` : `${mins}m ago`;

    const item: UnassignedIncidentItem = {
      incidentId: i.id,
      caseId: i.case_id || i.caseId || `CS-${i.id.slice(0, 6)}`,
      title: i.title || `${i.category} issue`,
      category: i.category as IncidentCategory,
      categoryLabel: CATEGORY_LABELS[i.category] || i.category,
      priorityTier: tier,
      priorityScore: score,
      createdAt: createdAtIso,
      timeSinceSubmissionMinutes: elapsedMinutes,
      timeSinceSubmissionText: timeText,
      addressSummary: i.address ? i.address.split(',')[0] : 'Reported location',
    };

    if (tier === 'CRITICAL' || score >= 80) {
      unassignedCritical.push(item);
    } else if (tier === 'HIGH' || score >= 60) {
      unassignedHigh.push(item);
    }
  });

  // Sort Unassigned Queues: Highest Priority Score first, then oldest createdAt first
  unassignedCritical.sort((a, b) => b.priorityScore - a.priorityScore || a.timeSinceSubmissionMinutes - b.timeSinceSubmissionMinutes);
  unassignedHigh.sort((a, b) => b.priorityScore - a.priorityScore || a.timeSinceSubmissionMinutes - b.timeSinceSubmissionMinutes);

  return {
    departments: filteredDeptDetails,
    unassignedCritical,
    unassignedHigh,
    totalUnassignedCritical: unassignedCritical.length,
    totalUnassignedHigh: unassignedHigh.length,
    storageMode: mode as 'mock' | 'supabase',
    generatedAt: new Date().toISOString(),
  };
}
