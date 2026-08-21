# Fuentes y actualización de datos

## Tipos de fuente

El sitio combina instantáneas JSON, archivos estáticos publicados, tablas D1 y fuentes administradas desde el CMS. Los componentes públicos deben consumir solamente datos publicados o fuentes autorizadas.

| Grupo | Ubicación habitual | Uso |
| --- | --- | --- |
| Datos de relato | `public/*-data.json` | Visualizaciones y rutas de consulta. |
| SDMX | `public/sdmx/`, `app/api/sdmx/` | Descarga y consulta estructurada. |
| Documentos públicos | `public/<operacion>/` | Boletines, cuadros, metodologías y recursos. |
| Fuentes CMS | D1 + `BUCKET` | Configuración, versiones, muestras y componentes. |

## Proceso para una fuente tabular en el CMS

1. Cargar o seleccionar el archivo dentro de una operación estadística.
2. Revisar la muestra y confirmar hoja, cabeceras y columnas.
3. Definir tipo de dato, decimales, unidades, valores faltantes y período si corresponde.
4. Registrar o asociar variables en el diccionario.
5. Usar la fuente en uno o más componentes y verificar la vista previa.
6. Someter la versión a autorización cuando afecte contenido público.

## Actualización de datos versionados en el repositorio

Los scripts de `scripts/` transforman fuentes externas a artefactos del sitio. Antes de versionar un resultado, se debe comprobar su origen, período de referencia, coherencia de filas y compatibilidad con las rutas que lo leen. Evitar editar manualmente datos derivados cuando exista un script reproducible.

Los archivos de gran tamaño requieren evaluación previa: GitHub limita archivos individuales y el despliegue se resiente con artefactos innecesarios. Datos privados o insumos con identificadores no deben incorporarse al repositorio.

