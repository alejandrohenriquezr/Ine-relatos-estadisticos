import * as XLSX from "xlsx";

export type EconomicKind = "energy" | "industry" | "permits" | "commerce";
type Cell = string | number | null;
const months: Record<string, number> = { ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sept:9,oct:10,nov:11,dic:12 };

const number = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/[$%\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};
const period = (v: unknown) => {
  const match = String(v ?? "").toLowerCase().match(/(ene|feb|mar|abr|may|jun|jul|ago|sept|oct|nov|dic)[.-](\d{2,4})/);
  if (!match) return null;
  let year = Number(match[2]);
  if (year < 100) year += year < 70 ? 2000 : 1900;
  return { year, month: months[match[1]], label: `${match[1]}-${year}` };
};
const matrix = (book: XLSX.WorkBook, sheet: string) =>
  XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[sheet], { header: 1, raw: true, defval: null });
const dated = (rows: Cell[][]) => rows.flatMap((row) => {
  const p = period(row[1]);
  return p ? [{ row, ...p }] : [];
});
const block = (item: ReturnType<typeof dated>[number], start: number) => ({
  year:item.year, month:item.month, label:item.label, value:number(item.row[start]), monthly:number(item.row[start+1]), annual:number(item.row[start+2]), accumulated:number(item.row[start+3]),
});

export function parseEconomicWorkbook(buffer: ArrayBuffer, kind: EconomicKind) {
  const book = XLSX.read(buffer, { type: "array", cellDates: false });
  if (kind === "commerce") {
    // Normaliza fechas seriales de Excel y rótulos de período como "may-26".
    const commercePeriod = (value: unknown) => {
      if (typeof value === "number") {
        const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
        const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1;
        return { year, month, label: `${Object.keys(months).find(key => months[key] === month) ?? month}-${year}` };
      }
      return period(value);
    };
    const commerceRows = (sheet: string) => matrix(book, sheet).flatMap(row => {
      const p = commercePeriod(row[1]);
      return p ? [{ row, ...p }] : [];
    });
    const point = (item: ReturnType<typeof commerceRows>[number], start: number) => ({
      year:item.year, month:item.month, label:item.label, index:number(item.row[start]),
      monthly:number(item.row[start+1]), annual:number(item.row[start+2]), accumulated:number(item.row[start+3]),
    });

    // Hoja 1: índice general y divisiones 45, 46 y 47.
    const sheet1 = commerceRows("1");
    const divisionMeta = [
      {id:"general",label:"Índice general",start:2},
      {id:"division45",label:"División 45 · Comercio y reparación de vehículos",start:6},
      {id:"division46",label:"División 46 · Comercio al por mayor",start:10},
      {id:"division47",label:"División 47 · Comercio al por menor",start:14},
    ];
    const divisions = Object.fromEntries(divisionMeta.map(meta => [meta.id,{label:meta.label,series:sheet1.map(item=>point(item,meta.start))}]));

    // Hoja 2: serie desestacionalizada y tendencia-ciclo.
    const seasonal = commerceRows("2").map(item=>({year:item.year,month:item.month,label:item.label,index:number(item.row[6]),monthly:number(item.row[7]),annual:number(item.row[8]),accumulated:number(item.row[9]),trend:number(item.row[10]),trendAnnualized:number(item.row[11])}));

    // Hoja 3: calcula variaciones desde los índices publicados de las columnas D a O.
    const productMatrix = matrix(book,"3"), productRows = commerceRows("3");
    const definitions = new Map(productMatrix.flatMap(row=>{const match=String(row[0]??"").match(/^(Línea\s+[\d.]+[A-Z]?):\s*(.+)$/i);return match?[[match[1],match[2]]]:[];}));
    const productIds=(productMatrix[5]??[]).slice(3,15).map((value,offset)=>({id:String(value??`producto-${offset+1}`),column:offset+3}));
    const products=Object.fromEntries(productIds.map(product=>{
      const indices=productRows.map(item=>({...item,index:number(item.row[product.column])}));
      return [product.id,{label:definitions.get(product.id)??product.id,series:indices.map((item,index)=>{
        const previous=indices[index-1]?.index,previousYear=indices[index-12]?.index;
        const variation=(base:number|null|undefined)=>item.index!=null&&base!=null&&base!==0?(item.index/base-1)*100:null;
        const current=indices.filter(candidate=>candidate.year===item.year&&candidate.month<=item.month&&candidate.index!=null);
        const prior=indices.filter(candidate=>candidate.year===item.year-1&&candidate.month<=item.month&&candidate.index!=null);
        const currentSum=current.reduce((sum,candidate)=>sum+Number(candidate.index),0),priorSum=prior.reduce((sum,candidate)=>sum+Number(candidate.index),0);
        return {year:item.year,month:item.month,label:item.label,index:item.index,monthly:variation(previous),annual:variation(previousYear),accumulated:prior.length===current.length&&priorSum?(currentSum/priorSum-1)*100:null};
      })}];
    }));

    // Hoja 4: bienes durables y no durables.
    const sheet4=commerceRows("4");
    const goods={durable:{label:"Bienes durables",series:sheet4.map(item=>point(item,6))},nonDurable:{label:"Bienes no durables",series:sheet4.map(item=>point(item,10))}};
    return {kind,base:"Promedio año 2018=100",divisions,seasonal,products,goods};
  }
  if (kind === "energy") {
    const main = dated(matrix(book, "1")).map(({row,...p}) => ({...p,index:number(row[2]),monthly:number(row[3]),annual:number(row[4]),accumulated:number(row[5]),seasonal:number(row[6]),seasonalMonthly:number(row[7]),seasonalAnnual:number(row[8]),trend:number(row[10]),trendAnnualized:number(row[11])}));
    const sectorRows = dated(matrix(book, "2"));
    const sectors = { general:sectorRows.map(x=>block(x,2)), electricity:sectorRows.map(x=>block(x,6)), gas:sectorRows.map(x=>block(x,10)), water:sectorRows.map(x=>block(x,14)) };
    return { kind, main, sectors };
  }
  if (kind === "industry") {
    const main = dated(matrix(book, "1")).map(({row,...p}) => ({...p,index:number(row[2]),monthly:number(row[3]),annual:number(row[4]),accumulated:number(row[5]),seasonal:number(row[6]),seasonalMonthly:number(row[7]),seasonalAnnual:number(row[8]),trend:number(row[10]),trendAnnualized:number(row[11])}));
    const categories = dated(matrix(book, "3")).map(({row,...p}) => ({...p,general:number(row[2]),mining:number(row[3]),manufacturing:number(row[4]),energy:number(row[5])}));
    const rows = matrix(book, "2");
    const divisions = rows.flatMap((row) => /^División\s+\d+/i.test(String(row[0] ?? "")) ? [{label:String(row[0]),index:number(row[3]),monthly:number(row[4]),annual:number(row[5]),accumulated:number(row[6]),weight:number(row[7]),incidence:number(row[8])}] : []);
    return { kind, main, categories, divisions };
  }
  const sheet1 = dated(matrix(book, "1"));
  const permitBlock=(item:ReturnType<typeof dated>[number],start:number)=>({year:item.year,month:item.month,label:item.label,value:number(item.row[start]),annual:number(item.row[start+1]),accumulated:number(item.row[start+2])});
  const surface = { total:sheet1.map(x=>permitBlock(x,2)), housing:sheet1.map(x=>permitBlock(x,5)), nonHousing:sheet1.map(x=>permitBlock(x,8)) };
  const composition = dated(matrix(book, "2")).map(({row,...p}) => ({...p,total:number(row[2]),newHousing:number(row[3]),extensions:number(row[4]),industryCommerce:number(row[5]),services:number(row[6])}));
  const housing = dated(matrix(book, "3")).map(({row,...p}) => ({...p,countryNew:number(row[2]),countryNewAnnual:number(row[3]),countryExtensions:number(row[5]),metroNew:number(row[8]),metroNewAnnual:number(row[9])}));
  return { kind, surface, composition, housing };
}
