# Contrato del modelo de datos

## Convenciones

- Los importes son enteros en centavos; sus campos terminan en `Minor`.
- Las fechas son texto ISO-8601 UTC y terminan en `At`.
- Los enumerados se escriben en `snake_case`.
- Las entidades son objetos planos y serializables. `null` representa ausencia; no se usa `undefined`.

## User

| Campo | Tipo | Obligatorio | Ejemplo |
|---|---|---|---|
| id | string | Sí | `user-cashier-ana` |
| name | string | Sí | Ana |
| role | `cashier \| supervisor \| accountant` | Sí | cashier |
| registerId | string \| null | Sí | reg-01 |
| avatarColor | string | Sí | #2563eb |

`pinHash` y `pinSalt` son internos de la base local y nunca salen de un repositorio.

## Register

`id`, `name`.

## CashSession

`id`, `userId`, `registerId`, `currency`, `openedAt`, `openingBalanceMinor`, `status`, `closedAt`, `countedBalanceMinor`, `expectedBalanceMinor`, `varianceMinor`, `varianceNote`, `closedByUserId`, `denominationBreakdown`, `syncStatus`.

Los estados de `status` son `open` y `closed`. Los campos opcionales finales usan `null`.

## Movement

`id`, `sessionId`, `userId`, `type`, `direction`, `amountMinor`, `currency`, `description`, `occurredAt`, `createdAt`, `reference`, `counterparty`, `counterpartyRegisterId`, `reversalOf`, `reversedBy`, `reversalReason`, `syncStatus`. La dirección se deriva del tipo y se almacena para consultas.

## OutboxEntry

`id`, `sequence`, `entityType`, `entityId`, `operation`, `status`, `attempts`, `lastAttemptAt`, `nextAttemptAt`, `lastError`, `serverResult`, `createdAt`, `updatedAt`.

## AuditEntry

`id`, `at`, `userId`, `action`, `entityType`, `entityId`, `details`.

## Estados de sincronización

`local → pending → syncing → synced | rejected | error`. Al recuperar el proceso, `syncing → pending`. Desde `error`, el reintento vuelve a `pending`. `synced` y `rejected` son finales.

## Reglas de negocio

- El saldo esperado incluye todos los movimientos locales, aprobados o rechazados por el servidor.
- Los movimientos son inmutables; las correcciones se realizan mediante movimientos inversos.
- Solo puede haber una caja abierta por usuario.
- Una caja cerrada no admite movimientos nuevos.
- La descripción debe tener entre 3 y 140 caracteres.
- La fecha de un movimiento no puede ser futura ni anterior a la apertura de su sesión. Se admite una tolerancia futura de 5 minutos.
- La moneda de un movimiento debe coincidir con la moneda de la sesión; el valor predeterminado es `CUP`.
