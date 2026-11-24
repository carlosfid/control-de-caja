# Contratos

## Movimiento

Los importes se representan como enteros en centavos. Cada movimiento identifica su sesión, tipo, dirección y fecha UTC.

## Estados de sincronización

`pending` → `syncing` → `synced`. En caso de problemas temporales pasa a `error`; una respuesta explícita del servidor puede marcarlo como `rejected`.

## Roles

`admin`, `cashier` y `auditor`. La matriz final de permisos vive en el paquete de dominio.

## POST /sync

La petición contiene el identificador del dispositivo, fecha ISO-8601 UTC y hasta 100 registros de la cola. El contrato y su validador están en `packages/domain/src/sync-contract`; el servidor valida contra este contrato y la app usa los tipos compartidos para construir la petición. Los registros llevan `recordId`, `kind`, `operation` y una carga útil de sesión o movimiento; no se permiten campos adicionales ni estados locales desconocidos.

La respuesta contiene un resultado por `recordId` (`accepted`, `duplicate`, `rejected` o error). Cuando el resultado es `duplicate`, `originalResult` conserva la decisión inicial (`accepted` o `rejected`), y `reason` conserva el motivo del rechazo original si lo hubo. Así la app no muestra como sincronizado un registro cuyo primer envío fue rechazado y cuya respuesta se perdió. Las razones de rechazo se enumeran en el contrato compartido. El servidor procesa cada registro en una transacción independiente; los intentos duplicados no vuelven a modificar datos.
