import { describe, expect, it } from 'vitest';
import { ACTIONS, can, canCreateMovementType } from '../src';
import type { Role } from '../src/types';

const allowed: Record<Role, string[]> = {
  cashier: ['session.open', 'session.close', 'session.viewOwn', 'movement.create', 'movement.reverse', 'sync.viewOwn', 'sync.retry'],
  supervisor: ACTIONS as unknown as string[],
  accountant: ['session.viewAll', 'sync.viewAll', 'audit.view', 'export.run'],
};

describe('permissions', () => {
  for (const role of ['cashier', 'supervisor', 'accountant'] as Role[]) {
    for (const action of ACTIONS) {
      it(`${role} ${action}`, () => expect(can(role, action)).toBe(allowed[role].includes(action)));
    }
  }
  it('only supervisors create salary movements', () => {
    expect(canCreateMovementType('cashier', 'salary_payment')).toBe(false);
    expect(canCreateMovementType('supervisor', 'salary_payment')).toBe(true);
  });
});
