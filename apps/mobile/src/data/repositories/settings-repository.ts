import type { CajaDatabase } from '../db';
import { enqueueLocalRecords } from '../outbox';

export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  watch(key: string, callback: (value: string | null) => void): () => void;
}

export function createSettingsRepository(db: CajaDatabase): SettingsRepository {
  const subscribers = new Map<string, Set<(value: string | null) => void>>();
  return {
    async get(key) { return (await db.settings.get(key))?.value ?? null; },
    async set(key, value) {
      if (key === 'serverUrl') {
        const previous = await db.settings.get(key);
        await db.transaction('rw', db.settings, db.sessions, db.movements, db.outbox, async () => {
          await db.settings.put({ key, value });
          if (!previous?.value.trim() && value.trim()) {
            await enqueueLocalRecords(db, new Date().toISOString());
          }
        });
      } else {
        await db.settings.put({ key, value });
      }
      subscribers.get(key)?.forEach((callback) => callback(value));
    },
    watch(key, callback) {
      void db.settings.get(key).then((setting) => callback(setting?.value ?? null));
      const callbacks = subscribers.get(key) ?? new Set();
      callbacks.add(callback);
      subscribers.set(key, callbacks);
      return () => callbacks.delete(callback);
    },
  };
}
