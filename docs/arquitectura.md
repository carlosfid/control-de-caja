# Arquitectura

El repositorio usa un monorepo con tres áreas: dominio compartido, aplicación móvil offline-first y servidor ERP simulado. La aplicación guarda los datos localmente, los representa en una cola de salida y los sincroniza mediante lotes con el servidor.

- `packages/domain`: modelos, reglas, permisos y contratos independientes de infraestructura.
- `apps/mobile`: interfaz, almacenamiento Dexie, cola y cliente HTTP.
- `apps/server`: API Fastify, persistencia SQLite y reglas de aceptación.
