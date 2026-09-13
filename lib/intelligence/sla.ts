import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { IncidentCategory, IncidentStatus } from '@/types/incident';
import {
  IncidentSLAItem,
  SLAResponse,
  SLAStatus,
  SLASummary,
} from './types';

export const SLA_CONFIG = {
  TARGET_HOURS: {
    CRITICAL: 4,
    HIGH: 24,
    MEDIUM: 72,
    LOW: 168,
  },
  AT_RISK_THRESHOLD_PERCENT: 25,
};

export interface SLAQueryParams {
  status?: string;
  priority?: string;
  departmentId?: string;
  slaStatus?: string;
  category?: string;
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

const DEPARTMENT_NAMES: Record<string, { code: string; name: string }> = {
  dept_roads: { code: 'PWD_ROAD', name: 'Road Maintenance' },
  dept_sanitation: { code: 'SAN_DEPT', name: 'Sanitation Department' },
  dept_electrical: { code: 'ELEC_DEPT', name: 'Electrical Works' },
  dept_water: { code: 'WATER_DEPT', name: 'Water Resources' },
  dept_drainage: { code: 'DRAIN_DEPT', name: 'Drainage Department' },
  dept_traffic: { code: 'TRAFF_DEPT', name: 'Traffic Management' },
};

/**
 * Calculates priority tier from priority score if not explicitly present.
 */
export function getPriorityTierFromScore(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * Computes individual incident SLA metrics deterministically.
 */
export function calculateIncidentSLA(incident: {
  id: string;
  case_id?: string;
  caseId?: string;
  title?: string;
  category: string;
  priority_tier?: string;
  priorityTier?: string;
  priority_score?: number;
  priorityScore?: number;
  department_id?: string | null;
  departmentId?: string | null;
  status: string;
  assigned_at?: string | null;
  assignedAt?: string | null;
  created_at?: string;
  createdAt?: string;
}): IncidentSLAItem {
  const now = new Date();

  const caseId = incident.case_id || incident.caseId || `CS-${incident.id.slice(0, 6)}`;
  const title = incident.title || `${incident.category} issue`;
  const category = incident.category as IncidentCategory;

  const score = incident.priority_score ?? incident.priorityScore ?? 50;
  const rawTier = (incident.priority_tier || incident.priorityTier || '').toUpperCase();
  const priorityTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
    rawTier === 'CRITICAL' || rawTier === 'HIGH' || rawTier === 'MEDIUM' || rawTier === 'LOW'
      ? rawTier
      : getPriorityTierFromScore(score);

  const deptId = incident.department_id || incident.departmentId || null;
  const deptInfo = deptId && DEPARTMENT_NAMES[deptId] ? DEPARTMENT_NAMES[deptId] : null;

  const status = incident.status as IncidentStatus;

  // 1. Determine SLA Start Timestamp (Prefer assigned_at; Fallback to created_at)
  const rawAssignedAt = incident.assigned_at || incident.assignedAt;
  const rawCreatedAt = incident.created_at || incident.createdAt || now.toISOString();
  const slaStartIso = rawAssignedAt || rawCreatedAt;
  const slaStart = new Date(slaStartIso);

  // 2. SLA Target Duration
  const targetHours = SLA_CONFIG.TARGET_HOURS[priorityTier] || 72;
  const totalDurationMs = targetHours * 3600 * 1000;
  const deadline = new Date(slaStart.getTime() + totalDurationMs);

  const totalDurationSeconds = targetHours * 3600;
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - slaStart.getTime()) / 1000));

  // 3. Excluded completed states
  if (status === 'VERIFIED') {
    return {
      incidentId: incident.id,
      caseId,
      title,
      category,
      categoryLabel: CATEGORY_LABELS[category] || category,
      priorityTier,
      priorityScore: score,
      departmentId: deptId,
      departmentName: deptInfo?.name || null,
      departmentCode: deptInfo?.code || null,
      status,
      slaStart: slaStart.toISOString(),
      deadline: deadline.toISOString(),
      targetHours,
      elapsedSeconds,
      remainingSeconds: 0,
      progressPercent: 100,
      slaStatus: 'NOT_APPLICABLE',
    };
  }

  // 4. Calculate SLA status, remaining time & progress percent
  let remainingSeconds = 0;
  let progressPercent = 100;
  let slaStatus: SLAStatus = 'ON_TRACK';

  if (now.getTime() >= deadline.getTime() || elapsedSeconds >= totalDurationSeconds) {
    slaStatus = 'BREACHED';
    remainingSeconds = 0;
    progressPercent = 100;
  } else {
    remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);
    const rawProgress = (elapsedSeconds / totalDurationSeconds) * 100;
    progressPercent = Math.min(100, Math.max(0, Math.round(rawProgress)));

    const remainingPercent = (remainingSeconds / totalDurationSeconds) * 100;
    if (remainingPercent <= SLA_CONFIG.AT_RISK_THRESHOLD_PERCENT) {
      slaStatus = 'AT_RISK';
    } else {
      slaStatus = 'ON_TRACK';
    }
  }

  return {
    incidentId: incident.id,
    caseId,
    title,
    category,
    categoryLabel: CATEGORY_LABELS[category] || category,
    priorityTier,
    priorityScore: score,
    departmentId: deptId,
    departmentName: deptInfo?.name || null,
    departmentCode: deptInfo?.code || null,
    status,
    slaStart: slaStart.toISOString(),
    deadline: deadline.toISOString(),
    targetHours,
    elapsedSeconds,
    remainingSeconds,
    progressPercent,
    slaStatus,
  };
}

/**
 * Executes SLA monitoring queries across active/primary incidents.
 */
export async function getSLAMonitoring(rawParams: SLAQueryParams = {}): Promise<SLAResponse> {
  const mode = process.env.CIVICSHIELD_STORAGE_MODE || 'mock';

  let rawIncidents: any[] = [];

  if (mode === 'supabase') {
    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('incidents')
        .select('id, case_id, title, category, priority_tier, priority_score, department_id, status, assigned_at, created_at')
        .is('master_incident_id', null);

      if (rawParams.status) query = query.eq('status', rawParams.status);
      if (rawParams.category) query = query.eq('category', rawParams.category);
      if (rawParams.departmentId) query = query.eq('department_id', rawParams.departmentId);

      const { data, error } = await query;
      if (error) {
        throw new Error(`Database query failed for SLA monitoring: ${error.message}`);
      }

      rawIncidents = data || [];
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' || process.env.CIVICSHIELD_STORAGE_MODE === 'supabase') {
        console.error('[SLA Monitoring Engine] Database Error:', err);
        throw err; // Triggers 503 Service Unavailable
      }
    }
  } else {
    // Explicit MOCK / DEMO Mode
    const allIncidents = mockStore.getIncidents();

    rawIncidents = allIncidents.filter((i) => {
      if (i.masterIncidentId || i.master_incident_id) return false;
      if (rawParams.status && i.status !== rawParams.status) return false;
      if (rawParams.category && i.category !== rawParams.category) return false;
      if (rawParams.departmentId && (i.departmentId || i.department_id) !== rawParams.departmentId) return false;
      return true;
    });
  }

  // Compute SLA for each incident
  let slaItems: IncidentSLAItem[] = rawIncidents.map((i) => calculateIncidentSLA(i));

  // Apply Priority filter
  if (rawParams.priority) {
    const filterPrio = rawParams.priority.toUpperCase();
    slaItems = slaItems.filter((item) => item.priorityTier === filterPrio);
  }

  // Apply SLA Status filter
  if (rawParams.slaStatus) {
    const filterSla = rawParams.slaStatus.toUpperCase();
    slaItems = slaItems.filter((item) => item.slaStatus === filterSla);
  }

  // Sort: BREACHED first, AT_RISK second, ON_TRACK third, NOT_APPLICABLE last
  const statusOrder: Record<SLAStatus, number> = {
    BREACHED: 1,
    AT_RISK: 2,
    ON_TRACK: 3,
    NOT_APPLICABLE: 4,
  };

  slaItems.sort((a, b) => {
    if (statusOrder[a.slaStatus] !== statusOrder[b.slaStatus]) {
      return statusOrder[a.slaStatus] - statusOrder[b.slaStatus];
    }
    return a.remainingSeconds - b.remainingSeconds;
  });

  const summary: SLASummary = {
    totalTracked: slaItems.length,
    onTrack: slaItems.filter((i) => i.slaStatus === 'ON_TRACK').length,
    atRisk: slaItems.filter((i) => i.slaStatus === 'AT_RISK').length,
    breached: slaItems.filter((i) => i.slaStatus === 'BREACHED').length,
    notApplicable: slaItems.filter((i) => i.slaStatus === 'NOT_APPLICABLE').length,
  };

  return {
    summary,
    incidents: slaItems,
    storageMode: mode as 'mock' | 'supabase',
    generatedAt: new Date().toISOString(),
  };
}
