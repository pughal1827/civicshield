import { NextRequest } from 'next/server';
import { getSessionByToken } from '@/lib/auth/session';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';
import { getIntelligenceOverview } from '@/lib/intelligence/aggregations';
import { TimeWindowType } from '@/lib/intelligence/types';

export async function GET(req: NextRequest) {
  try {
    // 1. Server-Side RBAC Enforcement
    const tokenCookie = req.cookies.get('civicshield_session')?.value;
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const token = tokenCookie || authHeader;

    const session = getSessionByToken(token);

    if (!session) {
      return createErrorResponse('Authentication required to access municipal intelligence data.', 'UNAUTHENTICATED', 401);
    }

    if (session.user.role === 'CITIZEN') {
      return createErrorResponse('Access denied: Intelligence analytics are restricted to municipal authority personnel.', 'FORBIDDEN', 403);
    }

    // 2. Query Parameters
    const { searchParams } = new URL(req.url);
    const windowType = (searchParams.get('window') || 'last30Days') as TimeWindowType;

    // 3. Compute Aggregations
    const overview = await getIntelligenceOverview(windowType);

    return createSuccessResponse(overview);
  } catch (error) {
    console.error('[API /api/authority/intelligence/overview] Database/System Error:', error);
    // Explicit Fail-Safe Error Handling: Do not swallow DB failures or return fake 0 counts
    return createErrorResponse(
      'Unable to load civic intelligence right now. Please check system status and try again.',
      'SERVICE_UNAVAILABLE',
      503
    );
  }
}
