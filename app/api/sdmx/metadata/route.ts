import {NextRequest, NextResponse} from "next/server";

const metadata = {
  IPC: {
    agency: "INE.GOB.CL",
    dataflow: "INE.GOB.CL:DF_IPC(1.0)",
    structure: "INE.GOB.CL:DSD_IPC(1.0)",
    data_endpoint: "/api/sdmx/data/INE.GOB.CL,DF_IPC,1.0/all",
    base_period: "2023=100",
    coverage: ["IPC general", "divisiones CCIF", "índices analíticos"],
  },
  IPP: {
    agency: "INE.GOB.CL",
    dataflow: "INE.GOB.CL:DF_IPP(1.0)",
    structure: "INE.GOB.CL:DSD_IPP(1.0)",
    data_endpoint: "/api/sdmx/data/INE.GOB.CL,DF_IPP,1.0/all",
    base_period: "2019=100",
    coverage: [
      "IPP Industrias",
      "IPP Industrias sin cobre",
      "manufactura",
      "minería",
      "IPDEGA",
      "divisiones manufactureras",
    ],
  },
} as const;

export async function GET(request: NextRequest) {
  const dataset = request.nextUrl.searchParams.get("dataset")?.toUpperCase();
  if (dataset !== "IPC" && dataset !== "IPP") {
    return NextResponse.json(
      {
        error: "Debe indicar dataset=IPC o dataset=IPP",
        supported_datasets: ["IPC", "IPP"],
      },
      {status: 400},
    );
  }
  return NextResponse.json(
    {
      ...metadata[dataset],
      frequency: "M",
      reference_area: "CL",
      format: "SDMX-CSV",
      dimensions: [
        "DATASET",
        "REF_AREA",
        "BREAKDOWN",
        "CATEGORY",
        "INDICATOR",
        "TIME_PERIOD",
      ],
      filters: [
        "breakdown",
        "category",
        "indicator",
        "start_period",
        "end_period",
        "last_n_periods",
      ],
      structures: "/sdmx/00_Estructuras_Precios_1.0.xml",
      technical_guide: "/sdmx/Guia_tecnica_Precios_SDMX_1.0.pdf",
      structure_report: "/sdmx/Informe_estructura_SDMX_Precios_1.0.pdf",
    },
    {headers: {"Cache-Control": "public, max-age=3600"}},
  );
}
