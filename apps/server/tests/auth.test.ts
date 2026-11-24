import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthToken, verifyAuthToken } from '../src/auth/token';
import { buildServer } from '../src/index';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('demo authentication', () => {
  it('issues expiring tokens only for a valid demo PIN', async () => {
    const server = buildServer();
    const invalid = await server.inject({
      method: 'POST',
      url: '/auth/token',
      payload: { userId: 'user-cashier-ana', pin: 'wrong' },
    });
    const valid = await server.inject({
      method: 'POST',
      url: '/auth/token',
      payload: { userId: 'user-cashier-ana', pin: '1234' },
    });

    expect(invalid.statusCode).toBe(401);
    expect(valid.statusCode).toBe(200);
    expect(verifyAuthToken(valid.json().token)).toMatchObject({
      userId: 'user-cashier-ana',
      expiresAt: valid.json().expiresAt,
    });
    await server.close();
  });

  it('rejects altered and expired tokens', () => {
    const token = createAuthToken('user-cashier-ana', 1).token;
    expect(verifyAuthToken(`${token}x`)).toBeNull();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 2000));
    expect(verifyAuthToken(token)).toBeNull();
    vi.useRealTimers();
  });

  it('requires a strong configured secret in production and hides demo controls', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SECRET', '');
    expect(() => buildServer()).toThrow(
      'AUTH_SECRET must be configured in production',
    );

    vi.stubEnv('AUTH_SECRET', 'a-secret-with-at-least-32-characters');
    const server = buildServer();
    expect(
      (await server.inject({ method: 'POST', url: '/demo/reset' })).statusCode,
    ).toBe(404);
    await server.close();
  });
});
