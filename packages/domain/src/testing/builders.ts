import type { CashSession, Movement, Register, Role, User } from '../types';

export function buildUser(overrides: Partial<User> = {}): User {
  return { id: 'user-cashier-ana', name: 'Ana', role: 'cashier' as Role, registerId: 'reg-01', avatarColor: '#2563eb', ...overrides };
}

export function buildRegister(overrides: Partial<Register> = {}): Register {
  return { id: 'reg-01', name: 'Caja 1', ...overrides };
}

export function buildSession(overrides: Partial<CashSession> = {}): CashSession {
  return {
    id: '00000000-0000-4000-8000-000000000001', userId: 'user-cashier-ana', registerId: 'reg-01', currency: 'CUP',
    openedAt: '2026-01-01T12:00:00Z', openingBalanceMinor: 0, status: 'open', closedAt: null,
    countedBalanceMinor: null, expectedBalanceMinor: null, varianceMinor: null, varianceNote: null,
    closedByUserId: null, denominationBreakdown: null, syncStatus: 'pending', ...overrides,
  };
}

export function buildMovement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: '00000000-0000-4000-8000-000000000002', sessionId: '00000000-0000-4000-8000-000000000001',
    userId: 'user-cashier-ana', type: 'sale', direction: 'in', amountMinor: 10000, currency: 'CUP',
    description: 'Venta demo', occurredAt: '2026-01-01T12:05:00Z', createdAt: '2026-01-01T12:05:00Z',
    reference: null, counterparty: null, counterpartyRegisterId: null, reversalOf: null, reversedBy: null,
    reversalReason: null, syncStatus: 'pending', ...overrides,
  };
}
