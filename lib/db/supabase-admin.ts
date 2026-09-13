import { createClient } from '@supabase/supabase-js';
import { assertProductionDatabaseAvailable } from './storage-config';

// WARNING: This client uses the SUPABASE_SERVICE_ROLE_KEY and must ONLY be invoked in server-side API routes or Server Actions.
export function createAdminClient() {
  assertProductionDatabaseAvailable();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV === 'production') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in production environment.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

