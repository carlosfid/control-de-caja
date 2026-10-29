export interface MovementTypeDefinition {
  id: string;
  label: string;
  direction: 'in' | 'out';
  allowedRoles: string[];
  requiredFields: string[];
}

export const movementTypes: MovementTypeDefinition[] = [];
