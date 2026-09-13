import { NextRequest } from 'next/server';
import { z } from 'zod';
import { registerCitizenUser, createAuthSession, checkAuthRateLimit } from '@/lib/auth/session';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-error';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirmPassword: z.string().optional(),
  // Note: Client attempts to send role are explicitly ignored by schema and server!
  role: z.string().optional(),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkAuthRateLimit(`signup_${ip}`, 5, 60000);

    if (!rateLimit.allowed) {
      return createErrorResponse(
        `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        'TOO_MANY_REQUESTS',
        429
      );
    }

    const body = await req.json();

    // 1. CRITICAL SECURITY RULE: Reject or override any client attempt to specify role=AUTHORITY
    if (body.role && body.role !== 'CITIZEN') {
      console.warn(`[Security Alert] Client attempt to specify role="${body.role}" on public signup rejected.`);
    }

    const parseResult = signupSchema.safeParse(body);
    if (!parseResult.success) {
      return createErrorResponse('Invalid registration details.', 'VALIDATION_ERROR', 400, parseResult.error.format());
    }

    const { fullName, email, password } = parseResult.data;

    // 2. Register user with forced 'CITIZEN' role
    const newUser = registerCitizenUser(fullName, email, password);

    // 3. Create Session Token
    const session = createAuthSession(newUser);

    const response = createSuccessResponse({
      user: newUser,
      token: session.token,
      message: 'Account created successfully! Welcome to CivicShield AI.',
    });

    // Set secure HTTP-only session cookie
    response.cookies.set('civicshield_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (error) {
    console.error('[API /api/auth/signup] Exception:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to create account.',
      'REGISTRATION_ERROR',
      400
    );
  }
}

