/*
 * Construye el cuadro descargable del IPC general a partir del conjunto de
 * datos normalizado que alimenta la historia interactiva del sitio.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = process.cwd();
const source = JSON.parse(await fs.readFile(path.join(root, "public/ipc-data.json"), "utf8"));
const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const rows = source.series
  .filter((row) => row.division === 0)
  .sort((a, b) => a.year - b.year || a.month - b.month)
  .map((row) => [row.year, monthNames[row.month - 1], row.index, row.monthly, row.accumulated]);

if (rows.length === 0) {
  throw new Error("No se encontraron registros con División vacía (IPC general).");
}

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("IPC");
sheet.showGridLines = false;
sheet.getRange("A1:E1").merge();
sheet.getRange("A2:E2").merge();
sheet.getRange("A1").values = [["Índice de Precios al Consumidor (IPC)"]];
sheet.getRange("A2").values = [["Año base 2023"]];
sheet.getRange("A4:E4").values = [[
  "Año", "Mes", "Índice", "Variación Mensual (%)", "Variación Acumulada (%)",
]];
sheet.getRange(`A5:E${rows.length + 4}`).values = rows;

sheet.getRange("A1:E1").format = {
  fill: "#003B73",
  font: { bold: true, color: "#FFFFFF", size: 16 },
  rowHeight: 30,
  verticalAlignment: "center",
};
sheet.getRange("A2:E2").format = {
  fill: "#EAF3F8",
  font: { bold: true, color: "#003B73", size: 11 },
  rowHeight: 22,
  verticalAlignment: "center",
};
sheet.getRange("A4:E4").format = {
  fill: "#0079B8",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  rowHeight: 30,
  borders: { preset: "outside", style: "thin", color: "#005B89" },
};
sheet.getRange(`A5:E${rows.length + 4}`).format = {
  borders: {
    insideHorizontal: { style: "thin", color: "#DCE6EC" },
    bottom: { style: "thin", color: "#A9BBC5" },
  },
  rowHeight: 20,
};
sheet.getRange(`A5:A${rows.length + 4}`).format = { horizontalAlignment: "center", numberFormat: "0" };
sheet.getRange(`B5:B${rows.length + 4}`).format = { horizontalAlignment: "left" };
sheet.getRange(`C5:C${rows.length + 4}`).format = { horizontalAlignment: "right", numberFormat: "0.00" };
sheet.getRange(`D5:E${rows.length + 4}`).format = { horizontalAlignment: "right", numberFormat: "0.0" };
sheet.getRange("A:A").format.columnWidth = 11;
sheet.getRange("B:B").format.columnWidth = 16;
sheet.getRange("C:C").format.columnWidth = 13;
sheet.getRange("D:E").format.columnWidth = 24;
sheet.freezePanes.freezeRows(4);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(root, "public/ipc-general.xlsx"));

/* Genera una vista temporal para la comprobación visual durante el desarrollo. */
const preview = await workbook.render({ sheetName: "IPC", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile("/tmp/ipc-general-preview.png", new Uint8Array(await preview.arrayBuffer()));
