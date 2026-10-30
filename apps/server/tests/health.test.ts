import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/index';

describe('GET /health', () => {
  it('returns the API status', async () => {
    const server = buildServer();
    const response = await server.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok', apiVersion: 'v1' });
    await server.close();
  });
});
