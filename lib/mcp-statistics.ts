import {buildLaborRows, type LaborRow} from "./labor-sdmx";
import {buildIpcRows, buildIppRows, type PriceRow} from "./price-sdmx";
import eneSnapshot from "../public/ene-data.json";
import informalitySnapshot from "../public/informality-data.json";
import ipcAnalyticsSnapshot from "../public/ipc-analytics.json";
import ipcSnapshot from "../public/ipc-data.json";
import ippDivisionsSnapshot from "../public/ippman-divisions.json";
import ippSnapshot from "../public/ipp-data.json";

type StatisticalRow = LaborRow | PriceRow;
export type DatasetId = "ENE" | "INFORMALITY" | "IPC" | "IPP";

const DATASETS: Record<DatasetId, {title:string; source:string; frequency:string; description:string}> = {
  ENE: {title:"Encuesta Nacional de Empleo",source:"Instituto Nacional de Estadísticas de Chile · ENE",frequency:"Trimestre móvil",description:"Mercado laboral: fuerza de trabajo, ocupación, desocupación, participación y desgloses disponibles."},
  INFORMALITY: {title:"Informalidad laboral",source:"Instituto Nacional de Estadísticas de Chile · ENE",frequency:"Trimestre móvil",description:"Ocupación formal e informal, tasas de ocupación informal y desgloses disponibles."},
  IPC: {title:"Índice de Precios al Consumidor",source:"Instituto Nacional de Estadísticas de Chile · IPC",frequency:"Mensual",description:"IPC general, divisiones y series analíticas, con índice y variaciones publicadas."},
  IPP: {title:"Índices de Precios de Productor",source:"Instituto Nacional de Estadísticas de Chile · IPP",frequency:"Mensual",description:"IPP Industrias, manufactura, minería, electricidad/gas/agua y divisiones manufactureras."},
};

let memo: StatisticalRow[] | null = null;

/** Construye una vista única usando las mismas instantáneas validadas que alimentan SDMX. */
export function allStatisticalRows(): StatisticalRow[] {
  if (memo) return memo;
  const labor = buildLaborRows(eneSnapshot, informalitySnapshot);
  const ipc = buildIpcRows({data: ipcSnapshot, analytics: ipcAnalyticsSnapshot});
  const ipp = buildIppRows({data: ippSnapshot, divisions: ippDivisionsSnapshot});
  memo = [...labor, ...ipc, ...ipp];
  return memo;
}

const text = (value: unknown) => String(value ?? "").trim();
const normalize = (value: unknown) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

function selectRows(input: Record<string, unknown>) {
  let rows = allStatisticalRows();
  const dataset = normalize(input.dataset);
  if (dataset) rows = rows.filter(row => normalize(row.DATASET) === dataset);
  for (const key of ["REF_AREA","SEX","BREAKDOWN","CATEGORY","INDICATOR"] as const) {
    const requested = normalize(input[key.toLowerCase()]);
    if (requested) rows = rows.filter(row => normalize((row as Record<string,string>)[key]) === requested);
  }
  const start = text(input.start_period);
  const end = text(input.end_period);
  if (start) rows = rows.filter(row => row.TIME_PERIOD >= start);
  if (end) rows = rows.filter(row => row.TIME_PERIOD <= end);
  return rows;
}

function compact(row: StatisticalRow) {
  const r = row as Record<string,string>;
  return {
    dataset:r.DATASET,
    ref_area:r.REF_AREA,
    sex:r.SEX || undefined,
    breakdown:r.BREAKDOWN,
    category:r.CATEGORY,
    indicator:r.INDICATOR,
    period:r.TIME_PERIOD,
    period_label:r.TIME_PERIOD_LABEL || undefined,
    value:Number(r.OBS_VALUE),
    unit:r.UNIT_MEASURE,
    unit_multiplier:r.UNIT_MULT,
    quality:r.EST_QUALITY,
    base_period:r.BASE_PERIOD || undefined,
    source:r.SOURCE,
  };
}

export function listDatasets() {
  return Object.entries(DATASETS).map(([id, metadata]) => ({id,...metadata}));
}

/** Búsqueda de catálogo: busca códigos y descripciones existentes, no genera conceptos nuevos. */
export function searchStatistics(query: string, limit = 25) {
  const q = normalize(query);
  const unique = new Map<string, ReturnType<typeof compact>>();
  for (const row of allStatisticalRows()) {
    const r = row as Record<string,string>;
    const haystack = normalize([r.DATASET,r.BREAKDOWN,r.CATEGORY,r.INDICATOR,r.UNIT_MEASURE,r.SOURCE].join(" "));
    if (q && !haystack.includes(q)) continue;
    const key = [r.DATASET,r.REF_AREA,r.SEX,r.BREAKDOWN,r.CATEGORY,r.INDICATOR].join("|");
    if (!unique.has(key)) unique.set(key, compact(row));
    if (unique.size >= Math.max(1, Math.min(limit, 100))) break;
  }
  return [...unique.values()];
}

export function latestObservation(input: Record<string, unknown>) {
  const rows = selectRows(input).sort((a,b) => b.TIME_PERIOD.localeCompare(a.TIME_PERIOD));
  return rows[0] ? compact(rows[0]) : null;
}

export function timeSeries(input: Record<string, unknown>) {
  let rows = selectRows(input).sort((a,b) => a.TIME_PERIOD.localeCompare(b.TIME_PERIOD));
  const last = Number(input.last_n_periods ?? 0);
  if (Number.isInteger(last) && last > 0) {
    const periods = [...new Set(rows.map(row => row.TIME_PERIOD))].sort().slice(-Math.min(last,240));
    rows = rows.filter(row => periods.includes(row.TIME_PERIOD));
  }
  const limit = Math.min(Math.max(Number(input.limit ?? 500),1),2000);
  return rows.slice(0,limit).map(compact);
}

export function metadata(input: Record<string, unknown>) {
  const rows = selectRows(input);
  const unique = (field: string) => [...new Set(rows.map(row => (row as Record<string,string>)[field]).filter(Boolean))].sort();
  return {
    dataset: text(input.dataset) || null,
    observations: rows.length,
    periods: unique("TIME_PERIOD"),
    ref_areas: unique("REF_AREA"),
    sexes: unique("SEX"),
    breakdowns: unique("BREAKDOWN"),
    categories: unique("CATEGORY"),
    indicators: unique("INDICATOR"),
    units: unique("UNIT_MEASURE"),
    quality_codes: unique("EST_QUALITY"),
    sources: unique("SOURCE"),
    dataset_metadata: DATASETS[normalize(input.dataset) as DatasetId] ?? null,
  };
}
