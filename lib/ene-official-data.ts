import * as XLSX from "xlsx";

type Cell=string|number|null;
const rows=(buffer:ArrayBuffer,sheet:string)=>{const book=XLSX.read(buffer,{type:"array",cellDates:false});return XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[sheet],{header:1,raw:true,defval:null});};
const num=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:null;
const dataRows=(input:Cell[][])=>input.filter(row=>Number.isInteger(row[0])&&typeof row[1]==="string");
const ids=["pet","labor","employed","unemployed","ceased","firstJob","inactive","initiators","potential","habitual","unemploymentRate","employmentRate","participation"];

function parseIndicators(buffer:ArrayBuffer){
  const result:Record<string,unknown[]>={Total:[],Hombres:[],Mujeres:[]};
  const indicatorSeries:Record<string,unknown[]>={Total:[],Hombres:[],Mujeres:[]};
  for(const [label,sheet] of [["Total","AS"],["Hombres","H"],["Mujeres","M"]] as const){
    for(const row of dataRows(rows(buffer,sheet))){
      const values=Object.fromEntries(ids.map((id,index)=>[id,{value:num(row[3+index*2]),note:row[2+index*2]||null}]));
      indicatorSeries[label].push({year:row[0],quarter:String(row[1]).trim(),values});
      result[label].push({year:row[0],quarter:String(row[1]).trim(),pet:num(row[3]),labor:num(row[5]),employed:num(row[7]),unemployed:num(row[9]),ceased:num(row[11]),firstJob:num(row[13]),participation:num(row[27]),employmentRate:num(row[25]),unemploymentRate:num(row[23])});
    }
  }
  return {series:result,indicatorSeries};
}

function parseBranches(buffer:ArrayBuffer){
  const input=rows(buffer,"AS"),headers=input[5],points=dataRows(input);
  return points.flatMap((row,index)=>{
    const previous=points.find(candidate=>candidate[0]===Number(row[0])-1&&candidate[1]===row[1]);
    if(!previous)return [];
    const previousTotal=num(previous[3])||1;
    const items=[] as {label:string;change:number;incidence:number|null}[];
    for(let column=4;column<headers.length;column+=2){
      const current=num(row[column+1]),prior=num(previous[column+1]);
      if(current===null||prior===null||prior===0)continue;
      items.push({label:String(headers[column]),change:(current/prior-1)*100,incidence:((current-prior)/previousTotal)*100});
    }
    const strongest=items.filter(item=>(item.incidence??0)>0).sort((a,b)=>(b.incidence??0)-(a.incidence??0)).slice(0,3);
    return [{year:row[0],quarter:String(row[1]).trim(),items:strongest,index}];
  });
}

function parseAbsent(buffer:ArrayBuffer){
  const points=dataRows(rows(buffer,"nacional"));
  return points.map(row=>{
    const previous=points.find(candidate=>candidate[0]===Number(row[0])-1&&candidate[1]===row[1]);
    const total=num(row[3])||0,present=num(row[5])||0,absent=num(row[7])||0,previousAbsent=previous?num(previous[7]):null,previousPresent=previous?num(previous[5]):null;
    return {year:row[0],quarter:String(row[1]).trim(),total,present,absent,share:total?absent/total*100:0,change:previousAbsent?((absent/previousAbsent)-1)*100:null,changePeople:previousAbsent?(absent-previousAbsent)*1000:null,presentChange:previousPresent?((present/previousPresent)-1)*100:null,quality:row[6]||null};
  });
}

export function parseEneOfficialFiles(files:{indicators:ArrayBuffer;branches:ArrayBuffer;absent:ArrayBuffer}){
  const indicators=parseIndicators(files.indicators);
  return {...indicators,sectorContributions:parseBranches(files.branches),absentEmployment:parseAbsent(files.absent)};
}
