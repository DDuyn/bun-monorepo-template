import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'node:crypto';

const isDev = process.env.NODE_ENV !== 'production';

export interface LogEntry {
  level: 'info' | 'error' | 'warn';
  timestamp: string;
  request_id: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
}

function write(entry: LogEntry) {
  if (isDev) {
    const color = entry.status >= 500 ? '\x1b[31m' : entry.status >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(
      `${color}${entry.method} ${entry.path} ${entry.status}${reset} ${entry.duration_ms}ms [${entry.request_id}]`,
    );
  } else {
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

export const structuredLogger = createMiddleware(async (c, next) => {
  const requestId = randomUUID();
  const start = Date.now();

  c.header('X-Request-Id', requestId);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  write({
    level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
    timestamp: new Date().toISOString(),
    request_id: requestId,
    method: c.req.method,
    path: c.req.path,
    status,
    duration_ms: duration,
  });
});

/**
 * Log an unhandled error with structured output.
 * Used by the error-handler middleware.
 */
export function logError(requestId: string, error: unknown) {
  if (isDev) {
    console.error('\x1b[31m[ERROR]\x1b[0m', requestId, error);
  } else {
    process.stdout.write(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        request_id: requestId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }) + '\n',
    );
  }
}
