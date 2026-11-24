# Limitaciones

## Versión final de demostración

- El servidor de E0 es un simulador y no representa todavía al ERP real.
- La base local móvil no usa cifrado real; los datos demo son visibles en soporte y dispositivo.
- El servidor Fastify/SQLite es una simulación de ERP, no una integración bancaria o contable real.
- La autenticación usa un secreto de demostración y PIN documentados; no sustituye autenticación de producción.
- Los tokens tienen caducidad, pero no existe gestión completa de revocación ni rotación de claves.
- Las sesiones usan una sola moneda por sesión; la conversión no forma parte del MVP.
- El cifrado de PIN y otras medidas de seguridad deben considerarse de demostración hasta que se endurezcan.
- El hash SHA-256 con sal usado en E1 es suficiente para demostrar el flujo, pero no sustituye Argon2id, scrypt o PBKDF2 para PIN en producción.
- Los secretos, certificados y variables de producción no deben añadirse al repositorio.
- CORS está abierto para la demostración y debe restringirse antes de desplegarlo fuera de red local.
- Toda entrada se valida en el servidor, pero la seguridad de producción requiere HTTPS, rate limiting y gestión segura de secretos.
- Los controles `/demo/*` están diseñados para escenarios de demostración y no deben exponerse como controles administrativos de producción.
- Los registros de soporte no deben incluir PIN, hashes, sales o tokens, salvo que exista un proceso autorizado de diagnóstico.
