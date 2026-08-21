# Gobernanza de datos, metadatos y versiones

| Unidad | Responsable principal | Regla de versión |
| --- | --- | --- |
| Operación estadística | Administrador de operación | Identificador y slug estables. |
| Página y relato | Editor o diseñador autorizado | Nueva versión antes de publicación. |
| Fuente de datos | Editor autorizado | Versión inmutable por carga o configuración. |
| Archivo | Editor y autorizador | Hash, metadatos y estado vinculados a la versión. |
| Variable y período | Administrador o responsable metodológico | Cambios trazables y compatibles con fuentes. |
| Publicación | Editor y autorizador distinto | Aprobación asociada a una versión específica. |

## Reglas

- D1 conserva metadatos, relaciones, estados y auditoría; los bytes privados se mantienen en `BUCKET`.
- Los archivos tabulares deben declarar hoja, fila o filas de encabezado, columnas utilizables, tipo de dato, formato y tratamiento de valores faltantes antes de alimentar un componente.
- El diccionario describe variables visibles o reutilizables. Las variables derivadas registran expresión, dependencias y definición; no sustituyen el dato original.
- Cada lote de carga se limita a una operación estadística y a un autorizador único para evitar mezclar responsabilidades.
- El historial de auditoría es append-only. Las restauraciones crean una nueva versión; no reactivan silenciosamente una anterior.
- Las reglas de confidencialidad, calidad y publicación siguen siendo responsabilidad de la operación estadística dueña del dato.

## Ciclo de publicación

`BORRADOR → PENDIENTE_AUTORIZACION → PUBLICADO`.

Un rechazo devuelve el contenido a revisión. Un retiro deja de exponer la versión pública sin borrar la trazabilidad. El embargo se comprueba al leer, por lo que una publicación puede hacerse visible al llegar su fecha sin depender exclusivamente de una tarea programada.

