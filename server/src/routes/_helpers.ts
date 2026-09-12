import type { NextFunction, Request, Response } from 'express';

/**
 * Resolve the current user id. Prefers the authenticated user (set by
 * attachUser from a JWT); falls back to the legacy `x-user-id` header for local
 * dev so the app works before a user signs in.
 */
export function userIdFrom(req: Request): string {
  if (req.userId) return req.userId;
  const header = req.header('x-user-id');
  return (typeof header === 'string' && header.trim()) || 'local-user';
}

/** Wrap an async route handler so rejected promises hit the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate a YYYY-MM-DD date, defaulting to today (local) when missing. */
export function parseDate(value: unknown): string {
  if (typeof value === 'string' && DATE_RE.test(value)) return value;
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}
