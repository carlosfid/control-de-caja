import type { SyncEngine } from './sync-state';

export function startSyncTriggers(engine: SyncEngine, intervalMs = 30000): () => void {
  let interval: ReturnType<typeof setInterval> | undefined;

  const onVisibility = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') void engine.sync();
  };

  void engine.sync();
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  if (typeof window !== 'undefined') window.addEventListener('online', onVisibility);
  if (typeof setInterval !== 'undefined') interval = setInterval(onVisibility, intervalMs);

  return () => {
    if (interval) clearInterval(interval);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    if (typeof window !== 'undefined') window.removeEventListener('online', onVisibility);
  };
}
