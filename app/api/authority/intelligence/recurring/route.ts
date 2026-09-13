import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken } from '@/lib/auth/session';
import { detectRecurringProblems } from '@/lib/intelligence/recurring';

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
        `[Security Alert] User ${session.user.email} (Role: ${session.user.role}) attempted to access Authority Recurring Problems API.`
      );
      return NextResponse.json(
        { error: 'Forbidden. Authority clearance required.' },
        { status: 403 }
      );
    }

    // 2. Parse & sanitize parameters
    const searchParams = req.nextUrl.searchParams;
    const daysStr = searchParams.get('days');
    const radiusStr = searchParams.get('radius');
    const minOccurrencesStr = searchParams.get('minOccurrences');
    const category = searchParams.get('category') || undefined;

    const days = daysStr ? parseInt(daysStr, 10) : undefined;
    const radius = radiusStr ? parseInt(radiusStr, 10) : undefined;
    const minOccurrences = minOccurrencesStr ? parseInt(minOccurrencesStr, 10) : undefined;

    // 3. Execute Recurrence Engine
    const result = await detectRecurringProblems({
      days,
      radius,
      minOccurrences,
      category,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[Authority Recurring API Error]:', err);
    return NextResponse.json(
      {
        error: 'Unable to load recurring civic problems right now. Database unavailable.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
      { status: 503 }
    );
  }
}
