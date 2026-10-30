# Manual de usuario

## Estado inicial

La primera versión contiene la infraestructura de la aplicación, el servidor y los contratos de datos. Las pantallas de acceso y operación se incorporarán en las etapas siguientes.

## Acceso y roles

La aplicación de demostración incluye tres usuarios:

| Usuario | Rol | Caja | PIN de demostración |
|---|---|---|---|
| Ana | Vendedor | Caja principal | `1234` |
| Luis | Supervisor | Caja principal | `2345` |
| Marta | Contabilidad | Ninguna | `3456` |

Los PIN son datos de demostración documentados y se deben reemplazar antes de usar la aplicación en producción. Tras cinco PIN incorrectos, el acceso queda bloqueado durante 60 segundos.

Las pantallas muestran únicamente las acciones autorizadas para el rol del usuario activo. Contabilidad tiene acceso de consulta; el vendedor opera su propia caja; el supervisor puede consultar todas las cajas y gestionar exportación, auditoría y configuración.
