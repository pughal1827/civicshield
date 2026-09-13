import { NextRequest } from 'next/server';
import { getSessionByToken } from '@/lib/auth/session';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

export async function GET(req: NextRequest) {
  const tokenCookie = req.cookies.get('civicshield_session')?.value;
  const headerToken = req.headers.get('authorization')?.replace('Bearer ', '');
  const token = tokenCookie || headerToken;

  const session = getSessionByToken(token);

  if (!session) {
    return createErrorResponse('Not authenticated.', 'UNAUTHORIZED', 401);
  }

  return createSuccessResponse({
    user: session.user,
  });
}
