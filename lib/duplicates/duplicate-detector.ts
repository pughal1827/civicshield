import { createAdminClient } from '@/lib/db/supabase-admin';
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
  return Math.round(R * c * 100) / 100; // Return rounded to 2 decimal places
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

// Active incident statuses eligible for duplicate evaluation (Excludes RESOLVED & VERIFIED)
const ACTIVE_STATUSES: IncidentStatus[] = [
  'SUBMITTED',
  'AI_ANALYSED',
  'ASSIGNED',
  'IN_PROGRESS',
  'CITIZEN_VERIFICATION',
];

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

  const supabase = createAdminClient();

  // 1. Fetch active incidents in the database (excluding candidate itself and resolved/verified)
  const { data: activeIncidents, error: incidentsError } = await supabase
    .from('incidents')
    .select('id, case_id, latitude, longitude, category, status, master_incident_id')
    .in('status', ACTIVE_STATUSES)
    .is('master_incident_id', null) // Only compare against active primary master incidents
    .neq('id', candidateIncidentId);

  if (incidentsError || !activeIncidents || activeIncidents.length === 0) {
    if (incidentsError) {
      console.error('[Duplicate Detector] Error querying active incidents:', incidentsError);
    }
    return [];
  }

  // 2. Fetch existing embeddings for target incidents
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
    // 3. Compute geographic distance
    const distance = calculateHaversineDistance(
      latitude,
      longitude,
      Number(incident.latitude),
      Number(incident.longitude)
    );

    // Skip if beyond max geographic radius (100m)
    if (distance > maxRadiusMeters) continue;

    // 4. Compute Geographic Score (linear decay within 100m)
    const geoScore = Math.max(0, 1 - distance / maxRadiusMeters);

    // 5. Compute Semantic Similarity if embedding is available
    const targetEmbedding = embeddingMap.get(incident.id);
    const hasSemanticMatch = Boolean(embeddingVector && targetEmbedding);

    let semanticSimilarity = 0;
    let combinedScore = 0;

    if (hasSemanticMatch && embeddingVector && targetEmbedding) {
      semanticSimilarity = calculateCosineSimilarity(embeddingVector, targetEmbedding);
      combinedScore = 0.65 * semanticSimilarity + 0.35 * geoScore;
    } else {
      // EMBEDDING FALLBACK SAFETY FIX:
      // When embedding is unavailable, semantic similarity is 0.0.
      // Geo-fallback score is strictly capped below automatic duplicate threshold (max 0.60)
      // to prevent false duplicate flags without semantic verification!
      semanticSimilarity = 0;
      const categoryMatchBonus = incident.category === category ? 0.25 : 0.0;
      combinedScore = Math.min(0.60, 0.35 * geoScore + categoryMatchBonus);
      console.warn(`[Duplicate Detector] Embedding missing for incident ${incident.id}. Assigned safe non-semantic fallback score (${combinedScore.toFixed(2)}). Candidate flag suppressed.`);
    }

    // Rounding scores
    semanticSimilarity = Math.round(semanticSimilarity * 10000) / 10000;
    const roundedGeoScore = Math.round(geoScore * 10000) / 10000;
    combinedScore = Math.round(combinedScore * 10000) / 10000;

    // 6. Threshold Filters: Requires semantic similarity >= 0.75 AND combined score >= 0.78
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

  // Sort candidates by highest combined score descending
  return matches.sort((a, b) => b.combinedScore - a.combinedScore);
}

// Persist candidate duplicate flags into `duplicate_relations` with status = 'PENDING'
export async function createPendingDuplicateRelations(
  candidateIncidentId: string,
  matches: DuplicateCandidateMatch[]
): Promise<number> {
  if (!matches || matches.length === 0) return 0;

  const supabase = createAdminClient();
  let createdCount = 0;

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
        console.log(`[Duplicate Detector] Relation between ${match.targetIncidentId} and ${match.candidateIncidentId} already exists.`);
      } else {
        console.error('[Duplicate Detector] Error inserting duplicate relation:', error);
      }
    } catch (err) {
      console.error('[Duplicate Detector] Exception inserting duplicate relation:', err);
    }
  }

  // Flag candidate incident in incidents table (NEVER auto-merge)
  if (createdCount > 0) {
    await supabase
      .from('incidents')
      .update({ is_duplicate_flagged: true })
      .eq('id', candidateIncidentId);
  }

  return createdCount;
}
