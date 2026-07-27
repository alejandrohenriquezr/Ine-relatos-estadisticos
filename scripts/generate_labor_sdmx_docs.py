import json
import unicodedata
from html import escape
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

OUT = Path("public/sdmx")
BLUE = colors.HexColor("#005EA8")
LIGHT = colors.HexColor("#EAF5FB")

def build(name, title, sections):
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleINE", parent=styles["Title"], textColor=BLUE, fontSize=23, leading=28))
    styles.add(ParagraphStyle(name="HeadINE", parent=styles["Heading2"], textColor=BLUE, spaceBefore=12))
    styles.add(ParagraphStyle(name="BodyINE", parent=styles["BodyText"], leading=15, spaceAfter=7))
    styles.add(ParagraphStyle(name="TableHeadINE", parent=styles["BodyText"], textColor=colors.white, fontName="Helvetica-Bold", fontSize=7.2, leading=8.6))
    styles.add(ParagraphStyle(name="TableCellINE", parent=styles["BodyText"], fontSize=7.1, leading=8.7))
    doc = SimpleDocTemplate(str(OUT / name), pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.8*cm, bottomMargin=1.8*cm)
    story = [Paragraph("INE | Relatos Estadísticos", styles["BodyINE"]), Paragraph(title, styles["TitleINE"]), Paragraph("Dataflow laboral SDMX 2.0 · 26 de julio de 2026", styles["BodyINE"]), Spacer(1, 10)]
    for heading, body in sections:
        if name.startswith("Informe_estructura") and heading == "Atributos":
            story += [PageBreak(), Paragraph("INE | Relatos Estadísticos", styles["BodyINE"])]
        story += [Paragraph(heading, styles["HeadINE"])]
        if isinstance(body, list):
            column_count = len(body[0])
            widths = {
                2: [4.2*cm, 11.6*cm],
                3: [3.0*cm, 3.5*cm, 9.3*cm],
                4: [2.0*cm, 4.0*cm, 4.0*cm, 5.8*cm],
            }[column_count]
            wrapped_body = [
                [
                    Paragraph(escape(str(value)), styles["TableHeadINE"] if row_index == 0 else styles["TableCellINE"])
                    for value in row
                ]
                for row_index, row in enumerate(body)
            ]
            table = Table(wrapped_body, colWidths=widths, repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,0), BLUE), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
                ("BACKGROUND", (0,1), (-1,-1), LIGHT), ("GRID", (0,0), (-1,-1), .35, colors.HexColor("#9CBCCE")),
                ("VALIGN", (0,0), (-1,-1), "TOP"), ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
                ("LEFTPADDING", (0,0), (-1,-1), 4), ("RIGHTPADDING", (0,0), (-1,-1), 4),
                ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
            ]))
            story += [table]
        else:
            story += [Paragraph(body, styles["BodyINE"])]
    doc.build(story)

def safe_code(value):
    normalized = unicodedata.normalize("NFD", str(value))
    ascii_value = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    code = "".join(char if char.isalnum() else "_" for char in ascii_value.upper())
    return "_".join(part for part in code.split("_") if part)[:90] or "TOTAL"

def unique_labels(series):
    labels = {
        item["label"]
        for point in series or []
        for item in point.get("items", [])
        if item.get("label")
    }
    return sorted(labels, key=lambda value: value.casefold())

def code_table(entries, first_header="Código", second_header="Glosa"):
    return [[first_header, second_header], *[[code, label] for code, label in entries]]

ene = json.loads((Path("public") / "ene-data.json").read_text(encoding="utf-8"))
informality = json.loads((Path("public") / "informality-data.json").read_text(encoding="utf-8"))

ene_activity = unique_labels(ene.get("sectorContributions"))
ene_occupation = unique_labels(ene.get("categoryContributions"))
informality_activity = unique_labels(informality.get("branches"))
informality_occupation = unique_labels(informality.get("categories"))
informality_groups = unique_labels(informality.get("groups"))
informality_hours = [
    item["label"] for item in informality.get("hours", {}).get("items", []) if item.get("label")
]

def category_rows(dataset, breakdown, labels):
    return [
        [dataset, breakdown, safe_code(label), label]
        for label in labels
    ]

guide = [
    ("Propósito", "Esta guía describe cómo descargar y consultar en una sola fuente todas las series usadas por las páginas Ocupación y Desocupación e Informalidad Laboral. El formato de salida es SDMX-CSV 2.0."),
    ("Actualización automática", "La API aplica una estrategia cache-first: sirve la caché pública y, a la vez, revisa ETag, fecha y tamaño de los Excel del INE. Si detecta cambios, descarga los archivos, transforma todas las filas válidas y reemplaza la caché. Por ello, los períodos nuevos se incorporan sin cambiar la URL."),
    ("Endpoint", "GET /api/sdmx/data/INE.GOB.CL,DF_ENE_MERCADO_LABORAL,2.0/all. Los filtros opcionales son dataset, ref_area, sex, breakdown, category, indicator y last_n_periods. Para metadatos use format=json."),
    ("Ejemplos", "Informalidad por rama: ?dataset=INFORMALITY&breakdown=ECONOMIC_ACTIVITY. Mujeres en indicadores principales: ?dataset=ENE&sex=F&breakdown=INDICATOR_MAIN. Últimos 13 períodos: ?last_n_periods=13."),
    ("Calidad", "EST_QUALITY usa F para estimación sin advertencia, A para estimación poco fiable y B para estimación no fiable. Los valores numéricos conservan la precisión de los archivos de origen."),
    ("Compatibilidad", "La URL DF_ENE_IND_PRINCIPALES 1.0 sigue operativa y devuelve el subconjunto histórico de indicadores principales ENE."),
]
structure = [
    ("Alcance", "La versión 2.0 amplía el piloto original: incorpora indicadores principales, ajuste estacional, aportes por actividad y categoría, ocupación presente/ausente y todas las desagregaciones temporales de informalidad. Este informe documenta tanto la estructura SDMX-CSV como los parámetros y variables expuestos por la API."),
    ("Identificadores", [["Elemento", "Identificador"], ["Agencia", "INE.GOB.CL"], ["Dataflow", "DF_ENE_MERCADO_LABORAL(2.0)"], ["DSD", "DSD_ENE_MERCADO_LABORAL(2.0)"], ["Frecuencia", "M3 · trimestre móvil"]]),
    ("Diccionario de variables", [
        ["Variable", "Definición"],
        ["STRUCTURE", "Tipo de estructura SDMX; valor constante dataflow."],
        ["STRUCTURE_ID", "Identificador de la DSD: INE.GOB.CL:DSD_ENE_MERCADO_LABORAL(2.0)."],
        ["ACTION", "Acción SDMX; I indica información incorporada."],
        ["FREQ", "Frecuencia de publicación; M3 identifica trimestres móviles mensuales."],
        ["DATASET", "Conjunto de origen: ENE o INFORMALITY."],
        ["REF_AREA", "Área geográfica de referencia; en la versión 2.0 corresponde a CL (Chile)."],
        ["SEX", "Sexo o total de la población: T, M o F."],
        ["BREAKDOWN", "Familia analítica o tipo de desagregación."],
        ["CATEGORY", "Código de la categoría dentro de BREAKDOWN; TOTAL cuando no aplica."],
        ["INDICATOR", "Código de la medida estadística observada."],
        ["TIME_PERIOD", "Mes final del trimestre móvil, en formato AAAA-MM."],
        ["OBS_VALUE", "Valor observado con la precisión decimal disponible en la fuente."],
        ["UNIT_MEASURE", "Unidad de medida: PERSONS o PERCENT."],
        ["UNIT_MULT", "Multiplicador decimal: 3 para miles y 0 para unidades."],
        ["EST_QUALITY", "Calidad de la estimación: F, A o B."],
        ["REF_PERIOD_START", "Fecha inicial del trimestre móvil, AAAA-MM-DD."],
        ["REF_PERIOD_END", "Fecha final del trimestre móvil, AAAA-MM-DD."],
        ["TIME_PERIOD_LABEL", "Etiqueta legible del trimestre móvil."],
        ["SOURCE", "Fuente institucional de la observación."],
    ]),
    ("Parámetros de consulta de la API", [
        ["Parámetro", "Valores y función"],
        ["dataset", "ENE, INFORMALITY. Admite códigos separados por coma."],
        ["ref_area", "CL. Admite códigos separados por coma."],
        ["sex", "T, M, F. Admite códigos separados por coma."],
        ["breakdown", "Uno o más códigos BREAKDOWN separados por coma."],
        ["category", "Uno o más códigos CATEGORY separados por coma."],
        ["indicator", "Uno o más códigos INDICATOR separados por coma."],
        ["last_n_periods", "Número entero positivo de períodos más recientes."],
        ["format", "json devuelve metadatos y resumen; sin este parámetro devuelve SDMX-CSV."],
    ]),
    ("Diccionario DATASET", code_table([
        ["ENE", "Encuesta Nacional de Empleo: ocupación y desocupación"],
        ["INFORMALITY", "Informalidad laboral"],
    ])),
    ("Diccionario REF_AREA", code_table([
        ["CL", "Chile"],
    ])),
    ("Diccionario SEX", code_table([
        ["T", "Total o ambos sexos"],
        ["M", "Hombres"],
        ["F", "Mujeres"],
    ])),
    ("Diccionario BREAKDOWN", code_table([
        ["INDICATOR_MAIN", "Indicadores principales"],
        ["SEASONAL", "Indicadores ajustados estacionalmente"],
        ["ECONOMIC_ACTIVITY", "Actividad económica: serie temporal"],
        ["OCCUPATIONAL_CATEGORY", "Categoría en la ocupación: serie temporal"],
        ["EMPLOYMENT_PRESENCE", "Ocupación total, presente y ausente"],
        ["ECONOMIC_ACTIVITY_SNAPSHOT", "Actividad económica: último período disponible"],
        ["OCCUPATIONAL_CATEGORY_SNAPSHOT", "Categoría en la ocupación: último período disponible"],
        ["OCCUPATION_GROUP", "Grupo ocupacional"],
        ["USUAL_HOURS", "Tramos de horas habitualmente trabajadas"],
    ])),
    ("Diccionario INDICATOR · ENE", code_table([
        ["PET", "Población en edad de trabajar"],
        ["LABOR", "Fuerza de trabajo"],
        ["EMPLOYED", "Personas ocupadas"],
        ["UNEMPLOYED", "Personas desocupadas"],
        ["CEASED", "Personas cesantes"],
        ["FIRSTJOB", "Personas que buscan trabajo por primera vez"],
        ["INACTIVE", "Personas fuera de la fuerza de trabajo"],
        ["INITIATORS", "Personas iniciadoras"],
        ["POTENTIAL", "Personas inactivas potencialmente activas"],
        ["HABITUAL", "Personas inactivas habituales"],
        ["UNEMPLOYMENTRATE", "Tasa de desocupación"],
        ["EMPLOYMENTRATE", "Tasa de ocupación"],
        ["PARTICIPATION", "Tasa de participación"],
        ["UNEMPLOYMENT_RATE_SEASONALLY_ADJUSTED", "Tasa de desocupación ajustada estacionalmente"],
        ["SECTOR_CHANGE", "Variación anual por actividad económica"],
        ["SECTOR_INCIDENCE", "Incidencia por actividad económica"],
        ["CATEGORY_CHANGE", "Variación anual por categoría en la ocupación"],
        ["CATEGORY_INCIDENCE", "Incidencia por categoría en la ocupación"],
        ["TOTAL", "Total de personas ocupadas para presencia laboral"],
        ["PRESENT", "Personas ocupadas presentes"],
        ["ABSENT", "Personas ocupadas ausentes"],
        ["SHARE", "Proporción de personas ocupadas ausentes"],
        ["CHANGE", "Variación anual de personas ocupadas ausentes"],
        ["CHANGEPEOPLE", "Variación anual en número de personas"],
        ["PRESENTCHANGE", "Variación anual de personas ocupadas presentes"],
    ])),
    ("Diccionario INDICATOR · INFORMALITY", code_table([
        ["FORMAL", "Personas ocupadas formales"],
        ["INFORMAL", "Personas ocupadas informales"],
        ["MENFORMAL", "Hombres ocupados formales"],
        ["MENINFORMAL", "Hombres ocupados informales"],
        ["WOMENFORMAL", "Mujeres ocupadas formales"],
        ["WOMENINFORMAL", "Mujeres ocupadas informales"],
        ["RATE", "Tasa de ocupación informal"],
        ["MENRATE", "Tasa de ocupación informal de hombres"],
        ["WOMENRATE", "Tasa de ocupación informal de mujeres"],
        ["SHARE", "Participación en el total de personas ocupadas informales"],
        ["ANNUAL", "Variación anual"],
    ])),
    ("Diccionario CATEGORY · ENE", [
        ["DATASET", "BREAKDOWN", "Código", "Glosa"],
        ["ENE", "INDICATOR_MAIN", "TOTAL", "Total"],
        ["ENE", "SEASONAL", "TOTAL", "Total"],
        ["ENE", "EMPLOYMENT_PRESENCE", "TOTAL", "Total"],
        *category_rows("ENE", "ECONOMIC_ACTIVITY", ene_activity),
        *category_rows("ENE", "OCCUPATIONAL_CATEGORY", ene_occupation),
        *category_rows("ENE", "ECONOMIC_ACTIVITY_SNAPSHOT", ene_activity),
        *category_rows("ENE", "OCCUPATIONAL_CATEGORY_SNAPSHOT", ene_occupation),
    ]),
    ("Diccionario CATEGORY · INFORMALITY", [
        ["DATASET", "BREAKDOWN", "Código", "Glosa"],
        ["INFORMALITY", "INDICATOR_MAIN", "TOTAL", "Total"],
        *category_rows("INFORMALITY", "ECONOMIC_ACTIVITY", informality_activity),
        *category_rows("INFORMALITY", "OCCUPATIONAL_CATEGORY", informality_occupation),
        *category_rows("INFORMALITY", "OCCUPATION_GROUP", informality_groups),
        *category_rows("INFORMALITY", "USUAL_HOURS", informality_hours),
    ]),
    ("Atributos", [["Atributo", "Uso"], ["UNIT_MEASURE / UNIT_MULT", "Unidad y potencia de diez"], ["EST_QUALITY", "F, A o B"], ["REF_PERIOD_START / END", "Límites del trimestre móvil"], ["TIME_PERIOD_LABEL", "Etiqueta legible"], ["SOURCE", "Fuente institucional"]]),
    ("Diccionarios de frecuencia, unidad y calidad", [
        ["Variable", "Código", "Glosa"],
        ["FREQ", "M3", "Trimestre móvil con publicación mensual"],
        ["UNIT_MEASURE", "PERSONS", "Personas"],
        ["UNIT_MEASURE", "PERCENT", "Porcentaje"],
        ["UNIT_MULT", "0", "Unidades"],
        ["UNIT_MULT", "3", "Miles"],
        ["EST_QUALITY", "F", "Estimación fiable; sin marca a o b"],
        ["EST_QUALITY", "A", "Estimación poco fiable; marca a"],
        ["EST_QUALITY", "B", "Estimación no fiable; marca b"],
    ]),
    ("Validaciones", "Se excluyen valores no numéricos; se validan períodos y claves; las filas se ordenan de forma determinista. El informe JSON descargable registra todas las reglas implementadas."),
]
build("Guia_tecnica_Empleo_SDMX_2.0.pdf", "Guía técnica de acceso y actualización", guide)
build("Informe_estructura_SDMX_Empleo_2.0.pdf", "Informe de estructura de la API y SDMX", structure)
