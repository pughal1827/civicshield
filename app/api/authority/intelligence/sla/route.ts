import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken } from '@/lib/auth/session';
import { getSLAMonitoring } from '@/lib/intelligence/sla';

export async function GET(req: NextRequest) {
  try {
    // 1. Server-side Authority Authorization
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
        `[Security Alert] User ${session.user.email} (Role: ${session.user.role}) attempted to access Authority SLA Monitoring API.`
      );
      return NextResponse.json(
        { error: 'Forbidden. Authority clearance required.' },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const slaStatus = searchParams.get('slaStatus') || undefined;
    const category = searchParams.get('category') || undefined;

    // 3. Execute SLA Engine
    const result = await getSLAMonitoring({
      status,
      priority,
      departmentId,
      slaStatus,
      category,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[Authority SLA API Error]:', err);
    return NextResponse.json(
      {
        error: 'Unable to load SLA monitoring right now. Database unavailable.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
      { status: 503 }
    );
  }
}
