# Contribución

## Antes de modificar

1. Leer `ARCHITECTURE.md`, `DATA_GOVERNANCE.md` y la documentación relevante de `docs/`.
2. Identificar la operación estadística, capa y contrato afectados.
3. Trabajar en una rama de propósito acotado.

## Reglas de desarrollo

- Escribir TypeScript estricto y conservar los comentarios necesarios para explicar reglas no evidentes.
- Mantener la autorización en rutas y servicios del servidor; nunca confiar en ocultar controles en la interfaz.
- No cambiar contratos públicos, slugs ni rutas sin un plan de compatibilidad.
- Agregar una migración para cada cambio persistente y una prueba cuando se alteren políticas, workflow o permisos.
- Mantener contenidos institucionales, fuentes y fechas verificables.

## Antes de proponer cambios

Ejecutar `npm run lint`, las pruebas aplicables y, cuando se altere la entrega, `npm run build`. Documentar cualquier limitación conocida y actualizar los documentos afectados.

