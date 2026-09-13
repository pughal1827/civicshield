import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken } from '@/lib/auth/session';
import { getEmergencyEscalations } from '@/lib/intelligence/escalation';

export async function GET(req: NextRequest) {
  try {
    // 1. Server-side Authority RBAC
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
      console.warn(
        `[Security Alert] User ${session.user.email} (Role: ${session.user.role}) attempted to access Emergency Escalations API.`
      );
      return NextResponse.json(
        { error: 'Forbidden. Authority clearance required.' },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const daysStr = searchParams.get('days');
    const level = searchParams.get('level') || undefined;
    const category = searchParams.get('category') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;

    const days = daysStr ? parseInt(daysStr, 10) : undefined;

    // 3. Execute Escalation Engine
    const result = await getEmergencyEscalations({
      days,
      level,
      category,
      departmentId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[Escalation API Error]:', err);
    return NextResponse.json(
      {
        error: 'Unable to load emergency escalations right now. Database unavailable.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
      { status: 503 }
    );
  }
}
