/**
 * Minimal HS256 JWT implementation using node:crypto (no dependency).
 * Supports signing and verifying compact JWTs with an exp claim.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

function secret(): string {
  return process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlJson(obj: unknown): string {
  return base64url(JSON.stringify(obj));
}

function sign(data: string): string {
  return base64url(createHmac('sha256', secret()).update(data).digest());
}

export interface JwtPayload {
  sub: string;
  email?: string;
  iat: number;
  exp: number;
}

const DEFAULT_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

export function signToken(sub: string, email: string, ttlSec = DEFAULT_TTL_SEC): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = { sub, email, iat: now, exp: now + ttlSec };
  const encoded = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  return `${encoded}.${sign(encoded)}`;
}

export function verifyToken(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sig] = parts;
  const expected = sign(`${headerB64}.${payloadB64}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as JwtPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
