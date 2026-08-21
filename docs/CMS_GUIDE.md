# Guía del CMS

## Propósito

El administrador permite mantener contenido estadístico sin editar código. Los permisos disponibles dependen del rol global y del alcance asignado a cada operación.

## Módulos

| Módulo | Función |
| --- | --- |
| Páginas | Crear, editar, previsualizar y publicar relatos. |
| Biblioteca de contenido | Reutilizar textos, recursos y elementos documentales. |
| Fuentes y archivos | Cargar archivos, revisar muestras y configurar su estructura. |
| Diccionario de variables | Registrar definición, unidad, tipo y uso de variables. |
| Variables derivadas | Definir cálculos basados en variables declaradas. |
| Períodos estadísticos | Declarar la forma en que se interpreta el tiempo de una fuente. |
| Centro de recursos | Asociar integraciones y recursos disponibles por operación. |

## Edición de un relato

1. Abrir la operación y seleccionar la página, incluso si está publicada.
2. Crear o actualizar los bloques mediante el registro de componentes permitido.
3. Para tablas, gráficos o elementos dinámicos, seleccionar una fuente previamente configurada.
4. Revisar la vista previa pública y la accesibilidad básica de títulos, alternativas y etiquetas.
5. Guardar como borrador y enviar a autorización cuando corresponda.

## Configuración de una fuente

La pantalla de fuentes identifica archivos disponibles y permite cargar uno nuevo. La configuración define la hoja, la fila o filas de cabecera, las columnas publicables, el tipo de dato, decimales y otros metadatos. Si el archivo tiene cabeceras multinivel, se debe confirmar la estructura detectada antes de usarlo.

## Carga masiva

Un lote contiene los archivos y su plantilla de metadatos. Se procesa dentro de una sola operación estadística y se asigna a un único autorizador. Los errores de validación se corrigen antes de enviarlo al workflow.

## Regla de publicación

Guardar no publica. La publicación exige autorización de una persona distinta del editor, y una fecha de embargo se respeta al momento de lectura. Las acciones de retirar o restaurar mantienen el historial.

