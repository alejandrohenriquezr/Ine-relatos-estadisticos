import * as XLSX from "xlsx";

export const POLICE_SOURCES={
  carabineros:"https://www.ine.gob.cl/docs/default-source/estadisticas-policiales-y-judiciales/cuadro-estadístico/estadisticas-policiales/cuadros-estadisticas-policiales_cch_2024.xlsx",
  pdi:"https://www.ine.gob.cl/docs/default-source/estadisticas-policiales-y-judiciales/cuadro-estadístico/estadisticas-policiales/cuadros-estadísticas-policiales_pdi_2024.xlsx",
};
const clean=(value:unknown)=>String(value??"").trim().replace(/\/4$/,"").toLocaleUpperCase("es-CL");
const value=(input:unknown)=>typeof input === "number" && Number.isFinite(input)?input:null;
function series(buffer:ArrayBuffer,sheetName:string,denuncias=false){
  const workbook=XLSX.read(buffer,{type:"array"}), rows=XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName],{header:1,raw:true,defval:null});
  const header=rows[2] || [], regions=header.slice(3).map(clean);
  return rows.slice(3).flatMap(row=>{
    const label=row[0];
    if(denuncias ? !String(label).startsWith("Denuncias ") : typeof label!=="number") return [];
    const match=String(label).match(/20\d{2}/), year=match?Number(match[0]):NaN;
    if(!Number.isInteger(year)||year<2016||year>2024) return [];
    const regional:Record<string,number|null>={}; regions.forEach((region,index)=>{if(region) regional[region]=value(row[index+3]);});
    return [{year,total:value(row[1]),regions:regional}];
  });
}
export function parsePoliceWorkbooks(cch:ArrayBuffer,pdi:ArrayBuffer){
  return {updated:2024,institutions:{
    carabineros:{label:"Carabineros de Chile",series:{denuncias:series(cch,"1",true),detenidos:series(cch,"7"),victimas:series(cch,"17")}},
    pdi:{label:"Policía de Investigaciones de Chile",series:{denuncias:series(pdi,"1"),detenidos:series(pdi,"6"),victimas:series(pdi,"15")}},
  }};
}
