export function parseAmount(value: string): number {
  const normalized = value.trim().replace(',', '.');
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) throw new Error('Monto inválido');
  return Math.round(amount * 100);
}

export function formatAmount(amountCents: number, locale = 'es-CU'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CUP',
  }).format(amountCents / 100);
}
