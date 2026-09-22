import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: NextRequest) {
  try {
    const baseUrl = process.env.NGROK_URL || 'https://universal-garbage-amenity.ngrok-free.dev';
    const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew-Neural">Welcome to Civic Shield. Please describe your civic issue and the exact location after the beep. Press the star key when you are finished.</Say>
  <Gather input="speech" action="${baseUrl}/api/voice/process" method="POST" timeout="5" speechTimeout="auto"></Gather>
  <Say>We did not receive any input. Goodbye.</Say>
</Response>`;

    // Return the XML response directly
    return new NextResponse(rawXml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error generating TwiML for incoming call:', error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred. Goodbye.</Say></Response>',
      { headers: { 'Content-Type': 'text/xml' }, status: 500 }
    );
  }
}
