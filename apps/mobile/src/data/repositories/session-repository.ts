import { liveQuery } from 'dexie';
import {
  ERROR_CODES,
  failure,
  computeVariance,
  success,
  validateClose,
  validateOpenSession,
  type CashSession,
  type Result,
  type User,
} from '@caja/domain';
import type { CajaDatabase } from '../db';
import { writeAudit } from '../audit-log';

export interface SessionRepository {
  openSession(user: User, openingBalanceMinor: number, now?: string): Promise<Result<CashSession>>;
  getOpenForUser(userId: string): Promise<CashSession | null>;
  getById(id: string): Promise<CashSession | null>;
  listByUser(userId: string, status?: 'open' | 'closed'): Promise<CashSession[]>;
  listAll(status?: 'open' | 'closed'): Promise<CashSession[]>;
  watchOpenForUser(userId: string, callback: (session: CashSession | null) => void): () => void;
  watchAll(callback: (sessions: CashSession[]) => void): () => void;
  closeSession(user: User, sessionId: string, countedMinor: number, note: string | null, denominationBreakdown?: Record<string, number> | null, now?: string): Promise<Result<CashSession>>;
}

export function createSessionRepository(db: CajaDatabase): SessionRepository {
  const repository: SessionRepository = {
    async openSession(user, openingBalanceMinor, now = new Date().toISOString()) {
      const sessionId = crypto.randomUUID();
      return db.transaction('rw', db.sessions, db.audit, async () => {
        const existing = await db.sessions
          .where('userId')
          .equals(user.id)
          .filter((session) => session.status === 'open')
          .first();
        const validation = validateOpenSession(user, openingBalanceMinor, existing ?? null, now);
        if (!validation.ok) return validation;

        const session: CashSession = {
          id: sessionId,
          userId: user.id,
          registerId: user.registerId!,
          currency: 'CUP',
          openedAt: now,
          openingBalanceMinor,
          status: 'open',
          closedAt: null,
          countedBalanceMinor: null,
          expectedBalanceMinor: null,
          varianceMinor: null,
          varianceNote: null,
          closedByUserId: null,
          denominationBreakdown: null,
          syncStatus: 'local',
        };
        await db.sessions.add(session);
        await writeAudit(db, {
          id: crypto.randomUUID(),
          at: now,
          userId: user.id,
          action: 'session_opened',
          entityType: 'session',
          entityId: session.id,
          details: { openingBalanceMinor },
        });
        return success(session);
      });
    },

    async getOpenForUser(userId) {
      return (await db.sessions
        .where('userId')
        .equals(userId)
        .filter((session) => session.status === 'open')
        .first()) ?? null;
    },

    async getById(id) {
      return (await db.sessions.get(id)) ?? null;
    },

    async listByUser(userId, status) {
      const sessions = await db.sessions.where('userId').equals(userId).toArray();
      return sessions
        .filter((session) => status === undefined || session.status === status)
        .sort((left, right) => right.openedAt.localeCompare(left.openedAt));
    },

    async listAll(status) {
      const sessions = await db.sessions.toArray();
      return sessions
        .filter((session) => status === undefined || session.status === status)
        .sort((left, right) => right.openedAt.localeCompare(left.openedAt));
    },

    watchOpenForUser(userId, callback) {
      const subscription = liveQuery(() => repository.getOpenForUser(userId)).subscribe({
        next: callback,
        error: (error: unknown) => console.error('Error observando la sesión abierta', error),
      });
      return () => subscription.unsubscribe();
    },

    watchAll(callback) {
      const subscription = liveQuery(() => repository.listAll()).subscribe({
        next: callback,
        error: (error: unknown) => console.error('Error observando las sesiones', error),
      });
      return () => subscription.unsubscribe();
    },

    async closeSession(user, sessionId, countedMinor, note, denominationBreakdown = null, now = new Date().toISOString()) {
      return db.transaction('rw', db.sessions, db.movements, db.audit, async () => {
        const stored = await db.sessions.get(sessionId);
        if (!stored) return failure({ code: ERROR_CODES.SESSION_NOT_FOUND });
        if (stored.status === 'closed') return failure({ code: ERROR_CODES.SESSION_ALREADY_CLOSED });

        const movements = await db.movements.where('sessionId').equals(sessionId).toArray();
        const incomeMinor = movements.reduce((total, movement) => total + (movement.direction === 'in' ? movement.amountMinor : 0), 0);
        const expenseMinor = movements.reduce((total, movement) => total + (movement.direction === 'out' ? movement.amountMinor : 0), 0);
        const expectedMinor = stored.openingBalanceMinor + incomeMinor - expenseMinor;
        const validation = validateClose(user, { ...stored, expectedBalanceMinor: expectedMinor }, countedMinor, note, now);
        if (!validation.ok) return validation;

        const variance = computeVariance(expectedMinor, countedMinor);

        const closed: CashSession = {
          ...stored,
          status: 'closed',
          closedAt: now,
          countedBalanceMinor: countedMinor,
          expectedBalanceMinor: expectedMinor,
          varianceMinor: variance.varianceMinor,
          varianceNote: note,
          closedByUserId: user.id,
          denominationBreakdown,
        };
        await db.sessions.put(closed);
        await writeAudit(db, {
          at: now,
          userId: user.id,
          action: 'session_closed',
          entityType: 'session',
          entityId: closed.id,
          details: { expectedBalanceMinor: expectedMinor, countedBalanceMinor: countedMinor, varianceMinor: variance.varianceMinor },
        });
        return success(closed);
      });
    },
  };
  return repository;
}
