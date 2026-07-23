"""Extrae del Excel oficial el IPC general y las 13 divisiones para la web."""
import json
from pathlib import Path

import openpyxl

SOURCE = Path("/workspace/scratch/0e027815dcde/upload/01-ipc-xls.xlsx")
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "ipc-data.json"

workbook = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
sheet = workbook["IPC 2023=100"]
series = []

for row in sheet.iter_rows(min_row=5, values_only=True):
    year, month, division, group, class_, subclass, product, label = row[:8]
    is_general = label == "IPC General"
    is_division = division is not None and all(value is None for value in (group, class_, subclass, product))
    if not (is_general or is_division):
        continue
    series.append({
        "year": year,
        "month": month,
        "division": 0 if is_general else division,
        "label": label,
        "weight": row[8],
        "index": row[9],
        "monthly": row[10],
        "accumulated": row[11],
        "annual": row[12],
        "monthlyIncidence": row[13],
    })

payload = {
    "base": "2023=100",
    "updated": "8 de julio de 2026",
    "series": series,
}
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(series)} observaciones escritas en {OUTPUT}")
