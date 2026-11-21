import { describe, expect, it } from 'vitest';
import { buildMovement, buildSession, buildUser } from '../src/testing/builders';
import { validateReversal } from '../src';

const now = '2026-11-21T16:00:00Z';

describe('E7 reversal rules', () => {
  it('allows reversal in the open owned session', () => {
    expect(validateReversal(buildUser(), buildMovement(), buildSession(), 'Error de registro', now)).toEqual({ ok: true, value: undefined });
  });

  it('rejects a reason shorter than 3 characters', () => {
    expect(validateReversal(buildUser(), buildMovement(), buildSession(), 'xy', now)).toMatchObject({
      ok: false,
      errors: [{ code: 'REVERSAL_REASON_REQUIRED' }],
    });
  });

  it('rejects already reversed movements and reversals of reversals', () => {
    expect(validateReversal(buildUser(), buildMovement({ reversedBy: 'movement-2' }), buildSession(), 'Error correcto', now)).toMatchObject({
      ok: false,
      errors: [{ code: 'REVERSAL_ALREADY_DONE' }],
    });
    expect(validateReversal(buildUser(), buildMovement({ reversalOf: 'movement-1', type: 'reversal' }), buildSession(), 'Error correcto', now)).toMatchObject({
      ok: false,
      errors: [{ code: 'REVERSAL_OF_REVERSAL' }],
    });
  });

  it('rejects a reversal in a closed session', () => {
    expect(validateReversal(buildUser(), buildMovement(), buildSession({ status: 'closed' }), 'Error correcto', now)).toMatchObject({
      ok: false,
      errors: [{ code: 'SESSION_NOT_OPEN' }],
    });
  });
});
