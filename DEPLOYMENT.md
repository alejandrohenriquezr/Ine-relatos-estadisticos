# Despliegue y recuperación

## Sitio productivo

- Proyecto Sites: identificado por `.openai/hosting.json`.
- Base lógica D1: `DB`.
- La publicación debe realizarse únicamente desde una versión guardada y
  validada del proyecto.

## Validaciones previas

```bash
npm ci
npm run lint
npm test
```

El proceso de construcción debe producir:

- `dist/server/index.js`;
- `dist/.openai/hosting.json`;
- migraciones en `dist/.openai/drizzle/`, cuando correspondan.

## Recuperación desde GitHub

1. Clonar el repositorio privado.
2. Instalar Node.js compatible.
3. Ejecutar `npm ci`.
4. Verificar `.openai/hosting.json`.
5. Configurar el enlace D1 en el ambiente de Sites.
6. Ejecutar las pruebas.
7. Publicar mediante el flujo de Sites.
8. Confirmar las páginas principales y las rutas API.

## Datos y caché

El repositorio respalda el esquema, las migraciones y los archivos iniciales.
No contiene una exportación de la base D1 productiva. La caché puede
reconstruirse desde las fuentes oficiales.

## Reversión

Ante una falla:

1. identificar el último release válido;
2. restaurar su commit;
3. ejecutar pruebas;
4. publicar una nueva versión;
5. documentar causa, impacto y corrección.
