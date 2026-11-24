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

## Persistencia y configuración de seguridad

El servidor usa SQLite mediante `better-sqlite3`. La base se conserva en memoria salvo que se proporcione `databasePath` al construir el servidor.

CORS acepta cualquier origen para la demostración y el navegador de desarrollo. Los PIN y el secreto de autenticación son exclusivamente de demostración. En producción `AUTH_SECRET` es obligatorio y debe tener al menos 32 caracteres; sin él, el servidor no arranca. No exponga este simulador como un ERP de producción.

## Sincronización del servidor

Ejecuta `npm run server` en la PC. Desde otra red, usa la IP de la PC obtenida con `ipconfig` y abre el puerto 3000 en el cortafuegos de Windows. El teléfono y la PC deben estar en la misma red. `POST /auth/token` obtiene un token de demostración; `POST /sync` recibe lotes validados de hasta 100 registros con `deviceId`, `sentAt` y registros en orden. Cada registro se procesa en una transacción independiente. Un `recordId` ya procesado devuelve `duplicate` con el resultado inicial; los intentos duplicados se contabilizan en el panel.

El panel está en `/` y siempre muestra que se trata de una simulación, no del ERP real. `/demo/state` devuelve contadores y registros. Los controles del panel y `POST /demo/config` permiten definir el límite de monto (10.000.000 centavos por defecto), rechazos forzados, latencia (máximo 60 segundos), respuestas HTTP 503 y pérdida de respuestas para probar la idempotencia. `/demo/close-session/:id` y `/demo/reset` sirven para preparar o limpiar escenarios. El reset también restaura la configuración demo.

La autenticación valida las credenciales de demostración y firma tokens HMAC con expiración de una hora. En modo desarrollo/test se usa el secreto demo predeterminado; en producción debe configurarse `AUTH_SECRET`. La ruta de sincronización valida la carga estructuralmente, comprueba la identidad del usuario y verifica las reglas aplicables en el servidor. No se registran PIN ni tokens.

## Cómo se guarda un registro (offline-first)

Las sesiones y movimientos se escriben primero en Dexie. Sin una URL de servidor configurada quedan en estado `local`; al configurar `serverUrl`, se encolan en orden en `outbox` y pasan a `pending`. La entidad, su entrada de cola y su auditoría se guardan en la misma transacción. La conectividad debe combinar el estado de red del dispositivo con una comprobación real de `GET /health`.
