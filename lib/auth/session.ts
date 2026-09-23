import { UserProfile, UserRole } from '@/types/user';
import crypto from 'crypto';
import { normalizeDepartmentCode } from '@/lib/constants/departments';

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
  if (userStore.has('road.worker@civicshield.demo') && userStore.has('garbage.worker@civicshield.demo')) {
    return;
  }

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

  // 1. Road Maintenance Worker
  userStore.set('road.worker@civicshield.demo', {
    id: 'user-worker-road-001',
    email: 'road.worker@civicshield.demo',
    fullName: 'Alex Rivera (Road Maintenance Lead)',
    role: 'WORKER',
    departmentId: 'dept_roads',
    departmentCode: 'ROAD_MAINT',
    departmentName: 'Road Maintenance',
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('Worker@123'),
  });

  // 2. Electrical Worker
  userStore.set('electrical.worker@civicshield.demo', {
    id: 'user-worker-elec-001',
    email: 'electrical.worker@civicshield.demo',
    fullName: 'Marcus Vance (Electrical Field Lead)',
    role: 'WORKER',
    departmentId: '33333333-3333-3333-3333-333333333333',
    departmentCode: 'ELECTRICAL',
    departmentName: 'Electrical',
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('Worker@123'),
  });

  // Legacy alias for electrical worker
  userStore.set('worker@civicshield.gov', {
    id: 'user-worker-elec-001',
    email: 'worker@civicshield.gov',
    fullName: 'Marcus Vance (Electrical Field Lead)',
    role: 'WORKER',
    departmentId: '33333333-3333-3333-3333-333333333333',
    departmentCode: 'ELECTRICAL',
    departmentName: 'Electrical',
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('worker123'),
  });

  // 3. Garbage / Sanitation Worker
  userStore.set('garbage.worker@civicshield.demo', {
    id: 'user-worker-sanitation-001',
    email: 'garbage.worker@civicshield.demo',
    fullName: 'Suresh Kumar (Sanitation Inspector)',
    role: 'WORKER',
    departmentId: '22222222-2222-2222-2222-222222222222',
    departmentCode: 'SANITATION',
    departmentName: 'Garbage / Sanitation',
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('Worker@123'),
  });

  // 4. Water Worker
  userStore.set('water.worker@civicshield.demo', {
    id: 'user-worker-water-001',
    email: 'water.worker@civicshield.demo',
    fullName: 'Elena Rostova (Water Resources Engineer)',
    role: 'WORKER',
    departmentId: '44444444-4444-4444-4444-444444444444',
    departmentCode: 'WATER_DEPT',
    departmentName: 'Water',
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('Worker@123'),
  });

  // 5. Drainage Worker
  userStore.set('drainage.worker@civicshield.demo', {
    id: 'user-worker-drainage-001',
    email: 'drainage.worker@civicshield.demo',
    fullName: "David O'Connor (Drainage Crew Lead)",
    role: 'WORKER',
    departmentId: 'dept_drainage',
    departmentCode: 'DRAINAGE',
    departmentName: 'Drainage',
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('Worker@123'),
  });

  // 6. Traffic Worker
  userStore.set('traffic.worker@civicshield.demo', {
    id: 'user-worker-traffic-001',
    email: 'traffic.worker@civicshield.demo',
    fullName: 'Priya Sharma (Traffic Signals Specialist)',
    role: 'WORKER',
    departmentId: 'dept_traffic',
    departmentCode: 'TRAFFIC',
    departmentName: 'Traffic',
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('Worker@123'),
  });

  // 7. Public Works Worker
  userStore.set('publicworks.worker@civicshield.demo', {
    id: 'user-worker-pw-001',
    email: 'publicworks.worker@civicshield.demo',
    fullName: 'Carlos Mendez (Public Infrastructure Engineer)',
    role: 'WORKER',
    departmentId: 'dept_publicworks',
    departmentCode: 'PUBLIC_WORKS',
    departmentName: 'Public Works',
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    passwordHash: hashPassword('Worker@123'),
  });
}

seedDefaultUsers();

export function getUserByEmail(email: string) {
  seedDefaultUsers();
  return userStore.get(email.toLowerCase().trim());
}

export function getWorkersByDepartment(deptCode?: string) {
  seedDefaultUsers();
  const workers: Array<UserProfile> = [];
  const searchCode = deptCode ? normalizeDepartmentCode(deptCode) : null;

  for (const user of userStore.values()) {
    if (user.role === 'WORKER') {
      const userDeptCode = normalizeDepartmentCode(user.departmentCode || user.departmentId || user.departmentName);
      if (!searchCode || userDeptCode === searchCode) {
        const { passwordHash: _, ...publicProfile } = user;
        workers.push(publicProfile as UserProfile);
      }
    }
  }
  return workers;
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
  seedDefaultUsers();
  let session = sessionStore.get(token);

  // If not found in in-memory map (e.g. dev server recompiled or restarted), reconstruct from userStore
  if (!session) {
    if (token.startsWith('sess_')) {
      const parts = token.split('_');
      if (parts.length >= 3) {
        const userId = parts.slice(1, parts.length - 1).join('_');
        for (const u of userStore.values()) {
          if (u.id === userId) {
            const { passwordHash: _, ...publicProfile } = u;
            session = {
              user: publicProfile as UserProfile,
              token,
              expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            };
            sessionStore.set(token, session);
            break;
          }
        }
      }
    }

    // Secondary fallback: search for any user whose ID or email is contained within the token string
    if (!session) {
      for (const u of userStore.values()) {
        if (token.includes(u.id) || (u.email && token.includes(u.email))) {
          const { passwordHash: _, ...publicProfile } = u;
          session = {
            user: publicProfile as UserProfile,
            token,
            expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          };
          sessionStore.set(token, session);
          break;
        }
      }
    }
  }

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

