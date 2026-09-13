import { NextRequest } from 'next/server';
import { getSessionByToken, destroySession } from '@/lib/auth/session';
import { createSuccessResponse } from '@/lib/utils/api-error';

export async function POST(req: NextRequest) {
  const tokenCookie = req.cookies.get('civicshield_session')?.value;
  const headerToken = req.headers.get('authorization')?.replace('Bearer ', '');
  const token = tokenCookie || headerToken;

  if (token) {
    destroySession(token);
  }

  const response = createSuccessResponse({ message: 'Logged out successfully.' });
  response.cookies.delete('civicshield_session');
  return response;
}
