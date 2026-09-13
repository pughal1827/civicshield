import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { IncidentCategory, IncidentStatus } from '@/types/incident';
import {
  GeographicPoint,
  RecurrenceItem,
  RecurrenceStrength,
  RecurringResponse,
} from './types';
import {
  isValidCoordinates,
  calculateHaversineDistance,
  calculateCentroid,
  calculateMaxRadiusFromCenter,
} from './geographic';
import { calculateTrendMetrics } from './trends';

export const RECURRENCE_CONFIG = {
  DEFAULT_LOOKBACK_DAYS: 180,
  MIN_LOOKBACK_DAYS: 30,
  MAX_LOOKBACK_DAYS: 365,

  DEFAULT_RADIUS_METERS: 250,
  MIN_RADIUS_METERS: 50,
  MAX_RADIUS_METERS: 1000,

  DEFAULT_MIN_OCCURRENCES: 3,
  MIN_MIN_OCCURRENCES: 2,
  MAX_MIN_OCCURRENCES: 50,
};

export interface RecurrenceQueryParams {
  days?: number;
  radius?: number;
  minOccurrences?: number;
  category?: string;
}

interface HistoricalIncident {
  id: string;
  case_id: string;
  latitude: number;
  longitude: number;
  category: IncidentCategory;
  status: IncidentStatus;
  created_at: string;
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

const ACTIVE_STATUSES = [
  'SUBMITTED',
  'AI_ANALYSED',
  'ASSIGNED',
  'IN_PROGRESS',
  'CITIZEN_VERIFICATION',
];

/**
 * Validates and sanitizes recurrence parameters.
 */
export function sanitizeRecurrenceParams(params: RecurrenceQueryParams) {
  let days = Number(params.days) || RECURRENCE_CONFIG.DEFAULT_LOOKBACK_DAYS;
  days = Math.max(
    RECURRENCE_CONFIG.MIN_LOOKBACK_DAYS,
    Math.min(RECURRENCE_CONFIG.MAX_LOOKBACK_DAYS, days)
  );

  let radius = Number(params.radius) || RECURRENCE_CONFIG.DEFAULT_RADIUS_METERS;
  radius = Math.max(
    RECURRENCE_CONFIG.MIN_RADIUS_METERS,
    Math.min(RECURRENCE_CONFIG.MAX_RADIUS_METERS, radius)
  );

  let minOccurrences = Number(params.minOccurrences) || RECURRENCE_CONFIG.DEFAULT_MIN_OCCURRENCES;
  minOccurrences = Math.max(
    RECURRENCE_CONFIG.MIN_MIN_OCCURRENCES,
    Math.min(RECURRENCE_CONFIG.MAX_MIN_OCCURRENCES, minOccurrences)
  );

  return {
    days,
    radius,
    minOccurrences,
    category: params.category,
  };
}

/**
 * Detects recurring civic problems using spatial lookback on same-category primary incidents.
 */
export async function detectRecurringProblems(
  rawParams: RecurrenceQueryParams = {}
): Promise<RecurringResponse> {
  const mode = process.env.CIVICSHIELD_STORAGE_MODE || 'mock';
  const params = sanitizeRecurrenceParams(rawParams);

  const now = new Date();
  const lookbackStart = new Date(now.getTime() - params.days * 24 * 60 * 60 * 1000);
  const midPoint = new Date(now.getTime() - (params.days / 2) * 24 * 60 * 60 * 1000);

  let eligibleIncidents: HistoricalIncident[] = [];

  if (mode === 'supabase') {
    try {
      const supabase = createAdminClient();

      let query = supabase
        .from('incidents')
        .select('id, case_id, latitude, longitude, category, status, created_at')
        .is('master_incident_id', null)
        .gte('created_at', lookbackStart.toISOString());

      if (params.category) query = query.eq('category', params.category);

      const { data, error } = await query;
      if (error) {
        throw new Error(`Database query failed for recurrence: ${error.message}`);
      }

      eligibleIncidents = (data || [])
        .filter((i) => isValidCoordinates(Number(i.latitude), Number(i.longitude)))
        .map((i) => ({
          id: i.id,
          case_id: i.case_id,
          latitude: Number(i.latitude),
          longitude: Number(i.longitude),
          category: i.category as IncidentCategory,
          status: i.status as IncidentStatus,
          created_at: i.created_at,
        }));
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' || process.env.CIVICSHIELD_STORAGE_MODE === 'supabase') {
        console.error('[Recurrence Engine] Database Error:', err);
        throw err; // Triggers 503 Service Unavailable
      }
    }
  } else {
    // Explicit MOCK / DEMO Mode
    const allIncidents = mockStore.getIncidents();

    eligibleIncidents = allIncidents
      .filter((i) => {
        if (i.masterIncidentId || i.master_incident_id) return false;
        if (!isValidCoordinates(i.latitude, i.longitude)) return false;

        const createdAt = new Date(i.createdAt || i.created_at);
        if (createdAt < lookbackStart) return false;

        if (params.category && i.category !== params.category) return false;

        return true;
      })
      .map((i) => ({
        id: i.id,
        case_id: i.caseId || i.case_id,
        latitude: i.latitude,
        longitude: i.longitude,
        category: i.category as IncidentCategory,
        status: i.status as IncidentStatus,
        created_at: i.createdAt || i.created_at,
      }));
  }

  // Group by category first (same-category recurrence matching)
  const categoryGroups = new Map<string, HistoricalIncident[]>();
  eligibleIncidents.forEach((i) => {
    const list = categoryGroups.get(i.category) || [];
    list.push(i);
    categoryGroups.set(i.category, list);
  });

  const recurrenceItems: RecurrenceItem[] = [];

  categoryGroups.forEach((items, category) => {
    // Spatial clustering within category
    const clusters: HistoricalIncident[][] = [];

    for (let i = 0; i < items.length; i++) {
      const incA = items[i];
      const neighbors: HistoricalIncident[] = [incA];

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

      if (neighbors.length >= params.minOccurrences) {
        clusters.push(neighbors);
      }
    }

    // Merge overlapping clusters
    const mergedClusters: HistoricalIncident[][] = [];
    const processedIndices = new Set<number>();

    for (let i = 0; i < clusters.length; i++) {
      if (processedIndices.has(i)) continue;

      const currentMap = new Map<string, HistoricalIncident>();
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

    // Process merged clusters into RecurrenceItems
    for (const cluster of mergedClusters) {
      const points: GeographicPoint[] = cluster.map((i) => ({
        latitude: i.latitude,
        longitude: i.longitude,
      }));

      const center = calculateCentroid(points);
      const radiusMeters = calculateMaxRadiusFromCenter(center, points);

      // Sort by created_at ascending
      const sortedByTime = [...cluster].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const firstOccurrence = sortedByTime[0].created_at;
      const lastOccurrence = sortedByTime[sortedByTime.length - 1].created_at;

      const daysSinceLastOccurrence = Math.max(
        0,
        Math.floor((now.getTime() - new Date(lastOccurrence).getTime()) / (1000 * 60 * 60 * 24))
      );

      const occurrenceCount = cluster.length;

      let averageDaysBetweenOccurrences = 0;
      if (occurrenceCount > 1) {
        const totalSpanMs =
          new Date(lastOccurrence).getTime() - new Date(firstOccurrence).getTime();
        const totalSpanDays = totalSpanMs / (1000 * 60 * 60 * 24);
        averageDaysBetweenOccurrences = Math.round(totalSpanDays / (occurrenceCount - 1));
      }

      let activeOccurrenceCount = 0;
      let resolvedOccurrenceCount = 0;
      let verifiedOccurrenceCount = 0;

      cluster.forEach((item) => {
        if (ACTIVE_STATUSES.includes(item.status)) activeOccurrenceCount++;
        else if (item.status === 'RESOLVED') resolvedOccurrenceCount++;
        else if (item.status === 'VERIFIED') verifiedOccurrenceCount++;
      });

      // Recurrence strength formula
      let recurrenceStrength: RecurrenceStrength = 'MODERATE';
      if (occurrenceCount >= 4 || daysSinceLastOccurrence <= 30) {
        recurrenceStrength = 'STRONG';
      } else if (occurrenceCount < params.minOccurrences) {
        recurrenceStrength = 'LOW';
      }

      // Period-over-Period trend: recent half vs previous half of lookback window
      const recentCount = cluster.filter((i) => new Date(i.created_at) >= midPoint).length;
      const prevCount = cluster.filter(
        (i) => new Date(i.created_at) >= lookbackStart && new Date(i.created_at) < midPoint
      ).length;

      const trend = calculateTrendMetrics(recentCount, prevCount);

      const deterministicId = `rec_${category}_${center.latitude.toFixed(4)}_${center.longitude.toFixed(4)}_${Math.round(radiusMeters || params.radius)}`;

      recurrenceItems.push({
        recurrenceId: deterministicId,
        center,
        radiusMeters,
        category: category as IncidentCategory,
        categoryLabel: CATEGORY_LABELS[category] || category,
        occurrenceCount,
        firstOccurrence,
        lastOccurrence,
        daysSinceLastOccurrence,
        activeOccurrenceCount,
        resolvedOccurrenceCount,
        verifiedOccurrenceCount,
        averageDaysBetweenOccurrences,
        trend,
        recurrenceStrength,
        incidentIds: cluster.map((i) => i.id),
      });
    }
  });

  recurrenceItems.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

  const totalAffectedIncidents = recurrenceItems.reduce((sum, r) => sum + r.occurrenceCount, 0);

  return {
    recurrences: recurrenceItems,
    config: {
      lookbackDays: params.days,
      radiusMeters: params.radius,
      minOccurrences: params.minOccurrences,
    },
    totalRecurringProblems: recurrenceItems.length,
    totalAffectedIncidents,
    storageMode: mode as 'mock' | 'supabase',
    generatedAt: new Date().toISOString(),
  };
}
