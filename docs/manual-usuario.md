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

## Abrir caja

El vendedor y el supervisor pueden abrir una caja asignada. El saldo inicial se introduce como importe con coma decimal y hasta dos decimales (por ejemplo, `1.234,50`); el punto se usa únicamente para agrupar miles. Un valor como `12.5` no es válido. El saldo puede ser cero, pero no negativo. Solo se permite una caja abierta por usuario.

## Registrar movimientos

Desde una caja abierta, el vendedor o supervisor puede registrar ingresos y egresos según el tipo permitido. El vendedor no puede registrar pagos de salario. La descripción debe tener entre 3 y 140 caracteres, el importe debe ser positivo y la fecha no puede ser anterior a la apertura ni futura. El saldo esperado combina el saldo inicial con todos los movimientos registrados, incluso mientras estén pendientes de sincronizar.

Los movimientos se consideran registros; una corrección posterior se realiza mediante una operación inversa y no modifica el movimiento original.
