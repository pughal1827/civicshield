import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { IncidentCategory } from '@/types/incident';
import {
  GeographicPoint,
  RootCauseClassification,
  RootCauseResponse,
  RootCauseSignalItem,
} from './types';
import {
  isValidCoordinates,
  calculateHaversineDistance,
  calculateCentroid,
  calculateMaxRadiusFromCenter,
} from './geographic';
import { detectRecurringProblems } from './recurring';

export const ROOT_CAUSE_CONFIG = {
  DEFAULT_DAYS: 30,
  MIN_DAYS: 1,
  MAX_DAYS: 90,

  DEFAULT_RADIUS_METERS: 250,
  MIN_RADIUS_METERS: 50,
  MAX_RADIUS_METERS: 2000,

  DEFAULT_MIN_INCIDENTS: 3,
  MIN_MIN_INCIDENTS: 2,
  MAX_MIN_INCIDENTS: 100,

  DEFAULT_MIN_SIGNAL_SCORE: 30,
};

export interface RootCauseQueryParams {
  days?: number;
  radius?: number;
  minIncidents?: number;
  minSignalScore?: number;
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

const CATEGORY_COMMON_TITLES: Record<string, string> = {
  ROAD_POTHOLE: 'Possible road-segment maintenance issue',
  GARBAGE: 'Possible sanitation collection issue',
  STREETLIGHT: 'Possible electrical infrastructure issue',
  WATER_LEAKAGE: 'Possible water pipe distribution issue',
  DRAINAGE_BLOCKAGE: 'Possible drainage network issue',
  TRAFFIC_SIGNAL: 'Possible traffic signal control issue',
  PUBLIC_INFRA_DAMAGE: 'Possible public structure integrity issue',
};

const DEPARTMENT_NAMES: Record<string, string> = {
  dept_roads: 'Road Maintenance',
  dept_sanitation: 'Sanitation Department',
  dept_electrical: 'Electrical Works',
  dept_water: 'Water Resources',
  dept_drainage: 'Drainage Department',
  dept_traffic: 'Traffic Management',
};

export function sanitizeRootCauseParams(params: RootCauseQueryParams) {
  let days = Number(params.days) || ROOT_CAUSE_CONFIG.DEFAULT_DAYS;
  days = Math.max(ROOT_CAUSE_CONFIG.MIN_DAYS, Math.min(ROOT_CAUSE_CONFIG.MAX_DAYS, days));

  let radius = Number(params.radius) || ROOT_CAUSE_CONFIG.DEFAULT_RADIUS_METERS;
  radius = Math.max(ROOT_CAUSE_CONFIG.MIN_RADIUS_METERS, Math.min(ROOT_CAUSE_CONFIG.MAX_RADIUS_METERS, radius));

  let minIncidents = Number(params.minIncidents) || ROOT_CAUSE_CONFIG.DEFAULT_MIN_INCIDENTS;
  minIncidents = Math.max(ROOT_CAUSE_CONFIG.MIN_MIN_INCIDENTS, Math.min(ROOT_CAUSE_CONFIG.MAX_MIN_INCIDENTS, minIncidents));

  let minSignalScore = Number(params.minSignalScore) ?? ROOT_CAUSE_CONFIG.DEFAULT_MIN_SIGNAL_SCORE;
  minSignalScore = Math.max(0, Math.min(100, minSignalScore));

  return {
    days,
    radius,
    minIncidents,
    minSignalScore,
    category: params.category,
    departmentId: params.departmentId,
  };
}

/**
 * Calculates deterministic root-cause signal score (0-100).
 */
export function calculateSignalScore(params: {
  incidentCount: number;
  minIncidents: number;
  radiusMeters: number;
  maxRadius: number;
  incidentsInLast48h: number;
  isSameCategory: boolean;
  isRecurringLocation: boolean;
}): { score: number; classification: RootCauseClassification; evidence: string[] } {
  const spatialScore = Math.min(
    100,
    (params.incidentCount / Math.max(1, params.minIncidents)) * 50 +
      Math.max(0, 1 - params.radiusMeters / Math.max(1, params.maxRadius)) * 50
  );

  const temporalScore = Math.min(
    100,
    (params.incidentsInLast48h / Math.max(1, params.incidentCount)) * 100
  );

  const categoryScore = params.isSameCategory ? 100 : 60;
  const recurrenceScore = params.isRecurringLocation ? 100 : 30;

  const rawScore =
    0.35 * spatialScore +
    0.25 * temporalScore +
    0.20 * categoryScore +
    0.20 * recurrenceScore;

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let classification: RootCauseClassification = 'LOW';
  if (score >= 80) classification = 'VERY_STRONG';
  else if (score >= 60) classification = 'STRONG';
  else if (score >= 40) classification = 'MODERATE';

  const evidence: string[] = [];
  evidence.push(`${params.incidentCount} related incidents within ${Math.round(params.radiusMeters)}m area`);
  evidence.push(`Category consistency: ${params.isSameCategory ? 'Same category pattern' : 'Mixed category'}`);
  if (params.incidentsInLast48h > 0) {
    evidence.push(`${params.incidentsInLast48h} incident(s) reported in the last 48 hours`);
  }
  if (params.isRecurringLocation) {
    evidence.push('Matches historical recurring problem cluster location');
  }

  return { score, classification, evidence };
}

/**
 * Detects root-cause signals across active primary incidents.
 */
export async function detectRootCauseSignals(
  rawParams: RootCauseQueryParams = {}
): Promise<RootCauseResponse> {
  const mode = process.env.CIVICSHIELD_STORAGE_MODE || 'mock';
  const params = sanitizeRootCauseParams(rawParams);

  const now = new Date();
  const windowStart = new Date(now.getTime() - params.days * 24 * 60 * 60 * 1000);
  const recent48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  let eligibleIncidents: any[] = [];

  if (mode === 'supabase') {
    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('incidents')
        .select('id, case_id, latitude, longitude, category, priority_score, department_id, status, created_at')
        .is('master_incident_id', null)
        .gte('created_at', windowStart.toISOString());

      if (params.category) query = query.eq('category', params.category);
      if (params.departmentId) query = query.eq('department_id', params.departmentId);

      const { data, error } = await query;
      if (error) throw new Error(`Database query failed for root causes: ${error.message}`);

      eligibleIncidents = (data || [])
        .filter((i) => isValidCoordinates(Number(i.latitude), Number(i.longitude)))
        .map((i) => ({
          id: i.id,
          caseId: i.case_id,
          latitude: Number(i.latitude),
          longitude: Number(i.longitude),
          category: i.category,
          priorityScore: Number(i.priority_score) || 50,
          departmentId: i.department_id,
          status: i.status,
          createdAt: i.created_at,
        }));
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' || process.env.CIVICSHIELD_STORAGE_MODE === 'supabase') {
        console.error('[Root Cause Engine] Supabase Error:', err);
        throw err; // HTTP 503
      }
    }
  } else {
    // Explicit MOCK Mode
    const allIncidents = mockStore.getIncidents();
    eligibleIncidents = allIncidents.filter((i) => {
      if (i.masterIncidentId || i.master_incident_id) return false;
      if (!isValidCoordinates(i.latitude, i.longitude)) return false;

      const createdAt = new Date(i.createdAt || i.created_at);
      if (createdAt < windowStart) return false;

      if (params.category && i.category !== params.category) return false;
      if (params.departmentId && (i.departmentId || i.department_id) !== params.departmentId) return false;

      return true;
    });
  }

  // Fetch recurrence signals for spatial correlation
  let recurringLocations: GeographicPoint[] = [];
  try {
    const recRes = await detectRecurringProblems({ days: 180, radius: params.radius });
    recurringLocations = recRes.recurrences.map((r) => r.center);
  } catch (err) {
    // Graceful fallback
  }

  // Group by category for same-category root cause signals
  const categoryGroups = new Map<string, any[]>();
  eligibleIncidents.forEach((i) => {
    const list = categoryGroups.get(i.category) || [];
    list.push(i);
    categoryGroups.set(i.category, list);
  });

  const signalItems: RootCauseSignalItem[] = [];

  categoryGroups.forEach((items, category) => {
    // Spatial clustering within category
    const clusters: any[][] = [];

    for (let i = 0; i < items.length; i++) {
      const incA = items[i];
      const neighbors: any[] = [incA];

      for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const incB = items[j];

        const dist = calculateHaversineDistance(
          incA.latitude,
          incA.longitude,
          incB.latitude,
          incB.longitude
        );

        if (dist <= params.radius) {
          neighbors.push(incB);
        }
      }

      if (neighbors.length >= params.minIncidents) {
        clusters.push(neighbors);
      }
    }

    // Merge overlapping clusters
    const mergedClusters: any[][] = [];
    const processedIndices = new Set<number>();

    for (let i = 0; i < clusters.length; i++) {
      if (processedIndices.has(i)) continue;

      const currentMap = new Map<string, any>();
      clusters[i].forEach((item) => currentMap.set(item.id, item));
      processedIndices.add(i);

      let expanded = true;
      while (expanded) {
        expanded = false;
        for (let j = 0; j < clusters.length; j++) {
          if (processedIndices.has(j)) continue;

          const candidateCluster = clusters[j];
          const hasOverlap = candidateCluster.some((item) => currentMap.has(item.id));

          if (hasOverlap) {
            candidateCluster.forEach((item) => currentMap.set(item.id, item));
            processedIndices.add(j);
            expanded = true;
          }
        }
      }

      mergedClusters.push(Array.from(currentMap.values()));
    }

    // Generate RootCauseSignalItem for each cluster
    for (const cluster of mergedClusters) {
      const points: GeographicPoint[] = cluster.map((i) => ({
        latitude: i.latitude,
        longitude: i.longitude,
      }));

      const center = calculateCentroid(points);
      const radiusMeters = calculateMaxRadiusFromCenter(center, points);

      const sortedByTime = [...cluster].sort(
        (a, b) => new Date(a.createdAt || a.created_at).getTime() - new Date(b.createdAt || b.created_at).getTime()
      );

      const firstOccurrence = sortedByTime[0].createdAt || sortedByTime[0].created_at;
      const latestOccurrence = sortedByTime[sortedByTime.length - 1].createdAt || sortedByTime[sortedByTime.length - 1].created_at;

      const incidentsInLast48h = cluster.filter((i) => new Date(i.createdAt || i.created_at) >= recent48h).length;

      // Check if near a known recurring location
      const isRecurringLocation = recurringLocations.some(
        (loc) => calculateHaversineDistance(center.latitude, center.longitude, loc.latitude, loc.longitude) <= params.radius
      );

      const { score, classification, evidence } = calculateSignalScore({
        incidentCount: cluster.length,
        minIncidents: params.minIncidents,
        radiusMeters,
        maxRadius: params.radius,
        incidentsInLast48h,
        isSameCategory: true,
        isRecurringLocation,
      });

      if (score < params.minSignalScore) continue;

      const title = CATEGORY_COMMON_TITLES[category] || `Possible common ${category} issue`;
      const deptId = cluster[0]?.departmentId || cluster[0]?.department_id || null;
      const deptName = deptId && DEPARTMENT_NAMES[deptId] ? DEPARTMENT_NAMES[deptId] : null;

      const deterministicId = `sig_${category}_${center.latitude.toFixed(4)}_${center.longitude.toFixed(4)}_${Math.round(radiusMeters || params.radius)}`;

      signalItems.push({
        signalId: deterministicId,
        category: category as IncidentCategory,
        categoryLabel: CATEGORY_LABELS[category] || category,
        title,
        departmentId: deptId,
        departmentName: deptName,
        center,
        radiusMeters: Math.round(radiusMeters),
        incidentCount: cluster.length,
        relatedIncidentIds: cluster.map((i) => i.id),
        firstOccurrence,
        latestOccurrence,
        signalScore: score,
        classification,
        evidence,
        recommendedAction: 'Field verification recommended',
        requiresFieldVerification: true,
      });
    }
  });

  signalItems.sort((a, b) => b.signalScore - a.signalScore);

  const totalAffectedIncidents = signalItems.reduce((sum, s) => sum + s.incidentCount, 0);

  return {
    signals: signalItems,
    config: {
      days: params.days,
      radiusMeters: params.radius,
      minIncidents: params.minIncidents,
      minSignalScore: params.minSignalScore,
    },
    totalSignals: signalItems.length,
    totalAffectedIncidents,
    storageMode: mode as 'mock' | 'supabase',
    generatedAt: new Date().toISOString(),
  };
}
