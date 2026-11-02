import type { Register } from '@caja/domain';
import type { CajaDatabase } from '../db';

export interface RegisterRepository {
  list(): Promise<Register[]>;
  getById(id: string): Promise<Register | null>;
}

export function createRegisterRepository(db: CajaDatabase): RegisterRepository {
  return {
    list: () => db.registers.toArray(),
    async getById(id) {
      return (await db.registers.get(id)) ?? null;
    },
  };
}
