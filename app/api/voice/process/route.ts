import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { analyzeCivicVoiceIssue, analyzeCivicIssue } from '@/lib/ai/gemini';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { calculatePriorityScore } from '@/lib/priority/priority-engine';

// Default city center (fallback if no geocoding)
const DEFAULT_LAT = 19.0760; // Example: Mumbai
const DEFAULT_LNG = 72.8777;

// These are the only categories allowed by the DB check constraint
const VALID_CATEGORIES = [
  'ROAD_POTHOLE',
  'GARBAGE_OVERFLOW',
  'BROKEN_STREETLIGHT',
  'WATER_LEAKAGE',
  'DRAINAGE_BLOCKAGE',
  'TRAFFIC_SIGNAL_DAMAGED',
  'PUBLIC_INFRA_DAMAGE',
] as const;

// Map any AI-generated category to the closest valid DB category
function sanitizeCategory(raw: string): string {
  if (VALID_CATEGORIES.includes(raw as any)) return raw;
  const upper = raw.toUpperCase();
  if (upper.includes('ROAD') || upper.includes('POTHOLE')) return 'ROAD_POTHOLE';
  if (upper.includes('GARBAGE') || upper.includes('WASTE') || upper.includes('LITTER')) return 'GARBAGE_OVERFLOW';
  if (upper.includes('LIGHT') || upper.includes('LAMP') || upper.includes('ELECTRIC')) return 'BROKEN_STREETLIGHT';
  if (upper.includes('WATER') || upper.includes('PIPE') || upper.includes('FLOOD') || upper.includes('LEAK')) return 'WATER_LEAKAGE';
  if (upper.includes('DRAIN') || upper.includes('SEWER') || upper.includes('SEWAGE')) return 'DRAINAGE_BLOCKAGE';
  if (upper.includes('TRAFFIC') || upper.includes('SIGNAL')) return 'TRAFFIC_SIGNAL_DAMAGED';
  return 'PUBLIC_INFRA_DAMAGE'; // safe default
}


// Extract location from spoken text using keyword patterns
// e.g. "near the market", "at Ambattur station", "opposite the school on main road"
function extractLocationFromSpeech(text: string): string | null {
  if (!text) return null;
  const patterns = [
    /(?:near|beside|next to|adjacent to)\s+([^,.]+)/i,
    /(?:at|in front of|opposite|outside)\s+([^,.]+)/i,
    /(?:on|along|in)\s+([^,.]*(?:road|street|avenue|lane|nagar|colony|bazaar|market|area|station|signal|junction|bridge|flyover)[^,.]*)/i,
    /(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const location = match[1].trim().replace(/\s+/g, ' ');
      if (location.length > 3) return location;
    }
  }
  return null;
}

// Geocode a free-text address using OpenStreetMap Nominatim (no API key needed)
async function geocodeAddress(addressText: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Append city/country hint to improve accuracy for Indian addresses
    const query = encodeURIComponent(`${addressText}, India`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=in`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CivicShield/1.0 (civic-issue-reporting)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.warn('[Voice] Geocoding failed, using default coords:', e);
  }
  return null;
}

// Background processing — runs after we've already responded to Twilio
async function processVoiceReport(speechResult: string, recordingUrl: string | null, fromPhone: string | null) {
  try {
    let analysis: any, isFallback: boolean;
    let textDescription = speechResult || 'Voice report submitted via hotline.';

    if (recordingUrl) {
      const result = await analyzeCivicVoiceIssue(recordingUrl);
      analysis = result.analysis;
      isFallback = result.isFallback;
    } else {
      const result = await analyzeCivicIssue(speechResult || '');
      analysis = result.analysis;
      isFallback = result.isFallback;
      textDescription = speechResult || textDescription;
    }

    const spokenLocation = extractLocationFromSpeech(speechResult || '');
    const address = analysis.extractedAddress || spokenLocation || 'Location unknown (Voice Report)';
    const category = sanitizeCategory(analysis.category || 'PUBLIC_INFRA_DAMAGE');
    const description = analysis.summary || textDescription;

    // Geocode the extracted address to real lat/lng (falls back to city center if not found)
    let latitude = DEFAULT_LAT + (Math.random() * 0.01 - 0.005);
    let longitude = DEFAULT_LNG + (Math.random() * 0.01 - 0.005);
    if (address && address !== 'Location unknown (Voice Report)') {
      const coords = await geocodeAddress(address);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
        console.log(`[Voice] 📍 Geocoded "${address}" -> ${latitude}, ${longitude}`);
      } else {
        console.warn(`[Voice] ⚠️ Could not geocode "${address}", using city default.`);
      }
    }

    const supabase = createAdminClient();

    const priorityResult = calculatePriorityScore({
      category,
      aiSeverity: analysis.severity,
      aiSafetyRiskScore: analysis.safetyRiskScore,
      description,
      addressText: address,
      reportCount: 1,
      affectedCitizensCount: 1,
    });

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const caseId = `CS-VOICE-${randomNum}`;
    const trackingCode = crypto.randomUUID();

    const { data: incident, error: incErr } = await supabase
      .from('incidents')
      .insert({
        case_id: caseId,
        title: `${category.replace(/_/g, ' ')} (Voice Report)`,
        summary: description,
        category,
        severity: analysis.severity,
        status: 'SUBMITTED',
        priority_score: priorityResult.priorityScore,
        latitude,
        longitude,
        address,
        department_id: '11111111-1111-1111-1111-111111111111',
        report_count: 1,
        affected_citizens_count: 1,
        is_duplicate_flagged: false,
      })
      .select()
      .single();

    if (incident) {
      await supabase.from('reports').insert({
        incident_id: incident.id,
        tracking_code: trackingCode,
        raw_description: description,
        audio_url: recordingUrl || null,
        latitude,
        longitude,
        address_text: address,
        reporter_phone: fromPhone,
        is_original_report: true,
      });

      console.log(`[Voice] ✅ Case saved: ${caseId} | Category: ${category} | From: ${fromPhone}`);

      // Attempt SMS (silently fails on trial accounts)
      if (fromPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          await client.messages.create({
            body: `CivicShield: Your issue (Case ${caseId}) has been reported. Thank you for keeping your city safe.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: fromPhone,
          });
        } catch (smsErr: any) {
          console.warn(`[SMS Fallback] ${smsErr.message}`);
        }
      }
    } else {
      console.error('[Voice] ❌ Failed to insert incident:', incErr);
    }
  } catch (err) {
    console.error('[Voice] ❌ Background processing error:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const recordingUrl = formData.get('RecordingUrl') as string | null;
    const speechResult = formData.get('SpeechResult') as string | null;
    const fromPhone = formData.get('From') as string | null;

    if (!recordingUrl && !speechResult) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>No input received. Goodbye.</Say></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // ⚡ Respond to Twilio IMMEDIATELY — do NOT wait for AI or DB
    // Processing happens in background so Twilio never times out
    processVoiceReport(speechResult || '', recordingUrl, fromPhone).catch(console.error);

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you. Your civic report has been received and filed with CivicShield. Goodbye.</Say></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (error) {
    console.error('[Voice] ❌ Error parsing request:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred. Goodbye.</Say></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
}
