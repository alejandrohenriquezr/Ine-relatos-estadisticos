// Convierte los cuatro cuadros oficiales entregados por el usuario en datos web.
import XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const upload=path.resolve(root,"../upload");
const files={rates:"05-informalidad_tasas.xlsx",groups:"02-informalidad_grupo.xlsx",categories:"03-informalidad_categoria.xlsx",branches:"04-informalidad_rama.xlsx"};
const read=name=>XLSX.utils.sheet_to_json(XLSX.readFile(path.join(upload,files[name])).Sheets.AS,{header:1,raw:true,defval:null});
const clean=value=>String(value).replace(" (formales)","").replace(" (informales)","").split(" [")[0];

// Conserva solamente filas que representan trimestres móviles.
const valid=rows=>rows.slice(7).filter(row=>Number.isFinite(row[0])&&row[1]);
const paired=name=>{
  const rows=read(name),headers=rows[5];
  return valid(rows).map(row=>{
    const formal={},informal={};
    for(let col=2;col<headers.length;col+=2){
      const header=headers[col],value=row[col+1];
      if(!header||!Number.isFinite(value))continue;
      (String(header).includes("(informales)")?informal:formal)[clean(header)]=value;
    }
    return {year:row[0],quarter:row[1],items:Object.keys(formal).filter(label=>label in informal).map(label=>({label,formal:formal[label],informal:informal[label]}))};
  });
};
const ratesRows=read("rates");
const rates=valid(ratesRows).map(row=>({year:row[0],quarter:row[1],formal:row[3],informal:row[5],menFormal:row[7],menInformal:row[9],womenFormal:row[11],womenInformal:row[13],rate:row[15],menRate:row[17],womenRate:row[19]}));

// Conserva las notas de encabezado y de calidad de cada serie nacional por categoría.
const categoryRows=read("categories"),categoryHeaders=categoryRows[5];
const categoryColumns=[[2,14],[4,16],[6,18],[null,20],[8,22],[10,24],[12,26]];
const categorySeries=valid(categoryRows).map(row=>({year:row[0],quarter:row[1],items:categoryColumns.map(([formalCol,informalCol])=>{
  const rawHeader=categoryHeaders[formalCol??informalCol]||categoryHeaders[informalCol];
  const references=Array.from(String(rawHeader).matchAll(/\[(\d+)\]/g),match=>match[1]);
  return {label:clean(rawHeader),formal:formalCol===null?0:row[formalCol+1],formalQuality:formalCol===null?null:row[formalCol]||null,informal:row[informalCol+1],informalQuality:row[informalCol]||null,references};
})}));
const categoryFootnotes={
  "2":"Esta categoría incluye a todas las personas asalariadas que trabajan no sólo en la Administración Pública, sino que también en cualquier institución o empresa del Estado.",
  "3":"El total de personal de servicio doméstico incluye tanto puertas adentro como puertas afuera."
};

// El boletín contiene el cuadro de horas para su período de referencia.
const hours={year:2026,quarter:"Ene - Mar",items:[
  ["Total",26.5,2498.665,100,3.2],["1-30",63.9,1201.895,48.1,3.7],["TPV",62.7,774.008,64.4,-1.1],["TPI",66,403.861,33.6,14.3],["Sin clasificación",69.8,24.027,2,7,"a"],["31-44",14.1,771.531,30.9,13.6],["45",15.3,110.972,4.4,-19.8],["46 y más",30.6,403.39,16.1,-6.9],["Sin información",42.1,10.877,.4,-.7,"a"]
].map(([label,rate,informal,share,annual,note])=>({label,rate,informal,share,annual,note}))};
fs.writeFileSync(path.join(root,"public/informality-data.json"),JSON.stringify({updated:"Enero - Marzo 2026",rates,groups:paired("groups"),categories:paired("categories"),branches:paired("branches"),categorySeries,categoryFootnotes,hours}));
