# Gobierno de datos

## Roles recomendados

| Rol | Responsabilidad |
|---|---|
| Dueño del producto | Priorizar alcance, experiencia y versiones |
| Dueño del dato | Aprobar definición, fuente, unidad y calidad |
| Equipo metodológico | Validar cálculos, notas e interpretación |
| Equipo editorial | Validar relato y lenguaje claro |
| Equipo técnico | Mantener transformadores, pruebas y despliegue |
| DMIE | Definir metadatos |
| TI y seguridad | Homologar plataforma, acceso y continuidad |

## Controles mínimos por producto

1. Fuente oficial y responsable identificados.
2. Diccionario de variables y unidades.
3. Reglas de transformación revisadas.
4. Validaciones de rango, completitud y coherencia temporal.
5. Comparación con la publicación oficial.
6. Registro del período y revisión publicados.
7. Prueba de regresión antes de desplegar.
8. Procedimiento de corrección y reversión.

## Gestión de cambios

- Todo cambio debe ingresar mediante una rama y revisión.
- `main` representa la versión aprobada del repositorio.
- Los cambios de fuentes o fórmulas deben actualizar pruebas y documentación.
- Las rupturas de esquema deben generar una alerta y bloquear la publicación.
- Los releases deben asociarse a un commit, una fecha y un responsable.

## Privacidad

El alcance vigente utiliza datos agregados de acceso público. La incorporación
de microdatos o tablas con riesgo de identificación requiere evaluación de
confidencialidad y control de divulgación estadística antes del desarrollo.
