import { UserProfile, UserRole } from '@/types/user';
import crypto from 'crypto';

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt: string;
}

/**
 * Password Hashing Engine using Node.js built-in scrypt Key Derivation Function (KDF)
 * Format: scrypt$<salt_hex>$<hash_hex>
 */
export function hashPassword(password: string, saltHex?: string): string {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  // scrypt key derivation with N=16384, r=8, p=1, derived key length 64 bytes
  const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Legacy SHA-256 hash generator for transparent credential migration support
 */
function hashPasswordLegacySHA256(password: string): string {
  return crypto.createHash('sha256').update(password + '_civicshield_salt_2026').digest('hex');
}

/**
 * PRODUCTION TODO:
 * The current sessionStore uses an in-memory map suitable for single-instance/demo environments.
 * For horizontally scalable multi-node production deployment, replace this with shared session storage
 * (e.g. Redis or Supabase Auth Webhooks).
 */
const sessionStore = new Map<string, AuthSession>();
const userStore = new Map<string, UserProfile & { passwordHash?: string }>();

// Simple in-memory rate limiting map for login/signup abuse protection
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkAuthRateLimit(identifier: string, maxAttempts = 5, windowMs = 60000): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// Seed default accounts using scrypt KDF
function seedDefaultUsers() {
  if (userStore.size > 0) return;

  // Default Citizen Account
  userStore.set('citizen@civicshield.org', {
    id: 'user-citizen-001',
    email: 'citizen@civicshield.org',
    fullName: 'Jane Citizen',
    role: 'CITIZEN',
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('citizen123'),
  });

  // Default Authority Officer Account
  userStore.set('officer@civicshield.gov', {
    id: 'user-officer-001',
    email: 'officer@civicshield.gov',
    fullName: 'Officer Robert Chen',
    role: 'AUTHORITY',
    departmentId: '11111111-1111-1111-1111-111111111111',
    createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('authority123'),
  });

  // Default Admin Account
  userStore.set('admin@civicshield.gov', {
    id: 'user-admin-001',
    email: 'admin@civicshield.gov',
    fullName: 'Director Sarah Vance',
    role: 'ADMIN',
    createdAt: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('admin123'),
  });
}

seedDefaultUsers();

export function getUserByEmail(email: string) {
  seedDefaultUsers();
  return userStore.get(email.toLowerCase().trim());
}

export function registerCitizenUser(fullName: string, email: string, rawPassword: string): UserProfile {
  seedDefaultUsers();
  const cleanEmail = email.toLowerCase().trim();

  if (userStore.has(cleanEmail)) {
    throw new Error('An account with this email address already exists.');
  }

  if (rawPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  // CRITICAL SECURITY HARDENING:
  // Role is strictly hardcoded to 'CITIZEN' on the server.
  // No client-side request parameter can ever escalate role privileges during registration.
  const newUser: UserProfile & { passwordHash?: string } = {
    id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    email: cleanEmail,
    fullName: fullName.trim(),
    role: 'CITIZEN', // STRICT ROLE FORCING
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(rawPassword),
  };

  userStore.set(cleanEmail, newUser);

  const { passwordHash: _, ...publicProfile } = newUser;
  return publicProfile;
}

/**
 * Verifies password against stored scrypt hash with transparent legacy SHA-256 auto-migration
 */
export function verifyUserPassword(userWithPassword: UserProfile & { passwordHash?: string }, rawPassword: string): boolean {
  if (!userWithPassword || !userWithPassword.passwordHash) return false;

  const storedHash = userWithPassword.passwordHash;

  // 1. Scrypt format verification: scrypt$<saltHex>$<derivedKeyHex>
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const saltHex = parts[1];
    const expectedHash = hashPassword(rawPassword, saltHex);
    return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(expectedHash));
  }

  // 2. Legacy SHA-256 format verification with transparent automatic migration to scrypt
  const legacyHash = hashPasswordLegacySHA256(rawPassword);
  const isValidLegacy = crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(legacyHash));

  if (isValidLegacy) {
    // Transparent Migration: Re-hash password using scrypt KDF and update store
    const newScryptHash = hashPassword(rawPassword);
    userWithPassword.passwordHash = newScryptHash;
    userStore.set(userWithPassword.email.toLowerCase().trim(), userWithPassword);
    console.info(`[Auth Migration] Successfully upgraded password hash to scrypt for ${userWithPassword.email}`);
  }

  return isValidLegacy;
}

/**
 * Creates a server session identified by a 256-bit cryptographically secure random token (32 bytes / 64 hex chars).
 */
export function createAuthSession(user: UserProfile): AuthSession {
  // 256-bit cryptographically random token (32 bytes = 256 bits)
  const token = `sess_${user.id}_${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  const session: AuthSession = {
    user,
    token,
    expiresAt,
  };

  sessionStore.set(token, session);
  return session;
}

export function getSessionByToken(token?: string | null): AuthSession | null {
  if (!token) return null;
  const session = sessionStore.get(token);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    sessionStore.delete(token);
    return null;
  }

  return session;
}

export function destroySession(token: string): boolean {
  return sessionStore.delete(token);
}

export function updateUserProfileName(userId: string, newFullName: string): UserProfile | null {
  seedDefaultUsers();
  for (const [email, user] of userStore.entries()) {
    if (user.id === userId) {
      user.fullName = newFullName.trim();
      userStore.set(email, user);
      
      // Update active sessions
      for (const [token, sess] of sessionStore.entries()) {
        if (sess.user.id === userId) {
          sess.user.fullName = newFullName.trim();
        }
      }
      const { passwordHash: _, ...publicProfile } = user;
      return publicProfile;
    }
  }
  return null;
}

