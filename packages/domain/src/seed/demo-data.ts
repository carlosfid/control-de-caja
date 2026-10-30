import type { Register, User } from '../types';

export const DEMO_USERS: User[] = [
  { id: 'user-cashier-ana', name: 'Ana', role: 'cashier', registerId: 'reg-01', avatarColor: '#2563eb' },
  { id: 'user-supervisor-luis', name: 'Luis', role: 'supervisor', registerId: 'reg-01', avatarColor: '#16a34a' },
  { id: 'user-accountant-marta', name: 'Marta', role: 'accountant', registerId: null, avatarColor: '#9333ea' },
];

export const DEMO_REGISTERS: Register[] = [
  { id: 'reg-01', name: 'Caja principal' },
  { id: 'reg-02', name: 'Caja secundaria' },
];
