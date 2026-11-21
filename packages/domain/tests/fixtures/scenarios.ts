export const MOVEMENT_SCENARIOS = {
  sale: { type: 'sale', amountMinor: 10000, description: 'Venta de mostrador', direction: 'in' },
  expense: { type: 'operating_expense', amountMinor: 3000, description: 'Compra de suministros', direction: 'out' },
  refund: { type: 'refund', amountMinor: 2000, description: 'Reembolso al cliente', direction: 'out' },
  salaryUnauthorized: { type: 'salary_payment', role: 'cashier', amountMinor: 50000 },
  closedSession: { status: 'closed', type: 'sale', amountMinor: 1000 },
  zeroAmount: { type: 'sale', amountMinor: 0 },
  shortDescription: { type: 'sale', amountMinor: 1000, description: 'xy' },
  futureDate: { occurredAt: '2099-01-01T00:00:00Z' },
} as const;
