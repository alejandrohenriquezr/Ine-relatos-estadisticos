# Guía técnica SDMX de índices de precios · versión 1.0

## 1. Alcance

La API publica dos flujos mensuales administrados por `INE.GOB.CL`:

- `INE.GOB.CL,DF_IPC,1.0/all`
- `INE.GOB.CL,DF_IPP,1.0/all`

Ambos se descargan desde `/api/sdmx/data/{flujo}` en formato SDMX-CSV.

## 2. Dimensiones

| Dimensión | Descripción |
|---|---|
| DATASET | Operación estadística: IPC o IPP |
| REF_AREA | Área de referencia; `CL` para Chile |
| BREAKDOWN | Nivel o tipo de desglose |
| CATEGORY | Categoría estadística normalizada |
| INDICATOR | Índice, variaciones, incidencia o ponderación |
| TIME_PERIOD | Mes de referencia en formato `AAAA-MM` |

Los atributos incluyen unidad de medida, multiplicador, período base, calidad
de estimación y fuente.

## 3. Indicadores

- `INDEX`: nivel del índice.
- `MONTHLY_CHANGE`: variación respecto del mes anterior.
- `ACCUMULATED_CHANGE`: variación acumulada en el año.
- `ANNUAL_CHANGE`: variación en doce meses.
- `MONTHLY_INCIDENCE`: incidencia mensual.
- `WEIGHT`: ponderación de la categoría.

## 4. Filtros de la API

La ruta acepta `dataset`, `ref_area`, `breakdown`, `category`, `indicator`,
`start_period`, `end_period` y `last_n_periods`. Para obtener un resumen JSON se
añade `format=json`.

Ejemplo:

`/api/sdmx/data/INE.GOB.CL,DF_IPC,1.0/all?breakdown=DIVISION&indicator=INDEX,MONTHLY_CHANGE&last_n_periods=25`

## 5. Actualización

La API consume la misma caché pública que alimenta las páginas del IPC e IPP.
Cuando los archivos oficiales cambian, el proceso de lectura incorpora las
nuevas filas sin reemplazar ni redondear los decimales de origen.

## 6. Calidad

Cuando una observación no presenta una marca de calidad `a` o `b`, se codifica
`F`, que representa estimación fiable. Esta regla mantiene el criterio aplicado
al flujo SDMX del mercado laboral.
