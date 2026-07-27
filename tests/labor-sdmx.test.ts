import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLaborRows,
  filterLaborRows,
  laborRowsToCsv,
  laborSummary,
} from "../lib/labor-sdmx";

const ene = {
  indicatorSeries: {
    Total: [{year: 2026, quarter: "Mar - May", values: {
      employed: {value: 9500.123456, note: null},
      unemploymentRate: {value: 8.9, note: "A"},
    }}],
    Mujeres: [{year: 2026, quarter: "Mar - May", values: {
      employed: {value: 4300.25, note: "B"},
    }}],
  },
  absentEmployment: [{year: 2026, quarter: "Mar - May", total: 9500, present: 9000, absent: 500, share: 5.263, quality: null}],
};
const informality = {
  rates: [{year: 2026, quarter: "Mar - May", formal: 7000, informal: 2500, rate: 26.315}],
  branches: [{year: 2026, quarter: "Mar - May", items: [{
    label: "Comercio al por mayor y al por menor",
    formal: 1000, informal: 600, formalQuality: null, informalQuality: "A",
  }]}],
};

test("incluye Ocupación, Desocupación e Informalidad sin redondear", () => {
  const rows = buildLaborRows(ene, informality);
  assert.deepEqual(laborSummary(rows).datasets, ["ENE", "INFORMALITY"]);
  assert.ok(rows.some(row => row.OBS_VALUE === "9500.123456"));
  assert.ok(rows.some(row => row.EST_QUALITY === "A"));
  assert.ok(rows.some(row => row.EST_QUALITY === "B"));
  assert.ok(rows.every(row => row.TIME_PERIOD === "2026-05"));
});

test("filtra conjuntos, desgloses y últimos períodos", () => {
  const rows = buildLaborRows(ene, informality);
  const params = new URLSearchParams({
    dataset: "INFORMALITY",
    breakdown: "ECONOMIC_ACTIVITY",
    last_n_periods: "13",
  });
  const filtered = filterLaborRows(rows, params);
  assert.equal(filtered.length, 2);
  assert.ok(filtered.every(row => row.DATASET === "INFORMALITY"));
  assert.ok(filtered.every(row => row.BREAKDOWN === "ECONOMIC_ACTIVITY"));
});

test("produce un encabezado SDMX-CSV 2.0 completo", () => {
  const csv = laborRowsToCsv(buildLaborRows(ene, informality));
  assert.match(csv, /^STRUCTURE,STRUCTURE_ID,ACTION,FREQ,DATASET,/);
  assert.match(csv, /INE\.GOB\.CL:DSD_ENE_MERCADO_LABORAL\(2\.0\)/);
});
