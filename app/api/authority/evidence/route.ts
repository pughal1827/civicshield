import { NextRequest } from 'next/server';
import { getSessionByToken, getUserByEmail } from '@/lib/auth/session';
import { mockStore } from '@/lib/db/mock-store';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';
import { normalizeDepartmentCode, DEPARTMENT_DISPLAY_NAMES } from '@/lib/constants/departments';

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get('civicshield_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '') ||
      '';

    const session = getSessionByToken(token);
    let user = session?.user;

    // Development/Testing header fallback for Authority role
    const headerEmail = req.headers.get('x-authority-email');
    if (!user && headerEmail) {
      const found = getUserByEmail(headerEmail);
      if (found && (found.role === 'AUTHORITY' || found.role === 'ADMIN')) {
        const { passwordHash: _, ...publicUser } = found;
        user = publicUser;
      }
    }

    // STRICT ROLE AUTHORIZATION CHECK: AUTHORITY or ADMIN only!
    if (!user || (user.role !== 'AUTHORITY' && user.role !== 'ADMIN')) {
      return createErrorResponse(
        'Access Denied: Evidence Approval module requires Authority or Admin authorization.',
        'FORBIDDEN',
        403
      );
    }

    const allIncidents = await mockStore.getAllIncidents();

    // Filter incidents that have submitted evidence OR are in evidence review states
    const evidenceItems = allIncidents
      .map((inc) => {
        const ev = mockStore.getResolutionEvidence(inc.id);
        const hasEvidence = Boolean(
          ev ||
            inc.after_photo_url ||
            inc.afterPhotoUrl ||
            inc.status === 'WAITING_FOR_APPROVAL' ||
            inc.status === 'WORK_COMPLETED' ||
            inc.status === 'AWAITING_VERIFICATION' ||
            inc.status === 'EVIDENCE_REJECTED' ||
            inc.status === 'RESOLVED' ||
            inc.status === 'VERIFIED'
        );

        if (!hasEvidence) return null;

        const deptCode = normalizeDepartmentCode(inc.department_id || inc.departmentCode, inc.category);
        const deptName = inc.departmentName || inc.departments?.name || DEPARTMENT_DISPLAY_NAMES[deptCode] || 'Municipal Department';

        // Evidence Status Mapping
        let evidenceStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
        if (inc.status === 'RESOLVED' || inc.status === 'VERIFIED' || ev?.status === 'APPROVED') {
          evidenceStatus = 'APPROVED';
        } else if (inc.status === 'EVIDENCE_REJECTED' || ev?.status === 'REJECTED') {
          evidenceStatus = 'REJECTED';
        }

        return {
          id: inc.id,
          caseId: inc.caseId || inc.case_id || `CS-${inc.id.substring(0, 4)}`,
          title: inc.title,
          summary: inc.summary,
          category: inc.category,
          status: inc.status,
          evidenceStatus,
          departmentCode: deptCode,
          departmentName: deptName,
          workerName: inc.evidence_submitted_by || inc.started_by || inc.accepted_by || ev?.officer_id || 'Assigned Worker',
          address: inc.address || 'Address provided on spatial map',
          latitude: inc.latitude,
          longitude: inc.longitude,
          priorityScore: inc.priority_score || inc.priorityScore || 50,
          severity: inc.severity || 'HIGH',
          submittedAt: inc.evidence_submitted_at || ev?.created_at || inc.updated_at || inc.created_at,
          beforePhotoUrl: inc.before_photo_url || inc.imageUrl || '/images/citizen_reporting.jpg',
          afterPhotoUrl: ev?.proof_image_url || inc.after_photo_url || inc.afterPhotoUrl || null,
          workerNotes: ev?.resolution_notes || inc.worker_notes || null,
          rejectionReason: inc.rejection_reason || inc.rejectionReason || ev?.rejection_reason || null,
          reviewedBy: inc.resolved_by || inc.rejected_by || ev?.reviewed_by || null,
          reviewedAt: inc.resolved_at || inc.rejected_at || ev?.reviewed_at || null,
          evidence: ev || null,
          attempts: ev?.attempts || [],
        };
      })
      .filter(Boolean);

    // Calculate Summary Counts dynamically from real DB records
    const stats = {
      pendingCount: evidenceItems.filter((i: any) => i.evidenceStatus === 'PENDING').length,
      approvedCount: evidenceItems.filter((i: any) => i.evidenceStatus === 'APPROVED').length,
      rejectedCount: evidenceItems.filter((i: any) => i.evidenceStatus === 'REJECTED').length,
      totalCount: evidenceItems.length,
    };

    return createSuccessResponse({
      evidenceItems,
      stats,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[API /api/authority/evidence] Exception:', error);
    return createErrorResponse('Failed to fetch evidence records for approval.', 'SERVER_ERROR', 500);
  }
}
