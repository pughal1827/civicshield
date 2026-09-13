import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken } from '@/lib/auth/session';
import { getDepartmentOperations } from '@/lib/intelligence/departments';

export async function GET(req: NextRequest) {
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
      console.warn(
        `[Security Alert] User ${session.user.email} (Role: ${session.user.role}) attempted to access Authority Department Operations API.`
      );
      return NextResponse.json(
        { error: 'Forbidden. Authority clearance required.' },
        { status: 403 }
      );
    }

    // 2. Parse & sanitize parameters
    const searchParams = req.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId') || undefined;
    const daysStr = searchParams.get('days');
    const days = daysStr ? parseInt(daysStr, 10) : undefined;

    // 3. Execute Department Operations Engine
    const result = await getDepartmentOperations({
      departmentId,
      days,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[Authority Department Operations API Error]:', err);
    return NextResponse.json(
      {
        error: 'Unable to load department operations intelligence right now. Database unavailable.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
      { status: 503 }
    );
  }
}
