import { liveQuery } from 'dexie';
import {
  ERROR_CODES,
  failure,
  success,
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
  listByUser(userId: string): Promise<CashSession[]>;
  listAll(): Promise<CashSession[]>;
  watchOpenForUser(userId: string, callback: (session: CashSession | null) => void): () => void;
  watchAll(callback: (sessions: CashSession[]) => void): () => void;
  closeSession(): Promise<Result<CashSession>>;
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

    async listByUser(userId) {
      return (await db.sessions.where('userId').equals(userId).toArray())
        .sort((left, right) => right.openedAt.localeCompare(left.openedAt));
    },

    async listAll() {
      return (await db.sessions.toArray())
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

    async closeSession() {
      return failure({
        code: ERROR_CODES.UNEXPECTED,
        params: { reason: 'SESSION_CLOSE_NOT_AVAILABLE_UNTIL_E4' },
      });
    },
  };
  return repository;
}
