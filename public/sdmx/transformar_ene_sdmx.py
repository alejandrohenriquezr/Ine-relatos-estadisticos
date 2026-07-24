#!/usr/bin/env python3
"""Transforma el Excel oficial de indicadores principales ENE a SDMX-CSV 2.0.

Características:
- Sin dependencias externas: lee XLSX mediante ZIP/XML de la biblioteca estándar.
- Puede usar un archivo local o descargar la fuente oficial.
- Conserva el texto decimal almacenado en el XLSX, sin redondearlo.
- Genera SDMX-CSV, informe JSON de validación y archivo SHA-256.

Uso:
    python transformar_ene_sdmx.py
    python transformar_ene_sdmx.py --input indicadores_principales.xlsx
    python transformar_ene_sdmx.py --output-dir salida --latest-only
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
import urllib.request
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Mapping, Optional, Sequence, Tuple
from xml.etree import ElementTree as ET

SOURCE_URL = (
    "https://www.ine.gob.cl/docs/default-source/ocupacion-y-desocupacion/"
    "cuadros-estadisticos/series-vigentes/indicadores_principales.xlsx"
)
AGENCY_ID = "INE.GOB.CL"
DATAFLOW_ID = "DF_ENE_IND_PRINCIPALES"
DATAFLOW_VERSION = "1.0"
STRUCTURE_ID = f"{AGENCY_ID}:{DATAFLOW_ID}({DATAFLOW_VERSION})"

SDMX_COLUMNS = [
    "STRUCTURE",
    "STRUCTURE_ID",
    "ACTION",
    "FREQ",
    "REF_AREA",
    "SEX",
    "INDICATOR",
    "TIME_PERIOD",
    "OBS_VALUE",
    "UNIT_MEASURE",
    "UNIT_MULT",
    "EST_QUALITY",
    "REF_PERIOD_START",
    "REF_PERIOD_END",
    "TIME_PERIOD_LABEL",
    "SOURCE",
]

# Hoja Excel -> (REF_AREA, SEX)
SHEET_CONTEXT: Mapping[str, Tuple[str, str]] = {
    "AS": ("CL", "T"),
    "H": ("CL", "M"),
    "M": ("CL", "F"),
    "AP": ("CL-AP", "T"),
    "TA": ("CL-TA", "T"),
    "AN": ("CL-AN", "T"),
    "AT": ("CL-AT", "T"),
    "CO": ("CL-CO", "T"),
    "VA": ("CL-VA", "T"),
    "RM": ("CL-RM", "T"),
    "LI": ("CL-LI", "T"),
    "ML": ("CL-ML", "T"),
    "NB": ("CL-NB", "T"),
    "BI": ("CL-BI", "T"),
    "AR": ("CL-AR", "T"),
    "LR": ("CL-LR", "T"),
    "LL": ("CL-LL", "T"),
    "AI": ("CL-AI", "T"),
    "MA": ("CL-MA", "T"),
}

# Columna de nota, columna de valor, código, unidad y multiplicador.
INDICATORS: Sequence[Tuple[int, int, str, str, str]] = (
    (3, 4, "WAP", "PS", "3"),
    (5, 6, "LF", "PS", "3"),
    (7, 8, "EMP", "PS", "3"),
    (9, 10, "UNE", "PS", "3"),
    (11, 12, "UNE_EXP", "PS", "3"),
    (13, 14, "UNE_FIRST", "PS", "3"),
    (15, 16, "OLF", "PS", "3"),
    (17, 18, "OLF_INIT", "PS", "3"),
    (19, 20, "OLF_POT", "PS", "3"),
    (21, 22, "OLF_USUAL", "PS", "3"),
    (23, 24, "UNE_RT", "PT", "0"),
    (25, 26, "EMP_RT", "PT", "0"),
    (27, 28, "LF_PART_RT", "PT", "0"),
)

MONTHS = {
    "ene": 1,
    "feb": 2,
    "mar": 3,
    "abr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "ago": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dic": 12,
}
MONTH_NAMES = {
    1: "Enero",
    2: "Febrero",
    3: "Marzo",
    4: "Abril",
    5: "Mayo",
    6: "Junio",
    7: "Julio",
    8: "Agosto",
    9: "Septiembre",
    10: "Octubre",
    11: "Noviembre",
    12: "Diciembre",
}

NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NS_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


class TransformError(RuntimeError):
    """Error de estructura o contenido que impide generar una salida confiable."""


@dataclass(frozen=True)
class PeriodInfo:
    time_period: str
    start_date: str
    end_date: str
    label: str


def column_number(cell_ref: str) -> int:
    """Convierte una referencia Excel, por ejemplo AA10, a número de columna."""
    match = re.match(r"([A-Z]+)", cell_ref)
    if not match:
        raise TransformError(f"Referencia de celda inválida: {cell_ref}")
    value = 0
    for char in match.group(1):
        value = value * 26 + ord(char) - 64
    return value


def normalize_text(value: Optional[str]) -> str:
    return "" if value is None else re.sub(r"\s+", " ", value).strip()


def quality_code(note: Optional[str]) -> str:
    """Mapea nota vacía/a/b a estimación fiable/poco fiable/no fiable."""
    clean = normalize_text(note).lower()
    if clean == "":
        return "F"
    if clean == "a":
        return "A"
    if clean == "b":
        return "B"
    raise TransformError(f"Código de calidad desconocido en Excel: {note!r}")


def last_day(year: int, month: int) -> int:
    if month == 12:
        next_year, next_month = year + 1, 1
    else:
        next_year, next_month = year, month + 1
    from datetime import date, timedelta

    return (date(next_year, next_month, 1) - timedelta(days=1)).day


def parse_period(year_value: str, quarter_label: str) -> PeriodInfo:
    """Interpreta un trimestre móvil y usa su mes final como TIME_PERIOD.

    El año del Excel corresponde al año del mes final. Para períodos que cruzan
    año (Nov-Ene y Dic-Feb), el inicio se asigna al año anterior.
    """
    try:
        end_year = int(float(normalize_text(year_value)))
    except ValueError as exc:
        raise TransformError(f"Año inválido: {year_value!r}") from exc

    parts = [normalize_text(p).lower() for p in re.split(r"\s*-\s*", quarter_label)]
    if len(parts) != 2 or parts[0] not in MONTHS or parts[1] not in MONTHS:
        raise TransformError(f"Trimestre móvil no reconocido: {quarter_label!r}")

    start_month, end_month = MONTHS[parts[0]], MONTHS[parts[1]]
    # En la fuente, Nov-Ene se etiqueta con el año de noviembre; Dic-Feb,
    # en cambio, se etiqueta con el año de febrero. Esta excepción mantiene
    # una secuencia mensual continua y sin duplicados.
    if start_month == 11 and end_month == 1:
        end_year += 1
    start_year = end_year - 1 if start_month > end_month else end_year
    start_date = f"{start_year:04d}-{start_month:02d}-01"
    end_date = f"{end_year:04d}-{end_month:02d}-{last_day(end_year, end_month):02d}"
    time_period = f"{end_year:04d}-{end_month:02d}"
    label = f"{MONTH_NAMES[start_month]}–{MONTH_NAMES[end_month]} {end_year}"
    return PeriodInfo(time_period, start_date, end_date, label)


class XlsxReader:
    """Lector mínimo XLSX que conserva el contenido decimal de las celdas."""

    def __init__(self, path: Path):
        self.path = path
        self.archive = zipfile.ZipFile(path)
        self.shared_strings = self._read_shared_strings()
        self.sheet_paths = self._read_sheet_paths()

    def close(self) -> None:
        self.archive.close()

    def __enter__(self) -> "XlsxReader":
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        self.close()

    def _read_shared_strings(self) -> List[str]:
        try:
            root = ET.fromstring(self.archive.read("xl/sharedStrings.xml"))
        except KeyError:
            return []
        output: List[str] = []
        for item in root:
            fragments = [node.text or "" for node in item.iter(NS_MAIN + "t")]
            output.append("".join(fragments))
        return output

    def _read_sheet_paths(self) -> Dict[str, str]:
        workbook = ET.fromstring(self.archive.read("xl/workbook.xml"))
        relations = ET.fromstring(self.archive.read("xl/_rels/workbook.xml.rels"))
        rel_map = {
            rel.attrib["Id"]: rel.attrib["Target"].lstrip("/") for rel in relations
        }
        paths: Dict[str, str] = {}
        sheets = workbook.find(NS_MAIN + "sheets")
        if sheets is None:
            raise TransformError("El XLSX no contiene una colección de hojas.")
        for sheet in sheets:
            name = sheet.attrib["name"]
            rid = sheet.attrib[NS_REL + "id"]
            target = rel_map[rid]
            paths[name] = target if target.startswith("xl/") else "xl/" + target
        return paths

    def iter_rows(self, sheet_name: str) -> Iterator[Tuple[int, Dict[int, str]]]:
        if sheet_name not in self.sheet_paths:
            raise TransformError(f"No existe la hoja requerida: {sheet_name}")
        root = ET.fromstring(self.archive.read(self.sheet_paths[sheet_name]))
        for row in root.iter(NS_MAIN + "row"):
            row_number = int(row.attrib["r"])
            values: Dict[int, str] = {}
            for cell in row.findall(NS_MAIN + "c"):
                col = column_number(cell.attrib["r"])
                cell_type = cell.attrib.get("t")
                if cell_type == "inlineStr":
                    node = cell.find(".//" + NS_MAIN + "t")
                    value = "" if node is None else (node.text or "")
                else:
                    node = cell.find(NS_MAIN + "v")
                    value = "" if node is None else (node.text or "")
                    if cell_type == "s" and value != "":
                        value = self.shared_strings[int(value)]
                values[col] = value
            yield row_number, values


def download_source(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "INE-SDMX-Transformer/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response, destination.open("wb") as out:
        content_type = response.headers.get("Content-Type", "")
        if "spreadsheet" not in content_type and "octet-stream" not in content_type:
            raise TransformError(f"La URL no devolvió un Excel. Content-Type={content_type}")
        while chunk := response.read(1024 * 1024):
            out.write(chunk)


def validate_headers(reader: XlsxReader, sheet_name: str) -> None:
    rows = {number: values for number, values in reader.iter_rows(sheet_name) if number in (6, 7)}
    if 6 not in rows or 7 not in rows:
        raise TransformError(f"La hoja {sheet_name} no tiene las filas de cabecera 6 y 7.")
    if normalize_text(rows[6].get(1)).lower() != "año":
        raise TransformError(f"Cabecera inesperada en {sheet_name}!A6")
    if not normalize_text(rows[6].get(2)).lower().startswith("trimestre"):
        raise TransformError(f"Cabecera inesperada en {sheet_name}!B6")
    for note_col, value_col, _, unit, _ in INDICATORS:
        if normalize_text(rows[7].get(note_col)).lower() != "nota":
            raise TransformError(f"Se esperaba 'nota' en {sheet_name}, columna {note_col}.")
        expected = "en miles" if unit == "PS" else "tasa (%)"
        if normalize_text(rows[7].get(value_col)).lower() != expected:
            raise TransformError(
                f"Unidad inesperada en {sheet_name}, columna {value_col}; se esperaba {expected!r}."
            )


def extract_observations(reader: XlsxReader, latest_only: bool = False) -> List[Dict[str, str]]:
    observations: List[Dict[str, str]] = []
    for sheet_name, (ref_area, sex) in SHEET_CONTEXT.items():
        validate_headers(reader, sheet_name)
        sheet_rows: List[Tuple[int, Dict[int, str]]] = []
        for row_number, cells in reader.iter_rows(sheet_name):
            if row_number < 8:
                continue
            year = normalize_text(cells.get(1))
            period_label = normalize_text(cells.get(2))
            if not year or not period_label:
                continue
            if not re.fullmatch(r"\d{4}(?:\.0+)?", year):
                continue
            sheet_rows.append((row_number, cells))

        if latest_only and sheet_rows:
            sheet_rows = [sheet_rows[-1]]

        for row_number, cells in sheet_rows:
            period = parse_period(cells.get(1, ""), cells.get(2, ""))
            for note_col, value_col, indicator, unit, multiplier in INDICATORS:
                obs_value = normalize_text(cells.get(value_col))
                if obs_value == "":
                    continue
                try:
                    float(obs_value)
                except ValueError as exc:
                    raise TransformError(
                        f"Valor no numérico en {sheet_name}, fila {row_number}, columna {value_col}: {obs_value!r}"
                    ) from exc
                observations.append(
                    {
                        "STRUCTURE": "dataflow",
                        "STRUCTURE_ID": STRUCTURE_ID,
                        "ACTION": "I",
                        "FREQ": "M",
                        "REF_AREA": ref_area,
                        "SEX": sex,
                        "INDICATOR": indicator,
                        "TIME_PERIOD": period.time_period,
                        "OBS_VALUE": obs_value,
                        "UNIT_MEASURE": unit,
                        "UNIT_MULT": multiplier,
                        "EST_QUALITY": quality_code(cells.get(note_col)),
                        "REF_PERIOD_START": period.start_date,
                        "REF_PERIOD_END": period.end_date,
                        "TIME_PERIOD_LABEL": period.label,
                        "SOURCE": SOURCE_URL,
                    }
                )

    observations.sort(
        key=lambda row: (
            row["REF_AREA"],
            row["SEX"],
            row["INDICATOR"],
            row["TIME_PERIOD"],
        )
    )
    return observations


def validate_observations(rows: Sequence[Mapping[str, str]]) -> Dict[str, object]:
    errors: List[str] = []
    expected_indicators = {item[2] for item in INDICATORS}
    expected_areas = {item[0] for item in SHEET_CONTEXT.values()}
    expected_sexes = {"T", "M", "F"}
    keys = set()
    quality_counts = {"F": 0, "A": 0, "B": 0}
    periods = set()

    for index, row in enumerate(rows, start=2):
        missing = [column for column in SDMX_COLUMNS if column not in row]
        if missing:
            errors.append(f"Fila {index}: faltan columnas {missing}")
        key = (
            row["FREQ"], row["REF_AREA"], row["SEX"], row["INDICATOR"], row["TIME_PERIOD"]
        )
        if key in keys:
            errors.append(f"Fila {index}: observación duplicada {key}")
        keys.add(key)
        if row["REF_AREA"] not in expected_areas:
            errors.append(f"Fila {index}: REF_AREA desconocida {row['REF_AREA']}")
        if row["SEX"] not in expected_sexes:
            errors.append(f"Fila {index}: SEX desconocido {row['SEX']}")
        if row["INDICATOR"] not in expected_indicators:
            errors.append(f"Fila {index}: INDICATOR desconocido {row['INDICATOR']}")
        if row["EST_QUALITY"] not in quality_counts:
            errors.append(f"Fila {index}: EST_QUALITY desconocido {row['EST_QUALITY']}")
        else:
            quality_counts[row["EST_QUALITY"]] += 1
        if not re.fullmatch(r"\d{4}-\d{2}", row["TIME_PERIOD"]):
            errors.append(f"Fila {index}: TIME_PERIOD inválido {row['TIME_PERIOD']}")
        try:
            float(row["OBS_VALUE"])
        except ValueError:
            errors.append(f"Fila {index}: OBS_VALUE no numérico {row['OBS_VALUE']}")
        periods.add(row["TIME_PERIOD"])

    return {
        "valid": not errors,
        "errors": errors,
        "observation_count": len(rows),
        "series_count": len({(r["REF_AREA"], r["SEX"], r["INDICATOR"]) for r in rows}),
        "period_count": len(periods),
        "first_period": min(periods) if periods else None,
        "last_period": max(periods) if periods else None,
        "quality_counts": quality_counts,
        "areas": sorted({r["REF_AREA"] for r in rows}),
        "sex_codes": sorted({r["SEX"] for r in rows}),
        "indicators": sorted({r["INDICATOR"] for r in rows}),
    }


def write_csv(path: Path, rows: Sequence[Mapping[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=SDMX_COLUMNS, extrasaction="raise")
        writer.writeheader()
        writer.writerows(rows)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        while chunk := file.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Ruta a indicadores_principales.xlsx")
    parser.add_argument("--url", default=SOURCE_URL, help="URL usada cuando no se especifica --input")
    parser.add_argument("--output-dir", type=Path, default=Path("salida_sdmx"))
    parser.add_argument("--latest-only", action="store_true", help="Exporta solo el último período de cada hoja")
    parser.add_argument("--keep-source", action="store_true", help="Conserva el Excel descargado en la salida")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    downloaded = args.input is None
    input_path = args.input or (args.output_dir / "indicadores_principales.xlsx")
    if downloaded:
        print(f"Descargando fuente oficial: {args.url}")
        download_source(args.url, input_path)
    elif not input_path.exists():
        raise TransformError(f"No existe el archivo de entrada: {input_path}")

    print(f"Leyendo: {input_path}")
    with XlsxReader(input_path) as reader:
        missing_sheets = sorted(set(SHEET_CONTEXT) - set(reader.sheet_paths))
        if missing_sheets:
            raise TransformError(f"Faltan hojas requeridas: {missing_sheets}")
        rows = extract_observations(reader, latest_only=args.latest_only)

    validation = validate_observations(rows)
    if not validation["valid"]:
        raise TransformError("La validación falló:\n- " + "\n- ".join(validation["errors"]))

    suffix = "ultimo_periodo" if args.latest_only else "completo"
    csv_path = args.output_dir / f"ENE_IND_PRINCIPALES_{suffix}_SDMX-CSV_2.0.csv"
    report_path = args.output_dir / f"informe_validacion_{suffix}.json"
    checksum_path = args.output_dir / "SHA256SUMS.txt"

    write_csv(csv_path, rows)
    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_url": args.url if downloaded else SOURCE_URL,
        "source_file": str(input_path.resolve()),
        "source_sha256": sha256(input_path),
        "agency_id": AGENCY_ID,
        "dataflow": STRUCTURE_ID,
        "format": "SDMX-CSV 2.0",
        "time_period_rule": "mes final del trimestre móvil",
        "decimal_policy": "se conserva el texto decimal almacenado en el XLSX",
        "quality_mapping": {"sin marca": "F", "a": "A", "b": "B"},
        **validation,
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    checksum_path.write_text(
        f"{sha256(csv_path)}  {csv_path.name}\n{sha256(report_path)}  {report_path.name}\n",
        encoding="utf-8",
    )

    if downloaded and not args.keep_source:
        input_path.unlink(missing_ok=True)

    print(json.dumps({"csv": str(csv_path), "report": str(report_path), **validation}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (TransformError, zipfile.BadZipFile, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
