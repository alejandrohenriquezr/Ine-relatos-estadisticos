import {NextRequest, NextResponse} from "next/server";
import {
  buildLaborRows,
  filterLaborRows,
  LABOR_DATAFLOW,
  laborRowsToCsv,
  laborSummary,
} from "../../../../../lib/labor-sdmx";
import {
  buildIpcRows,
  buildIppRows,
  filterPriceRows,
  IPC_DATAFLOW,
  IPP_DATAFLOW,
  priceRowsToCsv,
  priceSummary,
} from "../../../../../lib/price-sdmx";
import eneSnapshot from "../../../../../public/ene-data.json";
import informalitySnapshot from "../../../../../public/informality-data.json";
import ipcAnalyticsSnapshot from "../../../../../public/ipc-analytics.json";
import ipcSnapshot from "../../../../../public/ipc-data.json";
import ippDivisionsSnapshot from "../../../../../public/ippman-divisions.json";
import ippSnapshot from "../../../../../public/ipp-data.json";

const LEGACY_DATAFLOW = "INE.GOB.CL,DF_ENE_IND_PRINCIPALES,1.0/all";

/**
 * Construye el insumo de precios desde las instantáneas validadas incluidas
 * en el despliegue. Evita que una solicitud pública dependa de una segunda
 * petición HTTP al mismo Worker o de la disponibilidad momentánea del INE.
 */
function pricePayload(dataset: "IPC" | "IPP") {
  if (dataset === "IPC") {
    return {data: ipcSnapshot, analytics: ipcAnalyticsSnapshot};
  }
  return {data: ippSnapshot, divisions: ippDivisionsSnapshot};
}

export async function GET(
  request: NextRequest,
  context: {params: Promise<{query: string[]}>},
) {
  const requestedQuery = (await context.params).query.join("/");
  const supportedQueries = [
    LABOR_DATAFLOW,
    LEGACY_DATAFLOW,
    IPC_DATAFLOW,
    IPP_DATAFLOW,
  ];
  if (!supportedQueries.includes(requestedQuery)) {
    return NextResponse.json({
      error: "Consulta SDMX no disponible",
      supported_queries: supportedQueries,
      dataflows: [
        "INE.GOB.CL:DF_ENE_MERCADO_LABORAL(2.0)",
        "INE.GOB.CL:DF_IPC(1.0)",
        "INE.GOB.CL:DF_IPP(1.0)",
      ],
    }, {status: 404});
  }

  if (requestedQuery === IPC_DATAFLOW || requestedQuery === IPP_DATAFLOW) {
    const dataset = requestedQuery === IPC_DATAFLOW ? "IPC" : "IPP";
    const payload = pricePayload(dataset);
    const allRows =
      dataset === "IPC" ? buildIpcRows(payload) : buildIppRows(payload);
    const rows = filterPriceRows(
      allRows,
      new URLSearchParams(request.nextUrl.searchParams),
    );
    const summary = priceSummary(rows, requestedQuery);

    if (request.nextUrl.searchParams.get("format") === "json") {
      return NextResponse.json(
        {
          ...summary,
          cache_policy:
            "instantánea validada incluida en el despliegue; actualización controlada desde los Excel oficiales",
          filters: [
            "dataset",
            "ref_area",
            "breakdown",
            "category",
            "indicator",
            "start_period",
            "end_period",
            "last_n_periods",
          ],
          structure:
            dataset === "IPC"
              ? "INE.GOB.CL:DSD_IPC(1.0)"
              : "INE.GOB.CL:DSD_IPP(1.0)",
        },
        {headers: {"Cache-Control": "no-store"}},
      );
    }

    return new NextResponse(priceRowsToCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dataset}_SDMX-CSV_1.0.csv"`,
        "Cache-Control": "public, max-age=3600",
        "X-SDMX-Dataflow": String(summary.dataflow),
        "X-SDMX-Observations": String(summary.observations),
        "X-SDMX-Series": String(summary.series),
      },
    });
  }

  // El dataflow laboral se construye localmente con las instantáneas incluidas
  // en el sitio, por lo que la descarga no puede entrar en un bucle de fetch.
  const ene = eneSnapshot;
  const informality = informalitySnapshot;
  const parameters = new URLSearchParams(request.nextUrl.searchParams);
  if (requestedQuery === LEGACY_DATAFLOW) {
    parameters.set("dataset", "ENE");
    parameters.set("breakdown", "INDICATOR_MAIN");
  }
  const rows = filterLaborRows(buildLaborRows(ene, informality), parameters);
  const summary = laborSummary(rows);

  if (request.nextUrl.searchParams.get("format") === "json") {
    return NextResponse.json({
      ...summary,
      cache_policy: "instantánea validada incluida en el despliegue; actualización controlada desde los Excel oficiales",
      filters: ["dataset", "ref_area", "sex", "breakdown", "category", "indicator", "last_n_periods"],
    }, {headers: {"Cache-Control": "public, max-age=3600"}});
  }

  return new NextResponse(laborRowsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ENE_mercado_laboral_SDMX-CSV_2.0.csv"',
      "Cache-Control": "public, max-age=3600",
      "X-SDMX-Dataflow": String(summary.dataflow),
      "X-SDMX-Observations": String(summary.observations),
      "X-SDMX-Series": String(summary.series),
    },
  });
}
