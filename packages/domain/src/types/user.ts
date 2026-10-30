import type { Role } from './role';

export interface User {
  id: string;
  name: string;
  role: Role;
  registerId: string | null;
  avatarColor: string;
}
