import type { CajaDatabase } from './db';
import { createSessionRepository } from './repositories/session-repository';
import { createMovementRepository } from './repositories/movement-repository';

export async function loadDemoData(db: CajaDatabase): Promise<void> {
  if (await db.movements.count() > 0) return;

  const user = await db.users.get('user-cashier-ana');
  if (!user) return;

  const { pinHash: _pinHash, pinSalt: _pinSalt, ...demoUser } = user;
  const sessionRepository = createSessionRepository(db);
  let session = await sessionRepository.getOpenForUser(demoUser.id);
  if (!session) {
    const opened = await sessionRepository.openSession(demoUser, 100000, '2026-11-20T12:00:00Z');
    if (!opened.ok) return;
    session = opened.value;
  }

  const movementRepository = createMovementRepository(db);
  const inputs = [
    { type: 'sale' as const, amountMinor: 15000, currency: 'CUP', description: 'Venta mostrador', occurredAt: '2026-11-20T13:00:00Z' },
    { type: 'collection' as const, amountMinor: 5000, currency: 'CUP', description: 'Cobro de cuenta', occurredAt: '2026-11-20T14:00:00Z' },
    { type: 'operating_expense' as const, amountMinor: 3000, currency: 'CUP', description: 'Compra de suministros', occurredAt: '2026-11-20T15:00:00Z' },
  ];
  for (const input of inputs) {
    await movementRepository.add(demoUser, session!, input, '2026-11-20T15:30:00Z');
  }
}
