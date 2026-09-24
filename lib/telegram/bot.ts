import { getStorageConfig } from '../db/storage-config';

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramMessage(chatId: number, text: string, options?: any) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('sendTelegramMessage called but no bot token configured.');
    return null;
  }
  
  const payload = {
    chat_id: chatId,
    text,
    ...options
  };

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (error) {
    console.error('Error sending telegram message:', error);
    return null;
  }
}

export async function sendTelegramPhoto(chatId: number, photoUrl: string, caption?: string, options?: any) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  
  const payload = {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption || '',
    ...options
  };

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (error) {
    console.error('Error sending telegram photo:', error);
    return null;
  }
}

export async function getTelegramFileBase64(fileId: string): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) return null;

  try {
    // 1. Get file path
    const fileRes = await fetch(`${TELEGRAM_API_BASE}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();

    if (!fileData.ok) {
      console.error('Failed to get file from telegram:', fileData);
      return null;
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

    // 2. Download file
    const imgRes = await fetch(downloadUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 3. Convert to base64 data URI
    const mimeType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error downloading telegram file:', error);
    return null;
  }
}

export async function setTelegramWebhook(url: string) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  const res = await fetch(`${TELEGRAM_API_BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return await res.json();
}

export async function editMessageReplyMarkup(chatId: number, messageId: number, replyMarkup: any) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  const res = await fetch(`${TELEGRAM_API_BASE}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup
    })
  });
  return await res.json();
}
