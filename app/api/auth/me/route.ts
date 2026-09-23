import { NextRequest } from 'next/server';
import { getSessionByToken, getUserByEmail } from '@/lib/auth/session';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

export async function GET(req: NextRequest) {
  const tokenCookie = req.cookies.get('civicshield_session')?.value;
  const headerToken = req.headers.get('authorization')?.replace('Bearer ', '');
  const token = tokenCookie || headerToken;

  const session = getSessionByToken(token);
  let user = session?.user;

  const headerEmail = req.headers.get('x-worker-email');
  if (!user && headerEmail) {
    const found = getUserByEmail(headerEmail);
    if (found) {
      const { passwordHash: _, ...publicUser } = found;
      user = publicUser;
    }
  }

  if (!user) {
    return createErrorResponse('Not authenticated.', 'UNAUTHORIZED', 401);
  }

  return createSuccessResponse({
    user,
  });
}
