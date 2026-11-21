# Manual técnico — versión 1

## Requisitos

- Node.js 20 o posterior.
- npm 10 o posterior.
- Android Studio para etapas móviles posteriores.

## Instalación

```sh
npm install
```

## Servidor

```sh
npm run server
```

El servidor escucha por defecto en `0.0.0.0:3000`. La variable `PORT` permite cambiarlo.

## Comprobaciones

```sh
npm test
npm run build
npm run lint
```

## Endpoints iniciales

`GET /health`: información de estado, versión del servidor, versión del API y hora UTC.

## SQLite

La biblioteca concreta de persistencia SQLite se seleccionará al implementar las etapas posteriores. Debe documentarse aquí antes de integrarla.

CORS está abierto en E0 para permitir acceso desde la app móvil y el navegador de desarrollo.

## Sincronización del servidor

El servidor usa SQLite mediante `better-sqlite3`. Ejecuta `npm run server` en la PC. Desde otra red, usa la IP de la PC obtenida con `ipconfig` y abre el puerto 3000 en el cortafuegos de Windows. El teléfono y la PC deben estar en la misma red. `POST /auth/token` obtiene un token de demostración; `POST /sync` recibe lotes con `deviceId`, `sentAt` y registros en orden. Un `recordId` ya procesado devuelve `duplicate`.

El panel está en `/` y siempre muestra que se trata de una simulación, no del ERP real. `/demo/state` devuelve contadores y registros; `/demo/config`, `/demo/close-session/:id` y `/demo/reset` permiten controlar la demostración.

## Cómo se guarda un registro (offline-first)

Las sesiones y movimientos se escriben primero en Dexie. Sin una URL de servidor configurada quedan en estado `local`; al configurar `serverUrl`, se encolan en orden en `outbox` y pasan a `pending`. La entidad, su entrada de cola y su auditoría se guardan en la misma transacción. La conectividad debe combinar el estado de red del dispositivo con una comprobación real de `GET /health`.
