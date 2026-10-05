import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../lib/http-errors';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Malformed JSON bodies from express.json().
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    res.status(err.status ?? 400).json({ error: 'Invalid request body' });
    return;
  }
  req.log?.error({ err }, 'Unhandled error');
  // Never leak internals (SQL, stack traces) to the client.
  res.status(500).json({ error: 'Something went wrong' });
};
