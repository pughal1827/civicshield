import { mockStore, MockTelegramSession } from '@/lib/db/mock-store';
import { createAdminClient } from '@/lib/db/supabase-admin';
import { isMockStorageMode } from '@/lib/db/storage-config';
import { logger } from '@/lib/logging/logger';

export async function getTelegramSession(chatId: number): Promise<MockTelegramSession | null> {
  if (isMockStorageMode()) {
    return mockStore.getTelegramSession(chatId);
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('telegram_sessions')
      .select('*')
      .eq('chat_id', chatId)
      .maybeSingle();

    if (error || !data) return null;
    return data as MockTelegramSession;
  } catch (err) {
    logger.error('TelegramSession', 'Failed to get session from DB', { error: String(err) });
    return null;
  }
}

export async function setTelegramSession(session: MockTelegramSession): Promise<void> {
  if (isMockStorageMode()) {
    mockStore.setTelegramSession(session);
    return;
  }

  try {
    const supabase = createAdminClient();
    await supabase
      .from('telegram_sessions')
      .upsert({
        chat_id: session.chat_id,
        state: session.state,
        temp_data: session.temp_data,
        updated_at: session.updated_at
      });
  } catch (err) {
    logger.error('TelegramSession', 'Failed to set session in DB', { error: String(err) });
  }
}

export async function clearTelegramSession(chatId: number): Promise<void> {
  if (isMockStorageMode()) {
    mockStore.clearTelegramSession(chatId);
    return;
  }

  try {
    const supabase = createAdminClient();
    await supabase
      .from('telegram_sessions')
      .delete()
      .eq('chat_id', chatId);
  } catch (err) {
    logger.error('TelegramSession', 'Failed to clear session in DB', { error: String(err) });
  }
}
