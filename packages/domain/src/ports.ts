import type { CashSession, Movement, User } from './types';

export interface MovementRepository {
  save(movement: Movement): Promise<void>;
  listBySession(sessionId: string): Promise<Movement[]>;
}

export interface CashSessionRepository {
  save(session: CashSession): Promise<void>;
  findOpenByUser(userId: string): Promise<CashSession | undefined>;
}

export interface AuthPort {
  login(userId: string, pin: string): Promise<User | undefined>;
}
