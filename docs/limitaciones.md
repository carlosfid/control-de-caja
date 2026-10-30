# Limitaciones

## Versión 1

- El servidor de E0 es un simulador y no representa todavía al ERP real.
- Persistencia SQLite y sincronización pendiente de implementación en etapas posteriores.
- El cifrado de PIN y otras medidas de seguridad deben considerarse de demostración hasta que se endurezcan.
- El hash SHA-256 con sal usado en E1 es suficiente para demostrar el flujo, pero no sustituye Argon2id, scrypt o PBKDF2 para PIN en producción.
