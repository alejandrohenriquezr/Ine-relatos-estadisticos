import * as XLSX from "xlsx";

type Cell = string | number | null;
type Row = Cell[];

const matrix = (buffer: ArrayBuffer) => {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  return XLSX.utils.sheet_to_json<Row>(
    workbook.Sheets[workbook.SheetNames[0]],
    { header: 1, raw: true, defval: null },
  );
};
const numeric = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const dataRows = (buffer: ArrayBuffer) =>
  matrix(buffer)
    .slice(5)
    .filter((row) => Number.isInteger(row[0]) && Number.isInteger(row[1]));
const point = (row: Row, detailed = true) => ({
  year: Number(row[0]),
  month: Number(row[1]),
  label: String(row[detailed ? 7 : 2] ?? "").trim(),
  index: numeric(row[detailed ? 9 : 3]) ?? 0,
  monthly: numeric(row[detailed ? 10 : 4]) ?? 0,
  accumulated: numeric(row[detailed ? 11 : 5]) ?? 0,
  annual: numeric(row[detailed ? 12 : 6]) ?? 0,
});
const key = (row: Row) => `${row[0]}-${row[1]}`;

function detail(rows: Row[]) {
  const general = rows
    .filter((row) => row.slice(2, 7).every((value) => value === null))
    .map((row) => point(row));
  const summaries: Record<string, unknown> = {};
  for (const generalPoint of general) {
    const periodRows = rows.filter(
      (row) => row[0] === generalPoint.year && row[1] === generalPoint.month,
    );
    const classes = periodRows.filter(
      (row) => row[4] !== null && row[5] === null && row[6] === null,
    );
    const products = periodRows.filter((row) => row[6] !== null);
    const drivers = (items: Row[], direction: "up" | "down") =>
      items
        .filter((row) => {
          const incidence = numeric(row[13]);
          return incidence !== null &&
            (direction === "up" ? incidence > 0 : incidence < 0);
        })
        .sort((a, b) =>
          direction === "up"
            ? Number(b[13]) - Number(a[13])
            : Number(a[13]) - Number(b[13]),
        )
        .slice(0, 3)
        .map((row) => ({
          label: String(row[7] ?? "").trim(),
          monthly: numeric(row[10]),
          incidence: numeric(row[13]) ?? 0,
        }));
    const down = classes.filter((row) => Number(row[10]) < 0).length;
    const zero = classes.filter((row) => row[10] === 0).length;
    summaries[`${generalPoint.year}-${generalPoint.month}`] = {
      classes: classes.length,
      up: classes.length - down - zero,
      down,
      zero,
      topClasses: drivers(classes, "up"),
      bottomClasses: drivers(classes, "down"),
      topProducts: drivers(products, "up"),
      bottomProducts: drivers(products, "down"),
    };
  }
  return { series: general, summaries };
}

function reconstructPrevious(index: number, variation: number) {
  return index / (1 + variation / 100);
}

export function parseIppOfficialFiles(files: {
  industries: ArrayBuffer;
  mining: ArrayBuffer;
  ipdega: ArrayBuffer;
  manufacturing: ArrayBuffer;
}) {
  const industryRows = dataRows(files.industries);
  const miningRows = dataRows(files.mining);
  const manufacturingRows = dataRows(files.manufacturing);
  const industries = industryRows.map((row) => point(row, false));
  const copper = new Map(
    miningRows
      .filter((row) => row[6] === 1421002)
      .map((row) => [key(row), row] as const),
  );
  const copperWeight = 0.40838;
  const withoutCopper = (industryIndex: number, copperIndex: number) =>
    (industryIndex - copperWeight * copperIndex) / (1 - copperWeight);
  const noCopperIndexes = new Map(
    industryRows.map((row) => {
      const copperRow = copper.get(key(row));
      return [
        key(row),
        copperRow
          ? withoutCopper(Number(row[3]), Number(copperRow[9]))
          : Number(row[3]),
      ] as const;
    }),
  );
  const noCopper = industryRows.map((row) => {
    const copperRow = copper.get(key(row));
    const industry = point(row, false);
    if (!copperRow) return industry;
    const currentIndex = noCopperIndexes.get(key(row))!;
    const reconstructedVariation = (
      industryVariation: number,
      copperVariation: number,
    ) => {
      const previous = withoutCopper(
        reconstructPrevious(industry.index, industryVariation),
        reconstructPrevious(Number(copperRow[9]), copperVariation),
      );
      return (currentIndex / previous - 1) * 100;
    };
    const change = (previous: number | undefined, fallback: number) =>
      previous === undefined
        ? fallback
        : (currentIndex / previous - 1) * 100;
    const previousMonth =
      industry.month === 1
        ? `${industry.year - 1}-12`
        : `${industry.year}-${industry.month - 1}`;
    return {
      ...industry,
      index: currentIndex,
      monthly: change(
        noCopperIndexes.get(previousMonth),
        reconstructedVariation(industry.monthly, Number(copperRow[10]) || 0),
      ),
      accumulated: change(
        noCopperIndexes.get(`${industry.year - 1}-12`),
        reconstructedVariation(
          industry.accumulated,
          Number(copperRow[11]) || 0,
        ),
      ),
      annual: change(
        noCopperIndexes.get(`${industry.year - 1}-${industry.month}`),
        reconstructedVariation(industry.annual, Number(copperRow[12]) || 0),
      ),
    };
  });
  const divisions = manufacturingRows
    .filter(
      (row) =>
        row[2] !== null &&
        row[3] === null &&
        row[4] === null &&
        row[5] === null &&
        row[6] === null,
    )
    .map((row) => ({ ...point(row), division: Number(row[2]) }));
  const latest = industries.at(-1);
  return {
    data: {
      base: "2019=100",
      updated: latest ? `${latest.month}-${latest.year}` : "",
      industries,
      noCopper,
      manufacturing: detail(manufacturingRows),
      mining: detail(miningRows),
      ipdega: detail(dataRows(files.ipdega)),
    },
    divisions,
  };
}
