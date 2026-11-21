import { liveQuery } from 'dexie';
import {
  ERROR_CODES,
  failure,
  getMovementTypeDef,
  success,
  validateNewMovement,
  type CashSession,
  type Movement,
  type NewMovementInput,
  type Result,
  type User,
} from '@caja/domain';
import type { CajaDatabase } from '../db';
import { writeAudit } from '../audit-log';
import { createUuid } from '../id';
import { enqueueOutbox, hasServerUrl } from '../outbox';

export interface MovementRepository {
  add(user: User, session: CashSession, input: NewMovementInput, now?: string): Promise<Result<Movement>>;
  getById(id: string): Promise<Movement | null>;
  listBySession(sessionId: string): Promise<Movement[]>;
  watchBySession(sessionId: string, callback: (movements: Movement[]) => void): () => void;
  reverse(): Promise<Result<Movement>>;
}

export function createMovementRepository(db: CajaDatabase): MovementRepository {
  const repository: MovementRepository = {
    async add(user, session, input, now = new Date().toISOString()) {
      return db.transaction('rw', db.movements, db.sessions, db.outbox, db.settings, db.audit, async () => {
        const storedSession = await db.sessions.get(session.id);
        if (!storedSession || storedSession.status !== 'open') {
          return failure({ code: ERROR_CODES.SESSION_NOT_OPEN });
        }

        const validation = validateNewMovement(input, { user, session: storedSession, now });
        if (!validation.ok) return validation;

        const definition = getMovementTypeDef(input.type);
        if (!definition) return failure({ code: ERROR_CODES.MOVEMENT_TYPE_INVALID });

        const syncStatus = (await hasServerUrl(db)) ? 'pending' : 'local';
        const movement: Movement = {
          id: createUuid(),
          sessionId: storedSession.id,
          userId: user.id,
          type: input.type,
          direction: definition.direction,
          amountMinor: input.amountMinor as number,
          currency: input.currency,
          description: input.description.trim(),
          occurredAt: input.occurredAt,
          createdAt: now,
          reference: input.reference ?? null,
          counterparty: input.counterparty ?? null,
          counterpartyRegisterId: input.counterpartyRegisterId ?? null,
          reversalOf: null,
          reversedBy: null,
          reversalReason: null,
          syncStatus,
        };

        await db.movements.add(movement);
        if (syncStatus === 'pending') await enqueueOutbox(db, 'movement', movement.id, 'create', now);
        await writeAudit(db, {
          at: now,
          userId: user.id,
          action: 'movement_created',
          entityType: 'movement',
          entityId: movement.id,
          details: { sessionId: movement.sessionId, type: movement.type, amountMinor: movement.amountMinor },
        });
        return success(movement);
      });
    },

    async getById(id) {
      return (await db.movements.get(id)) ?? null;
    },

    async listBySession(sessionId) {
      return (await db.movements.where('sessionId').equals(sessionId).sortBy('createdAt')).reverse();
    },

    watchBySession(sessionId, callback) {
      void repository.listBySession(sessionId).then(callback);
      const subscription = liveQuery(() => repository.listBySession(sessionId)).subscribe({
        next: callback,
        error: (error: unknown) => console.error('Error observando los movimientos', error),
      });
      return () => subscription.unsubscribe();
    },

    async reverse() {
      return failure({ code: ERROR_CODES.UNEXPECTED, params: { reason: 'MOVEMENT_REVERSAL_NOT_AVAILABLE_UNTIL_E7' } });
    },
  };
  return repository;
}
