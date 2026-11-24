import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/index';

describe('E6 demo controls', () => {
  it('shows the simulation dashboard without inserting untrusted data as HTML', async () => {
    const server = buildServer();
    const dashboard = await server.inject({ method: 'GET', url: '/' });
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.body).toContain('SIMULACIÓN — no es el ERP real');
    expect(dashboard.body).toContain('cell.textContent=String(value)');
    expect(dashboard.body).not.toContain('innerHTML');

    const state = await server.inject({ method: 'GET', url: '/demo/state' });
    expect(state.statusCode).toBe(200);
    expect(state.json()).toMatchObject({
      total: 0,
      accepted: 0,
      duplicates: 0,
      rejected: 0,
    });
    await server.close();
  });

  it('configures all demo faults, rejects invalid values, and resets data and config', async () => {
    const server = buildServer();
    const configured = await server.inject({
      method: 'POST',
      url: '/demo/config',
      payload: {
        amountLimitMinor: 5000,
        rejectNextN: 2,
        latencyMs: 200,
        failNextN: 3,
        loseResponseNextN: 4,
      },
    });
    expect(configured.statusCode).toBe(200);
    expect(configured.json()).toMatchObject({
      amountLimitMinor: 5000,
      forcedRejectCount: 2,
      latencyMs: 200,
      failNextCount: 3,
      loseResponseCount: 4,
    });

    const invalid = await server.inject({
      method: 'POST',
      url: '/demo/config',
      payload: { failNextN: -1 },
    });
    expect(invalid.statusCode).toBe(400);

    const reset = await server.inject({ method: 'POST', url: '/demo/reset' });
    expect(reset.json()).toEqual({ ok: true });
    expect(
      (await server.inject({ method: 'GET', url: '/demo/state' })).json()
        .config,
    ).toMatchObject({
      amountLimitMinor: 10_000_000,
      forcedRejectCount: 0,
      latencyMs: 0,
      failNextCount: 0,
      loseResponseCount: 0,
    });
    await server.close();
  });
});
