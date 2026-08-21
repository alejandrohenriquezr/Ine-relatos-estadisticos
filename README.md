# INE | Relatos Estadísticos

Plataforma web del Instituto Nacional de Estadísticas de Chile para publicar relatos, productos y recursos estadísticos. Reúne la consulta pública de operaciones estadísticas con un CMS protegido para administrar páginas, contenidos, fuentes, variables y períodos de referencia.

## Cambios principales desde la versión publicada en GitHub el 8 de agosto de 2026

- CMS visual para crear y editar relatos, incluidas páginas ya publicadas y su vista previa pública.
- Biblioteca de contenido, fuentes y archivos, con alta de fuentes, vista de muestra, configuración de encabezados, columnas, tipos de dato y decimales.
- Motor de fuentes para archivos tabulares, con detección y confirmación de encabezados simples o multinivel, selección de columnas y reutilización de datos en componentes.
- Editor de componentes visuales, diccionario de variables, variables derivadas y esquemas de períodos estadísticos.
- Carga masiva de archivos por lote y reglas de una operación y un autorizador por lote.
- Flujo editorial versionado con borrador, envío, aprobación, embargo, retiro, restauración, auditoría y caché selectiva.
- Activación gradual y reversible del CMS para ENE, Informalidad, IPC e IPP, sin romper las rutas públicas heredadas.

## Tecnología

- TypeScript, React 19, Next 16 y Vinext/Vite.
- Cloudflare D1 con Drizzle para metadatos y relaciones editoriales.
- Almacenamiento privado de archivos mediante el binding lógico `BUCKET`.
- ChatGPT Sites para ejecución y autenticación; las reglas RBAC se validan siempre en el servidor.

## Estructura del repositorio

| Ruta | Contenido |
| --- | --- |
| `app/` | Interfaz pública, administrador y rutas API. |
| `lib/` | Reglas editoriales, consultas, caché y adaptadores de datos. |
| `db/` y `drizzle/` | Esquema, acceso D1 y migraciones ordenadas. |
| `public/` | Datos estáticos, identidad visual y documentos públicos heredados. |
| `scripts/` | Importación, transformación, validación y utilidades de compilación. |
| `tests/` | Pruebas de políticas, migraciones, interfaz y datos. |
| `docs/` | Decisiones, procedimientos y documentación del CMS. |

## Inicio local

Requisitos: Node.js 22.13 o superior, Linux con `bash`, `curl`, `flock` y GNU `timeout`.

```bash
npm run install:ci
npm run dev
```

```bash
npm run build
npm test
npm run lint
npm run db:generate
```

No se versionan secretos. Las variables necesarias para servicios externos deben configurarse en el entorno de despliegue.

## Lectura recomendada para colaboradores

1. [Arquitectura](ARCHITECTURE.md)
2. [Guía del CMS](docs/CMS_GUIDE.md)
3. [Gobernanza de datos](DATA_GOVERNANCE.md)
4. [Fuentes y actualización de datos](DATA_SOURCES.md)
5. [Seguridad](SECURITY.md)
6. [Despliegue](DEPLOYMENT.md)
7. [Contribución](CONTRIBUTING.md)
