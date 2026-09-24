import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage, getTelegramFileBase64 } from '@/lib/telegram/bot';
import { getTelegramSession, setTelegramSession, clearTelegramSession } from '@/lib/telegram/session';
import { logger } from '@/lib/logging/logger';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    if (update.callback_query) {
      return await handleCallbackQuery(update.callback_query, req);
    }

    // If it's not a message update, just return 200 to acknowledge
    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text || '';

    // Load user session
    let session = await getTelegramSession(chatId);
    
    if (text === '/start' || text === '/report') {
      // Start a new reporting session
      await setTelegramSession({
        chat_id: chatId,
        state: 'AWAITING_PHOTO',
        temp_data: {},
        updated_at: new Date().toISOString()
      });
      await sendTelegramMessage(chatId, "Welcome to CivicShield AI! 🛡️\n\nLet's get this civic issue reported. Please reply with a **photo** of the issue.");
      return NextResponse.json({ ok: true });
    }

    if (text === '/cancel') {
      await clearTelegramSession(chatId);
      await sendTelegramMessage(chatId, "Report cancelled. You can start a new one anytime with /report.");
      return NextResponse.json({ ok: true });
    }

    if (!session) {
      await sendTelegramMessage(chatId, "I didn't understand that. Please type /report to start submitting a civic issue.");
      return NextResponse.json({ ok: true });
    }

    // STATE MACHINE
    switch (session.state) {
      case 'AWAITING_PHOTO':
        if (message.photo && message.photo.length > 0) {
          // Telegram sends multiple sizes, get the largest one
          const largestPhoto = message.photo[message.photo.length - 1];
          const fileId = largestPhoto.file_id;
          
          await sendTelegramMessage(chatId, "Downloading your photo, please wait...");
          const base64Image = await getTelegramFileBase64(fileId);
          
          if (!base64Image) {
            await sendTelegramMessage(chatId, "Sorry, I couldn't process that photo. Please try sending another one.");
            return NextResponse.json({ ok: true });
          }

          // Advance state
          session.temp_data.imageUrl = base64Image;
          
          // Also capture caption if provided
          if (message.caption) {
             session.temp_data.description = message.caption;
          }

          session.state = 'AWAITING_LOCATION';
          await setTelegramSession(session);
          
          await sendTelegramMessage(chatId, "Photo received! 📸\n\nNext, please tap the attachment (📎) icon and send your **Location**.");
        } else {
          await sendTelegramMessage(chatId, "Please send a photo of the issue. (You can type /cancel to stop)");
        }
        break;

      case 'AWAITING_LOCATION':
        if (message.location) {
          session.temp_data.latitude = message.location.latitude;
          session.temp_data.longitude = message.location.longitude;
          
          // Advance state
          if (session.temp_data.description) {
            // Already got description from the photo caption! We can skip AWAITING_DESCRIPTION.
            session.state = 'READY_TO_SUBMIT';
            await setTelegramSession(session);
            // Fallthrough to submission
            return await submitReportFromSession(chatId, session, req);
          } else {
            session.state = 'AWAITING_DESCRIPTION';
            await setTelegramSession(session);
            await sendTelegramMessage(chatId, "Location received! 📍\n\nFinally, please type a short description or send a voice note describing the problem.");
          }
        } else {
          await sendTelegramMessage(chatId, "Please use Telegram's attachment menu (📎) to send your Location. (Type /cancel to stop)");
        }
        break;

      case 'AWAITING_DESCRIPTION':
        let description = '';
        if (message.text) {
           description = message.text;
        } else if (message.voice) {
           // For MVP without full whisper transcription integration, we just placeholder the voice.
           // In a full integration we'd download the voice OGG and run it through a speech-to-text API.
           description = "User submitted a voice note via Telegram.";
        } else {
           await sendTelegramMessage(chatId, "Please send a text description or voice note. (Type /cancel to stop)");
           return NextResponse.json({ ok: true });
        }

        session.temp_data.description = description;
        session.state = 'READY_TO_SUBMIT';
        await setTelegramSession(session);
        
        return await submitReportFromSession(chatId, session, req);

      default:
        await clearTelegramSession(chatId);
        await sendTelegramMessage(chatId, "Session expired or invalid state. Type /report to start again.");
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing telegram webhook:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to telegram to stop retries
  }
}

async function submitReportFromSession(chatId: number, session: any, req: NextRequest) {
  try {
    await sendTelegramMessage(chatId, "Processing your report using CivicShield AI... 🤖\nThis usually takes a few seconds.");
    
    // Call our internal submit API
    // Note: In Next.js App Router, calling internal API routes via full URL during SSR can sometimes be tricky.
    // Since we're in an API route, we can actually just invoke the same logic, but for simplicity we'll try a local fetch.
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    const baseUrl = `${protocol}://${host}`;
    const internalUrl = `http://localhost:${process.env.PORT || 3000}`;

    const submitRes = await fetch(`${internalUrl}/api/reports/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-citizen-id': `telegram-${chatId}`,
        'Bypass-Tunnel-Reminder': 'true'
      },
      body: JSON.stringify({
        description: session.temp_data.description,
        imageUrl: session.temp_data.imageUrl,
        latitude: session.temp_data.latitude,
        longitude: session.temp_data.longitude,
        addressText: "Location extracted from Telegram" // Will be overridden or augmented by reverse geocoding if implemented
      })
    });

    const result = await submitRes.json();

    if (!submitRes.ok || !result.success) {
      console.error("Internal submit failed:", result);
      await sendTelegramMessage(chatId, "Failed to submit your report to the core engine. Please try again later.");
      await clearTelegramSession(chatId);
      return NextResponse.json({ ok: true });
    }

    const { caseId, trackingCode } = result.data;
    const trackingUrl = `${baseUrl}/track/${trackingCode}`;

    const msg = `✅ **Report Submitted Successfully!**\n\n` +
                `**Case ID:** ${caseId}\n\n` +
                `Our AI has processed your report and assigned it to the appropriate department.\n\n` +
                `Track live progress here:\n${trackingUrl}`;

    await sendTelegramMessage(chatId, msg, { parse_mode: 'Markdown' });
    
    // Clear session
    await clearTelegramSession(chatId);
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('TelegramSubmit', 'Failed to bridge session to submit API', { error: String(err) });
    await sendTelegramMessage(chatId, "An unexpected error occurred while processing your report.");
    await clearTelegramSession(chatId);
    return NextResponse.json({ ok: true });
  }
}

async function handleCallbackQuery(callbackQuery: any, req: NextRequest) {
  const { data, message } = callbackQuery;
  const chatId = message.chat.id;
  const messageId = message.message_id;

  if (!data.startsWith('verify_') && !data.startsWith('reject_')) {
    return NextResponse.json({ ok: true });
  }

  const isVerify = data.startsWith('verify_');
  const incidentId = data.replace('verify_', '').replace('reject_', '');
  const newStatus = isVerify ? 'VERIFIED' : 'EVIDENCE_REJECTED';

  try {
    const { editMessageReplyMarkup, sendTelegramMessage } = await import('@/lib/telegram/bot');
    const { getStorageConfig } = await import('@/lib/db/storage-config');
    const config = getStorageConfig();

    // 1. Remove the buttons
    await editMessageReplyMarkup(chatId, messageId, { inline_keyboard: [] });

    // 2. Update DB
    if (config.isMock) {
      const { mockStore } = await import('@/lib/db/mock-store');
      mockStore.updateIncident(incidentId, {
        status: newStatus,
        changed_at: new Date().toISOString(),
        changed_by: `Citizen (Telegram ${chatId})`
      });
    } else {
      const { createAdminClient } = await import('@/lib/db/supabase-admin');
      const supabase = createAdminClient();
      await supabase.from('incidents').update({
        status: newStatus,
        updated_at: new Date().toISOString()
      }).eq('id', incidentId);
    }

    // 3. Acknowledge to user
    const text = isVerify 
      ? "✅ Thank you! You've successfully verified this fix. The case is now closed."
      : "❌ Got it. We've pushed this back to the municipal authorities to re-investigate.";
    
    await sendTelegramMessage(chatId, text);
    
  } catch (error) {
    logger.error('TelegramWebhook', 'Failed to handle callback query', { error: String(error) });
  }

  return NextResponse.json({ ok: true });
}
