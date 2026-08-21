# Deuda técnica y límites conocidos

| Tema | Estado | Tratamiento previsto |
| --- | --- | --- |
| Transición de catálogo | Conviven lecturas heredada y editorial | Mantener conciliación y retirar la ruta heredada solo cuando todas las operaciones estén verificadas. |
| Integraciones de correo | Dependen de secretos y configuración externa | Conservar outbox idempotente y registrar errores sin exponer credenciales. |
| Datos de gran tamaño | Parte de los datos y documentos vive en el repositorio | Evaluar almacenamiento especializado y procesos de actualización reproducibles. |
| Portabilidad institucional | La primera etapa usa D1 y Sites | Mantener adaptadores, contratos y exportación conforme a `docs/PORTABILITY.md`. |
| Cobertura de pruebas visuales | Hay pruebas estructurales y de políticas, no una matriz visual completa | Añadir pruebas de recorridos críticos al estabilizar el CMS. |

