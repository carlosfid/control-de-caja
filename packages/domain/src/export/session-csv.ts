import type { SessionReport } from '../rules/session-report';

function escapeCsv(value: unknown): string {
  const text = String(value ?? '').replace(/"/g, '""');
  return /[;"\n]/.test(text) ? `"${text}"` : text;
}

function decimalMinor(minor: number | null): string {
  if (minor === null) return '';
  const sign = minor < 0 ? '-' : '';
  const absolute = Math.abs(minor);
  return `${sign}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, '0')}`;
}

export function sessionCsv(report: SessionReport): string {
  const rows: unknown[][] = [
    ['sessionId', 'openedAt', 'openingBalanceMinor', 'expectedBalanceMinor', 'countedBalanceMinor', 'varianceMinor', 'varianceNote', 'responsibleUserId'],
    [
      report.session.id,
      report.session.openedAt,
      decimalMinor(report.openingBalanceMinor),
      decimalMinor(report.expectedBalanceMinor),
      decimalMinor(report.countedBalanceMinor),
      decimalMinor(report.varianceMinor),
      report.varianceNote,
      report.responsibleUserId,
    ],
  ];
  const body = rows.map((row) => row.map(escapeCsv).join(';')).join('\r\n');
  return `\ufeff${body}`;
}
