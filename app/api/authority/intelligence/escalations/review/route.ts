import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { mockStore } from '@/lib/db/mock-store';

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Server-Side Authority RBAC
    const tokenCookie = req.cookies.get('civicshield_session')?.value;
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    const session = getSessionByToken(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required. Please log into Authority Portal.' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'AUTHORITY' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Authority clearance required to mark escalations reviewed.' },
        { status: 403 }
      );
    }

    // 2. Parse payload
    const body = await req.json();
    const { incidentId, notes } = body;

    if (!incidentId) {
      return NextResponse.json(
        { error: 'Missing incidentId parameter.' },
        { status: 400 }
      );
    }

    const mode = process.env.CIVICSHIELD_STORAGE_MODE || 'mock';
    const nowIso = new Date().toISOString();

    if (mode === 'supabase') {
      const supabase = createAdminClient();

      // Update incident reviewed state
      const { error: updateErr } = await supabase
        .from('incidents')
        .update({
          is_escalation_reviewed: true,
          escalation_reviewed_at: nowIso,
          escalation_reviewed_by: session.user.email,
        })
        .eq('id', incidentId);

      if (updateErr) {
        throw new Error(`Failed to update escalation review state: ${updateErr.message}`);
      }

      // Record Audit Log Entry
      await supabase.from('audit_logs').insert({
        incident_id: incidentId,
        performed_by: session.user.email,
        action: 'ESCALATION_REVIEWED',
        new_value: {
          is_escalation_reviewed: true,
          notes: notes || 'Authority officer marked emergency escalation alert reviewed.',
        },
        reason: notes || 'Authority operational escalation triage.',
      });
    } else {
      // Explicit MOCK mode
      mockStore.updateIncident(incidentId, {
        is_escalation_reviewed: true,
        isEscalationReviewed: true,
        escalation_reviewed_at: nowIso,
        escalationReviewedAt: nowIso,
        escalation_reviewed_by: session.user.email,
        escalationReviewedBy: session.user.email,
      });

      mockStore.addAuditLog({
        id: `audit_${Date.now()}`,
        incident_id: incidentId,
        performed_by: session.user.email,
        action: 'ESCALATION_REVIEWED',
        new_value: {
          is_escalation_reviewed: true,
          notes: notes || 'Authority officer marked emergency escalation alert reviewed.',
        },
        reason: notes || 'Authority operational escalation triage.',
        created_at: nowIso,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Escalation alert marked as reviewed successfully.',
        incidentId,
        reviewedAt: nowIso,
        reviewedBy: session.user.email,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[Escalation Review API Error]:', err);
    return NextResponse.json(
      {
        error: 'Unable to update escalation review status. Database unavailable.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
      { status: 503 }
    );
  }
}
