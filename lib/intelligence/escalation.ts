import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { IncidentCategory, IncidentStatus } from '@/types/incident';
import {
  EscalationAlertItem,
  EscalationLevel,
  EscalationResponse,
  EscalationSummary,
} from './types';
import { calculateIncidentSLA, getPriorityTierFromScore } from './sla';
import { detectRecurringProblems } from './recurring';

export interface EscalationQueryParams {
  days?: number;
  level?: string;
  category?: string;
  departmentId?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ROAD_POTHOLE: 'Roads & Potholes',
  GARBAGE: 'Garbage & Sanitation',
  STREETLIGHT: 'Street Lighting',
  WATER_LEAKAGE: 'Water Leakage',
  DRAINAGE_BLOCKAGE: 'Drainage Blockage',
  TRAFFIC_SIGNAL: 'Traffic Signals',
  PUBLIC_INFRA_DAMAGE: 'Public Infrastructure',
};

const DEPARTMENT_NAMES: Record<string, string> = {
  dept_roads: 'Road Maintenance',
  dept_sanitation: 'Sanitation Department',
  dept_electrical: 'Electrical Works',
  dept_water: 'Water Resources',
  dept_drainage: 'Drainage Department',
  dept_traffic: 'Traffic Management',
};

/**
 * Deterministically computes emergency escalation level and trigger reasons.
 */
export function calculateEscalationLevel(params: {
  priorityScore: number;
  priorityTier: string;
  safetyRiskScore: number;
  reportCount: number;
  slaState: string;
  recurrenceSignal: boolean;
}): { level: EscalationLevel; reasons: string[] } {
  const reasons: string[] = [];

  const isCritical = params.priorityScore >= 80 || params.priorityTier === 'CRITICAL';
  const isHigh = params.priorityScore >= 60 || params.priorityTier === 'HIGH';

  if (isCritical) {
    reasons.push(`Critical priority tier (Priority score: ${params.priorityScore}/100)`);
  } else if (isHigh) {
    reasons.push(`High priority tier (Priority score: ${params.priorityScore}/100)`);
  }

  if (params.safetyRiskScore >= 85) {
    reasons.push(`Severe public safety risk score (${params.safetyRiskScore}/100)`);
  } else if (params.safetyRiskScore >= 70) {
    reasons.push(`Elevated safety risk factor (${params.safetyRiskScore}/100)`);
  }

  if (params.reportCount >= 3) {
    reasons.push(`High citizen report volume (${params.reportCount} submissions linked)`);
  }

  if (params.slaState === 'BREACHED') {
    reasons.push('SLA resolution deadline BREACHED');
  } else if (params.slaState === 'AT_RISK') {
    reasons.push('SLA resolution deadline AT RISK');
  }

  if (params.recurrenceSignal) {
    reasons.push('Matches historical recurring problem pattern');
  }

  // Escalation Level Rules
  if (
    isCritical &&
    (params.safetyRiskScore >= 85 || params.reportCount >= 3 || params.slaState === 'BREACHED')
  ) {
    return { level: 'EMERGENCY_REVIEW', reasons };
  }

  if (
    isHigh &&
    (params.slaState === 'BREACHED' ||
      params.slaState === 'AT_RISK' ||
      params.recurrenceSignal ||
      params.safetyRiskScore >= 75)
  ) {
    return { level: 'URGENT', reasons };
  }

  if (params.priorityScore >= 40 || params.safetyRiskScore >= 70) {
    return { level: 'WATCH', reasons };
  }

  return { level: 'NONE', reasons };
}

/**
 * Evaluates active incidents and detects emergency escalations.
 */
export async function getEmergencyEscalations(
  rawParams: EscalationQueryParams = {}
): Promise<EscalationResponse> {
  const mode = process.env.CIVICSHIELD_STORAGE_MODE || 'mock';
  const days = rawParams.days || 30;

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  let rawIncidents: any[] = [];
  let rawReports: any[] = [];

  if (mode === 'supabase') {
    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('incidents')
        .select('*')
        .is('master_incident_id', null)
        .gte('created_at', windowStart.toISOString());

      if (rawParams.category) query = query.eq('category', rawParams.category);
      if (rawParams.departmentId) query = query.eq('department_id', rawParams.departmentId);

      const { data: incData, error: incErr } = await query;
      if (incErr) throw new Error(`Database query failed for escalations: ${incErr.message}`);
      rawIncidents = incData || [];

      const { data: repData } = await supabase.from('reports').select('incident_id');
      rawReports = repData || [];
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' || process.env.CIVICSHIELD_STORAGE_MODE === 'supabase') {
        console.error('[Escalation Engine] Supabase Error:', err);
        throw err; // HTTP 503
      }
    }
  } else {
    // Explicit MOCK Mode
    rawIncidents = mockStore.getIncidents().filter((i) => {
      if (i.masterIncidentId || i.master_incident_id) return false;
      const createdAt = new Date(i.createdAt || i.created_at);
      if (createdAt < windowStart) return false;

      if (rawParams.category && i.category !== rawParams.category) return false;
      if (rawParams.departmentId && (i.departmentId || i.department_id) !== rawParams.departmentId) return false;

      return true;
    });

    rawReports = mockStore.getReports();
  }

  // Count reports per incident
  const reportCountsMap = new Map<string, number>();
  rawReports.forEach((r) => {
    const incId = r.incident_id || r.incidentId;
    if (incId) reportCountsMap.set(incId, (reportCountsMap.get(incId) || 0) + 1);
  });

  // Fetch recurrence signals for spatial correlation
  let recurringIncidentIds = new Set<string>();
  try {
    const recRes = await detectRecurringProblems({ days: 180 });
    recRes.recurrences.forEach((r) => {
      r.incidentIds.forEach((id) => recurringIncidentIds.add(id));
    });
  } catch (err) {
    // Graceful fallback
  }

  const alertItems: EscalationAlertItem[] = [];

  rawIncidents.forEach((i) => {
    const status = i.status as IncidentStatus;
    // Only escalate active issues
    if (status === 'VERIFIED') return;

    const score = Number(i.priority_score ?? i.priorityScore) || 50;
    const tier = getPriorityTierFromScore(score);

    // Extract safety risk from priority factors if available, else derive from score
    const factors = i.priority_factors || i.priorityFactors || {};
    const safetyRiskScore = Number(factors.safetyRisk) || Math.min(100, Math.round(score * 0.95));

    const reportCount = Math.max(1, reportCountsMap.get(i.id) || i.report_count || 1);

    const sla = calculateIncidentSLA(i);
    const recurrenceSignal = recurringIncidentIds.has(i.id);

    const { level, reasons } = calculateEscalationLevel({
      priorityScore: score,
      priorityTier: tier,
      safetyRiskScore,
      reportCount,
      slaState: sla.slaStatus,
      recurrenceSignal,
    });

    // Only include incidents that trigger an escalation level
    if (level === 'NONE') return;

    const category = i.category as IncidentCategory;
    const deptId = i.department_id || i.departmentId || null;
    const deptName = deptId && DEPARTMENT_NAMES[deptId] ? DEPARTMENT_NAMES[deptId] : null;

    alertItems.push({
      incidentId: i.id,
      caseId: i.case_id || i.caseId || `CS-${i.id.slice(0, 6)}`,
      title: i.title || `${category} issue`,
      category,
      categoryLabel: CATEGORY_LABELS[category] || category,
      departmentId: deptId,
      departmentName: deptName,
      priorityTier: tier,
      priorityScore: score,
      safetyRiskScore,
      reportCount,
      slaState: sla.slaStatus,
      recurrenceSignal,
      escalationLevel: level,
      reasons,
      recommendedAction:
        level === 'EMERGENCY_REVIEW'
          ? 'Immediate field inspection & emergency response review required'
          : level === 'URGENT'
          ? 'High priority triage & department assignment acceleration recommended'
          : 'Operational monitoring',
      createdAt: i.created_at || i.createdAt || now.toISOString(),
      isReviewed: Boolean(i.is_escalation_reviewed || i.isEscalationReviewed),
      reviewedAt: i.escalation_reviewed_at || i.escalationReviewedAt || null,
      reviewedBy: i.escalation_reviewed_by || i.escalationReviewedBy || null,
    });
  });

  // Apply Level Filter if provided
  let filteredAlerts = alertItems;
  if (rawParams.level) {
    const filterLevel = rawParams.level.toUpperCase();
    filteredAlerts = alertItems.filter((a) => a.escalationLevel === filterLevel);
  }

  // Sort: EMERGENCY_REVIEW first, URGENT second, WATCH third, then by priority score descending
  const levelOrder: Record<EscalationLevel, number> = {
    EMERGENCY_REVIEW: 1,
    URGENT: 2,
    WATCH: 3,
    NONE: 4,
  };

  filteredAlerts.sort((a, b) => {
    if (levelOrder[a.escalationLevel] !== levelOrder[b.escalationLevel]) {
      return levelOrder[a.escalationLevel] - levelOrder[b.escalationLevel];
    }
    return b.priorityScore - a.priorityScore;
  });

  const summary: EscalationSummary = {
    emergencyReviewCount: alertItems.filter((a) => a.escalationLevel === 'EMERGENCY_REVIEW').length,
    urgentCount: alertItems.filter((a) => a.escalationLevel === 'URGENT').length,
    watchCount: alertItems.filter((a) => a.escalationLevel === 'WATCH').length,
    totalAlerts: alertItems.length,
  };

  return {
    summary,
    alerts: filteredAlerts,
    storageMode: mode as 'mock' | 'supabase',
    generatedAt: new Date().toISOString(),
  };
}
