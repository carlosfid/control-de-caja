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

## E4 — Conteo y cierre

| Fecha | Etapa | Versión | Prueba | Resultado | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| 2026-11-21 | E4 | 0.4.0 | Conteo cuadrado, faltante y sobrante | Aprobado | Suite móvil stage4 y reglas de dominio | La diferencia exige nota. |
| 2026-11-21 | E4 | 0.4.0 | Doble cierre y movimiento posterior | Aprobado | Suite móvil stage4 | Una caja cerrada queda bloqueada. |
| 2026-11-21 | E4 | 0.4.0 | Esperado recalculado desde movimientos | Aprobado | Suite móvil stage4 | Un valor esperado manipulado no se acepta. |

## E5 — Offline real y estados visibles

| Fecha | Etapa | Versión | Prueba | Resultado | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| 2026-11-21 | E5 | 0.5.0 | Cola offline y retroencolado | Aprobado | Suite móvil stage5 | Cinco movimientos locales pasan a pendiente al configurar el servidor. |
| 2026-11-21 | E5 | 0.5.0 | Escritura transaccional y reintento | Aprobado | Suite móvil stage5 | Solo `error` puede pasar a `pending` mediante reintento. |
| 2026-11-21 | E5 | 0.5.0 | Transiciones de sincronización | Aprobado | 36 pruebas de dominio | Estados finales y recuperaciones permiten la tabla definida. |

## E6 — Sincronización con el servidor simulado

| Fecha | Etapa | Versión | Prueba | Resultado | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| 2026-11-21 | E6 | 0.6.0 | Idempotencia, autenticación y límites | Aprobado | Suite servidor sync | Un recordId duplicado conserva el resultado original. |
| 2026-11-21 | E6 | 0.6.0 | Motor, backoff y recuperación | Aprobado | Suite móvil stage6 | El motor usa lotes de hasta 20 registros. |
| 2026-11-21 | E6 | 0.6.0 | Panel y controles demo | Aprobado | Suite servidor demo | La interfaz muestra la simulación y los últimos registros. |

## E7 — Ampliación funcional

| Fecha | Etapa | Versión | Prueba | Resultado | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| 2026-11-21 | E7 | 0.7.0 | Anulación feliz y prohibiciones | Aprobado | 118 pruebas dominio y 31 pruebas móviles | Incluye sesión cerrada, motivo corto y doble anulación. |
| 2026-11-21 | E7 | 0.7.0 | CSV, catálogo ampliado y auditoría | Aprobado | Pruebas dominio y repositorios móviles | CSV con BOM y separador decimal/coma. |
| 2026-11-21 | E7 | 0.7.0 | Tipos, reversión y transferencias servidor | Aprobado | Servicio servidor actualizado | Transferencias sin pareja visibles en estado demo. |

## E8 — Pulido y entrega

| Fecha | Etapa | Versión | Prueba | Resultado | Evidencia | Observaciones |
|---|---|---|---|---|---|---|
| 2026-11-21 | E8 | 0.8.0 | Flujo extremo a extremo sin interfaz | Aprobado | Suite full-flow | Apertura, offline, cierre, reconexión y sincronización. |
| 2026-11-21 | E8 | 0.8.0 | Prueba de carga de 1.000 movimientos | Aprobado | Suite full-flow | Los registros se mantienen en Dexie. |
| 2026-11-21 | E8 | 0.8.0 | Reset, exportación y escenario demo | Aprobado | Suite stage8 | El volcado excluye PIN, sales y bloqueos. |
| 2026-11-21 | E8 | 0.8.0 | Compilación y suites completas | Aprobado | Build y npm test | Validación de dominio, móvil y servidor. |
