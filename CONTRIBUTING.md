# Contribución

## Flujo de trabajo

1. Crear una rama descriptiva desde `main`.
2. Realizar cambios pequeños y trazables.
3. Agregar o actualizar pruebas.
4. Ejecutar `npm run lint` y `npm test`.
5. Abrir un pull request con evidencia.
6. Obtener revisión técnica y, cuando corresponda, metodológica.
7. Fusionar sólo con controles aprobados.

## Convenciones

- TypeScript para el código de aplicación.
- Comentarios para explicar transformaciones o decisiones no evidentes.
- Nombres de variables que reflejen concepto y unidad.
- No duplicar fórmulas estadísticas entre componentes.
- Mantener las URLs oficiales junto al transformador responsable.

## Criterios de aceptación

- La página carga desde caché o fallback antes de verificar la fuente.
- Las unidades, notas y períodos son correctos.
- Los gráficos responden a teclado y dispositivos táctiles.
- Las series y selectores mantienen transiciones coherentes.
- No se incorporan secretos ni datos personales.
- Las pruebas y la construcción finalizan correctamente.
