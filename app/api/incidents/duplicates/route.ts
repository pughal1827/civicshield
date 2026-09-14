import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { findDuplicateCandidates, createPendingDuplicateRelations } from '@/lib/duplicates/duplicate-detector';
import { logger } from '@/lib/logging/logger';

export async function GET() {
  try {
    const incidents = mockStore.getAllIncidents();
    const pairs: any[] = [];

    // Find all incidents flagged as having duplicates
    const flaggedIncidents = incidents.filter((inc: any) => inc.is_duplicate_flagged);

    for (const flagged of flaggedIncidents) {
      const relations = mockStore.getDuplicateRelations(flagged.id);

      for (const rel of relations) {
        if (rel.status === 'PENDING') {
          const targetIncident = mockStore.getIncident(rel.target_incident_id);
          const candidateIncident = mockStore.getIncident(rel.candidate_incident_id);

          if (targetIncident && candidateIncident) {
            const targetEmbedding = mockStore.getEmbedding(targetIncident.id);
            const candidateEmbedding = mockStore.getEmbedding(candidateIncident.id);

            let semanticSimilarity = 0;
            if (targetEmbedding && candidateEmbedding) {
              const dot = targetEmbedding.reduce((sum, v, i) => sum + v * (candidateEmbedding[i] || 0), 0);
              const normA = Math.sqrt(targetEmbedding.reduce((s, v) => s + v * v, 0));
              const normB = Math.sqrt(candidateEmbedding.reduce((s, v) => s + v * v, 0));
              if (normA > 0 && normB > 0) {
                semanticSimilarity = dot / (normA * normB);
              }
            }

            const categoryMatch = targetIncident.category === candidateIncident.category;

            pairs.push({
              relationId: rel.id,
              targetIncident: {
                id: targetIncident.id,
                caseId: targetIncident.case_id || targetIncident.caseId,
                title: targetIncident.title,
                summary: targetIncident.summary,
                category: targetIncident.category,
                status: targetIncident.status,
                address: targetIncident.address || 'Unknown',
                createdAt: targetIncident.created_at || targetIncident.createdAt,
                priorityScore: targetIncident.priority_score || targetIncident.priorityScore,
                reportCount: targetIncident.report_count || targetIncident.reportCount || 1,
              },
              candidateIncident: {
                id: candidateIncident.id,
                caseId: candidateIncident.case_id || candidateIncident.caseId,
                title: candidateIncident.title,
                summary: candidateIncident.summary,
                category: candidateIncident.category,
                status: candidateIncident.status,
                address: candidateIncident.address || 'Unknown',
                createdAt: candidateIncident.created_at || candidateIncident.createdAt,
                priorityScore: candidateIncident.priority_score || candidateIncident.priorityScore,
                reportCount: candidateIncident.report_count || candidateIncident.reportCount || 1,
              },
              similarityScore: Math.round((rel.similarity_score || 0) * 100),
              distanceMeters: Math.round(rel.distance_meters || 0),
              semanticSimilarity: Math.round(semanticSimilarity * 100),
              categoryMatch,
              status: rel.status,
            });
          }
        }
      }
    }

    // If no flagged pairs, do a live scan for nearby incidents with same category
    if (pairs.length === 0) {
      const activeIncidents = incidents.filter((inc: any) =>
        ['SUBMITTED', 'AI_ANALYSED', 'ASSIGNED', 'IN_PROGRESS'].includes(inc.status) &&
        !inc.master_incident_id
      );

      for (let i = 0; i < activeIncidents.length; i++) {
        for (let j = i + 1; j < activeIncidents.length; j++) {
          const incA = activeIncidents[i] as any;
          const incB = activeIncidents[j] as any;

          const latDiff = Math.abs(incA.latitude - incB.latitude);
          const lngDiff = Math.abs(incA.longitude - incB.longitude);
          const approxDistance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // rough meters

          if (approxDistance < 200 && incA.category === incB.category) {
            const embA = mockStore.getEmbedding(incA.id);
            const embB = mockStore.getEmbedding(incB.id);

            let semanticScore = 0;
            if (embA && embB) {
              const dot = embA.reduce((sum, v, idx) => sum + v * (embB[idx] || 0), 0);
              const normA = Math.sqrt(embA.reduce((s, v) => s + v * v, 0));
              const normB = Math.sqrt(embB.reduce((s, v) => s + v * v, 0));
              if (normA > 0 && normB > 0) {
                semanticScore = dot / (normA * normB);
              }
            }

            const geoScore = Math.max(0, 1 - approxDistance / 100);
            const combined = 0.65 * semanticScore + 0.35 * geoScore;

            if (combined >= 0.5) {
              pairs.push({
                relationId: `live-scan-${incA.id}-${incB.id}`,
                targetIncident: {
                  id: incA.id,
                  caseId: incA.case_id || incA.caseId,
                  title: incA.title,
                  summary: incA.summary,
                  category: incA.category,
                  status: incA.status,
                  address: incA.address || 'Unknown',
                  createdAt: incA.created_at || incA.createdAt,
                  priorityScore: incA.priority_score || incA.priorityScore,
                  reportCount: incA.report_count || incA.reportCount || 1,
                },
                candidateIncident: {
                  id: incB.id,
                  caseId: incB.case_id || incB.caseId,
                  title: incB.title,
                  summary: incB.summary,
                  category: incB.category,
                  status: incB.status,
                  address: incB.address || 'Unknown',
                  createdAt: incB.created_at || incB.createdAt,
                  priorityScore: incB.priority_score || incB.priorityScore,
                  reportCount: incB.report_count || incB.reportCount || 1,
                },
                similarityScore: Math.round(combined * 100),
                distanceMeters: Math.round(approxDistance),
                semanticSimilarity: Math.round(semanticScore * 100),
                categoryMatch: incA.category === incB.category,
                status: 'PENDING',
              });
            }
          }
        }
      }
    }

    // Sort by similarity score descending
    pairs.sort((a, b) => b.similarityScore - a.similarityScore);

    return NextResponse.json({
      success: true,
      data: {
        duplicates: pairs,
        totalPending: pairs.length,
        totalFlagged: flaggedIncidents.length,
      },
    });
  } catch (err) {
    console.error('[DuplicatesAPI] Error:', err);
    return NextResponse.json({
      success: true,
      data: { duplicates: [], totalPending: 0, totalFlagged: 0 },
    });
  }
}
