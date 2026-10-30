export interface DomainError {
  code: string;
  field?: string;
  params?: Record<string, string | number | boolean | null>;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; errors: DomainError[] };

export const success = <T>(value: T): Result<T> => ({ ok: true, value });
export const failure = <T = never>(...errors: DomainError[]): Result<T> => ({ ok: false, errors });
