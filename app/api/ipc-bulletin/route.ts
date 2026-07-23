type BulletinResult = { url:string|null; verified:boolean };

const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const memoryCache = new Map<string,BulletinResult>();

function candidates(year:number,month:string) {
  // Se prueban primero las cuatro combinaciones exactas "consumido" solicitadas.
  const prefixes = [
    "boletin-indice-de-precios-al-consumido",
    "boletín-indice-de-precios-al-consumido",
    "boletin-índice-de-precios-al-consumido",
    "boletín-índice-de-precios-al-consumido",
    "boletin-indice-de-precios-al-consumidor",
    "boletín-indice-de-precios-al-consumidor",
    "boletin-índice-de-precios-al-consumidor",
    "boletín-índice-de-precios-al-consumidor",
    "boletin-indice-de-precios-al-consumir",
    "boletín-indice-de-precios-al-consumir",
    "boletin-índice-de-precios-al-consumir",
    "boletín-índice-de-precios-al-consumir",
  ];
  const root=`https://www.ine.gob.cl/docs/default-source/índice-de-precios-al-consumidor/boletines/español/${year}/`;
  return prefixes.map(prefix=>`${root}${prefix}-${month}-${year}.pdf`);
}

async function isPdf(url:string) {
  try {
    const head=await fetch(url,{method:"HEAD",redirect:"follow"});
    if(!head.ok&&head.status!==405) return false;
    if(head.ok&&(head.headers.get("content-type")||"").toLowerCase().includes("application/pdf")) return true;
    // Algunos servidores no resuelven correctamente HEAD; se confirma entonces con una descarga parcial.
    const partial=await fetch(url,{method:"GET",headers:{Range:"bytes=0-1023"},redirect:"follow"});
    return partial.ok&&(partial.headers.get("content-type")||"").toLowerCase().includes("application/pdf");
  } catch {
    return false;
  }
}

export async function GET(request:Request) {
  const input=new URL(request.url);
  const year=Number(input.searchParams.get("year"));
  const monthNumber=Number(input.searchParams.get("month"));
  if(!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(monthNumber)||monthNumber<1||monthNumber>12) {
    return Response.json({url:null,verified:false},{status:400});
  }

  // La versión invalida resultados guardados por reglas anteriores del verificador.
  const key=`v3-${year}-${String(monthNumber).padStart(2,"0")}`;
  const cached=memoryCache.get(key);
  const cacheHeaders={"Cache-Control":"public, max-age=86400, s-maxage=31536000","CDN-Cache-Control":"public, max-age=31536000"};
  if(cached) return Response.json(cached,{headers:cacheHeaders});

  let result:BulletinResult={url:null,verified:true};
  for(const url of candidates(year,MONTHS[monthNumber-1])) {
    if(await isPdf(url)) { result={url,verified:true}; break; }
  }
  memoryCache.set(key,result);
  // El resultado queda en memoria y también en la caché HTTP compartida del sitio.
  return Response.json(result,{headers:cacheHeaders});
}
