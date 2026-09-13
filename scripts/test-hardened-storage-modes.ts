import { POST } from '../app/api/reports/submit/route';
import { NextRequest } from 'next/server';

async function testStorageModes() {
  console.log('================================================================');
  console.log('  TESTING HARDENED CIVICSHIELD AI STORAGE MODES                 ');
  console.log('================================================================\n');

  // 1. TEST MODE A: Explicit Mock / Demo Mode
  console.log('--- MODE A: Explicit Mock/Demo Mode (CIVICSHIELD_STORAGE_MODE=mock) ---');
  process.env.CIVICSHIELD_STORAGE_MODE = 'mock';

  const reqA = new NextRequest('http://localhost:3000/api/reports/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Deep pothole outside school main gate causing traffic slowdown.',
      latitude: 12.9715987,
      longitude: 77.5945627,
      addressText: 'St. Jude School Road',
    }),
  });

  const resA = await POST(reqA);
  const jsonA = await resA.json();
  console.log('Mode A HTTP Status:', resA.status);
  console.log('Mode A Response Body:', jsonA);

  if (resA.status !== 200 || !jsonA.success || jsonA.data.storageMode !== 'mock') {
    throw new Error('Mode A (Mock) submission failed or returned invalid response!');
  }
  console.log('Mode A PASSED ✓\n');

  // 2. TEST MODE C: Supabase Mode with Connection Failure
  console.log('--- MODE C: Supabase Mode with DB Failure (CIVICSHIELD_STORAGE_MODE=supabase) ---');
  process.env.CIVICSHIELD_STORAGE_MODE = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-key';

  const reqC = new NextRequest('http://localhost:3000/api/reports/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Garbage dump overflow in residential lane.',
      latitude: 12.9725,
      longitude: 77.5955,
      addressText: 'Market Lane 2',
    }),
  });

  const resC = await POST(reqC);
  const jsonC = await resC.json();
  console.log('Mode C HTTP Status:', resC.status);
  console.log('Mode C Response Body:', jsonC);

  if (resC.status !== 503 || jsonC.success !== false) {
    throw new Error('Mode C (DB failure in Supabase mode) should return 503 error instead of silent mock success!');
  }
  if (!jsonC.error?.message?.includes("We're having trouble submitting your report right now")) {
    throw new Error('Mode C did not return expected user-friendly error message!');
  }
  console.log('Mode C Safe Failure PASSED ✓\n');

  // RESET ENV TO DEFAULT MOCK DEMO FOR CONTINUED LOCAL TESTING
  process.env.CIVICSHIELD_STORAGE_MODE = 'mock';

  console.log('================================================================');
  console.log('  ALL HARDENED STORAGE MODE TESTS PASSED 100%                   ');
  console.log('================================================================\n');
}

testStorageModes().catch((err) => {
  console.error('Storage Mode Test Error:', err);
  process.exit(1);
});
