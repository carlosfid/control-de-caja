import Dexie, { type EntityTable } from 'dexie';
import type { AuditEntry, CashSession, Movement, OutboxEntry, Register, User } from '@caja/domain';

export interface StoredUser extends User {
  pinHash: string;
  pinSalt: string;
}

export interface StoredSetting {
  key: string;
  value: string;
}

export class CajaDatabase extends Dexie {
  users!: EntityTable<StoredUser, 'id'>;
  registers!: EntityTable<Register, 'id'>;
  sessions!: EntityTable<CashSession, 'id'>;
  movements!: EntityTable<Movement, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'id'>;
  audit!: EntityTable<AuditEntry, 'id'>;
  settings!: EntityTable<StoredSetting, 'key'>;

  constructor(name = 'control-de-caja') {
    super(name);
    this.version(1).stores({
      users: 'id, role',
      registers: 'id',
      sessions: 'id, userId, status',
      movements: 'id, sessionId, [sessionId+createdAt]',
      outbox: 'id, status, sequence',
      audit: 'id, action, [entityType+entityId], at',
      settings: '&key',
    });
    this.version(2).stores({
      sessions: 'id, userId, status, syncStatus',
      movements: 'id, sessionId, [sessionId+createdAt], syncStatus',
      outbox: 'id, status, sequence, operation, entityType, entityId',
    });
    this.version(3).stores({
      movements: 'id, sessionId, [sessionId+createdAt], syncStatus, reversalOf, counterparty, counterpartyRegisterId',
    }).upgrade((transaction) => {
      return transaction.table('movements').toCollection().modify((movement) => {
        if (movement.reversalOf === undefined) movement.reversalOf = null;
        if (movement.reversedBy === undefined) movement.reversedBy = null;
        if (movement.reversalReason === undefined) movement.reversalReason = null;
        if (movement.counterparty === undefined) movement.counterparty = null;
        if (movement.counterpartyRegisterId === undefined) movement.counterpartyRegisterId = null;
      });
    });
  }
}

export const database = new CajaDatabase();
