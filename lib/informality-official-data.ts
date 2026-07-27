import * as XLSX from "xlsx";

type Cell=string|number|null;
const matrix=(buffer:ArrayBuffer,sheet="AS")=>{const book=XLSX.read(buffer,{type:"array",cellDates:false});return XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[sheet],{header:1,raw:true,defval:null});};
const num=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:0;
const dataRows=(input:Cell[][])=>input.filter(row=>Number.isInteger(row[0])&&typeof row[1]==="string");

function parseRates(buffer:ArrayBuffer){return dataRows(matrix(buffer)).map(row=>({year:row[0],quarter:String(row[1]).trim(),formal:num(row[3]),informal:num(row[5]),menFormal:num(row[7]),menInformal:num(row[9]),womenFormal:num(row[11]),womenInformal:num(row[13]),rate:num(row[15]),menRate:num(row[17]),womenRate:num(row[19])}));}

function parseBreakdown(buffer:ArrayBuffer){
  const input=matrix(buffer),headers=input[5];
  return dataRows(input).map(row=>{
    const items=new Map<string,{label:string;formal:number;formalQuality:string|null;informal:number;informalQuality:string|null;references:string[]}>();
    for(let column=2;column<headers.length;column+=2){
      const raw=String(headers[column]??""); if(!raw)continue;
      const informal=/\(informales\)/i.test(raw),formal=/\(formales\)/i.test(raw); if(!formal&&!informal)continue;
      const references=Array.from(raw.matchAll(/\[(\d+)\]/g),match=>match[1]);
      const label=raw.replace(/\s*\((?:in)?formales\)/i,"").replace(/\s*\[\d+\]/g,"").trim();
      const item=items.get(label)??{label,formal:0,formalQuality:null,informal:0,informalQuality:null,references:[]};
      if(informal){item.informal=num(row[column+1]);item.informalQuality=row[column]?String(row[column]):null;}else{item.formal=num(row[column+1]);item.formalQuality=row[column]?String(row[column]):null;}
      item.references=Array.from(new Set([...item.references,...references])); items.set(label,item);
    }
    return {year:row[0],quarter:String(row[1]).trim(),items:Array.from(items.values())};
  });
}

const simple=(series:ReturnType<typeof parseBreakdown>)=>series.map(point=>({year:point.year,quarter:point.quarter,items:point.items.filter(item=>!item.label.startsWith("No sabe"))}));

export function parseInformalityOfficialFiles(files:{rates:ArrayBuffer;branches:ArrayBuffer;categories:ArrayBuffer;groups:ArrayBuffer}){
  const rates=parseRates(files.rates),categorySeries=parseBreakdown(files.categories),latest=rates.at(-1);
  return {updated:latest?`${latest.quarter} ${latest.year}`:"",rates,branches:simple(parseBreakdown(files.branches)),categories:simple(categorySeries),groups:simple(parseBreakdown(files.groups)),categorySeries};
}
