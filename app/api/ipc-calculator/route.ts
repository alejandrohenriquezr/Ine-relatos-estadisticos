const OFFICIAL_API = "https://api-calculadora.ine.cl/";

const integer = (value: string | null, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
};

async function officialJson(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": "INE-Relatos/1.0" },
  });
  if (!response.ok) throw new Error("El servicio oficial no respondió");
  return response.json();
}

export async function GET(request: Request) {
  const input = new URL(request.url);
  const action = input.searchParams.get("action");

  try {
    if (action === "years") {
      return Response.json(
        await officialJson(`${OFFICIAL_API}ServiciosCalculadoraAnio`),
        { headers: { "Cache-Control": "public, max-age=3600" } },
      );
    }

    if (action === "months") {
      const year = integer(input.searchParams.get("year"), 1900, 2100);
      if (!year) return Response.json({ error: "Año inválido" }, { status: 400 });
      return Response.json(
        await officialJson(
          `${OFFICIAL_API}ServiciosCalculadoraMeses?anio=${year}`,
        ),
        { headers: { "Cache-Control": "public, max-age=3600" } },
      );
    }

    if (action === "calculate") {
      const startYear = integer(input.searchParams.get("startYear"), 1900, 2100);
      const startMonth = integer(input.searchParams.get("startMonth"), 1, 12);
      const endYear = integer(input.searchParams.get("endYear"), 1900, 2100);
      const endMonth = integer(input.searchParams.get("endMonth"), 1, 12);
      const amount = input.searchParams.get("amount")?.replace(/[^0-9]/g, "");
      if (!startYear || !startMonth || !endYear || !endMonth || amount === undefined)
        return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
      const query = new URLSearchParams({
        mesInicio: String(startMonth),
        AnioInicio: String(startYear),
        mesTermino: String(endMonth),
        AnioTermino: String(endYear),
        valor_a_ajustar: amount || "0",
      });
      return Response.json(
        await officialJson(
          `${OFFICIAL_API}ServiciosCalculadoraVariacion?${query}`,
        ),
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json({ error: "Acción inválida" }, { status: 400 });
  } catch {
    return Response.json(
      { error: "La calculadora oficial no está respondiendo" },
      { status: 502 },
    );
  }
}
