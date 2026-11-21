# Guion de demostración — versión final

## E0 — Cimientos

1. Presentar la arquitectura del monorepo y la separación de responsabilidades.
2. Ejecutar `npm test` para el dominio y el servidor.
3. Arrancar el ERP simulado con `npm run server`.
4. Comprobar `GET /health` desde el navegador.
5. Mostrar los contratos de datos y roles.

## Demostración de extremo a extremo (≈ 5 minutos)

1. Abrir el servidor y mostrar el rótulo `SIMULACIÓN — no es el ERP real`.
2. Con el vendedor Ana, abrir una caja con saldo inicial conocido.
3. Activar modo avión y registrar una venta y un egreso.
4. Reiniciar la aplicación y confirmar que los movimientos permanecen locales.
5. Contar la caja y cerrar mostrando una diferencia con una nota obligatoria.
6. Reconectar al servidor y observar el motor enviando el lote.
7. Mostrar en el panel los registros aceptados y al menos un rechazo deliberado.
8. Mostrar el estado final: aceptados, rechazados y registros sin duplicados.
