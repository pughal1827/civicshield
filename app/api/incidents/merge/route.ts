import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { getSessionByToken } from '@/lib/auth/session';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

const mergeActionSchema = z.object({
  action: z.enum(['CONFIRM_MERGE', 'REJECT_MERGE']),
  duplicateRelationId: z.string().uuid('Invalid duplicate relation ID'),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication & Role Authorization Check
    const tokenCookie = req.cookies.get('civicshield_session')?.value;
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');

    const session = getSessionByToken(tokenCookie || authHeader);

    // 401 Unauthorized check for unauthenticated requests
    if (!session) {
      return createErrorResponse(
        'Authentication required: Please provide valid credentials to perform merge operations.',
        'UNAUTHENTICATED',
        401
      );
    }

    const userRole = session.user.role;

    // 403 Forbidden check for non-authority citizen accounts
    if (userRole === 'CITIZEN') {
      return createErrorResponse(
        'Access denied: Only municipal authority officers or administrators are permitted to perform merge actions.',
        'FORBIDDEN',
        403
      );
    }

    const userId = session.user.id;


    // 2. Validate Request Body
    const body = await req.json();
    const parseResult = mergeActionSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse('Invalid merge request body.', 'VALIDATION_ERROR', 400, parseResult.error.format());
    }

    const { action, duplicateRelationId, reason } = parseResult.data;
    const supabase = createAdminClient();

    // 3. Fetch Duplicate Relation Record
    const { data: relation, error: relationError } = await supabase
      .from('duplicate_relations')
      .select('*')
      .eq('id', duplicateRelationId)
      .single();

    if (relationError || !relation) {
      return createErrorResponse('Duplicate relation record not found.', 'NOT_FOUND', 404);
    }

    if (relation.status !== 'PENDING') {
      return createErrorResponse(`Duplicate relation has already been processed with status: ${relation.status}.`, 'INVALID_STATE', 400);
    }

    const { target_incident_id: targetId, candidate_incident_id: candidateId } = relation;

    // 4. Validate Target and Candidate Incidents
    if (targetId === candidateId) {
      return createErrorResponse('Self merge is prohibited: Target and Candidate incidents cannot be identical.', 'SELF_MERGE_REJECTED', 400);
    }

    const { data: targetIncident, error: targetErr } = await supabase.from('incidents').select('*').eq('id', targetId).single();
    const { data: candidateIncident, error: candidateErr } = await supabase.from('incidents').select('*').eq('id', candidateId).single();

    if (targetErr || !targetIncident || candidateErr || !candidateIncident) {
      return createErrorResponse('One or both incidents associated with this duplicate relation do not exist.', 'NOT_FOUND', 404);
    }

    if (['RESOLVED', 'VERIFIED'].includes(targetIncident.status)) {
      return createErrorResponse(`Cannot merge into incident ${targetIncident.case_id} because it is already ${targetIncident.status}.`, 'TARGET_RESOLVED', 400);
    }

    if (candidateIncident.master_incident_id !== null) {
      return createErrorResponse(`Candidate incident ${candidateIncident.case_id} has already been merged into another master incident.`, 'ALREADY_MERGED', 400);
    }

    // 5. Execute Action
    if (action === 'CONFIRM_MERGE') {
      await supabase.from('reports').update({ incident_id: targetId, is_original_report: false }).eq('incident_id', candidateId);

      const updatedReportCount = Number(targetIncident.report_count) + Number(candidateIncident.report_count);
      const updatedCitizenCount = Number(targetIncident.affected_citizens_count) + Number(candidateIncident.affected_citizens_count);

      await supabase.from('incidents').update({ report_count: updatedReportCount, affected_citizens_count: updatedCitizenCount, is_duplicate_flagged: true }).eq('id', targetId);
      await supabase.from('incidents').update({ master_incident_id: targetId, status: 'RESOLVED', resolved_at: new Date().toISOString() }).eq('id', candidateId);
      await supabase.from('duplicate_relations').update({ status: 'CONFIRMED', reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq('id', duplicateRelationId);

      await supabase.from('audit_logs').insert({
        incident_id: targetId,
        performed_by: userId,
        action: 'CONFIRM_MERGE',
        old_value: { target_case_id: targetIncident.case_id, target_report_count: targetIncident.report_count },
        new_value: { candidate_case_id: candidateIncident.case_id, merged_report_count: updatedReportCount, merged_citizens_count: updatedCitizenCount },
        reason: reason || 'Authority confirmed duplicate complaint merge.',
      });

      return createSuccessResponse({
        action: 'CONFIRM_MERGE',
        duplicateRelationId,
        targetIncidentId: targetId,
        candidateIncidentId: candidateId,
        targetCaseId: targetIncident.case_id,
        candidateCaseId: candidateIncident.case_id,
        updatedReportCount,
        updatedCitizenCount,
      });
    } else {
      await supabase.from('duplicate_relations').update({ status: 'REJECTED', reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq('id', duplicateRelationId);
      await supabase.from('audit_logs').insert({
        incident_id: targetId,
        performed_by: userId,
        action: 'REJECT_MERGE',
        old_value: { relation_status: 'PENDING' },
        new_value: { relation_status: 'REJECTED' },
        reason: reason || 'Authority rejected duplicate match suggestion; kept incidents separate.',
      });

      return createSuccessResponse({
        action: 'REJECT_MERGE',
        duplicateRelationId,
        targetIncidentId: targetId,
        candidateIncidentId: candidateId,
        status: 'REJECTED',
      });
    }
  } catch (error) {
    console.error('[API /api/incidents/merge] Exception:', error);
    return createErrorResponse('An unexpected error occurred processing the duplicate merge request.', 'MERGE_PROCESSING_ERROR', 500);
  }
}
