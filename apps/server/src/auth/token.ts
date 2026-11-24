import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface AuthTokenPayload {
  userId: string;
  expiresAt: string;
}

const DEMO_SECRET = 'demo-auth-secret';

export function createAuthToken(
  userId: string,
  ttlSeconds = 3600,
): { token: string; expiresAt: string; userId: string } {
  if (
    !userId ||
    userId.length > 128 ||
    !Number.isSafeInteger(ttlSeconds) ||
    ttlSeconds <= 0
  ) {
    throw new RangeError('Invalid token parameters');
  }
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const token = signToken(userId, expiresAt, authSecret());
  return { token, expiresAt, userId };
}

export function signAuthToken(
  userId: string,
  ttlSeconds = 3600,
  secret = authSecret(),
): string {
  if (
    !userId ||
    userId.length > 128 ||
    !Number.isSafeInteger(ttlSeconds) ||
    ttlSeconds <= 0
  ) {
    throw new RangeError('Invalid token parameters');
  }
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return signToken(userId, expiresAt, secret);
}

export function verifyAuthToken(
  token: string,
  secret = authSecret(),
): AuthTokenPayload | null {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  )
    return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as AuthTokenPayload & { nonce?: string };
    if (
      typeof parsed.userId !== 'string' ||
      parsed.userId.length === 0 ||
      parsed.userId.length > 128 ||
      typeof parsed.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(parsed.expiresAt)) ||
      typeof parsed.nonce !== 'string'
    )
      return null;
    if (Date.parse(parsed.expiresAt) <= Date.now()) return null;
    return { userId: parsed.userId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function authSecret(): string {
  if (process.env.AUTH_SECRET) {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.AUTH_SECRET.length < 32
    ) {
      throw new Error(
        'AUTH_SECRET must contain at least 32 characters in production',
      );
    }
    return process.env.AUTH_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be configured in production');
  }
  return DEMO_SECRET;
}

export function assertAuthConfiguration(): void {
  authSecret();
}

function signToken(userId: string, expiresAt: string, secret: string): string {
  const nonce = randomBytes(8).toString('hex');
  const payload = Buffer.from(
    JSON.stringify({ userId, expiresAt, nonce }),
  ).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}
