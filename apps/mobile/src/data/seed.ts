import { DEMO_PIN_BY_USER_ID, DEMO_REGISTERS, DEMO_USERS } from '@caja/domain';
import { type CajaDatabase } from './db';
import { createPinSalt, hashPin } from './pin-hash';

export async function loadDemoData(db: CajaDatabase): Promise<void> {
  await Promise.all(DEMO_REGISTERS.map((register) => db.registers.put(register)));

  const usersToAdd = [];
  for (const user of DEMO_USERS) {
    if (await db.users.get(user.id)) continue;
    const pinSalt = await createPinSalt();
    usersToAdd.push({
      ...user,
      pinSalt,
      pinHash: await hashPin(DEMO_PIN_BY_USER_ID[user.id], pinSalt),
    });
  }
  await db.users.bulkAdd(usersToAdd);
}

export async function resetLocalData(db: CajaDatabase): Promise<void> {
  await db.users.clear();
  await db.registers.clear();
  await db.sessions.clear();
  await db.movements.clear();
  await db.outbox.clear();
  await db.audit.clear();
  await db.settings.clear();
}
