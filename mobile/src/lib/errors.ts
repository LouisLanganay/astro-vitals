import type { AppError } from './types';

export function toAppError(e: unknown): AppError {
  if (typeof e === 'object' && e !== null && 'kind' in e) return e as AppError;
  return { kind: 'internal', message: e instanceof Error ? e.message : String(e) };
}

export function fieldMessage(error: AppError | null, field: string): string | null {
  if (error?.kind !== 'validation') return null;
  return error.errors.find((e) => e.field === field)?.message ?? null;
}

export function errorText(error: AppError): string {
  switch (error.kind) {
    case 'validation':
      return error.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    case 'rules':
      return error.rule_id ? `Rule ${error.rule_id}: ${error.message}` : error.message;
    default:
      return error.message;
  }
}
