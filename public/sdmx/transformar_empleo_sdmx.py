#!/usr/bin/env python3
"""Descarga la versión vigente del dataflow laboral SDMX-CSV 2.0.

La API consulta las cachés públicas de Ocupación y Desocupación e Informalidad.
Cada caché verifica los Excel oficiales mediante ETag, fecha y tamaño, y se
reconstruye cuando encuentra nuevos datos. No requiere dependencias externas.
"""
from argparse import ArgumentParser
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DEFAULT_BASE = "https://ene-interactiva.chatgpt-sites.com"
PATH = "/api/sdmx/data/INE.GOB.CL,DF_ENE_MERCADO_LABORAL,2.0/all"


def main() -> None:
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=DEFAULT_BASE)
    parser.add_argument("--output", default="ENE_mercado_laboral_SDMX-CSV_2.0.csv")
    parser.add_argument("--dataset", choices=("ENE", "INFORMALITY"))
    parser.add_argument("--breakdown")
    parser.add_argument("--sex", choices=("T", "M", "F"))
    parser.add_argument("--last-n-periods", type=int)
    args = parser.parse_args()
    query = {
        key: value
        for key, value in {
            "dataset": args.dataset,
            "breakdown": args.breakdown,
            "sex": args.sex,
            "last_n_periods": args.last_n_periods,
        }.items()
        if value is not None
    }
    url = args.base_url.rstrip("/") + PATH
    if query:
        url += "?" + urlencode(query)
    request = Request(url, headers={"User-Agent": "INE-SDMX-Updater/2.0"})
    with urlopen(request, timeout=120) as response:
        body = response.read()
        if not body.startswith(b"STRUCTURE,STRUCTURE_ID"):
            raise RuntimeError("La respuesta no tiene un encabezado SDMX-CSV válido")
    Path(args.output).write_bytes(body)
    print(f"{len(body):,} bytes guardados en {args.output}")


if __name__ == "__main__":
    main()
