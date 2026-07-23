# Arquitectura

## Componentes

1. **Interfaz:** componentes React y estilos globales en `app/`.
2. **Rutas de datos:** endpoints bajo `app/api/`.
3. **Transformadores:** módulos de dominio en `lib/`.
4. **Persistencia:** D1, esquema Drizzle y migraciones en `db/` y `drizzle/`.
5. **Arranque resiliente:** archivos JSON/XLSX versionados en `public/`.
6. **Runtime:** adaptador Worker en `worker/`.

## Flujo de una consulta

1. La página solicita el producto estadístico.
2. La API busca una revisión válida en D1.
3. Si existe, responde inmediatamente.
4. La interfaz presenta los datos y solicita una verificación en segundo plano.
5. La API consulta ETag, `Last-Modified` y tamaño de la fuente.
6. Si la firma cambió, descarga y transforma la planilla.
7. Se calculan indicadores derivados y se valida la estructura.
8. La nueva revisión se guarda en D1 y la interfaz se actualiza.
9. Si la fuente falla, se conserva la última revisión válida.

## Capas de continuidad

- **Archivos iniciales:** garantizan una vista recuperable desde el código.
- **Memoria del cliente:** evita repetir solicitudes durante la navegación.
- **D1 compartida:** reutiliza la misma revisión entre visitantes e instancias.
- **Fuente oficial:** determina cuándo corresponde una actualización.

## Criterios de diseño

- Último período disponible por omisión.
- Texto analítico vinculado a las cifras visibles.
- Selectores territoriales, temáticos y temporales.
- Leyendas que activan u ocultan series.
- Transiciones suaves y descarga de gráficos.
- Diseño adaptable y navegación consistente.

## Límites actuales

- Las fuentes son planillas y documentos cuya estructura puede cambiar.
- Los transformadores son específicos por producto.
- D1 actúa como caché operacional, no como fuente estadística maestra.
- La incorporación de un producto requiere validación metodológica y editorial.
