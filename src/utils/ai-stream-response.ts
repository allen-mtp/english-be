import { Response } from 'express';

/** Keep Vercel serverless functions alive by flushing at least every 10s. */
export const STREAM_HEARTBEAT_MS = 10_000;

type StreamLine =
  | { type: 'chunk'; text: string }
  | { type: 'heartbeat'; ts: number }
  | { type: 'done'; [key: string]: unknown }
  | { type: 'error'; error: string };

export async function withAIStream<T>(
  res: Response,
  statusCode: number,
  handler: (emitChunk: (text: string) => void) => Promise<T>,
  toPayload: (result: T) => Record<string, unknown>,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    try {
      const result = await handler(() => {});
      res.status(statusCode).json(toPayload(result));
    } catch (error: any) {
      console.error('withAIStream error:', error);
      const status = error?.status === 429 || error?.status === 503 ? 503 : 500;
      res.status(status).json({
        error: status === 503
          ? 'AI service is temporarily busy. Please wait a moment and try again.'
          : (error.message || 'Internal server error'),
      });
    }
    return;
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.status(statusCode);

  const writeLine = (line: StreamLine) => {
    if (!res.writableEnded) {
      res.write(`${JSON.stringify(line)}\n`);
    }
  };

  let lastActivity = Date.now();
  const emitChunk = (text: string) => {
    lastActivity = Date.now();
    writeLine({ type: 'chunk', text });
  };

  const heartbeat = setInterval(() => {
    if (Date.now() - lastActivity >= STREAM_HEARTBEAT_MS - 500) {
      writeLine({ type: 'heartbeat', ts: Date.now() });
      lastActivity = Date.now();
    }
  }, STREAM_HEARTBEAT_MS);

  try {
    const result = await handler(emitChunk);
    writeLine({ type: 'done', ...toPayload(result) });
    res.end();
  } catch (error: any) {
    console.error('withAIStream error:', error);
    const status = error?.status === 429 || error?.status === 503 ? 503 : 500;
    if (!res.headersSent) {
      res.status(status);
    }
    writeLine({
      type: 'error',
      error: status === 503
        ? 'AI service is temporarily busy. Please wait a moment and try again.'
        : (error.message || 'Internal server error'),
    });
    res.end();
  } finally {
    clearInterval(heartbeat);
  }
}
