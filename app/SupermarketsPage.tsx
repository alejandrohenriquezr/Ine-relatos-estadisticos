"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { toggleChartSeries } from "../lib/supermarket-chart-state";
import {
  peekDataset,
  primeDataset,
  refreshDataset,
} from "../lib/client-data-prefetch";
import SectionHeader, { IneLogo } from "./SectionHeader";
import {
  useTemporalWindow,
  type TemporalPreset,
} from "./TemporalChartControls";
const variationLabels = {
    monthly: "Variación mensual (%)",
    annual: "Variación 12 meses (%)",
    accumulated: "Variación acumulada (%)",
  },
  colors = {
    value: "#168477",
    monthly: "#15547d",
    annual: "#dc4a58",
    accumulated: "#e7a72f",
  };
const fmt = (value: any, digits = 1) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("es-CL", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "—";
const month = (point: any) =>
  point
    ? new Intl.DateTimeFormat("es-CL", {
        month: "long",
        year: "numeric",
      }).format(new Date(point.year, point.month - 1, 1))
    : "—";
function Chart({
  series,
  valueLabel,
  valueUnit,
}: {
  series: any[];
  valueLabel?: string;
  valueUnit?: "currency" | "number";
}) {
  const hasValue = Boolean(valueLabel),
    allLabels = hasValue
      ? { value: valueLabel!, ...variationLabels }
      : variationLabels,
    [visible, setVisible] = useState<Record<string, boolean>>(() => {
      const initial: Record<string, boolean> = hasValue
        ? { value: true, monthly: false, annual: false, accumulated: false }
        : { monthly: true, annual: true, accumulated: true };
      return initial;
    });
  const toggle = (key: string) =>
    setVisible((old) => toggleChartSeries(old, key, hasValue));
  const temporalPresets: TemporalPreset[] = [
    { value: 25, label: "25 períodos" },
    { value: 60, label: "5 años" },
    { value: 120, label: "10 años" },
    { value: "all", label: "Serie completa" },
  ];
  const temporal = useTemporalWindow(
    series,
    series.map((point) => point.label),
    temporalPresets,
    25,
  );
  const usable = temporal.visible,
    keys = Object.keys(allLabels),
    activeKeys = keys.filter((key) => visible[key]),
    values = usable.flatMap((point) =>
      activeKeys.map((key) => point[key]).filter(Number.isFinite),
    ),
    levelMode = hasValue && visible.value,
    lo = Math.min(...values, ...(levelMode ? [] : [0])),
    hi = Math.max(...values, ...(levelMode ? [] : [0])),
    pad = (hi - lo || Math.abs(hi) || 1) * 0.1,
    min = levelMode ? Math.max(0, lo - pad) : lo - pad,
    max = hi + pad,
    range = max - min || 1,
    w = 760,
    h = 390,
    l = 88,
    r = 22,
    t = 25,
    b = 112,
    x = (i: number) => l + (i * (w - l - r)) / Math.max(usable.length - 1, 1),
    y = (v: number) => t + ((max - v) * (h - t - b)) / range,
    axis = (tick: number) =>
      levelMode
        ? valueUnit === "currency"
          ? `$${fmt(tick, 0)}`
          : fmt(tick, 0)
        : `${fmt(tick)}%`;
  return (
    <div
      className={`econ-chart supermarket-chart ${levelMode ? "is-level" : "is-variation"}`}
      data-chart-mode={levelMode ? "level" : "variations"}
    >
      <div className="supermarket-chart-header">
        <span>{levelMode ? valueLabel : "Puede combinar las variaciones"}</span>
      </div>
      <div className="series-toggles">
        {Object.entries(allLabels).map(([key, label]) => (
          <button
            key={key}
            data-series={key}
            className={visible[key] ? "on" : ""}
            aria-pressed={Boolean(visible[key])}
            onClick={() => toggle(key)}
          >
            <i style={{ background: colors[key as keyof typeof colors] }} />
            {label}
          </button>
        ))}
      </div>
      <svg className="chart chart-motion" viewBox={`0 0 ${w} ${h}`}>
        {Array.from({ length: 6 }, (_, i) => min + (range * i) / 5).map(
          (tick, index) => (
            <g className="supermarket-grid-tick" key={index}>
              <line
                className="econ-grid"
                x1={l}
                x2={w - r}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text x={l - 9} y={y(tick) + 4} textAnchor="end">
                {axis(tick)}
              </text>
            </g>
          ),
        )}
        <line className="econ-axis" x1={l} x2={l} y1={t} y2={h - b} />
        <line className="econ-axis" x1={l} x2={w - r} y1={h - b} y2={h - b} />
        {usable.map((point, i) => (
          <text
            key={point.label}
            className="econ-x-label"
            textAnchor="end"
            transform={`translate(${x(i)} ${h - b + 14}) rotate(-90)`}
          >
            {point.label}
          </text>
        ))}
        {keys.map((key) => (
          <g
            key={key}
            data-series={key}
            opacity={visible[key] ? 1 : 0}
          >
            <path
              data-series={key}
              className={`supermarket-series ${visible[key] ? "is-visible" : ""}`}
              pathLength="1"
              fill="none"
              stroke={colors[key as keyof typeof colors]}
              strokeWidth="3"
              d={usable
                .map((point, i) =>
                  Number.isFinite(point[key])
                    ? `${i ? "L" : "M"}${x(i)},${y(point[key])}`
                    : "",
                )
                .join(" ")}
            />
            {usable.map((point, index) =>
              Number.isFinite(point[key]) ? (
                <circle
                  key={`${key}-${point.label}`}
                  cx={x(index)}
                  cy={y(point[key])}
                  r="3"
                  fill={colors[key as keyof typeof colors]}
                >
                  <title>
                    {point.label}: {axis(point[key])}
                  </title>
                </circle>
              ) : null,
            )}
          </g>
        ))}
      </svg>
      {temporal.controls}
      <p className="econ-caption">
        {usable.length} períodos visibles. Fuente: INE, Índice de Ventas de
        Supermercados.
      </p>
    </div>
  );
}
function Cards({ latest }: { latest: any }) {
  return (
    <div className="econ-kpis supermarket-kpis">
      {Object.entries(variationLabels).map(([key, label]) => (
        <article key={key}>
          <span>{label}</span>
          <strong>{fmt(latest?.[key])}%</strong>
        </article>
      ))}
    </div>
  );
}
function Analysis({
  series,
  territory,
  unit,
}: {
  series: any[];
  territory: string;
  unit: string;
}) {
  const latest = series.at(-1),
    direction = latest?.annual >= 0 ? "expansión" : "contracción",
    monthly = latest?.monthly >= 0 ? "avance" : "retroceso";
  return (
    <>
      <Cards latest={latest} />
      <p>
        En {month(latest)},{" "}
        {territory === "Nacional" || territory === "Total"
          ? "el total nacional"
          : territory}{" "}
        registró{" "}
        <strong>
          {unit === "$ millones"
            ? `$${fmt(latest?.value, 0)} millones`
            : `${fmt(latest?.value, unit === "índice" ? 2 : 0)} ${unit}`}
        </strong>
        . La variación mensual fue {fmt(latest?.monthly)}%, la variación en doce
        meses {fmt(latest?.annual)}% y la acumulada {fmt(latest?.accumulated)}%.
      </p>
      <p>
        En términos interanuales, el resultado representa una {direction}; el{" "}
        {monthly} mensual permite evaluar la señal más reciente, mientras la
        variación acumulada compara el desempeño del año a la fecha con igual
        período del año anterior.
      </p>
    </>
  );
}
function IndexSection({
  data,
  mode,
  title,
  band = false,
}: {
  data: any;
  mode: "current" | "constant";
  title: string;
  band?: boolean;
}) {
  const [territory, setTerritory] = useState("Nacional"),
    series = (data.indexByTerritory[territory] ?? []).map((p: any) => ({
      ...p,
      ...p[mode],
    }));
  return (
    <div className={band ? "tourism-band" : ""}>
      <section className="wrap supermarket-section">
        <article>
          <span className="eyebrow">Serie índice · {data.base}</span>
          <h2>{title}</h2>
          <Analysis series={series} territory={territory} unit="índice" />
        </article>
        <div>
          <label className="supermarket-select">
            Territorio
            <select
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
            >
              {data.territories.map((name: string) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <Chart series={series} />
        </div>
      </section>
    </div>
  );
}
function MatrixSection({
  matrix,
  title,
  unit,
  levelLabel,
  band = false,
}: {
  matrix: any;
  title: string;
  unit: string;
  levelLabel: string;
  band?: boolean;
}) {
  const [territory, setTerritory] = useState("Total"),
    series = matrix.seriesByTerritory[territory] ?? [];
  return (
    <div className={band ? "tourism-band" : ""}>
      <section className="wrap supermarket-section">
        <article>
          <span className="eyebrow">Cobertura regional</span>
          <h2>{title}</h2>
          <Analysis series={series} territory={territory} unit={unit} />
        </article>
        <div>
          <label className="supermarket-select">
            Territorio
            <select
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
            >
              {matrix.territories.map((name: string) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <Chart
            series={series}
            valueLabel={levelLabel}
            valueUnit={unit === "$ millones" ? "currency" : "number"}
          />
        </div>
      </section>
    </div>
  );
}
export default function SupermarketsPage({
  onNavigate,
}: {
  onNavigate: (value: string) => void;
}) {
  const [data, setData] = useState<any>(() => peekDataset("supermarkets")),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    primeDataset<any>("supermarkets")
      .then(async (initial) => {
        if (!active) return;
        setData(initial);
        setError("");
        const refreshed = await refreshDataset<any>("supermarkets");
        if (active && refreshed) setData(refreshed);
      })
      .catch(
        (cause) =>
          active &&
          setError(
            cause instanceof Error
              ? cause.message
              : "No fue posible cargar los datos",
          ),
      );
    return () => {
      active = false;
    };
  }, []);
  const latest = useMemo(
    () => data?.indexByTerritory?.Nacional?.at(-1),
    [data],
  );
  return (
    <main className="economic-page supermarket-page">
      <SectionHeader
        current="supermarkets"
        onNavigate={(destination) => onNavigate(destination)}
      />
      <section className="births-hero wrap econ-hero product-hero">
        <div>
          <span className="eyebrow">SERVICIOS · COMERCIO MINORISTA</span>
          <h1>Índice de Ventas de Supermercados</h1>
          <p>Base promedio año 2018=100</p>
        </div>
        <div className="period-box">
          <span>Último dato disponible</span>
          <strong>{latest ? month(latest) : "Datos almacenados"}</strong>
        </div>
      </section>
      {error ? (
        <section className="wrap econ-status">
          <h2>No fue posible cargar las series</h2>
          <p>{error}</p>
        </section>
      ) : !data ? (
        <section className="wrap econ-status cache-ready-placeholder" aria-hidden="true" />
      ) : (
        <>
          <IndexSection
            data={data}
            mode="current"
            title="Análisis del índice a precios corrientes"
          />
          <IndexSection
            data={data}
            mode="constant"
            title="Análisis del índice a precios constantes"
            band
          />
          <MatrixSection
            matrix={data.matrices.sales}
            title="Ventas a precios corrientes en millones de pesos"
            unit="$ millones"
            levelLabel="Ventas corrientes (millones de pesos)"
          />
          <MatrixSection
            matrix={data.matrices.stores}
            title="Número de establecimientos de supermercados"
            unit="establecimientos"
            levelLabel="Número de establecimientos"
            band
          />
          <MatrixSection
            matrix={data.matrices.area}
            title="Metros cuadrados totales de establecimientos de supermercados"
            unit="m²"
            levelLabel="Metros cuadrados totales"
          />
          <section className="resources">
            <div className="wrap econ-source">
              <span className="eyebrow">Fuente oficial</span>
              <h2>Índice de Ventas de Supermercados</h2>
              <p>
                Los datos se consultan desde la planilla oficial del INE. La
                caché compartida se renueva únicamente cuando cambian los
                metadatos del archivo fuente.
              </p>
              <a className="birth-download" href={data.source.url}>
                Descargar planilla oficial ↗
              </a>
            </div>
          </section>
        </>
      )}
      <footer>
        <div className="wrap">
          <div className="brand inverse">
            <IneLogo inverse />
            <b>Instituto Nacional de Estadísticas</b>
          </div>
          <p>Información estadística para una mejor comprensión de Chile.</p>
        </div>
      </footer>
    </main>
  );
}
