import {NextRequest, NextResponse} from "next/server";
import {
  latestObservation,
  listDatasets,
  metadata,
  searchStatistics,
  timeSeries,
} from "../../../lib/mcp-statistics";

const DEFAULT_PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2025-03-26", "2025-06-18", "2025-11-25"]);

const schemas = {
  dataset: {type:"string", enum:["ENE","INFORMALITY","IPC","IPP"]},
  ref_area: {type:"string", description:"Código territorial SDMX, por ejemplo CL."},
  sex: {type:"string", description:"Código de sexo cuando corresponda: T, M o F."},
  breakdown: {type:"string"},
  category: {type:"string"},
  indicator: {type:"string"},
  start_period: {type:"string", description:"Periodo inicial ISO, por ejemplo 2025-01."},
  end_period: {type:"string", description:"Periodo final ISO, por ejemplo 2026-06."},
};

const TOOLS = [
  {
    name:"list_datasets",
    description:"Lista los conjuntos estadísticos oficiales disponibles en este servidor MCP del INE de Chile.",
    inputSchema:{type:"object",properties:{},additionalProperties:false},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  },
  {
    name:"search_statistics",
    description:"Busca series disponibles por texto dentro de los códigos de dataset, desglose, categoría, indicador, unidad y fuente. Úsala para descubrir parámetros antes de solicitar datos.",
    inputSchema:{type:"object",properties:{query:{type:"string"},limit:{type:"integer",minimum:1,maximum:100,default:25}},required:["query"],additionalProperties:false},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  },
  {
    name:"get_latest_observation",
    description:"Devuelve la observación oficial más reciente que coincide exactamente con los filtros entregados. Si el filtro no identifica una serie única, devuelve la primera observación del periodo más reciente; para descubrir códigos use search_statistics o get_metadata.",
    inputSchema:{type:"object",properties:{...schemas},required:["dataset"],additionalProperties:false},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  },
  {
    name:"get_time_series",
    description:"Obtiene observaciones oficiales de una serie temporal. Los filtros se aplican de forma exacta sobre los códigos SDMX existentes. Permite limitar los últimos periodos y el número de filas.",
    inputSchema:{type:"object",properties:{...schemas,last_n_periods:{type:"integer",minimum:1,maximum:240},limit:{type:"integer",minimum:1,maximum:2000,default:500}},required:["dataset"],additionalProperties:false},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  },
  {
    name:"get_metadata",
    description:"Devuelve los códigos de áreas, sexos, desgloses, categorías, indicadores, unidades, calidad y fuentes disponibles para los filtros entregados.",
    inputSchema:{type:"object",properties:{...schemas},required:["dataset"],additionalProperties:false},
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  },
];

type RpcRequest = {jsonrpc?:string;id?:string|number|null;method?:string;params?:Record<string,unknown>};

const rpc = (id: RpcRequest["id"], result: unknown) => ({jsonrpc:"2.0",id:id ?? null,result});
const error = (id: RpcRequest["id"], code:number, message:string, data?:unknown) => ({jsonrpc:"2.0",id:id ?? null,error:{code,message,...(data===undefined?{}:{data})}});

// MCP exige que structuredContent sea un objeto. El valor completo se conserva
// también como texto JSON para clientes que sólo consumen content.
const toolResult = (value: unknown) => ({
  content:[{type:"text",text:JSON.stringify(value,null,2)}],
  structuredContent:{result:value},
  isError:false,
});

function callTool(name:string, args:Record<string,unknown>) {
  switch(name) {
    case "list_datasets": return toolResult(listDatasets());
    case "search_statistics": return toolResult(searchStatistics(String(args.query ?? ""), Number(args.limit ?? 25)));
    case "get_latest_observation": return toolResult(latestObservation(args));
    case "get_time_series": return toolResult(timeSeries(args));
    case "get_metadata": return toolResult(metadata(args));
    default: throw new Error(`Herramienta MCP desconocida: ${name}`);
  }
}

/**
 * Endpoint MCP por HTTP, sin estado y de solo lectura.
 * Implementa initialize, ping, tools/list y tools/call.
 */
export async function POST(request:NextRequest) {
  let body:RpcRequest;
  try { body = await request.json() as RpcRequest; }
  catch { return NextResponse.json(error(null,-32700,"JSON inválido"),{status:400}); }

  if (body.jsonrpc !== "2.0" || !body.method) return NextResponse.json(error(body.id,-32600,"Solicitud JSON-RPC inválida"),{status:400});

  // Las notificaciones MCP no esperan cuerpo de respuesta.
  if (body.id === undefined && body.method.startsWith("notifications/")) return new NextResponse(null,{status:202});

  try {
    switch(body.method) {
      case "initialize": {
        const requested = String(body.params?.protocolVersion ?? "");
        const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requested) ? requested : DEFAULT_PROTOCOL_VERSION;
        return NextResponse.json(rpc(body.id,{
          protocolVersion,
          capabilities:{tools:{listChanged:false}},
          serverInfo:{name:"ine-statistical-mcp",version:"1.0.0",title:"INE Chile · Statistical MCP"},
          instructions:"Servidor de solo lectura. Las cifras provienen de las mismas instantáneas validadas que alimentan la capa SDMX del sitio INE | Relatos Estadísticos. Use search_statistics o get_metadata para descubrir códigos antes de filtrar. No inferir ni reemplazar valores ausentes.",
        }),{headers:{"Cache-Control":"no-store"}});
      }
      case "ping": return NextResponse.json(rpc(body.id,{}));
      case "tools/list": return NextResponse.json(rpc(body.id,{tools:TOOLS}));
      case "tools/call": {
        const params = body.params ?? {};
        const name = String(params.name ?? "");
        const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string,unknown>;
        return NextResponse.json(rpc(body.id,callTool(name,args)),{headers:{"Cache-Control":"no-store"}});
      }
      default: return NextResponse.json(error(body.id,-32601,`Método no implementado: ${body.method}`),{status:404});
    }
  } catch (cause) {
    return NextResponse.json(error(body.id,-32603,cause instanceof Error ? cause.message : "Error interno MCP"),{status:500});
  }
}

export async function GET() {
  return NextResponse.json({
    name:"INE Chile · Statistical MCP",
    version:"1.0.0",
    transport:"HTTP",
    endpoint:"/api/mcp",
    read_only:true,
    protocol_versions:[...SUPPORTED_PROTOCOL_VERSIONS],
    datasets:listDatasets(),
    tools:TOOLS.map(tool=>tool.name),
  },{headers:{"Cache-Control":"public, max-age=300"}});
}
