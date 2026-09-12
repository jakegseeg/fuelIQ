import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Populate req.userId/req.userEmail from a Bearer token when present and valid.
 * Non-blocking: requests without a token continue (legacy x-user-id dev mode
 * still works via userIdFrom). Place this before all routers.
 */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (header && header.startsWith('Bearer ')) {
    const payload = verifyToken(header.slice(7).trim());
    if (payload) {
      req.userId = payload.sub;
      req.userEmail = payload.email;
    }
  }
  next();
}

/** Require a valid authenticated user (used by /api/auth/me and any hard-gated route). */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}
