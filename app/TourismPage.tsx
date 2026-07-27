"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
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

const metricLabels = {
  value: "Nivel",
  monthly: "Variación mensual (%)",
  annual: "Variación en 12 meses (%)",
  accumulated: "Variación acumulada (%)",
};
const colors = ["#15547d", "#dc4a58"];
const fmt = (value: unknown, digits = 1) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("es-CL", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "—";
const monthName = (point: any) =>
  point
    ? new Intl.DateTimeFormat("es-CL", {
        month: "long",
        year: "numeric",
      }).format(new Date(point.year, point.month - 1, 1))
    : "Último período";
const measureBySheet: Record<number, string> = {
  1: "pernoctaciones de pasajeros en establecimientos de alojamiento turístico",
  2: "pernoctaciones de pasajeros residentes en Chile",
  3: "pernoctaciones de pasajeros residentes en el extranjero",
  4: "pernoctaciones de pasajeros en establecimientos clase hotel",
  5: "pernoctaciones de pasajeros en establecimientos clase otros",
  6: "llegadas de pasajeros a establecimientos de alojamiento turístico",
  7: "llegadas de pasajeros residentes en Chile",
  8: "llegadas de pasajeros residentes en el extranjero",
  9: "llegadas de pasajeros a establecimientos clase hotel",
  10: "llegadas de pasajeros a establecimientos clase otros",
  22: "de ingreso promedio por habitación disponible, expresado en pesos chilenos corrientes",
  25: "de tarifa promedio diaria por unidad de alojamiento ocupada, expresada en pesos chilenos corrientes",
  28: "unidades de alojamiento estimadas",
  31: "plazas estimadas",
};

function TourismTitle({ table }: { table: any }) {
  if (table.sheet === 4)
    return (
      <>
        Número de pernoctaciones de pasajeros en establecimientos clase
        <sup>1</sup> hotel<sup>2</sup>, según región, por mes y año
      </>
    );
  if (table.sheet === 5)
    return (
      <>
        Número de pernoctaciones de pasajeros en establecimientos clase
        <sup>1</sup> otros<sup>3</sup>, según región, por mes y año
      </>
    );
  if (table.sheet === 9)
    return (
      <>
        Número de llegadas de pasajeros a establecimientos clase<sup>1</sup>{" "}
        hotel<sup>2</sup>, según región, por mes y año
      </>
    );
  if (table.sheet === 10)
    return (
      <>
        Número de llegadas de pasajeros a establecimientos clase<sup>1</sup>{" "}
        otros<sup>3</sup>, según región, por mes y año
      </>
    );
  if (table.sheet === 22)
    return (
      <>
        Ingreso por habitación disponible (RevPAR)<sup>4</sup>, según región,
        por mes y año
      </>
    );
  if (table.sheet === 25)
    return (
      <>
        Tarifa promedio diaria (ADR)<sup>5</sup>, según región, por mes y año
      </>
    );
  return <>{table.title}</>;
}

function TourismChart({
  series,
  metric,
  unit,
}: {
  series: any[];
  metric: string;
  unit: string;
}) {
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
    values = usable
      .map((point) => point[metric])
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );
  const rawMin = Math.min(...values),
    rawMax = Math.max(...values),
    spread = rawMax - rawMin || Math.abs(rawMax) || 1;
  const min =
      metric === "value" && rawMin >= 0
        ? Math.max(0, rawMin - spread * 0.1)
        : rawMin - spread * 0.1,
    max = rawMax + spread * 0.1,
    range = max - min || 1;
  const w = 760,
    h = 390,
    left = 82,
    right = 20,
    top = 30,
    bottom = 112,
    x = (index: number) =>
      left + (index * (w - left - right)) / Math.max(usable.length - 1, 1),
    y = (value: number) => top + ((max - value) * (h - top - bottom)) / range;
  const path = usable
    .map((point, index) =>
      typeof point[metric] === "number"
        ? `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point[metric]).toFixed(1)}`
        : "",
    )
    .join(" ");
  const [hover, setHover] = useState<any>(null);
  return (
    <div className="econ-chart tourism-chart">
      <div className="econ-plot">
        {hover && (
          <div
            className="econ-tooltip"
            style={{
              left: `${(hover.x / w) * 100}%`,
              top: `${(hover.y / h) * 100}%`,
              borderColor: colors[0],
            }}
          >
            <b>{hover.label}</b>
            <span>
              {fmt(hover.value, unit === "%" ? 1 : 0)}
              {unit}
            </span>
          </div>
        )}
        <svg
          className="chart chart-motion"
          viewBox={`0 0 ${w} ${h}`}
          onMouseLeave={() => setHover(null)}
        >
          {Array.from(
            { length: 6 },
            (_, index) => min + (range * index) / 5,
          ).map((tick, index) => (
            <g key={index}>
              <line
                x1={left}
                x2={w - right}
                y1={y(tick)}
                y2={y(tick)}
                className="econ-grid"
              />
              <text x={left - 10} y={y(tick) + 4} textAnchor="end">
                {fmt(tick, unit === "%" ? 1 : 0)}
                {unit}
              </text>
            </g>
          ))}
          <line
            x1={left}
            x2={left}
            y1={top}
            y2={h - bottom}
            className="econ-axis"
          />
          <line
            x1={left}
            x2={w - right}
            y1={h - bottom}
            y2={h - bottom}
            className="econ-axis"
          />
          {usable.map((point, index) => (
            <text
              key={point.label}
              textAnchor="end"
              className="econ-x-label"
              transform={`translate(${x(index)} ${h - bottom + 14}) rotate(-90)`}
            >
              {point.label}
            </text>
          ))}
          <path
            d={path}
            fill="none"
            stroke={colors[0]}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="line"
          />
          {usable.map((point, index) =>
            typeof point[metric] === "number" ? (
              <circle
                key={`${point.label}-hit`}
                cx={x(index)}
                cy={y(point[metric])}
                r="8"
                fill="transparent"
                onMouseEnter={() =>
                  setHover({
                    x: x(index),
                    y: y(point[metric]),
                    label: point.label,
                    value: point[metric],
                  })
                }
              >
                <title>
                  {point.label}:{" "}
                  {fmt(point[metric], unit === "%" ? 1 : 0)}
                  {unit}
                </title>
              </circle>
            ) : null,
          )}
        </svg>
      </div>
      {temporal.controls}
      <p className="econ-caption">
        {usable.length} períodos visibles. Fuente: INE, Encuesta Mensual de
        Alojamiento Turístico.
      </p>
    </div>
  );
}

function TourismSection({
  table,
  lead = false,
}: {
  table: any;
  lead?: boolean;
}) {
  const [region, setRegion] = useState("Total nacional"),
    [metric, setMetric] = useState("value");
  const series = table.seriesByRegion[region] ?? [],
    latest = series.at(-1);
  const unit =
    metric === "value"
      ? table.unit === "currency"
        ? " $"
        : table.unit === "percent"
          ? "%"
          : table.unit === "nights"
            ? " noches"
            : ""
      : "%";
  const level =
    table.unit === "currency"
      ? `$${fmt(latest?.value, 0)}`
      : table.unit === "percent"
        ? `${fmt(latest?.value)}%`
        : table.unit === "nights"
          ? `${fmt(latest?.value, 2)} noches`
          : fmt(latest?.value, 0);
  return (
    <section className={`wrap tourism-story ${lead ? "is-lead" : ""}`}>
      <article>
        <span className="eyebrow">{table.shortTitle}</span>
        <h2>
          <TourismTitle table={table} />
        </h2>
        <p>
          En {monthName(latest)},{" "}
          {region === "Total nacional"
            ? "el total nacional"
            : `la región de ${region}`}{" "}
          registró{" "}
          <strong>
            {level} {measureBySheet[table.sheet]}
          </strong>
          . La variación mensual fue {fmt(latest?.monthly)}%, la variación en
          doce meses {fmt(latest?.annual)}% y la acumulada{" "}
          {fmt(latest?.accumulated)}%.
        </p>
        <p>
          {latest?.annual >= 0
            ? "El resultado interanual muestra una expansión"
            : "El resultado interanual muestra una contracción"}
          ; su lectura conjunta con el cambio mensual permite distinguir una
          señal reciente de una trayectoria más persistente.
        </p>
      </article>
      <div>
        <div className="tourism-selectors">
          <label>
            Serie
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
            >
              {Object.entries(metricLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {id === "value" ? table.shortTitle : label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Territorio
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              {table.regions.map((item: string) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <TourismChart series={series} metric={metric} unit={unit} />
      </div>
    </section>
  );
}

function Kpi({ table, label }: { table: any; label: string }) {
  const latest = table.seriesByRegion["Total nacional"].at(-1),
    digits =
      table.unit === "number" || table.unit === "currency"
        ? 0
        : table.unit === "nights"
          ? 2
          : 1;
  const prefix = table.unit === "currency" ? "$" : "",
    suffix =
      table.unit === "percent" ? "%" : table.unit === "nights" ? " noches" : "";
  return (
    <article>
      <span>{label}</span>
      <strong>
        {prefix}
        {fmt(latest.value, digits)}
        {suffix}
      </strong>
      <p>
        {fmt(latest.annual)}
        {table.unit === "percent" ? " pp" : "%"} en doce meses
      </p>
    </article>
  );
}

export default function TourismPage({
  onNavigate,
}: {
  onNavigate: (value: string) => void;
}) {
  const [data, setData] = useState<any>(() => peekDataset("tourism") ?? null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    primeDataset<any>("tourism")
      .then(async (initial) => {
        if (!active) return;
        setData(initial);
        setError("");
        const refreshed = await refreshDataset<any>("tourism");
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
  const tables = useMemo(() => data?.tables ?? {}, [data]);
  const demandSheets = useMemo(
    () =>
      data
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((sheet) => {
            const latest =
              tables[String(sheet)]?.seriesByRegion?.["Total nacional"]?.at(-1);
            return (
              latest &&
              (latest.year > 2020 || (latest.year === 2020 && latest.month > 3))
            );
          })
        : [],
    [data, tables],
  );
  return (
    <main className="economic-page tourism-page">
      <SectionHeader
        current="tourism"
        onNavigate={(destination) => onNavigate(destination)}
      />
      <section className="births-hero wrap econ-hero tourism-hero">
        <div>
          <span className="eyebrow">SERVICIOS · TURISMO</span>
          <h1>
            ENCUESTA MENSUAL DE
            <br />
            ALOJAMIENTO TURÍSTICO
          </h1>
          <p>Actividades de alojamiento para estancias cortas.</p>
        </div>
        <div className="period-box">
          <span>Último dato disponible</span>
          <strong>
            {data
              ? monthName(tables["1"].seriesByRegion["Total nacional"].at(-1))
              : "Datos almacenados"}
          </strong>
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
          <section className="wrap econ-kpis tourism-kpis">
            <Kpi table={tables["1"]} label="Número de pernoctaciones" />
            <Kpi table={tables["6"]} label="Número de llegadas" />
            <Kpi table={tables["11"]} label="Estancia media" />
            <Kpi table={tables["16"]} label="Tasa de ocupación" />
          </section>
          <div className="tourism-section-heading wrap">
            <span className="eyebrow">Demanda turística</span>
            <h2>Número de pernoctaciones y llegadas de pasajeros</h2>
          </div>
          {demandSheets.map((sheet, index) => (
            <div className={index % 2 ? "tourism-band" : ""} key={sheet}>
              <TourismSection
                table={tables[String(sheet)]}
                lead={sheet === 1}
              />
            </div>
          ))}
          <section className="wrap econ-kpis tourism-kpis tourism-secondary-kpis">
            <Kpi table={tables["22"]} label="Ingreso por habitación" />
            <Kpi table={tables["25"]} label="Tarifa promedio" />
            <Kpi
              table={tables["28"]}
              label="Unidades de alojamiento estimadas"
            />
            <Kpi table={tables["31"]} label="Plazas estimadas" />
          </section>
          <div className="tourism-section-heading wrap">
            <span className="eyebrow">Oferta y desempeño</span>
            <h2>Ingresos, tarifas y capacidad de alojamiento</h2>
          </div>
          {[22, 25, 28, 31].map((sheet, index) => (
            <div className={index % 2 ? "tourism-band" : ""} key={sheet}>
              <TourismSection table={tables[String(sheet)]} />
            </div>
          ))}
          <section
            className="wrap tourism-footnotes"
            aria-label="Notas de clasificación e indicadores"
          >
            <h2>Notas</h2>
            <ol>
              <li>
                <strong>1.</strong> La clase corresponde a la modalidad en que
                se provee el servicio turístico, referida al espacio destinado
                al alojamiento y a la configuración arquitectónica de las
                instalaciones, según la NCh 2760.Of 2007.
              </li>
              <li>
                <strong>2.</strong> Hotel comprende establecimientos
                clasificados como hotel y apart-hotel, según la NCh 2760.Of
                2007.
              </li>
              <li>
                <strong>3.</strong> Otros comprende hostales, hosterías,
                residenciales, cabañas y similares, según la NCh 2760.Of 2007.
              </li>
              <li>
                <strong>4.</strong> RevPAR corresponde a la sigla en inglés{" "}
                <em>Revenue per Available Room</em>: ingreso promedio por
                habitación disponible.
              </li>
              <li>
                <strong>5.</strong> ADR corresponde a la sigla en inglés{" "}
                <em>Average Daily Rate</em>: tarifa promedio diaria de una
                unidad de alojamiento ocupada.
              </li>
            </ol>
          </section>
          <section className="resources">
            <div className="wrap econ-source">
              <span className="eyebrow">Fuente oficial</span>
              <h2>Encuesta Mensual de Alojamiento Turístico</h2>
              <p>
                La página conserva exclusivamente Total nacional y regiones. La
                fuente se actualiza solo cuando cambian los metadatos del Excel
                oficial; entre actualizaciones se reutiliza la caché compartida.
              </p>
              <a className="birth-download" href={data.source?.url}>
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
