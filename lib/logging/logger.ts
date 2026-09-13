/**
 * CivicShield AI - Structured Server Logger
 * 
 * Provides safe, structured logging for operational visibility while automatically
 * redacting credentials, secrets, password hashes, and citizen PII.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'salt',
  'token',
  'sessiontoken',
  'session_token',
  'authorization',
  'apikey',
  'api_key',
  'servicerolekey',
  'service_role_key',
  'secret',
  'phone',
  'email',
  'trackingcode',
  'tracking_code',
  'trackinguuid',
  'tracking_uuid',
]);

function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (REDACTED_KEYS.has(normalizedKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function logEvent(
  level: LogLevel,
  event: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    ...(meta ? { meta: sanitizeData(meta) } : {}),
  };

  const outputString = `[CivicShield ${level}] ${event}: ${message}`;

  if (level === 'ERROR') {
    console.error(outputString, payload.meta || '');
  } else if (level === 'WARN') {
    console.warn(outputString, payload.meta || '');
  } else {
    console.log(outputString, payload.meta || '');
  }
}

export const logger = {
  info: (event: string, message: string, meta?: Record<string, unknown>) =>
    logEvent('INFO', event, message, meta),
  warn: (event: string, message: string, meta?: Record<string, unknown>) =>
    logEvent('WARN', event, message, meta),
  error: (event: string, message: string, meta?: Record<string, unknown>) =>
    logEvent('ERROR', event, message, meta),
};
