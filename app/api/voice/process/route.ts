import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { analyzeCivicVoiceIssue } from '@/lib/ai/gemini';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { calculatePriorityScore } from '@/lib/priority/priority-engine';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Default city center (fallback if no geocoding)
const DEFAULT_LAT = 19.0760; // Example: Mumbai
const DEFAULT_LNG = 72.8777;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const recordingUrl = formData.get('RecordingUrl') as string;
    const fromPhone = formData.get('From') as string;

    const twiml = new VoiceResponse();

    if (!recordingUrl) {
      twiml.say('No recording received. Goodbye.');
      return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    // 1. Analyze the voice recording using Gemini 2.5 Flash native audio
    const { analysis, isFallback } = await analyzeCivicVoiceIssue(recordingUrl);

    const address = analysis.extractedAddress || 'Location unknown (Voice Report)';
    const category = analysis.category || 'PUBLIC_INFRA_DAMAGE';
    const description = analysis.summary || 'Voice report submitted via hotline.';

    // 2. Simple mock geocoding (in a real app, call Google Maps API here)
    const latitude = DEFAULT_LAT + (Math.random() * 0.01 - 0.005);
    const longitude = DEFAULT_LNG + (Math.random() * 0.01 - 0.005);

    // 3. Save to database using Supabase Admin client
    const supabase = createAdminClient();
    
    // Priority calculation
    const priorityResult = calculatePriorityScore({
      category: category,
      aiSeverity: analysis.severity,
      aiSafetyRiskScore: analysis.safetyRiskScore,
      description: description,
      addressText: address,
      reportCount: 1,
      affectedCitizensCount: 1,
    });

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const caseId = `CS-VOICE-${randomNum}`;
    const trackingCode = crypto.randomUUID();

    // Map department
    const deptObj = { id: '11111111-1111-1111-1111-111111111111', code: 'ROAD_MAINT' }; // Simplified fallback

    const { data: incident, error: incErr } = await supabase
      .from('incidents')
      .insert({
        case_id: caseId,
        title: `${category.replace(/_/g, ' ')} (Voice Report)`,
        summary: description,
        category: category,
        severity: analysis.severity,
        status: 'SUBMITTED',
        priority_score: priorityResult.priorityScore,
        latitude,
        longitude,
        address: address,
        department_id: deptObj.id,
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
        audio_url: recordingUrl,
        latitude,
        longitude,
        address_text: address,
        reporter_phone: fromPhone, // Using the new column we added
        is_original_report: true,
      });

      // 4. Send SMS to the caller with the tracking code
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          await client.messages.create({
            body: `CivicShield: Your issue has been reported (Case ${caseId}). Track it here: https://civicshield.app/track/${trackingCode}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: fromPhone,
          });
        } catch (smsErr) {
          console.error('Failed to send tracking SMS:', smsErr);
        }
      }

      twiml.say('Thank you. Your report has been successfully filed. We have sent you a text message with your tracking link. Goodbye.');
    } else {
      console.error('Failed to insert incident from voice:', incErr);
      twiml.say('Sorry, there was a problem saving your report. Please try again later.');
    }

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error processing voice recording:', error);
    const errorTwiml = new VoiceResponse();
    errorTwiml.say('Sorry, an unexpected error occurred while processing your report. Goodbye.');
    return new NextResponse(errorTwiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }
}
