import test from "node:test";
import assert from "node:assert/strict";
import {
  allStatisticalRows,
  latestObservation,
  listDatasets,
  metadata,
  searchStatistics,
  timeSeries,
} from "../lib/mcp-statistics";

// Verifica que el MCP se construye desde las instantáneas estadísticas existentes.
test("MCP expone los cuatro datasets iniciales", () => {
  assert.deepEqual(listDatasets().map(item => item.id), ["ENE","INFORMALITY","IPC","IPP"]);
  assert.ok(allStatisticalRows().length > 0);
});

// La búsqueda debe devolver únicamente series existentes y datos trazables.
test("MCP busca series y conserva fuente, periodo y unidad", () => {
  const results = searchStatistics("UNEMPLOYMENT", 10);
  assert.ok(results.length > 0);
  for (const row of results) {
    assert.ok(row.dataset);
    assert.ok(row.indicator);
    assert.ok(row.period);
    assert.ok(row.unit);
    assert.match(row.source, /Instituto Nacional de Estadísticas/);
  }
});

// Comprueba filtros exactos y orden temporal para una serie central de ENE.
test("MCP entrega serie temporal ENE ordenada", () => {
  const rows = timeSeries({
    dataset:"ENE",
    ref_area:"CL",
    sex:"T",
    breakdown:"INDICATOR_MAIN",
    category:"TOTAL",
    indicator:"UNEMPLOYMENTRATE",
    last_n_periods:5,
  });
  assert.ok(rows.length > 0);
  for (let i=1;i<rows.length;i++) assert.ok(rows[i-1].period <= rows[i].period);
});

// El último valor debe coincidir con el último elemento de la misma serie filtrada.
test("MCP identifica la última observación", () => {
  const filter = {dataset:"IPC",breakdown:"TOTAL",category:"IPC_GENERAL",indicator:"INDEX"};
  const series = timeSeries({...filter,last_n_periods:3});
  assert.ok(series.length > 0);
  const latest = latestObservation(filter);
  assert.ok(latest);
  assert.equal(latest?.period, series.at(-1)?.period);
  assert.equal(latest?.value, series.at(-1)?.value);
});

// Los metadatos deben permitir descubrir códigos sin conocimiento previo del esquema.
test("MCP devuelve metadatos descubribles", () => {
  const info = metadata({dataset:"IPP"});
  assert.ok(info.observations > 0);
  assert.ok(info.indicators.length > 0);
  assert.ok(info.breakdowns.length > 0);
  assert.ok(info.sources.some(source => source.includes("IPP")));
});
