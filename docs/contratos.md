# Contratos

## Movimiento

Los importes se representan como enteros en centavos. Cada movimiento identifica su sesión, tipo, dirección y fecha UTC.

## Estados de sincronización

`pending` → `syncing` → `synced`. En caso de problemas temporales pasa a `error`; una respuesta explícita del servidor puede marcarlo como `rejected`.

## Roles

`admin`, `cashier` y `auditor`. La matriz final de permisos vive en el paquete de dominio.

## POST /sync

La petición contiene el identificador del dispositivo, fecha de envío y registros de la cola. La respuesta contiene un resultado por `recordId` (`accepted`, `duplicate`, `rejected` o error).
