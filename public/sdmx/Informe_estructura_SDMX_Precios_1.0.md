# Informe de estructura SDMX para IPC e IPP · versión 1.0

## Identidad institucional

- Agencia mantenedora: `INE.GOB.CL`
- Dataflow IPC: `DF_IPC(1.0)`
- Dataflow IPP: `DF_IPP(1.0)`
- DSD IPC: `DSD_IPC(1.0)`
- DSD IPP: `DSD_IPP(1.0)`
- Frecuencia: mensual (`M`)
- Área de referencia: Chile (`CL`)

## Modelo común

Los dos flujos comparten las dimensiones `FREQ`, `DATASET`, `REF_AREA`,
`BREAKDOWN`, `CATEGORY`, `INDICATOR` y `TIME_PERIOD`. La observación se expresa
en `OBS_VALUE` y se acompaña de `UNIT_MEASURE`, `UNIT_MULT`, `BASE_PERIOD`,
`EST_QUALITY` y `SOURCE`.

## Cobertura del IPC

- IPC general.
- Divisiones CCIF.
- Índices analíticos.
- Índice, variación mensual, acumulada, anual, incidencia y ponderación, cuando
  están disponibles en la fuente.
- Base anual 2023=100.

## Cobertura del IPP

- IPP de Industrias.
- IPP de Industrias sin cobre.
- Industria manufacturera, minería e IPDEGA.
- Divisiones de la industria manufacturera.
- Clases y productos impulsores visibles en el relato.
- Índice y variaciones mensual, acumulada y anual.
- Base anual 2019=100.

## Codificación

Las etiquetas se convierten a códigos estables en mayúsculas, sin tildes ni
caracteres especiales. El texto original permanece disponible en las fuentes y
en la interfaz del sitio. El período se identifica como `AAAA-MM`.

## Compatibilidad

La salida respeta el orden de columnas de SDMX-CSV y declara `STRUCTURE` como
`dataflow`. Las estructuras formales están disponibles en
`00_Estructuras_Precios_1.0.xml`.
