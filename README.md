# INE | Relatos Estadísticos

Sitio interactivo que transforma estadísticas oficiales del Instituto Nacional
de Estadísticas de Chile en relatos guiados, gráficos explorables y recursos de
consulta. El portal oficial [ine.gob.cl](https://www.ine.gob.cl/) continúa siendo
la fuente institucional y canónica.

## Alcance actual

- Mercado laboral: ENE e informalidad laboral.
- Precios: IPC, IPP y calculadora IPC.
- Demografía y población: nacimientos, fecundidad, defunciones, mortalidad,
  matrimonios y acuerdos de unión civil.
- Condiciones de vida: ENUSC y estadísticas policiales.
- Industria, energía y construcción.
- Servicios: comercio, turismo y supermercados.

## Arquitectura resumida

```text
Fuentes oficiales INE (Excel/XLS/PDF)
                 │
                 ▼
API y transformadores TypeScript
                 │
        ┌────────┴────────┐
        ▼                 ▼
Cloudflare D1       JSON iniciales
caché compartida    versionados
        └────────┬────────┘
                 ▼
React / Vinext / Cloudflare Worker
```

La aplicación responde primero desde la caché compartida o desde conjuntos
iniciales versionados. La fuente oficial se verifica en segundo plano mediante
metadatos HTTP y sólo se reprocesa cuando cambia.

## Tecnologías

- TypeScript 5.9 y React 19.
- Next.js 16, Vinext y Vite.
- Cloudflare Worker y Sites.
- Cloudflare D1 y Drizzle ORM.
- SheetJS/XLSX para planillas.
- Node Test Runner y ESLint.

## Desarrollo local

Requisitos:

- Node.js `>=22.13.0`.
- Linux o WSL con `bash`, `curl`, `flock` y GNU `timeout`.

```bash
npm ci
npm run dev
```

Comandos principales:

```bash
npm run lint
npm run build
npm test
npm run validate:artifact
```

## Configuración

La identidad del proyecto Sites y el nombre lógico del enlace D1 se declaran en
`.openai/hosting.json`. Los valores secretos o específicos de cada ambiente
deben configurarse en el servicio de alojamiento, nunca en Git.

Consulte:

- [Arquitectura](ARCHITECTURE.md)
- [Fuentes y transformaciones](DATA_SOURCES.md)
- [Gobierno de datos](DATA_GOVERNANCE.md)
- [Despliegue y recuperación](DEPLOYMENT.md)
- [Contribución](CONTRIBUTING.md)
- [Seguridad](SECURITY.md)

## Naturaleza de los datos

El sitio utiliza estadísticas agregadas publicadas por el INE. No debe
incorporar microdatos, identificadores personales ni información sujeta a
reserva sin una evaluación formal de seguridad y control de divulgación.

## Estado del repositorio

Este repositorio privado es la fuente oficial de desarrollo y respaldo del
sitio **INE | Relatos Estadísticos**.
