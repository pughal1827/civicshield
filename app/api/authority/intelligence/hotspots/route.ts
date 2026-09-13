import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken } from '@/lib/auth/session';
import { detectCivicHotspots } from '@/lib/intelligence/hotspots';

export async function GET(req: NextRequest) {
  try {
    // 1. Enforce Server-Side Authority Authorization
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
        `[Security Alert] User ${session.user.email} (Role: ${session.user.role}) attempted to access Authority Hotspots API.`
      );
      return NextResponse.json(
        { error: 'Forbidden. Authority clearance required.' },
        { status: 403 }
      );
    }


    // 2. Parse Query Parameters safely
    const searchParams = req.nextUrl.searchParams;
    const daysStr = searchParams.get('days');
    const radiusStr = searchParams.get('radius');
    const minIncidentsStr = searchParams.get('minIncidents');
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;

    const days = daysStr ? parseInt(daysStr, 10) : undefined;
    const radius = radiusStr ? parseInt(radiusStr, 10) : undefined;
    const minIncidents = minIncidentsStr ? parseInt(minIncidentsStr, 10) : undefined;

    // 3. Execute Hotspot Engine
    const result = await detectCivicHotspots({
      days,
      radius,
      minIncidents,
      category,
      priority,
      departmentId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[Authority Hotspots API Error]:', err);
    return NextResponse.json(
      {
        error: 'Unable to load civic hotspots right now. Database unavailable.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
      { status: 503 }
    );
  }
}
