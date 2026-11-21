# Control de Caja

Monorepo para una aplicación móvil offline-first de control de caja, con dominio compartido y un ERP simulador.

## Estructura

- `packages/domain`: reglas, tipos, permisos y contrato de sincronización en TypeScript puro.
- `apps/mobile`: cliente React + Capacitor con almacenamiento local Dexie.
- `apps/server`: simulador ERP con Fastify y SQLite.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Android Studio y JDK 17 para generar la APK

## Inicio rápido

```bash
npm install
npm run build
npm test
npm run lint
```

Consulte la carpeta `docs/` para la arquitectura, contratos, decisiones técnicas y guion de demostración.

## Servidor de demostración

```bash
npm run server
```

El servidor escucha en `0.0.0.0:3000` por defecto. El panel está en `http://localhost:3000/`, `/health` devuelve el estado y `/demo/state` entrega contadores y registros. Para un teléfono en la misma red, configure el puerto 3000 en el cortafuegos y use la IP de la PC.

## Flujo de Git

Las propuestas se realizan mediante una rama desde `main` y un pull request. Los tags con formato `v*` generan una release con APK.
