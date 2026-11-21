export type SyncPhase = 'idle' | 'offline' | 'syncing' | 'error';

export interface SyncState {
  phase: SyncPhase;
  lastSyncAt: string | null;
  pendingCount: number;
  lastError: { code: string; detail: string } | null;
}

export interface SyncEngine {
  sync(): Promise<void>;
}

export class NullSyncEngine implements SyncEngine {
  async sync(): Promise<void> {
    return;
  }
}

export function createSyncState(): {
  get: () => SyncState;
  set: (state: SyncState) => void;
  watch: (callback: (state: SyncState) => void) => () => void;
} {
  let state: SyncState = {
    phase: 'idle',
    lastSyncAt: null,
    pendingCount: 0,
    lastError: null,
  };
  const subscribers = new Set<(state: SyncState) => void>();

  return {
    get: () => state,
    set: (next) => {
      state = next;
      subscribers.forEach((callback) => callback(state));
    },
    watch: (callback) => {
      subscribers.add(callback);
      callback(state);
      return () => subscribers.delete(callback);
    },
  };
}
