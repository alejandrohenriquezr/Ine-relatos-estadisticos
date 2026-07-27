# Fuentes y transformaciones

## Principio

Toda cifra debe poder relacionarse con:

- producto estadístico;
- URL oficial;
- archivo y hoja;
- rango o variables utilizadas;
- unidad de medida;
- fórmula aplicada;
- fecha de verificación;
- versión del transformador.

## Familias de fuentes

| Familia | Productos | Implementación |
|---|---|---|
| Mercado laboral | ENE e informalidad | `app/api/ene-data`, `app/api/informality-data`, `lib/*ene*`, `lib/*informality*` |
| Precios | IPC e IPP | `app/api/ipc-*`, `app/api/ipp-data`, `lib/ipc-*`, `lib/ipp-*` |
| Demografía | Estadísticas vitales | `app/api/vital-data`, `lib/vital-statistics-data.ts` |
| Condiciones de vida | ENUSC y policías | `app/api/enusc-data`, `app/api/police-data`, `lib/enusc-*`, `lib/police-*` |
| Actividad económica | Industria, energía, permisos y comercio | `app/api/economic-data`, `lib/economic-data.ts` |
| Servicios | Turismo y supermercados | `app/api/tourism-data`, `app/api/supermarkets-data`, `lib/tourism-data.ts`, `lib/supermarkets-data.ts` |

Las URLs específicas se mantienen junto a cada transformador para evitar que la
documentación quede desactualizada respecto del código ejecutable.

## Indicadores derivados

Según el producto, el sistema calcula:

- variación mensual;
- variación en doce meses;
- variación acumulada;
- incidencias;
- tasas y proporciones;
- índices desestacionalizados;
- tendencia-ciclo;
- agregaciones territoriales o de productos.

## Archivos iniciales

Los archivos de `public/` son conjuntos agregados publicados y preparados para
la primera carga. Deben actualizarse mediante los scripts de `scripts/` y
revisarse antes de cada commit.

## Regla de actualización

Una fuente se reprocesa sólo cuando cambian sus metadatos disponibles. Si la
fuente no responde, se sirve la última revisión válida y se registra el estado
degradado.
