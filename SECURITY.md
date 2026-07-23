# Seguridad

## Reporte

Las vulnerabilidades no deben publicarse como incidencias abiertas. Deben
comunicarse directamente al responsable institucional del proyecto.

## Reglas del repositorio

- No almacenar tokens, contraseñas, cookies ni claves privadas.
- No subir archivos `.env` reales.
- No incluir microdatos ni identificadores personales.
- Mantener dependencias bloqueadas mediante `package-lock.json`.
- Revisar alertas de dependencias y resultados de CI.
- Rotar inmediatamente cualquier credencial expuesta.

## Alcance

El sitio consume fuentes estadísticas públicas y agregadas. Una ampliación que
incorpore autenticación, carga de archivos o datos no públicos requiere una
evaluación de amenazas y controles adicionales.
