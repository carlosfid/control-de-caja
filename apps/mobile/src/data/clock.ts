export interface Clock {
  now(): string;
}

export function createClock(): Clock {
  return { now: () => new Date().toISOString() };
}
