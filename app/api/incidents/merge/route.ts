import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/db/mock-store';
import { getStorageConfig } from '@/lib/db/storage-config';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { calculatePriorityScore } from '@/lib/priority/priority-engine';

interface MergeRequest {
  targetIncidentId: string;
  duplicateIncidentIds: string[];
  mergeReason?: string;
  performedBy?: string;
}

export async function POST(req: NextRequest) {
  try {
    const storageConfig = getStorageConfig();
    const body = (await req.json()) as MergeRequest;
    const { targetIncidentId, duplicateIncidentIds, mergeReason, performedBy } = body;

    if (!targetIncidentId || !duplicateIncidentIds?.length) {
      return NextResponse.json(
        { success: false, error: 'targetIncidentId and duplicateIncidentIds are required.' },
        { status: 400 }
      );
    }

    // Get target incident
    const target = mockStore.getIncident(targetIncidentId);
    if (!target) {
      return NextResponse.json(
        { success: false, error: `Target incident ${targetIncidentId} not found.` },
        { status: 404 }
      );
    }

    const mergedIncidentIds: string[] = [];
    const errors: string[] = [];

    for (const dupId of duplicateIncidentIds) {
      if (dupId === targetIncidentId) continue;

      const duplicate = mockStore.getIncident(dupId);
      if (!duplicate) {
        errors.push(`Incident ${dupId} not found.`);
        continue;
      }

      // Skip if already resolved
      if (duplicate.status === 'RESOLVED') {
        errors.push(`Incident ${dupId} is already resolved — skipped.`);
        continue;
      }

      // Fuse evidence: increment report count and affected citizens
      const newReportCount = (target.report_count || 0) + (duplicate.report_count || 0);
      const newAffectedCount = (target.affected_citizens_count || 0) + (duplicate.affected_citizens_count || 0);

      // Recalculate priority with merged data
      const priorityResult = calculatePriorityScore({
        category: target.category,
        aiSeverity: target.severity,
        aiSafetyRiskScore: (target.priority_factors?.safetyRisk as number) || 70,
        description: target.summary + ' ' + duplicate.summary,
        addressText: target.address || '',
        reportCount: newReportCount,
        affectedCitizensCount: newAffectedCount,
      });

      // Update target with merged data
      const updatedTarget = mockStore.updateIncident(target.id, {
        report_count: newReportCount,
        affected_citizens_count: newAffectedCount,
        priority_score: priorityResult.priorityScore,
        priority_factors: {
          ...(target.priority_factors || {}),
          ...priorityResult.factorScores,
          explanation: priorityResult.explanationSummary,
        },
        is_duplicate_flagged: true,
        updated_at: new Date().toISOString(),
      });

      if (!updatedTarget) {
        errors.push(`Failed to update target incident ${targetIncidentId}.`);
        continue;
      }

      // Mark duplicate as merged
      const dupUpdated = mockStore.updateIncident(duplicate.id, {
        status: 'DUPLICATE',
        master_incident_id: targetIncidentId,
        updated_at: new Date().toISOString(),
      });

      if (dupUpdated) {
        mergedIncidentIds.push(dupId);
      }

      // Log the merge in audit trail
      mockStore.addAuditLog({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        incident_id: targetIncidentId,
        performed_by: performedBy || 'AI_SYSTEM',
        action: 'INCIDENT_MERGE',
        old_value: { report_count: target.report_count, affected_citizens_count: target.affected_citizens_count },
        new_value: { report_count: newReportCount, affected_citizens_count: newAffectedCount, merged_from: dupId },
        reason: mergeReason || 'AI-detected duplicate — same underlying civic issue',
        created_at: new Date().toISOString(),
      });
    }

    // Supabase persistence
    if (storageConfig.isSupabase) {
      try {
        const supabase = createAdminClient();
        for (const mergedId of mergedIncidentIds) {
          await supabase
            .from('incidents')
            .update({ status: 'DUPLICATE', master_incident_id: targetIncidentId })
            .eq('id', mergedId);
        }
      } catch (supabaseErr) {
        console.error('[MergeAPI] Supabase sync error:', supabaseErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        targetIncidentId,
        targetCaseId: target.case_id,
        mergedCount: mergedIncidentIds.length,
        mergedIncidentIds,
        totalReportsNow: (target.report_count || 0) + mergedIncidentIds.length,
        totalAffectedNow: (target.affected_citizens_count || 0) + mergedIncidentIds.reduce((sum, _) => sum + 1, 0),
        newPriorityScore: target.priority_score,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('[MergeAPI] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to merge incidents. Please try again.' },
      { status: 500 }
    );
  }
}
