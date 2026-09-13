import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getUserByEmail, verifyUserPassword, createAuthSession, checkAuthRateLimit } from '@/lib/auth/session';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  portal: z.enum(['CITIZEN', 'AUTHORITY']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkAuthRateLimit(`login_${ip}`, 10, 60000);

    if (!rateLimit.allowed) {
      return createErrorResponse(
        `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        'TOO_MANY_REQUESTS',
        429
      );
    }

    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return createErrorResponse('Invalid login details format.', 'VALIDATION_ERROR', 400);
    }

    const { email, password, portal } = parseResult.data;

    const userWithPassword = getUserByEmail(email);

    // Generic error message: do not leak whether account/email exists
    if (!userWithPassword || !verifyUserPassword(userWithPassword, password)) {
      return createErrorResponse('Invalid email or password.', 'UNAUTHORIZED', 401);
    }

    // Portal Access Verification
    if (portal === 'AUTHORITY' && userWithPassword.role === 'CITIZEN') {
      console.warn(`[Security Alert] Citizen ${email} attempted to log into Authority Portal.`);
      return createErrorResponse(
        'Access Denied: This portal is restricted to authorized municipal personnel only.',
        'FORBIDDEN',
        403
      );
    }

    const { passwordHash: _, ...userProfile } = userWithPassword;
    const session = createAuthSession(userProfile);

    const response = createSuccessResponse({
      user: userProfile,
      token: session.token,
      message: `Welcome back, ${userProfile.fullName}!`,
    });

    response.cookies.set('civicshield_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (error) {
    console.error('[API /api/auth/login] Exception:', error);
    return createErrorResponse(
      'An unexpected error occurred during login. Please try again.',
      'LOGIN_ERROR',
      500
    );
  }
}

