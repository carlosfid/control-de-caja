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
