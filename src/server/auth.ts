import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const EPHEMERAL_FALLBACK_KEY = crypto.randomBytes(32).toString('hex');

function getSigningKey(): string {
  return process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : EPHEMERAL_FALLBACK_KEY;
}

export const SESSION_COOKIE_NAME = 'il_session';

export interface SessionPayload {
  uid: number;
  role: 'user' | 'admin';
  email: string;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: SessionPayload;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const originalBuf = Buffer.from(originalHex, 'hex');
  if (derivedBuf.length !== originalBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, originalBuf);
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function signHmac(data: string): string {
  return crypto.createHmac('sha256', getSigningKey()).update(data).digest('base64url');
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>, ttlSeconds = 60 * 60 * 24 * 7): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = signHmac(encoded);
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = signHmac(encoded);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed || typeof parsed.uid !== 'number' || typeof parsed.exp !== 'number') {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const pairs = header.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    if (k === name) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return null;
}

export function setSessionCookie(res: Response, token: string) {
  const maxAge = 60 * 60 * 24 * 7;
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None; Partitioned`
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
  );
}

function isOriginSafe(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  if (req.headers.authorization?.startsWith('Bearer ')) return true;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
    const host = forwardedHost || req.headers.host;
    return !!host && originHost === host;
  } catch {
    return false;
  }
}

export function extractSession(req: Request): SessionPayload | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const verified = verifySessionToken(token);
    if (verified) return verified;
  }
  const cookieToken = parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
  if (cookieToken) {
    return verifySessionToken(cookieToken);
  }
  return null;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!isOriginSafe(req)) {
    return res.status(403).json({ error: 'Invalid request origin.' });
  }
  const session = extractSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required. Please log in to continue.' });
  }
  req.user = session;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!isOriginSafe(req)) {
    return res.status(403).json({ error: 'Invalid request origin.' });
  }
  const session = extractSession(req);
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator authorization required.' });
  }
  req.user = session;
  next();
}
