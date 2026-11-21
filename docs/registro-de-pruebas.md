# Registro de pruebas

## Plantilla

| Fecha | Etapa | Versión | Prueba | Resultado | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | E0 | | | Pendiente | | |

## E0 — Cimientos y contratos

Las pruebas automáticas incluyen el contrato `Result`, los constructores de datos de prueba y `GET /health`.

## E1 — Acceso y roles

Verificar:

- Los tres usuarios demo aparecen desde la base local.
- Los PIN correcto, incorrecto, mal formado y bloqueo cumplen el contrato.
- La siembra no duplica usuarios al ejecutarse varias veces.
- Los registros de auditoría existen en login correcto y fallido.
- La matriz acción × rol coincide con el documento de permisos.

## E2 — Apertura de caja

Las pruebas automáticas cubren parseo y formato de importes, saldo inicial cero y valores inválidos, rol sin permiso, apertura concurrente, auditoría y persistencia de la sesión tras cerrar y reabrir la base local.

## E3 — Movimientos y saldo esperado

| Fecha | Etapa | Versión | Prueba | Resultado | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| 2026-11-21 | E3 | 0.3.0 | Catálogo, validación múltiple y resumen de sesión | Aprobado | 74 pruebas del dominio, incluidas 4 nuevas de E3 | Todos los movimientos locales deben incluirse en el cálculo del esperado. |
| 2026-11-21 | E3 | 0.3.0 | Persistencia, auditoría y suscripción de movimientos | Aprobado | 15 pruebas móviles, incluidas 4 nuevas de E3 | `movement_created` se escribe dentro de la transacción del movimiento. |
