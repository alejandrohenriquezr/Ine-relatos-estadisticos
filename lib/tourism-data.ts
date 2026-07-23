import * as XLSX from "xlsx";

type Cell = string | number | null;

// Las claves reproducen exactamente las glosas regionales del libro; los valores son rótulos breves para la interfaz.
const regionAliases:Record<string,string> = {
  "Total nacional":"Total nacional", "Arica y Parinacota":"Arica y Parinacota", "Tarapacá":"Tarapacá",
  "Antofagasta":"Antofagasta", "Atacama":"Atacama", "Coquimbo":"Coquimbo", "Valparaíso":"Valparaíso",
  "Metropolitana de Santiago":"Metropolitana", "Libertador Gral. Bernardo O’Higgins":"O’Higgins", "Maule":"Maule",
  "Ñuble":"Ñuble", "Biobío":"Biobío", "La Araucanía":"La Araucanía", "Los Ríos":"Los Ríos",
  "Los Lagos":"Los Lagos", "Aysén del Gral. Carlos Ibáñez del Campo":"Aysén", "Magallanes y la Antártica Chilena":"Magallanes",
};

const monthNumbers: Record<string, number> = {
  ene:1, feb:2, mar:3, abr:4, may:5, jun:6, jul:7, ago:8, sept:9, oct:10, nov:11, dic:12,
};

const parsePeriod = (value: unknown) => {
  const match = String(value ?? "").trim().toLowerCase().match(/^(ene|feb|mar|abr|may|jun|jul|ago|sept|oct|nov|dic)-(\d{2,4})(?:\/r|\/p)?$/);
  if (!match) return null;
  let year = Number(match[2]);
  if (year < 100) year += 2000;
  return { year, month: monthNumbers[match[1]], label: `${match[1]}-${year}` };
};

const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

const sheetMeta: Record<number, { shortTitle:string; unit:"number"|"nights"|"percent"|"currency" }> = {
  1:{shortTitle:"Pernoctaciones · Total",unit:"number"},
  2:{shortTitle:"Pernoctaciones · Residentes en Chile",unit:"number"},
  3:{shortTitle:"Pernoctaciones · Residentes en el extranjero",unit:"number"},
  4:{shortTitle:"Pernoctaciones · Hoteles",unit:"number"},
  5:{shortTitle:"Pernoctaciones · Otros establecimientos",unit:"number"},
  6:{shortTitle:"Llegadas · Total",unit:"number"},
  7:{shortTitle:"Llegadas · Residentes en Chile",unit:"number"},
  8:{shortTitle:"Llegadas · Residentes en el extranjero",unit:"number"},
  9:{shortTitle:"Llegadas · Hoteles",unit:"number"},
  10:{shortTitle:"Llegadas · Otros establecimientos",unit:"number"},
  11:{shortTitle:"Estancia media",unit:"nights"},
  16:{shortTitle:"Tasa de ocupación",unit:"percent"},
  22:{shortTitle:"Ingreso por habitación disponible (RevPAR)",unit:"currency"},
  25:{shortTitle:"Tarifa promedio (ADR)",unit:"currency"},
  28:{shortTitle:"Unidades de alojamiento estimadas",unit:"number"},
  31:{shortTitle:"Plazas estimadas",unit:"number"},
};

function parseSheet(book:XLSX.WorkBook, sheetNumber:number) {
  const sheet = book.Sheets[String(sheetNumber)];
  const rows = XLSX.utils.sheet_to_json<Cell[]>(sheet,{header:1,raw:true,defval:null});
  const periods = (rows[6] ?? []).slice(1).map(parsePeriod);
  const title = String(rows[2]?.[0] ?? sheetMeta[sheetNumber].shortTitle).replace(/^Cuadro\s+\d+\.-\s*/i,"").replace(/\/P\.?$/i,"").trim();
  const seriesByRegion:Record<string,unknown[]> = {};
  for (const row of rows.slice(7)) {
    const sourceRegion = String(row[0] ?? "").trim();
    if (!regionAliases[sourceRegion]) continue;
    const region=regionAliases[sourceRegion];
    const raw = periods.flatMap((period,index) => period ? [{...period,value:numeric(row[index+1])}] : []).filter(point=>point.value!=null);
    seriesByRegion[region] = raw.map(point => {
      const previousDate=new Date(Date.UTC(point.year,point.month-2,1));
      const previous = raw.find(candidate=>candidate.year===previousDate.getUTCFullYear()&&candidate.month===previousDate.getUTCMonth()+1)?.value;
      const previousYear = raw.find(candidate=>candidate.year===point.year-1&&candidate.month===point.month)?.value;
      const variation = (base:number|null|undefined) => point.value != null && base != null && base !== 0 ? (sheetMeta[sheetNumber].unit==="percent"?point.value-base:(point.value/base-1)*100) : null;
      const current = raw.filter(candidate=>candidate.year===point.year&&candidate.month<=point.month&&candidate.value!=null);
      const prior = raw.filter(candidate=>candidate.year===point.year-1&&candidate.month<=point.month&&candidate.value!=null);
      const currentSum=current.reduce((sum,candidate)=>sum+Number(candidate.value),0),priorSum=prior.reduce((sum,candidate)=>sum+Number(candidate.value),0);
      const accumulated=prior.length===current.length&&priorSum?(sheetMeta[sheetNumber].unit==="percent"?currentSum/current.length-priorSum/prior.length:(currentSum/priorSum-1)*100):null;
      return {...point,monthly:variation(previous),annual:variation(previousYear),accumulated};
    });
  }
  return {sheet:sheetNumber,title,shortTitle:sheetMeta[sheetNumber].shortTitle,unit:sheetMeta[sheetNumber].unit,regions:Object.keys(seriesByRegion),seriesByRegion};
}

export function parseTourismWorkbook(buffer:ArrayBuffer) {
  const book=XLSX.read(buffer,{type:"array",cellDates:false});
  const requested=[1,2,3,4,5,6,7,8,9,10,11,16,22,25,28,31];
  return {kind:"tourism",base:"Serie histórica desde julio de 2016",tables:Object.fromEntries(requested.map(sheet=>[String(sheet),parseSheet(book,sheet)]))};
}
