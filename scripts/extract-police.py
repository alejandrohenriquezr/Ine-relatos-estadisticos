import json
import re
from pathlib import Path

import openpyxl


SOURCE = Path("/workspace/scratch/2d2d04d80cf0/upload/01-cuadros-estad-sticas-policiales_2025-1s.xlsx")
OUTPUT = Path("public/police-data.json")
REGION_ALIASES = {"Metropolitana ": "METROPOLITANA", "O'Higgins": "O'HIGGINS"}


def clean_region(value):
    label = str(value).strip()
    return REGION_ALIASES.get(value, label.upper())


def numeric(value):
    return value if isinstance(value, (int, float)) else None


def extract_sheet(workbook, sheet_name, combined=False):
    sheet = workbook[sheet_name]
    headers = [clean_region(cell.value) for cell in sheet[4][1:]]
    records = []
    for row in sheet.iter_rows(min_row=5, values_only=True):
        label = row[0]
        if combined:
            if not isinstance(label, str) or not label.startswith("Denuncias "):
                continue
            match = re.search(r"(20\d{2})", label)
            if not match:
                continue
            year = int(match.group(1))
        else:
            match = re.search(r"(20\d{2})", str(label))
            if not match:
                continue
            year = int(match.group(1))
        if year > 2024:
            continue
        records.append({
            "year": year,
            "total": numeric(row[1]),
            "regions": {
                region: numeric(value)
                for region, value in zip(headers[1:], row[2:])
                if region != "NONE"
            },
        })
    return records


workbook = openpyxl.load_workbook(SOURCE, data_only=True, read_only=True)
data = {
    "updated": 2024,
    "institutions": {
        "carabineros": {
            "label": "Carabineros de Chile",
            "series": {
                "denuncias": extract_sheet(workbook, "1", combined=True),
                "detenidos": extract_sheet(workbook, "7"),
                "victimas": extract_sheet(workbook, "17"),
            },
        },
        "pdi": {
            "label": "Policía de Investigaciones de Chile",
            "series": {
                "denuncias": extract_sheet(workbook, "23"),
                "detenidos": extract_sheet(workbook, "28"),
                "victimas": extract_sheet(workbook, "37"),
            },
        },
    },
}
OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
