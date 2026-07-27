#!/usr/bin/env python3
"""Transforma una respuesta JSON de IPC o IPP en SDMX-CSV.

El sitio ejecuta la transformación equivalente en tiempo real. Este script
documenta un flujo reproducible para usuarios que descarguen el JSON de la API.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from pathlib import Path


COLUMNS = [
    "STRUCTURE", "STRUCTURE_ID", "ACTION", "FREQ", "DATASET", "REF_AREA",
    "BREAKDOWN", "CATEGORY", "INDICATOR", "TIME_PERIOD", "OBS_VALUE",
    "UNIT_MEASURE", "UNIT_MULT", "BASE_PERIOD", "EST_QUALITY", "SOURCE",
]


def safe_code(value: object) -> str:
    """Normaliza una etiqueta como código SDMX estable."""
    text = unicodedata.normalize("NFD", str(value or "TOTAL"))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"(^_|_$)", "", re.sub(r"[^A-Z0-9]+", "_", text.upper())) or "TOTAL"


def row(dataset: str, breakdown: str, category: str, indicator: str,
        point: dict, value: object, base: str) -> dict | None:
    """Construye una observación mensual conservando el valor de origen."""
    if not isinstance(value, (int, float)):
        return None
    unit = "INDEX" if indicator in {"INDEX", "WEIGHT"} else "PERCENT"
    return {
        "STRUCTURE": "dataflow",
        "STRUCTURE_ID": f"INE.GOB.CL:DSD_{dataset}(1.0)",
        "ACTION": "I",
        "FREQ": "M",
        "DATASET": dataset,
        "REF_AREA": "CL",
        "BREAKDOWN": breakdown,
        "CATEGORY": safe_code(category),
        "INDICATOR": indicator,
        "TIME_PERIOD": f"{point['year']}-{int(point['month']):02d}",
        "OBS_VALUE": value,
        "UNIT_MEASURE": unit,
        "UNIT_MULT": "0",
        "BASE_PERIOD": base,
        "EST_QUALITY": "F",
        "SOURCE": f"Instituto Nacional de Estadísticas de Chile · {dataset}",
    }


def transform_ipc(payload: dict) -> list[dict]:
    """Convierte IPC general, divisiones y analíticos."""
    data = payload.get("data", payload)
    analytics = payload.get("analytics", {"series": []})
    output: list[dict] = []
    metrics = {
        "INDEX": "index", "MONTHLY_CHANGE": "monthly",
        "ACCUMULATED_CHANGE": "accumulated", "ANNUAL_CHANGE": "annual",
        "MONTHLY_INCIDENCE": "monthlyIncidence", "WEIGHT": "weight",
    }
    for point in data.get("series", []):
        total = int(point.get("division", 0)) == 0
        breakdown = "TOTAL" if total else "DIVISION"
        category = "IPC_GENERAL" if total else f"DIV_{point['division']}_{point['label']}"
        for indicator, field in metrics.items():
            item = row("IPC", breakdown, category, indicator, point,
                       point.get(field), data.get("base", "2023=100"))
            if item:
                output.append(item)
    for point in analytics.get("series", []):
        for indicator, field in list(metrics.items())[:3]:
            item = row("IPC", "ANALYTICAL", point["label"], indicator, point,
                       point.get(field), analytics.get("base", "2023=100"))
            if item:
                output.append(item)
    return output


def transform_ipp(payload: dict) -> list[dict]:
    """Convierte las series principales y sectoriales del IPP."""
    data = payload.get("data", payload)
    output: list[dict] = []
    metrics = {
        "INDEX": "index", "MONTHLY_CHANGE": "monthly",
        "ACCUMULATED_CHANGE": "accumulated", "ANNUAL_CHANGE": "annual",
    }
    groups = [
        ("TOTAL", "IPP_INDUSTRIES", data.get("industries", [])),
        ("ANALYTICAL", "IPP_INDUSTRIES_WITHOUT_COPPER", data.get("noCopper", [])),
        ("SECTOR", "MANUFACTURING", data.get("manufacturing", {}).get("series", [])),
        ("SECTOR", "MINING", data.get("mining", {}).get("series", [])),
        ("SECTOR", "ELECTRICITY_GAS_WATER", data.get("ipdega", {}).get("series", [])),
    ]
    for breakdown, category, points in groups:
        for point in points:
            for indicator, field in metrics.items():
                item = row("IPP", breakdown, category, indicator, point,
                           point.get(field), data.get("base", "2019=100"))
                if item:
                    output.append(item)
    return output


def main() -> None:
    """Lee el JSON, transforma y escribe un archivo SDMX-CSV."""
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", choices=["IPC", "IPP"])
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    rows = transform_ipc(payload) if args.dataset == "IPC" else transform_ipp(payload)
    with args.output.open("w", encoding="utf-8", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
