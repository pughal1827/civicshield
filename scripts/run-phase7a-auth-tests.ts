import { registerCitizenUser, getUserByEmail, createAuthSession, getSessionByToken, hashPassword, verifyUserPassword } from '../lib/auth/session';
import { POST as signupHandler } from '../app/api/auth/signup/route';
import { POST as loginHandler } from '../app/api/auth/login/route';
import { POST as logoutHandler } from '../app/api/auth/logout/route';
import { GET as meHandler } from '../app/api/auth/me/route';
import { POST as mergeHandler } from '../app/api/incidents/merge/route';
import { PATCH as updateIncidentHandler } from '../app/api/incidents/[id]/route';
import { POST as submitReportHandler } from '../app/api/reports/submit/route';
import { GET as nearbyHandler } from '../app/api/citizen/nearby/route';
import { NextRequest } from 'next/server';

interface AuthTestResult {
  testId: number;
  category: string;
  name: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

export async function runPhase7AAuthSecurityTests(): Promise<AuthTestResult[]> {
  console.log('=== RUNNING PHASE 7A.2 FINAL AUTHENTICATION & SECURITY HARDENING TEST SUITE (16/16) ===\n');

  const results: AuthTestResult[] = [];

  // TEST 1: Citizen Signup
  try {
    const email = `citizen_test_${Date.now()}@example.com`;
    const req = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'New Citizen User',
        email,
        password: 'securePassword123!',
        confirmPassword: 'securePassword123!',
      }),
    });

    const res = await signupHandler(req);
    const json = await res.json();
    const pass = res.status === 200 && json.success && json.data?.user?.role === 'CITIZEN';

    results.push({
      testId: 1,
      category: 'Citizen Signup',
      name: 'Valid Citizen Registration',
      expected: 'Returns 200 OK with CITIZEN role',
      actual: pass ? `Registered ${email}` : `Failed: status ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 1, category: 'Citizen Signup', name: 'Valid Citizen Registration', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 2: Citizen Login
  try {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen@civicshield.org',
        password: 'citizen123',
        portal: 'CITIZEN',
      }),
    });

    const res = await loginHandler(req);
    const json = await res.json();
    const pass = res.status === 200 && json.success && json.data?.user?.role === 'CITIZEN';

    results.push({
      testId: 2,
      category: 'Citizen Login',
      name: 'Citizen Login & Session Token Generation',
      expected: 'Returns 200 OK with valid citizen session token',
      actual: pass ? `Logged in as ${json.data?.user?.email}` : `Failed: ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 2, category: 'Citizen Login', name: 'Citizen Login Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 3: Wrong Password
  try {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen@civicshield.org',
        password: 'wrongPassword999',
        portal: 'CITIZEN',
      }),
    });

    const res = await loginHandler(req);
    const json = await res.json();
    const pass = res.status === 401 && json.error?.message === 'Invalid email or password.';

    results.push({
      testId: 3,
      category: 'Wrong Password',
      name: 'Authentication Failure Message Sanitization',
      expected: 'Returns 401 with generic "Invalid email or password."',
      actual: pass ? '401 Unauthorized with generic message returned' : `Failed: status ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 3, category: 'Wrong Password', name: 'Wrong Password Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 4: Citizen Logout
  try {
    const citizenUser = getUserByEmail('citizen@civicshield.org')!;
    const session = createAuthSession(citizenUser);

    const req = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        'Cookie': `civicshield_session=${session.token}`,
      },
    });

    const res = await logoutHandler(req);
    const isValidAfterLogout = getSessionByToken(session.token);
    const pass = res.status === 200 && isValidAfterLogout === null;

    results.push({
      testId: 4,
      category: 'Citizen Logout',
      name: 'Server-Side Session Revocation on Logout',
      expected: 'Returns 200 OK and invalidates session token from store',
      actual: pass ? 'Session invalidated successfully' : 'Session still active after logout!',
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 4, category: 'Citizen Logout', name: 'Citizen Logout Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 5: Session Persistence
  try {
    const citizenUser = getUserByEmail('citizen@civicshield.org')!;
    const session = createAuthSession(citizenUser);

    const req = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        'Cookie': `civicshield_session=${session.token}`,
      },
    });

    const res = await meHandler(req);
    const json = await res.json();
    const pass = res.status === 200 && json.data?.user?.email === 'citizen@civicshield.org';

    results.push({
      testId: 5,
      category: 'Session Persistence',
      name: 'Active Session Identity Resolution (/api/auth/me)',
      expected: 'Returns 200 OK with authenticated user profile',
      actual: pass ? `Resolved identity ${json.data?.user?.email}` : `Failed: status ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 5, category: 'Session Persistence', name: 'Session Persistence Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 6: Citizen -> Authority Denial
  try {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen@civicshield.org',
        password: 'citizen123',
        portal: 'AUTHORITY',
      }),
    });

    const res = await loginHandler(req);
    const pass = res.status === 403;

    results.push({
      testId: 6,
      category: 'Authority Denial',
      name: 'Citizen Login to Authority Portal Prohibition',
      expected: 'Returns 403 Forbidden',
      actual: pass ? '403 Forbidden access denied returned' : `Failed status: ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 6, category: 'Authority Denial', name: 'Citizen Portal Denial Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 7: Citizen -> Authority API Denial
  try {
    const citizenUser = getUserByEmail('citizen@civicshield.org')!;
    const citizenSess = createAuthSession(citizenUser);

    const req = new NextRequest('http://localhost:3000/api/incidents/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `civicshield_session=${citizenSess.token}`,
        'x-user-role': 'CITIZEN',
      },
      body: JSON.stringify({ action: 'CONFIRM_MERGE' }),
    });

    const res = await mergeHandler(req);
    const pass = res.status === 403;

    results.push({
      testId: 7,
      category: 'Authority API Denial',
      name: 'Citizen Authority Incident Merge API Prohibition',
      expected: 'Returns 403 Forbidden',
      actual: pass ? '403 Forbidden returned correctly' : `Failed status: ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 7, category: 'Authority API Denial', name: 'Citizen API Denial Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 8: Authority Login
  try {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'officer@civicshield.gov',
        password: 'authority123',
        portal: 'AUTHORITY',
      }),
    });

    const res = await loginHandler(req);
    const json = await res.json();
    const pass = res.status === 200 && json.success && (json.data?.user?.role === 'AUTHORITY' || json.data?.user?.role === 'ADMIN');

    results.push({
      testId: 8,
      category: 'Authority Login',
      name: 'Official Authority Login & Portal Verification',
      expected: 'Returns 200 OK with valid authority session',
      actual: pass ? `Logged in as ${json.data?.user?.email} (${json.data?.user?.role})` : `Failed: status ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 8, category: 'Authority Login', name: 'Authority Login Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 9: Authority Route Access
  try {
    const officerUser = getUserByEmail('officer@civicshield.gov')!;
    const officerSess = createAuthSession(officerUser);

    const req = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        'Cookie': `civicshield_session=${officerSess.token}`,
      },
    });

    const res = await meHandler(req);
    const json = await res.json();
    const pass = res.status === 200 && json.data?.user?.role === 'AUTHORITY';

    results.push({
      testId: 9,
      category: 'Authority Route Access',
      name: 'Authority Protected Identity Verification',
      expected: 'Returns 200 OK with AUTHORITY role',
      actual: pass ? `Authorized authority role ${json.data?.user?.role}` : `Failed: status ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 9, category: 'Authority Route Access', name: 'Authority Route Access Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 10: Authority API Access
  try {
    const officerUser = getUserByEmail('officer@civicshield.gov')!;
    const officerSess = createAuthSession(officerUser);

    const req = new NextRequest('http://localhost:3000/api/incidents/inc-1001-open-manhole', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `civicshield_session=${officerSess.token}`,
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });

    const params = Promise.resolve({ id: 'inc-1001-open-manhole' });
    const res = await updateIncidentHandler(req, { params });
    const pass = res.status === 200 || res.status === 404; // Route handler authorizes before DB check

    results.push({
      testId: 10,
      category: 'Authority API Access',
      name: 'Authority Role Incident Update Authorization',
      expected: 'Permits status update for authority role',
      actual: pass ? `Authorized status update (Response ${res.status})` : `Denied: status ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 10, category: 'Authority API Access', name: 'Authority API Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 11: Role Escalation Attempt
  try {
    const req = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Attacker User',
        email: `attacker_${Date.now()}@test.org`,
        password: 'password123!',
        role: 'AUTHORITY',
      }),
    });

    const res = await signupHandler(req);
    const json = await res.json();
    const pass = json.success && json.data?.user?.role === 'CITIZEN';

    results.push({
      testId: 11,
      category: 'Role Escalation Attempt',
      name: 'Client Role Escalation Override Protection',
      expected: 'Forces role = CITIZEN regardless of client payload',
      actual: pass ? `Server forced role to ${json.data?.user?.role}` : 'Escalation occurred!',
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 11, category: 'Role Escalation Attempt', name: 'Role Escalation Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 12: Fake Authority Role Attempt
  try {
    const req = new NextRequest('http://localhost:3000/api/incidents/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'AUTHORITY', // Header spoofing attempt without session token!
      },
      body: JSON.stringify({ action: 'CONFIRM_MERGE' }),
    });

    const res = await mergeHandler(req);
    const pass = res.status === 401;

    results.push({
      testId: 12,
      category: 'Fake Authority Role Attempt',
      name: 'Header Spoofing Without Session Rejection',
      expected: 'Returns 401 Unauthorized',
      actual: pass ? '401 Unauthorized returned correctly' : `Failed status: ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 12, category: 'Fake Authority Role Attempt', name: 'Header Spoof Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 13: Forged Session Attempt
  try {
    const req = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        'Cookie': 'civicshield_session=sess_forged_fake_token_1234567890',
      },
    });

    const res = await meHandler(req);
    const pass = res.status === 401;

    results.push({
      testId: 13,
      category: 'Forged Session Attempt',
      name: 'Forged / Non-existent Session Token Rejection',
      expected: 'Returns 401 Unauthorized',
      actual: pass ? '401 Unauthorized returned' : `Failed status: ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 13, category: 'Forged Session Attempt', name: 'Forged Session Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 14: Password Hash Security
  try {
    const officerUser = getUserByEmail('officer@civicshield.gov')!;
    const hash = officerUser.passwordHash || '';
    const pass = hash.startsWith('scrypt$') && hash.split('$').length === 3;

    results.push({
      testId: 14,
      category: 'Password Hash Security',
      name: 'scrypt Key Derivation Function Verification',
      expected: 'Stored password uses scrypt$<saltHex>$<derivedKeyHex>',
      actual: pass ? `Verified scrypt hash format (${hash.slice(0, 20)}...)` : `Insecure hash format: ${hash}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 14, category: 'Password Hash Security', name: 'Password Hash Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 15: Anonymous Reporting
  try {
    const req = new NextRequest('http://localhost:3000/api/reports/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Anonymous report check: water pipe burst on Main St.',
        latitude: 12.9715,
        longitude: 77.5945,
        addressText: 'Main St & 4th Cross',
      }),
    });

    const res = await submitReportHandler(req);
    const json = await res.json();
    const pass = res.status === 200 && json.success && Boolean(json.data?.caseId);

    results.push({
      testId: 15,
      category: 'Anonymous Reporting',
      name: 'Unauthenticated Anonymous Incident Submission Continuity',
      expected: 'Permits anonymous reporting without breaking flow',
      actual: pass ? `Case ID ${json.data?.caseId} created` : `Failed status: ${res.status}`,
      status: pass ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 15, category: 'Anonymous Reporting', name: 'Anonymous Reporting Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  // TEST 16: Login Abuse / Rate Limiting
  try {
    let triggeredRateLimit = false;
    for (let i = 0; i < 12; i++) {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '198.51.100.99', // Test IP
        },
        body: JSON.stringify({
          email: 'citizen@civicshield.org',
          password: 'badPassword',
          portal: 'CITIZEN',
        }),
      });

      const res = await loginHandler(req);
      if (res.status === 429) {
        triggeredRateLimit = true;
        break;
      }
    }

    results.push({
      testId: 16,
      category: 'Abuse Protection',
      name: 'Login Attempt Rate Limiting (HTTP 429)',
      expected: 'Returns 429 Too Many Requests when login threshold exceeded',
      actual: triggeredRateLimit ? 'HTTP 429 Too Many Requests triggered successfully' : 'Rate limit not triggered',
      status: triggeredRateLimit ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    results.push({ testId: 16, category: 'Abuse Protection', name: 'Rate Limit Check', expected: 'PASS', actual: String(err), status: 'FAIL' });
  }

  console.table(results);
  return results;
}

if (require.main === module) {
  runPhase7AAuthSecurityTests()
    .then((res) => {
      const failed = res.filter((r) => r.status === 'FAIL');
      if (failed.length > 0) {
        console.error(`\n${failed.length} Auth Security Tests Failed!`);
        process.exit(1);
      }
      console.log('\nALL 16 AUTHENTICATION & SECURITY HARDENING TESTS PASSED 100% ✓\n');
    })
    .catch((err) => {
      console.error('Auth test execution error:', err);
      process.exit(1);
    });
}
