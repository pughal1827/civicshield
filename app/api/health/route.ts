import { NextResponse } from 'next/server';
import { getStorageConfig } from '@/lib/db/storage-config';
import { logger } from '@/lib/logging/logger';

export async function GET() {
  try {
    const config = getStorageConfig();

    if (config.appMode === 'production' && !config.supabaseConfigured) {
      logger.warn('HealthCheck', 'Production health check failed: database unconfigured or unavailable');
      return NextResponse.json(
        {
          status: 'unhealthy',
          mode: 'production',
          database: 'unavailable',
          error: 'Service temporarily unavailable. Required production database is unconfigured.',
        },
        { status: 503 }
      );
    }

    logger.info('HealthCheck', `Health check ping succeeded in ${config.appMode} mode`);
    
    return NextResponse.json(
      {
        status: 'ok',
        mode: config.appMode,
        storage: config.isMock ? 'mock' : 'supabase',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('HealthCheck', 'Unexpected health check exception', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal health check error.',
      },
      { status: 500 }
    );
  }
}
