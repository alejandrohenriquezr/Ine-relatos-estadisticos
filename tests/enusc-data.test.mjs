import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const data = JSON.parse(
  await readFile(new URL("../public/enusc-data.json", import.meta.url), "utf8"),
);
const map = JSON.parse(
  await readFile(
    new URL("../public/chile-regions-map.json", import.meta.url),
    "utf8",
  ),
);

test("ENUSC incluye los 286 tabulados del índice", () => {
  assert.equal(data.metadata.length, 286);
  assert.equal(Object.keys(data.tabulations).length, 286);
  for (const meta of data.metadata) {
    assert.ok(data.tabulations[meta.variable], meta.variable);
    assert.ok(data.tabulations[meta.variable].length >= 1, meta.variable);
  }
});

test("estimaciones conservan intervalos y notas oficiales", () => {
  let intervals = 0;
  let note1 = 0;
  let note2 = 0;
  for (const records of Object.values(data.tabulations)) {
    for (const record of records) {
      for (const item of record.estimates) {
        assert.ok([null, "1", "2"].includes(item.note));
        if (item.note === "1") note1 += 1;
        if (item.note === "2") note2 += 1;
        if (item.lower !== null || item.upper !== null) {
          assert.notEqual(item.lower, null);
          assert.notEqual(item.upper, null);
          assert.ok(item.lower <= item.estimate);
          assert.ok(item.estimate <= item.upper);
          intervals += 1;
        }
      }
    }
  }
  assert.ok(intervals > 40_000);
  assert.ok(note1 > 4_000);
  assert.ok(note2 > 50);
  assert.match(data.qualityNotes["1"], /Estimación poco fiable/);
  assert.match(data.qualityNotes["2"], /Estimación no fiable/);
});

test("indicadores editoriales contienen estimación nacional", () => {
  const variables = [
    "VH_DC_NSE",
    "PAD_SEX",
    "PADB_SEX",
    "PCOS_SEX",
    "PED_SEX",
    "VP_DV_SEX",
    "DEN_VHDC_NSE",
    "EV_CONFIA_CCH_SEX",
  ];
  for (const variable of variables) {
    const national = data.tabulations[variable].find(
      (record) => record.region === "TOTAL NACIONAL",
    );
    assert.ok(national, variable);
    assert.ok(national.estimates.some((item) => item.group === "Total"));
  }
});

test("mapa coroplético contiene y enlaza las 16 regiones", () => {
  assert.equal(map.length, 16);
  const regionalNames = new Set(
    data.tabulations.PAD_SEX.filter(
      (record) => record.region !== "TOTAL NACIONAL",
    ).map((record) => record.region),
  );
  for (const region of map) {
    assert.ok(region.path.startsWith("M"), region.region);
    assert.ok(regionalNames.has(region.region), region.region);
  }
  for (const variable of [
    "PAD_SEX",
    "PADB_SEX",
    "PCOS_SEX",
    "PED_SEX",
    "VP_DC_SEX",
  ]) {
    const records = data.tabulations[variable].filter(
      (record) => record.region !== "TOTAL NACIONAL",
    );
    assert.equal(records.length, 16, variable);
    for (const record of records) {
      const estimate = record.estimates.find((item) => item.group === "Total");
      assert.ok(
        Number.isFinite(estimate?.estimate),
        `${variable}: ${record.region}`,
      );
      assert.ok(
        Number.isFinite(estimate?.lower),
        `${variable}: ${record.region}`,
      );
      assert.ok(
        Number.isFinite(estimate?.upper),
        `${variable}: ${record.region}`,
      );
    }
  }
});
