import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Lee las fuentes que concentran la cabecera compartida y las portadas económicas.
const headerSource = readFileSync("app/SectionHeader.tsx", "utf8");
const pageSource = readFileSync("app/page.tsx", "utf8");
const economicSource = readFileSync("app/EconomicPage.tsx", "utf8");
const supermarketSource = readFileSync("app/SupermarketsPage.tsx", "utf8");
const tourismSource = readFileSync("app/TourismPage.tsx", "utf8");

test("la cabecera económica contiene los seis menús desplegables", () => {
  const menuIds = [
    "labor",
    "prices",
    "demography",
    "living",
    "industry",
    "services",
  ];

  for (const menuId of menuIds) {
    assert.match(headerSource, new RegExp(`id: "${menuId}"`));
  }
});

test("la cabecera compartida usa el logo institucional y apertura por cursor", () => {
  assert.match(headerSource, /src="\/ine-logo\.jpg"/);
  assert.match(headerSource, /onMouseEnter=\{\(\) => setOpenMenu\(menu\.id\)\}/);
  assert.match(headerSource, /onMouseLeave=\{\(\) => setOpenMenu\(null\)\}/);
});

test("el acceso al inicio antecede Mercado laboral en todas las cabeceras", () => {
  assert.match(headerSource, /export function HomeNavLink/);
  assert.match(headerSource, /href="\/"/);
  assert.match(headerSource, /aria-label="Ir al inicio"/);
  assert.ok(
    headerSource.indexOf("<HomeNavLink") <
      headerSource.indexOf("{menus.map((menu)"),
  );
  assert.equal(
    (pageSource.match(/<HomeNavLink \/>/g) || []).length,
    2,
  );
});

test("las cuatro portadas muestran el nombre oficial solicitado", () => {
  assert.match(economicSource, /title: "Índice de Producción Industrial"/);
  assert.match(
    economicSource,
    /title: "Producción de electricidad, gas y agua"/,
  );
  assert.match(economicSource, /title: "Permisos de Edificación"/);
  assert.match(
    supermarketSource,
    /<h1>Índice de Ventas de Supermercados<\/h1>/,
  );
});

test("las páginas económicas ya no usan el logotipo de texto provisional", () => {
  for (const source of [economicSource, supermarketSource, tourismSource]) {
    assert.doesNotMatch(source, /<span className="econ-logo">INE<\/span>/);
  }
});
