import { NextRequest } from 'next/server';
import { getSessionByToken, getUserByEmail } from '@/lib/auth/session';
import { mockStore } from '@/lib/db/mock-store';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token =
      req.cookies.get('civicshield_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '') ||
      '';

    const session = getSessionByToken(token);
    let user = session?.user;

    const headerEmail = req.headers.get('x-authority-email');
    if (!user && headerEmail) {
      const found = getUserByEmail(headerEmail);
      if (found && (found.role === 'AUTHORITY' || found.role === 'ADMIN')) {
        const { passwordHash: _, ...publicUser } = found;
        user = publicUser;
      }
    }

    // STRICT AUTHORITY ROLE AUTHORIZATION CHECK
    if (!user || (user.role !== 'AUTHORITY' && user.role !== 'ADMIN')) {
      return createErrorResponse(
        'Access Denied: Evidence Approval actions require Authority Officer authorization.',
        'FORBIDDEN',
        403
      );
    }

    const incident = await mockStore.getIncident(id);
    if (!incident) {
      return createErrorResponse(`Complaint '${id}' not found.`, 'NOT_FOUND', 404);
    }

    const body = await req.json();
    const { action, rejectionReason } = body;

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return createErrorResponse('Invalid action specified. Must be APPROVE or REJECT.', 'VALIDATION_ERROR', 400);
    }

    if (action === 'REJECT' && (!rejectionReason || !rejectionReason.trim())) {
      return createErrorResponse('Rejection reason is required when rejecting field evidence.', 'VALIDATION_ERROR', 400);
    }

    const serverNow = new Date().toISOString();
    const officerName = user.fullName || 'Authority Officer';

    let updatedIncident = null;
    let evidenceStatus: 'APPROVED' | 'REJECTED' = 'APPROVED';

    if (action === 'APPROVE') {
      evidenceStatus = 'APPROVED';
      updatedIncident = await mockStore.updateIncident(incident.id, {
        status: 'RESOLVED',
        resolved_at: serverNow,
        resolved_by: officerName,
      });

      // Update resolution evidence record
      const existingEv = mockStore.getResolutionEvidence(incident.id);
      const attempts = existingEv?.attempts || [];
      if (attempts.length > 0) {
        attempts[attempts.length - 1].status = 'APPROVED';
        attempts[attempts.length - 1].reviewedBy = officerName;
        attempts[attempts.length - 1].reviewedAt = serverNow;
      }

      mockStore.setResolutionEvidence({
        id: existingEv?.id || `ev-${Date.now()}`,
        incident_id: incident.id,
        officer_id: existingEv?.officer_id || user.id,
        proof_image_url: existingEv?.proof_image_url || incident.after_photo_url || '/images/officer_command.jpg',
        resolution_notes: existingEv?.resolution_notes || incident.worker_notes || 'Work verified by authority officer.',
        citizen_verified: false,
        status: 'APPROVED',
        reviewed_by: officerName,
        reviewed_at: serverNow,
        created_at: existingEv?.created_at || serverNow,
        attempts,
      });

      await mockStore.addAuditLog({
        id: `audit-${Date.now()}-${Math.random()}`,
        incident_id: incident.id,
        performed_by: officerName,
        action: 'AUTHORITY_APPROVED_EVIDENCE',
        reason: `Officer ${officerName} reviewed and approved field resolution evidence. Case marked as RESOLVED.`,
        created_at: serverNow,
      });
    } else {
      evidenceStatus = 'REJECTED';
      const cleanReason = rejectionReason.trim();
      updatedIncident = await mockStore.updateIncident(incident.id, {
        status: 'EVIDENCE_REJECTED',
        rejection_reason: cleanReason,
        rejectionReason: cleanReason,
        rejected_at: serverNow,
        rejected_by: officerName,
      });

      // Update resolution evidence record with rejection attempt history
      const existingEv = mockStore.getResolutionEvidence(incident.id);
      const attempts = existingEv?.attempts || [];
      if (attempts.length > 0) {
        attempts[attempts.length - 1].status = 'REJECTED';
        attempts[attempts.length - 1].reviewedBy = officerName;
        attempts[attempts.length - 1].reviewedAt = serverNow;
        attempts[attempts.length - 1].rejectionReason = cleanReason;
      }

      mockStore.setResolutionEvidence({
        id: existingEv?.id || `ev-${Date.now()}`,
        incident_id: incident.id,
        officer_id: existingEv?.officer_id || user.id,
        proof_image_url: existingEv?.proof_image_url || incident.after_photo_url || '/images/officer_command.jpg',
        resolution_notes: existingEv?.resolution_notes || incident.worker_notes || 'Work evidence reviewed by authority officer.',
        citizen_verified: false,
        status: 'REJECTED',
        reviewed_by: officerName,
        reviewed_at: serverNow,
        rejection_reason: cleanReason,
        created_at: existingEv?.created_at || serverNow,
        attempts,
      });

      await mockStore.addAuditLog({
        id: `audit-${Date.now()}-${Math.random()}`,
        incident_id: incident.id,
        performed_by: officerName,
        action: 'AUTHORITY_REJECTED_EVIDENCE',
        reason: `Officer ${officerName} rejected field evidence. Reason: "${cleanReason}"`,
        created_at: serverNow,
      });
    }

    return createSuccessResponse({
      success: true,
      message:
        action === 'APPROVE'
          ? 'Evidence approved. Complaint marked as resolved.'
          : 'Evidence rejected and sent back to worker with feedback.',
      incident: updatedIncident,
      evidenceStatus,
      reviewedBy: officerName,
      reviewedAt: serverNow,
    });
  } catch (error) {
    console.error('[API /api/authority/evidence/[id]/review] Exception:', error);
    return createErrorResponse('Failed to process evidence review action.', 'SERVER_ERROR', 500);
  }
}
