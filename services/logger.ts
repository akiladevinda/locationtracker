type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const sensitivePatterns = [
  /Bearer\s+[A-Za-z0-9._\-]+/gi,
  /eyJ[A-Za-z0-9._\-]+/g,
  /service_role/gi,
  /private_key/gi,
];

/** In-memory only — never write logs to SQLite (avoids GPS/sync lock contention). */
const recentLogs: Array<{ level: LogLevel; message: string; at: string }> = [];
const MAX_MEMORY_LOGS = 200;

function sanitize(message: string): string {
  let next = message;
  for (const pattern of sensitivePatterns) {
    next = next.replace(pattern, '[redacted]');
  }
  return next;
}

function write(level: LogLevel, message: string, extra?: unknown): void {
  const cleaned = sanitize(message);
  const payload = extra === undefined ? cleaned : `${cleaned} ${sanitize(String(extra))}`;
  if (level === 'error' || level === 'warn') {
    console.warn(`[tracker] ${payload}`);
  } else {
    console.log(`[tracker] ${payload}`);
  }
  recentLogs.unshift({ level, message: payload, at: new Date().toISOString() });
  if (recentLogs.length > MAX_MEMORY_LOGS) {
    recentLogs.length = MAX_MEMORY_LOGS;
  }
}

export function getMemoryLogs(): Array<{ level: LogLevel; message: string; at: string }> {
  return [...recentLogs];
}

export const logger = {
  debug(message: string, extra?: unknown): void {
    write('debug', message, extra);
  },
  info(message: string, extra?: unknown): void {
    write('info', message, extra);
  },
  warn(message: string, extra?: unknown): void {
    write('warn', message, extra);
  },
  error(message: string, extra?: unknown): void {
    write('error', message, extra);
  },
};
