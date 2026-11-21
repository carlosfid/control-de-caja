# Roles y permisos

## Roles

- `cashier`: vendedor.
- `supervisor`: supervisor de caja.
- `accountant`: contabilidad, solo lectura.

## Matriz

| Acción | Vendedor | Supervisor | Contabilidad |
|---|---|---|---|
| `session.open` | Sí | Sí | No |
| `session.close` propia | Sí | Sí | No |
| `session.viewOwn` | Sí | Sí | — |
| `session.viewAll` | No | Sí | Sí |
| `movement.create` salvo salarios | Sí | Sí | No |
| `movement.create` `salary_payment` | No | Sí | No |
| `movement.reverse` | Sí | Sí | No |
| `sync.viewOwn` | Sí | Sí | — |
| `sync.viewAll` | No | Sí | Sí |
| `sync.retry` | Sí | Sí | No |
| `audit.view` | No | Sí | Sí |
| `export.run` | No | Sí | Sí |
| `settings.manage` | No | Sí | No |

El supervisor no registra movimientos en cajas ajenas en el MVP. Ningún rol puede reabrir una caja cerrada.
