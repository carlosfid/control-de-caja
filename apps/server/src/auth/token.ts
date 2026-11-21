import { createHmac, randomBytes } from 'crypto';

export interface AuthTokenPayload {
  userId: string;
  expiresAt: string;
}

export function signAuthToken(userId: string, ttlSeconds = 3600, secret = process.env.AUTH_SECRET ?? 'demo-auth-secret'): string {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const nonce = randomBytes(8).toString('hex');
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt, nonce })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAuthToken(token: string, secret = process.env.AUTH_SECRET ?? 'demo-auth-secret'): AuthTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  if (signature !== expected) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthTokenPayload & { nonce?: string };
    if (!parsed.userId || !parsed.expiresAt) return null;
    if (Date.parse(parsed.expiresAt) <= Date.now()) return null;
    return { userId: parsed.userId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}
