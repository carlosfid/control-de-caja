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
