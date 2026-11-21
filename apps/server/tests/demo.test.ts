import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/index';

describe('E6 demo controls', () => {
  it('shows the simulation dashboard and demo state', async () => {
    const server = buildServer();
    const dashboard = await server.inject({ method: 'GET', url: '/' });
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.body).toContain('SIMULACIÓN — no es el ERP real');

    const state = await server.inject({ method: 'GET', url: '/demo/state' });
    expect(state.statusCode).toBe(200);
    expect(state.json()).toMatchObject({ total: 0, accepted: 0, rejected: 0 });
    await server.close();
  });

  it('configures and resets forced rejection', async () => {
    const server = buildServer();
    const configured = await server.inject({ method: 'POST', url: '/demo/config', payload: { rejectNextN: 2 } });
    expect(configured.json()).toMatchObject({ forcedRejectCount: 2 });

    const reset = await server.inject({ method: 'POST', url: '/demo/reset' });
    expect(reset.json()).toEqual({ ok: true });
    await server.close();
  });
});
