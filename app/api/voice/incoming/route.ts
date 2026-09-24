import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(req: NextRequest) {
  try {
    const twiml = new VoiceResponse();

    // Use <Say> to greet the caller
    twiml.say(
      { voice: 'Polly.Matthew-Neural' },
      'Welcome to Civic Shield. Please describe your civic issue and the exact location after the beep. Press the star key when you are finished.'
    );

    // Use <Record> to record the caller's voice
    // The recording will be sent to the process webhook
    twiml.record({
      action: '/api/voice/process',
      method: 'POST',
      maxLength: 120, // Max 2 minutes
      timeout: 10, // Wait 10 seconds for silence instead of 5
      finishOnKey: '*',
      playBeep: true,
    });

    // If the recording fails or they stay silent, we say a fallback message
    twiml.say('We did not receive any input. Goodbye.');

    // Return the XML response directly
    return new NextResponse(twiml.toString(), {
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
