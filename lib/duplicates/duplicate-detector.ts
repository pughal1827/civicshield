import { mockStore } from '@/lib/db/mock-store';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { getStorageConfig } from '@/lib/db/storage-config';
import { IncidentStatus } from '@/types/incident';

export interface DuplicateCandidateMatch {
  targetIncidentId: string;
  candidateIncidentId: string;
  targetCaseId: string;
  semanticSimilarity: number;
  distanceMeters: number;
  geoScore: number;
  combinedScore: number;
  hasSemanticMatch: boolean;
}

export interface EvaluateDuplicateInputs {
  candidateIncidentId: string;
  latitude: number;
  longitude: number;
  category: string;
  embeddingVector?: number[] | null;
  maxRadiusMeters?: number; // Default: 100m
}

export interface ClusteringMatchResult {
  isClusterMatch: boolean;
  masterIncident: any | null;
  distanceMeters: number;
  clusterScore: number;
  reason: string;
}

// Active incident statuses eligible for clustering (Excludes RESOLVED & VERIFIED)
const ACTIVE_STATUSES: IncidentStatus[] = [
  'SUBMITTED',
  'AI_ANALYSED',
  'ASSIGNED',
  'IN_PROGRESS',
  'CITIZEN_VERIFICATION',
];

// Haversine formula to compute distance in meters between two lat/lng points
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// Compute Cosine similarity between two float vector arrays
export function calculateCosineSimilarity(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length === 0 || v2.length === 0 || v1.length !== v2.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    normA += v1[i] * v1[i];
    normB += v2[i] * v2[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return Math.max(0, Math.min(1, dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))));
}

// Simple token overlap metric for text fallback
function computeTokenOverlap(t1: string, t2: string): number {
  if (!t1 || !t2) return 0;
  const words1 = new Set(t1.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(t2.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3));
  if (words1.size === 0 || words2.size === 0) return 0;
  let matches = 0;
  for (const w of words1) {
    if (words2.has(w)) matches++;
  }
  return matches / Math.max(words1.size, words2.size);
}

// ──────────────────────────────────────────────
// INTELLIGENT AUTO-CLUSTERING ENGINE
// ──────────────────────────────────────────────

/**
 * Searches active master incidents to check if a new citizen report matches an existing issue
 * using Geospatial Proximity (<= 250m) + Category + Semantic/Keyword relevance.
 */
export async function findClusteringMasterIncident(inputs: {
  latitude: number;
  longitude: number;
  category: string;
  description: string;
  embeddingVector?: number[] | null;
  maxRadiusMeters?: number;
}): Promise<ClusteringMatchResult> {
  const {
    latitude,
    longitude,
    category,
    description,
    embeddingVector,
    maxRadiusMeters = 250, // 250m cluster radius
  } = inputs;

  const storageConfig = getStorageConfig();
  let candidateMasterIncidents: any[] = [];

  if (storageConfig.isMock) {
    candidateMasterIncidents = mockStore.getAllIncidents().filter((inc: any) => {
      const status = inc.status;
      return (
        ACTIVE_STATUSES.includes(status) &&
        !inc.master_incident_id &&
        !inc.masterIncidentId
      );
    });
  } else {
    const supabase = createAdminClient();
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .in('status', ACTIVE_STATUSES)
        .is('master_incident_id', null);
      if (!error && data) {
        candidateMasterIncidents = data;
      }
    } catch (err) {
      console.error('[Clustering Engine] Error querying active incidents from Supabase:', err);
    }
  }

  if (candidateMasterIncidents.length === 0) {
    return {
      isClusterMatch: false,
      masterIncident: null,
      distanceMeters: 0,
      clusterScore: 0,
      reason: 'No existing active incidents to cluster with.',
    };
  }

  let bestMatch: any = null;
  let highestScore = 0;
  let bestDistance = 0;

  for (const incident of candidateMasterIncidents) {
    const incLat = Number(incident.latitude);
    const incLng = Number(incident.longitude);

    if (isNaN(incLat) || isNaN(incLng)) continue;

    const distance = calculateHaversineDistance(latitude, longitude, incLat, incLng);
    if (distance > maxRadiusMeters) continue;

    // 1. Geospatial Proximity Score (0.0 to 1.0)
    const geoScore = Math.max(0, 1 - distance / maxRadiusMeters);

    // 2. Category Similarity Score
    let categoryScore = 0.0;
    if (incident.category === category) {
      categoryScore = 1.0;
    } else {
      // Related categories (e.g. Drainage & Flood, Road Pothole & Infrastructure)
      const relatedPairs: [string, string][] = [
        ['DRAINAGE_BLOCKAGE', 'FLOOD'],
        ['WATER_LEAKAGE', 'DRAINAGE_BLOCKAGE'],
        ['ROAD_POTHOLE', 'PUBLIC_INFRA_DAMAGE'],
        ['BROKEN_STREETLIGHT', 'ELECTRICAL_HAZARD'],
      ];
      const isRelated = relatedPairs.some(
        ([c1, c2]) => (c1 === category && c2 === incident.category) || (c2 === category && c1 === incident.category)
      );
      categoryScore = isRelated ? 0.60 : 0.10;
    }

    // 3. Textual / Semantic Similarity
    let semanticScore = 0;
    const targetEmbedding = storageConfig.isMock ? mockStore.getEmbedding(incident.id) : null;

    if (embeddingVector && targetEmbedding) {
      semanticScore = calculateCosineSimilarity(embeddingVector, targetEmbedding);
    } else {
      const incText = `${incident.title || ''} ${incident.summary || ''}`;
      semanticScore = computeTokenOverlap(description, incText);
    }

    // Weighted Combined Clustering Score
    // Proximity (45%) + Category (35%) + Semantic (20%)
    const combinedClusterScore = 0.45 * geoScore + 0.35 * categoryScore + 0.20 * semanticScore;

    // Threshold: Same category within 150m is a strong cluster match, or overall score >= 0.62
    const isDirectMatch = (incident.category === category && distance <= 180) || combinedClusterScore >= 0.62;

    if (isDirectMatch && combinedClusterScore > highestScore) {
      highestScore = combinedClusterScore;
      bestMatch = incident;
      bestDistance = distance;
    }
  }

  if (bestMatch && highestScore > 0) {
    return {
      isClusterMatch: true,
      masterIncident: bestMatch,
      distanceMeters: Math.round(bestDistance),
      clusterScore: Math.round(highestScore * 100) / 100,
      reason: `Matched active incident #${bestMatch.case_id || bestMatch.caseId} within ${Math.round(bestDistance)}m (${Math.round(highestScore * 100)}% match confidence).`,
    };
  }

  return {
    isClusterMatch: false,
    masterIncident: null,
    distanceMeters: 0,
    clusterScore: 0,
    reason: 'No proximity or category match found.',
  };
}

// ──────────────────────────────────────────────
// MOCK & SUPABASE DUPLICATE DETECTION HELPERS
// ──────────────────────────────────────────────

export async function findDuplicateCandidates(
  inputs: EvaluateDuplicateInputs
): Promise<DuplicateCandidateMatch[]> {
  const {
    candidateIncidentId,
    latitude,
    longitude,
    category,
    embeddingVector,
    maxRadiusMeters = 100,
  } = inputs;

  const storageConfig = getStorageConfig();

  if (storageConfig.isMock) {
    return findDuplicateCandidatesMock(candidateIncidentId, latitude, longitude, category, embeddingVector, maxRadiusMeters);
  }

  return findDuplicateCandidatesSupabase(candidateIncidentId, latitude, longitude, category, embeddingVector, maxRadiusMeters);
}

function findDuplicateCandidatesMock(
  candidateIncidentId: string,
  latitude: number,
  longitude: number,
  category: string,
  embeddingVector: number[] | undefined | null,
  maxRadiusMeters: number,
): DuplicateCandidateMatch[] {
  const all = mockStore.getAllIncidents();
  const activeIncidents = all.filter((inc: any) => {
    const status = inc.status;
    return (
      ACTIVE_STATUSES.includes(status) &&
      !inc.master_incident_id &&
      inc.id !== candidateIncidentId
    );
  });

  if (activeIncidents.length === 0) return [];

  const matches: DuplicateCandidateMatch[] = [];

  for (const incident of activeIncidents) {
    const distance = calculateHaversineDistance(
      latitude,
      longitude,
      Number(incident.latitude),
      Number(incident.longitude)
    );

    if (distance > maxRadiusMeters) continue;

    const geoScore = Math.max(0, 1 - distance / maxRadiusMeters);
    const targetEmbedding = mockStore.getEmbedding(incident.id);
    const hasSemanticMatch = Boolean(embeddingVector && targetEmbedding);

    let semanticSimilarity = 0;
    let combinedScore = 0;

    if (hasSemanticMatch && embeddingVector && targetEmbedding) {
      semanticSimilarity = calculateCosineSimilarity(embeddingVector, targetEmbedding);
      combinedScore = 0.65 * semanticSimilarity + 0.35 * geoScore;
    } else {
      semanticSimilarity = 0;
      const categoryMatchBonus = incident.category === category ? 0.25 : 0.0;
      combinedScore = Math.min(0.60, 0.35 * geoScore + categoryMatchBonus);
    }

    semanticSimilarity = Math.round(semanticSimilarity * 10000) / 10000;
    const roundedGeoScore = Math.round(geoScore * 10000) / 10000;
    combinedScore = Math.round(combinedScore * 10000) / 10000;

    const meetsSemanticThreshold = hasSemanticMatch && semanticSimilarity >= 0.75;
    const meetsCombinedThreshold = combinedScore >= 0.78;

    if (meetsSemanticThreshold && meetsCombinedThreshold) {
      matches.push({
        targetIncidentId: incident.id,
        candidateIncidentId,
        targetCaseId: incident.case_id || incident.caseId,
        semanticSimilarity,
        distanceMeters: distance,
        geoScore: roundedGeoScore,
        combinedScore,
        hasSemanticMatch,
      });
    }
  }

  return matches.sort((a, b) => b.combinedScore - a.combinedScore);
}

async function findDuplicateCandidatesSupabase(
  candidateIncidentId: string,
  latitude: number,
  longitude: number,
  category: string,
  embeddingVector: number[] | undefined | null,
  maxRadiusMeters: number,
): Promise<DuplicateCandidateMatch[]> {
  const supabase = createAdminClient();

  const { data: activeIncidents, error: incidentsError } = await supabase
    .from('incidents')
    .select('id, case_id, latitude, longitude, category, status, master_incident_id')
    .in('status', ACTIVE_STATUSES)
    .is('master_incident_id', null)
    .neq('id', candidateIncidentId);

  if (incidentsError || !activeIncidents || activeIncidents.length === 0) {
    return [];
  }

  const targetIds = activeIncidents.map((i) => i.id);
  const { data: embeddingsData } = await supabase
    .from('embeddings')
    .select('incident_id, embedding')
    .in('incident_id', targetIds);

  const embeddingMap = new Map<string, number[]>();
  if (embeddingsData) {
    embeddingsData.forEach((row: any) => {
      if (row.embedding) {
        const vec = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
        embeddingMap.set(row.incident_id, vec);
      }
    });
  }

  const matches: DuplicateCandidateMatch[] = [];

  for (const incident of activeIncidents) {
    const distance = calculateHaversineDistance(
      latitude,
      longitude,
      Number(incident.latitude),
      Number(incident.longitude)
    );

    if (distance > maxRadiusMeters) continue;

    const geoScore = Math.max(0, 1 - distance / maxRadiusMeters);
    const targetEmbedding = embeddingMap.get(incident.id);
    const hasSemanticMatch = Boolean(embeddingVector && targetEmbedding);

    let semanticSimilarity = 0;
    let combinedScore = 0;

    if (hasSemanticMatch && embeddingVector && targetEmbedding) {
      semanticSimilarity = calculateCosineSimilarity(embeddingVector, targetEmbedding);
      combinedScore = 0.65 * semanticSimilarity + 0.35 * geoScore;
    } else {
      semanticSimilarity = 0;
      const categoryMatchBonus = incident.category === category ? 0.25 : 0.0;
      combinedScore = Math.min(0.60, 0.35 * geoScore + categoryMatchBonus);
    }

    semanticSimilarity = Math.round(semanticSimilarity * 10000) / 10000;
    const roundedGeoScore = Math.round(geoScore * 10000) / 10000;
    combinedScore = Math.round(combinedScore * 10000) / 10000;

    const meetsSemanticThreshold = hasSemanticMatch && semanticSimilarity >= 0.75;
    const meetsCombinedThreshold = combinedScore >= 0.78;

    if (meetsSemanticThreshold && meetsCombinedThreshold) {
      matches.push({
        targetIncidentId: incident.id,
        candidateIncidentId,
        targetCaseId: incident.case_id,
        semanticSimilarity,
        distanceMeters: distance,
        geoScore: roundedGeoScore,
        combinedScore,
        hasSemanticMatch,
      });
    }
  }

  return matches.sort((a, b) => b.combinedScore - a.combinedScore);
}

export async function createPendingDuplicateRelations(
  candidateIncidentId: string,
  matches: DuplicateCandidateMatch[]
): Promise<number> {
  if (!matches || matches.length === 0) return 0;

  const storageConfig = getStorageConfig();
  let createdCount = 0;

  if (storageConfig.isMock) {
    for (const match of matches) {
      try {
        mockStore.addDuplicateRelation({
          id: `dup-rel-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          target_incident_id: match.targetIncidentId,
          candidate_incident_id: match.candidateIncidentId,
          similarity_score: match.combinedScore,
          distance_meters: match.distanceMeters,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        });
        createdCount++;
      } catch (err) {
        console.error('[Duplicate Detector] Error inserting mock duplicate relation:', err);
      }
    }

    if (createdCount > 0) {
      mockStore.updateIncident(candidateIncidentId, { is_duplicate_flagged: true });
    }
  } else {
    const supabase = createAdminClient();
    for (const match of matches) {
      try {
        const { error } = await supabase.from('duplicate_relations').insert({
          target_incident_id: match.targetIncidentId,
          candidate_incident_id: match.candidateIncidentId,
          similarity_score: match.combinedScore,
          distance_meters: match.distanceMeters,
          status: 'PENDING',
        });

        if (!error) {
          createdCount++;
        } else if (error.code === '23505') {
          console.log(`[Duplicate Detector] Relation already exists for ${match.candidateIncidentId} → ${match.targetIncidentId}.`);
        } else {
          console.error('[Duplicate Detector] Error inserting duplicate relation:', error);
        }
      } catch (err) {
        console.error('[Duplicate Detector] Exception inserting duplicate relation:', err);
      }
    }

    if (createdCount > 0) {
      await supabase
        .from('incidents')
        .update({ is_duplicate_flagged: true })
        .eq('id', candidateIncidentId);
    }
  }

  return createdCount;
}
