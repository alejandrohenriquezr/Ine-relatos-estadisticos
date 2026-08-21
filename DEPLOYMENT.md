# Despliegue y recuperación

## Entorno

La aplicación se ejecuta en ChatGPT Sites. El manifiesto `.openai/hosting.json` declara la identidad del proyecto y los bindings lógicos. El proyecto usa Vinext/Vite y puede disponer de D1 y `BUCKET` según su configuración de entorno.

## Secuencia de entrega

1. Revisar los cambios y ejecutar las pruebas pertinentes.
2. Confirmar que toda modificación del esquema tenga una migración Drizzle nueva.
3. Verificar que no se agregaron secretos ni datos privados.
4. Construir con `npm run build` y resolver los errores antes de crear una versión.
5. Crear la versión del sitio desde el commit validado y publicar solo con la autorización aplicable.

## Recuperación

Ante diferencias en el catálogo editorial, cambiar la operación afectada al modo de lectura heredado, revisar auditoría y conciliación, y restaurar el modo CMS solo después de verificar resultados. El retiro de un archivo o publicación debe hacerse mediante el workflow; no se elimina directamente una versión publicada.

