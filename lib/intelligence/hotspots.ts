import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';
import { IncidentCategory, IncidentStatus } from '@/types/incident';
import {
  GeographicPoint,
  HotspotCategoryBreakdown,
  HotspotDepartmentInfo,
  HotspotItem,
  HotspotsResponse,
  HotspotSeverity,
  DetectionStrength,
} from './types';
import {
  isValidCoordinates,
  calculateHaversineDistance,
  calculateCentroid,
  calculateMaxRadiusFromCenter,
} from './geographic';
import { calculateTrendMetrics } from './trends';
import { getTimeWindow } from './time-windows';

export const HOTSPOT_CONFIG = {
  DEFAULT_TIME_WINDOW_DAYS: 7,
  MIN_TIME_WINDOW_DAYS: 1,
  MAX_TIME_WINDOW_DAYS: 90,

  DEFAULT_RADIUS_METERS: 500,
  MIN_RADIUS_METERS: 50,
  MAX_RADIUS_METERS: 2000,

  DEFAULT_MIN_INCIDENTS: 3,
  MIN_MIN_INCIDENTS: 2,
  MAX_MIN_INCIDENTS: 100,

  ACTIVE_STATUSES: [
    'SUBMITTED',
    'AI_ANALYSED',
    'ASSIGNED',
    'IN_PROGRESS',
    'CITIZEN_VERIFICATION',
  ] as IncidentStatus[],
};

export interface HotspotQueryParams {
  days?: number;
  radius?: number;
  minIncidents?: number;
  category?: string;
  priority?: string;
  departmentId?: string;
}

interface InternalIncident {
  id: string;
  case_id: string;
  latitude: number;
  longitude: number;
  category: IncidentCategory;
  priority_score: number;
  department_id?: string | null;
  status: IncidentStatus;
  created_at: string;
  report_count: number;
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
 * Validates and sanitizes hotspot parameters.
 */
export function sanitizeHotspotParams(params: HotspotQueryParams) {
  let days = Number(params.days) || HOTSPOT_CONFIG.DEFAULT_TIME_WINDOW_DAYS;
  days = Math.max(HOTSPOT_CONFIG.MIN_TIME_WINDOW_DAYS, Math.min(HOTSPOT_CONFIG.MAX_TIME_WINDOW_DAYS, days));

  let radius = Number(params.radius) || HOTSPOT_CONFIG.DEFAULT_RADIUS_METERS;
  radius = Math.max(HOTSPOT_CONFIG.MIN_RADIUS_METERS, Math.min(HOTSPOT_CONFIG.MAX_RADIUS_METERS, radius));

  let minIncidents = Number(params.minIncidents) || HOTSPOT_CONFIG.DEFAULT_MIN_INCIDENTS;
  minIncidents = Math.max(HOTSPOT_CONFIG.MIN_MIN_INCIDENTS, Math.min(HOTSPOT_CONFIG.MAX_MIN_INCIDENTS, minIncidents));

  return {
    days,
    radius,
    minIncidents,
    category: params.category,
    priority: params.priority,
    departmentId: params.departmentId,
  };
}

/**
 * Detects civic hotspots using spatial clustering on active master incidents.
 */
export async function detectCivicHotspots(
  rawParams: HotspotQueryParams = {}
): Promise<HotspotsResponse> {
  const mode = process.env.CIVICSHIELD_STORAGE_MODE || 'mock';
  const params = sanitizeHotspotParams(rawParams);

  const now = new Date();
  const currentStart = new Date(now.getTime() - params.days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 2 * params.days * 24 * 60 * 60 * 1000);

  let currentIncidents: InternalIncident[] = [];
  let previousIncidents: InternalIncident[] = [];

  if (mode === 'supabase') {
    try {
      const supabase = createAdminClient();

      // Query active current period primary master incidents
      let currentQuery = supabase
        .from('incidents')
        .select('id, case_id, latitude, longitude, category, priority_score, department_id, status, created_at')
        .is('master_incident_id', null)
        .in('status', HOTSPOT_CONFIG.ACTIVE_STATUSES)
        .gte('created_at', currentStart.toISOString());

      if (params.category) currentQuery = currentQuery.eq('category', params.category);
      if (params.departmentId) currentQuery = currentQuery.eq('department_id', params.departmentId);

      const { data: currData, error: currErr } = await currentQuery;
      if (currErr) {
        throw new Error(`Database query failed for current incidents: ${currErr.message}`);
      }

      // Query reports count for each incident
      const incidentIds = (currData || []).map((i) => i.id);
      const reportCountsMap = new Map<string, number>();

      if (incidentIds.length > 0) {
        const { data: reportData } = await supabase
          .from('reports')
          .select('incident_id')
          .in('incident_id', incidentIds);

        if (reportData) {
          reportData.forEach((r: any) => {
            if (r.incident_id) {
              reportCountsMap.set(r.incident_id, (reportCountsMap.get(r.incident_id) || 0) + 1);
            }
          });
        }
      }

      currentIncidents = (currData || [])
        .filter((i) => isValidCoordinates(Number(i.latitude), Number(i.longitude)))
        .map((i) => ({
          id: i.id,
          case_id: i.case_id,
          latitude: Number(i.latitude),
          longitude: Number(i.longitude),
          category: i.category as IncidentCategory,
          priority_score: Number(i.priority_score) || 0,
          department_id: i.department_id,
          status: i.status as IncidentStatus,
          created_at: i.created_at,
          report_count: Math.max(1, reportCountsMap.get(i.id) || 1),
        }));

      // Query previous period primary incidents for trend calculation
      let prevQuery = supabase
        .from('incidents')
        .select('id, case_id, latitude, longitude, created_at')
        .is('master_incident_id', null)
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', currentStart.toISOString());

      const { data: prevData, error: prevErr } = await prevQuery;
      if (prevErr) {
        throw new Error(`Database query failed for previous incidents: ${prevErr.message}`);
      }

      previousIncidents = (prevData || [])
        .filter((i) => isValidCoordinates(Number(i.latitude), Number(i.longitude)))
        .map((i) => ({
          id: i.id,
          case_id: i.case_id,
          latitude: Number(i.latitude),
          longitude: Number(i.longitude),
          category: '' as any,
          priority_score: 0,
          status: '' as any,
          created_at: i.created_at,
          report_count: 1,
        }));
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production' || process.env.CIVICSHIELD_STORAGE_MODE === 'supabase') {
        console.error('[Hotspot Engine] Supabase Database Error:', err);
        throw err; // Will trigger 503 Service Unavailable
      }
    }
  } else {
    // Explicit MOCK / DEMO Mode
    const allIncidents = mockStore.getIncidents();
    const allReports = mockStore.getReports();

    const reportCountsMap = new Map<string, number>();
    allReports.forEach((r) => {
      if (r.incidentId) {
        reportCountsMap.set(r.incidentId, (reportCountsMap.get(r.incidentId) || 0) + 1);
      }
    });

    currentIncidents = allIncidents
      .filter((i) => {
        if (i.masterIncidentId) return false;
        if (!HOTSPOT_CONFIG.ACTIVE_STATUSES.includes(i.status as IncidentStatus)) return false;
        if (!isValidCoordinates(i.latitude, i.longitude)) return false;

        const createdAt = new Date(i.createdAt);
        if (createdAt < currentStart) return false;

        if (params.category && i.category !== params.category) return false;
        if (params.departmentId && i.departmentId !== params.departmentId) return false;

        return true;
      })
      .map((i) => ({
        id: i.id,
        case_id: i.caseId,
        latitude: i.latitude,
        longitude: i.longitude,
        category: i.category as IncidentCategory,
        priority_score: i.priorityScore || 0,
        department_id: i.departmentId,
        status: i.status as IncidentStatus,
        created_at: i.createdAt,
        report_count: Math.max(1, reportCountsMap.get(i.id) || 1),
      }));

    previousIncidents = allIncidents
      .filter((i) => {
        if (i.masterIncidentId) return false;
        if (!isValidCoordinates(i.latitude, i.longitude)) return false;
        const createdAt = new Date(i.createdAt);
        return createdAt >= previousStart && createdAt < currentStart;
      })
      .map((i) => ({
        id: i.id,
        case_id: i.caseId,
        latitude: i.latitude,
        longitude: i.longitude,
        category: i.category as IncidentCategory,
        priority_score: i.priorityScore || 0,
        status: i.status as IncidentStatus,
        created_at: i.createdAt,
        report_count: 1,
      }));
  }

  // Perform Density-based spatial clustering
  const clusters: InternalIncident[][] = [];

  for (let i = 0; i < currentIncidents.length; i++) {
    const incA = currentIncidents[i];
    const neighbors: InternalIncident[] = [incA];

    for (let j = 0; j < currentIncidents.length; j++) {
      if (i === j) continue;
      const incB = currentIncidents[j];

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

  // Merge overlapping clusters (clusters sharing incidents or with close centroids)
  const mergedClusters: InternalIncident[][] = [];
  const processedIndices = new Set<number>();

  for (let i = 0; i < clusters.length; i++) {
    if (processedIndices.has(i)) continue;

    let currentGroupMap = new Map<string, InternalIncident>();
    clusters[i].forEach((item) => currentGroupMap.set(item.id, item));
    processedIndices.add(i);

    let expanded = true;
    while (expanded) {
      expanded = false;
      for (let j = 0; j < clusters.length; j++) {
        if (processedIndices.has(j)) continue;

        const candidateCluster = clusters[j];
        const hasOverlap = candidateCluster.some((item) => currentGroupMap.has(item.id));

        if (hasOverlap) {
          candidateCluster.forEach((item) => currentGroupMap.set(item.id, item));
          processedIndices.add(j);
          expanded = true;
        }
      }
    }

    mergedClusters.push(Array.from(currentGroupMap.values()));
  }

  // Build HotspotItems from merged clusters
  const hotspotItems: HotspotItem[] = [];
  const timeWindowInfo = getTimeWindow('last7Days');

  for (const cluster of mergedClusters) {
    const points: GeographicPoint[] = cluster.map((i) => ({
      latitude: i.latitude,
      longitude: i.longitude,
    }));

    const center = calculateCentroid(points);
    const radiusMeters = calculateMaxRadiusFromCenter(center, points);

    const incidentCount = cluster.length;
    const citizenReportCount = cluster.reduce((sum, item) => sum + item.report_count, 0);

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    const categoryMap = new Map<string, number>();
    const departmentMap = new Map<string, number>();

    cluster.forEach((item) => {
      if (item.priority_score >= 80) criticalCount++;
      else if (item.priority_score >= 60) highCount++;
      else if (item.priority_score >= 40) mediumCount++;
      else lowCount++;

      if (item.category) {
        categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
      }

      if (item.department_id) {
        departmentMap.set(item.department_id, (departmentMap.get(item.department_id) || 0) + 1);
      }
    });

    // Top Categories
    const topCategories: HotspotCategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([cat, count]) => ({
        category: cat as IncidentCategory,
        categoryLabel: CATEGORY_LABELS[cat] || cat,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Top Department
    let topDepartment: HotspotDepartmentInfo | null = null;
    let maxDeptCount = 0;
    let topDeptId = '';

    departmentMap.forEach((cnt, deptId) => {
      if (cnt > maxDeptCount) {
        maxDeptCount = cnt;
        topDeptId = deptId;
      }
    });

    if (topDeptId && DEPARTMENT_NAMES[topDeptId]) {
      topDepartment = {
        departmentId: topDeptId,
        departmentCode: DEPARTMENT_NAMES[topDeptId].code,
        departmentName: DEPARTMENT_NAMES[topDeptId].name,
        count: maxDeptCount,
      };
    }

    // Determine Hotspot Type
    let hotspotType = 'MIXED_CIVIC_HOTSPOT';
    if (topCategories.length > 0 && topCategories[0].count >= Math.ceil(incidentCount * 0.5)) {
      hotspotType = `${topCategories[0].category}_HOTSPOT`;
    }

    // Determine Hotspot Severity
    let hotspotSeverity: HotspotSeverity = 'MEDIUM';
    if (criticalCount >= 2 || (criticalCount >= 1 && incidentCount >= 5)) {
      hotspotSeverity = 'CRITICAL';
    } else if (highCount + criticalCount >= 2 || incidentCount >= 5) {
      hotspotSeverity = 'HIGH';
    } else if (incidentCount < params.minIncidents) {
      hotspotSeverity = 'LOW';
    }

    // Determine Detection Strength
    let detectionStrength: DetectionStrength = 'MODERATE';
    if (incidentCount >= 5 || (incidentCount >= 3 && criticalCount >= 1)) {
      detectionStrength = 'STRONG';
    } else if (incidentCount < 3) {
      detectionStrength = 'EMERGING';
    }

    // Previous period trend comparison for this hotspot location
    const previousPeriodCount = previousIncidents.filter((prevItem) => {
      const dist = calculateHaversineDistance(
        center.latitude,
        center.longitude,
        prevItem.latitude,
        prevItem.longitude
      );
      return dist <= (radiusMeters || params.radius);
    }).length;

    const trend = calculateTrendMetrics(incidentCount, previousPeriodCount);

    const deterministicId = `hs_${center.latitude.toFixed(4)}_${center.longitude.toFixed(4)}_${Math.round(radiusMeters || params.radius)}`;

    hotspotItems.push({
      id: deterministicId,
      center,
      radiusMeters,
      incidentCount,
      citizenReportCount,
      activeCount: incidentCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      topCategories,
      topDepartment,
      hotspotType,
      hotspotSeverity,
      detectionStrength,
      trend,
      timeWindow: timeWindowInfo,
      incidentIds: cluster.map((i) => i.id),
    });
  }

  // Sort hotspots by incident count descending
  hotspotItems.sort((a, b) => b.incidentCount - a.incidentCount);

  const totalClusteredIncidents = hotspotItems.reduce((sum, h) => sum + h.incidentCount, 0);
  const totalClusteredReports = hotspotItems.reduce((sum, h) => sum + h.citizenReportCount, 0);

  return {
    hotspots: hotspotItems,
    config: {
      timeWindowDays: params.days,
      radiusMeters: params.radius,
      minIncidents: params.minIncidents,
    },
    totalHotspots: hotspotItems.length,
    totalClusteredIncidents,
    totalClusteredReports,
    storageMode: mode as 'mock' | 'supabase',
    generatedAt: new Date().toISOString(),
  };
}
