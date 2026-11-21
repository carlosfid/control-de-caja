export const BACKOFF_SECONDS = [1, 5, 30, 120, 600] as const;

export function backoffSeconds(attempts: number): number {
  const index = Math.max(0, Math.min(attempts - 1, BACKOFF_SECONDS.length - 1));
  return BACKOFF_SECONDS[index];
}

export function nextAttemptAt(attempts: number, now: string): string {
  const millis = backoffSeconds(attempts) * 1000;
  return new Date(Date.parse(now) + millis).toISOString();
}
