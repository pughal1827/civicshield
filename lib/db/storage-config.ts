export type AppMode = 'demo' | 'production';
export type StorageMode = 'mock' | 'supabase';

export interface StorageConfig {
  appMode: AppMode;
  mode: StorageMode;
  isMock: boolean;
  isSupabase: boolean;
  supabaseConfigured: boolean;
}

export function getAppMode(): AppMode {
  const envAppMode = (process.env.CIVICSHIELD_MODE || '').toLowerCase().trim();
  const envStorageMode = (process.env.CIVICSHIELD_STORAGE_MODE || '').toLowerCase().trim();

  if (envAppMode === 'production' || envStorageMode === 'production' || envStorageMode === 'supabase') {
    return 'production';
  }
  
  if (envAppMode === 'demo' || envStorageMode === 'demo' || envStorageMode === 'mock') {
    return 'demo';
  }

  // Default mode
  return 'demo';
}

export function getStorageConfig(): StorageConfig {
  const appMode = getAppMode();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const isPlaceholderUrl = !supabaseUrl || supabaseUrl.includes('placeholder.supabase.co');
  const isPlaceholderKey = !serviceRoleKey || serviceRoleKey.includes('placeholder');
  const supabaseConfigured = !isPlaceholderUrl && !isPlaceholderKey;

  let mode: StorageMode;

  if (appMode === 'production') {
    // Production MUST use Supabase storage. Unconfigured DB in production fails closed.
    mode = 'supabase';
  } else {
    // Demo mode: uses mock store by default unless Supabase is explicitly configured and requested
    const envStorageMode = (process.env.CIVICSHIELD_STORAGE_MODE || '').toLowerCase().trim();
    if (envStorageMode === 'supabase' && supabaseConfigured) {
      mode = 'supabase';
    } else {
      mode = 'mock';
    }
  }

  return {
    appMode,
    mode,
    isMock: mode === 'mock',
    isSupabase: mode === 'supabase',
    supabaseConfigured,
  };
}

export function isMockStorageMode(): boolean {
  return getStorageConfig().isMock;
}

export class ProductionDatabaseError extends Error {
  readonly isDatabaseUnavailable = true;
  constructor(message: string = 'Production database is unavailable or unconfigured.') {
    super(message);
    this.name = 'ProductionDatabaseError';
  }
}

export function assertProductionDatabaseAvailable(): void {
  const config = getStorageConfig();
  if (config.appMode === 'production' && !config.supabaseConfigured) {
    throw new ProductionDatabaseError();
  }
}

