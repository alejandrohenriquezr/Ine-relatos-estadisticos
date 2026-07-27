#!/usr/bin/env python3
"""Genera las guías SDMX con una composición visual tipo notebook."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "sdmx"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")

NAVY = colors.HexColor("#123F87")
BLUE = colors.HexColor("#1769AA")
CYAN = colors.HexColor("#00A6C8")
RED = colors.HexColor("#D63031")
INK = colors.HexColor("#172B3A")
MUTED = colors.HexColor("#526878")
LINE = colors.HexColor("#D8E2EA")
SOFT = colors.HexColor("#F4F7FA")
CODE_BG = colors.HexColor("#F7F8FA")
OUTPUT_BG = colors.HexColor("#EEF7F9")


pdfmetrics.registerFont(TTFont("DejaVu", FONT_DIR / "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", FONT_DIR / "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("DejaVuMono", FONT_DIR / "DejaVuSansMono.ttf"))
pdfmetrics.registerFont(
    TTFont("DejaVuMono-Bold", FONT_DIR / "DejaVuSansMono-Bold.ttf")
)


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="NotebookTitle",
        fontName="DejaVu-Bold",
        fontSize=25,
        leading=30,
        textColor=NAVY,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="NotebookSubtitle",
        fontName="DejaVu",
        fontSize=11,
        leading=17,
        textColor=MUTED,
        spaceAfter=16,
    )
)
styles.add(
    ParagraphStyle(
        name="Section",
        fontName="DejaVu-Bold",
        fontSize=17,
        leading=22,
        textColor=NAVY,
        spaceBefore=10,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="Subsection",
        fontName="DejaVu-Bold",
        fontSize=12,
        leading=16,
        textColor=INK,
        spaceBefore=7,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyNB",
        fontName="DejaVu",
        fontSize=9.5,
        leading=14.5,
        textColor=INK,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        name="SmallNB",
        fontName="DejaVu",
        fontSize=7.8,
        leading=11,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="CodeNB",
        fontName="DejaVuMono",
        fontSize=7.3,
        leading=10.5,
        textColor=INK,
        leftIndent=0,
    )
)
styles.add(
    ParagraphStyle(
        name="PromptNB",
        fontName="DejaVuMono-Bold",
        fontSize=7.5,
        leading=10,
        textColor=BLUE,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        name="OutputNB",
        fontName="DejaVuMono",
        fontSize=7.3,
        leading=10.5,
        textColor=colors.HexColor("#184D56"),
    )
)
styles.add(
    ParagraphStyle(
        name="CoverBadge",
        fontName="DejaVu-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHeaderNB",
        fontName="DejaVu-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )
)


def footer(canvas, doc):
    """Dibuja identidad, regla y numeración en todas las páginas."""
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFont("DejaVu", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9.5 * mm, "INE Chile | Relatos Estadísticos | SDMX")
    canvas.drawRightString(
        width - 18 * mm, 9.5 * mm, f"Página {canvas.getPageNumber()}"
    )
    canvas.restoreState()


def document(path: Path, title: str):
    """Configura el documento A4 y su área útil."""
    doc = BaseDocTemplate(
        str(path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title=title,
        author="Instituto Nacional de Estadísticas de Chile",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="content",
    )
    doc.addPageTemplates(PageTemplate(id="main", frames=[frame], onPage=footer))
    return doc


def cover(title: str, subtitle: str, badge: str):
    """Crea una portada compacta inspirada en una cabecera de notebook."""
    badge_table = Table(
        [[Paragraph(badge, styles["CoverBadge"])]],
        colWidths=[50 * mm],
        rowHeights=[8 * mm],
    )
    badge_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOX", (0, 0), (-1, -1), 0, NAVY),
            ]
        )
    )
    return [
        Spacer(1, 8 * mm),
        badge_table,
        Spacer(1, 12 * mm),
        Paragraph(title, styles["NotebookTitle"]),
        Paragraph(subtitle, styles["NotebookSubtitle"]),
        Table(
            [
                [
                    Paragraph("Agencia", styles["TableHeaderNB"]),
                    Paragraph("Formato", styles["TableHeaderNB"]),
                    Paragraph("Edición", styles["TableHeaderNB"]),
                ],
                [
                    Paragraph("INE.GOB.CL", styles["BodyNB"]),
                    Paragraph("SDMX-CSV", styles["BodyNB"]),
                    Paragraph("Julio de 2026", styles["BodyNB"]),
                ],
            ],
            colWidths=[doc_width() / 3] * 3,
            style=[
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("BACKGROUND", (0, 1), (-1, 1), SOFT),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ],
        ),
        Spacer(1, 10 * mm),
        Paragraph(
            "<b>Cómo leer esta guía.</b> Cada sección combina una celda de "
            "explicación, una celda de código reproducible y una salida esperada. "
            "El diseño simula un notebook técnico sin requerir software adicional.",
            styles["BodyNB"],
        ),
        PageBreak(),
    ]


def doc_width():
    """Retorna el ancho útil del A4 con los márgenes definidos."""
    return A4[0] - 36 * mm


def markdown_cell(number: int, title: str, text: str):
    """Representa una celda Markdown numerada."""
    table = Table(
        [
            [
                Paragraph(f"md [{number}]", styles["PromptNB"]),
                [
                    Paragraph(title, styles["Subsection"]),
                    Paragraph(text, styles["BodyNB"]),
                ],
            ]
        ],
        colWidths=[18 * mm, doc_width() - 18 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (1, 0), (1, 0), colors.white),
                ("LINEBEFORE", (1, 0), (1, 0), 2.5, CYAN),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, 0), 6),
                ("RIGHTPADDING", (0, 0), (0, 0), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (1, 0), (1, 0), 12),
            ]
        )
    )
    return [table, Spacer(1, 5 * mm)]


def code_cell(number: int, code: str, output: str | None = None):
    """Representa una celda de código y, opcionalmente, su salida."""
    code_text = code.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    rows = [
        [
            Paragraph(f"In [{number}]", styles["PromptNB"]),
            Paragraph(code_text.replace("\n", "<br/>"), styles["CodeNB"]),
        ]
    ]
    if output is not None:
        output_text = (
            output.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        )
        rows.append(
            [
                Paragraph(f"Out[{number}]", styles["PromptNB"]),
                Paragraph(output_text.replace("\n", "<br/>"), styles["OutputNB"]),
            ]
        )
    table = Table(rows, colWidths=[18 * mm, doc_width() - 18 * mm])
    style = [
        ("BACKGROUND", (1, 0), (1, 0), CODE_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, -1), 6),
        ("RIGHTPADDING", (0, 0), (0, -1), 6),
        ("LEFTPADDING", (1, 0), (1, -1), 10),
        ("RIGHTPADDING", (1, 0), (1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]
    if output is not None:
        style.extend(
            [
                ("BACKGROUND", (1, 1), (1, 1), OUTPUT_BG),
                ("LINEABOVE", (0, 1), (-1, 1), 0.5, LINE),
            ]
        )
    table.setStyle(TableStyle(style))
    return [KeepTogether(table), Spacer(1, 5 * mm)]


def build_notebook_guide(path: Path, kind: str):
    """Genera la guía de precios o empleo con la misma gramática visual."""
    prices = kind == "prices"
    if prices:
        title = "Guía técnica SDMX de índices de precios"
        subtitle = (
            "Notebook reproducible para consultar, filtrar y descargar los "
            "dataflows del IPC y del IPP."
        )
        badge = "PRECIOS | SDMX 1.0"
        flows = (
            "IPC = 'INE.GOB.CL,DF_IPC,1.0/all'\n"
            "IPP = 'INE.GOB.CL,DF_IPP,1.0/all'"
        )
        endpoint = "/api/sdmx/data/INE.GOB.CL,DF_IPC,1.0/all"
        dimensions = "DATASET, REF_AREA, BREAKDOWN, CATEGORY, INDICATOR, TIME_PERIOD"
        example = (
            "params = {\n"
            "  'breakdown': 'MANUFACTURING_DIVISION',\n"
            "  'indicator': 'INDEX,ANNUAL_CHANGE',\n"
            "  'last_n_periods': 13\n"
            "}"
        )
        example_endpoint = "/api/sdmx/data/INE.GOB.CL,DF_IPP,1.0/all"
        expected = "Frecuencia: M | Área: CL | Base IPC: 2023=100 | Base IPP: 2019=100"
        coverage = (
            "IPC general, divisiones CCIF e índices analíticos. IPP de "
            "Industrias, sin cobre, manufactura, minería, IPDEGA, divisiones "
            "manufactureras e impulsores visibles en el relato."
        )
    else:
        title = "Guía técnica SDMX del mercado laboral"
        subtitle = (
            "Notebook reproducible para Ocupación y Desocupación e "
            "Informalidad Laboral."
        )
        badge = "MERCADO LABORAL | SDMX 2.0"
        flows = "LABOR = 'INE.GOB.CL,DF_ENE_MERCADO_LABORAL,2.0/all'"
        endpoint = "/api/sdmx/data/INE.GOB.CL,DF_ENE_MERCADO_LABORAL,2.0/all"
        dimensions = (
            "DATASET, REF_AREA, SEX, BREAKDOWN, CATEGORY, INDICATOR, TIME_PERIOD"
        )
        example = (
            "params = {\n"
            "  'dataset': 'INFORMALITY',\n"
            "  'breakdown': 'ECONOMIC_ACTIVITY',\n"
            "  'last_n_periods': 13\n"
            "}"
        )
        example_endpoint = endpoint
        expected = "Frecuencia: M3 | Área: CL | Sexo: T, F, M | Calidad: F, A, B"
        coverage = (
            "Indicadores principales, sexo, actividad económica, categoría "
            "ocupacional, grupo de ocupación, presencia efectiva e informalidad."
        )

    story = cover(title, subtitle, badge)
    story += markdown_cell(
        1,
        "Objetivo y alcance",
        f"{coverage} La API conserva los decimales de las fuentes oficiales y "
        "publica una instantánea validada, actualizada mediante el proceso controlado de fuentes.",
    )
    story += code_cell(2, flows, expected)
    story += markdown_cell(
        3,
        "Modelo de información",
        f"Las dimensiones principales son <b>{dimensions}</b>. "
        "OBS_VALUE contiene el valor; UNIT_MEASURE, UNIT_MULT, BASE_PERIOD, "
        "EST_QUALITY y SOURCE describen la observación.",
    )
    story += code_cell(
        4,
        f"GET {endpoint}?format=json",
        '{"agency":"INE.GOB.CL","format":"SDMX-CSV","status":"available"}',
    )
    story.append(PageBreak())
    story += [Paragraph("1. Consulta y descarga", styles["Section"])]
    story += markdown_cell(
        5,
        "Ejemplo 1 · descarga y lectura",
        (
            "Descarga el IPC completo y abre las primeras observaciones con pandas."
            if prices
            else "Descarga indicadores ENE para mujeres y abre las primeras observaciones con pandas."
        ),
    )
    story += code_cell(
        6,
        "import pandas as pd\n"
        f"url = 'https://ene-interactiva.alhen1970.chatgpt.site{endpoint}'\n"
        + (
            "url += '?breakdown=TOTAL&last_n_periods=13'\n"
            if prices
            else "url += '?dataset=ENE&sex=F&breakdown=INDICATOR_MAIN&last_n_periods=13'\n"
        )
        +
        "datos = pd.read_csv(url)\n"
        "datos.head()",
        "STRUCTURE | DATASET | REF_AREA | INDICATOR | TIME_PERIOD | OBS_VALUE",
    )
    story += markdown_cell(
        7,
        (
            "Ejemplo 2 · divisiones manufactureras del IPP"
            if prices
            else "Ejemplo 2 · informalidad por actividad económica"
        ),
        "Combina filtros SDMX y limita la salida a los 13 períodos más recientes. "
        "Los códigos múltiples se separan por coma.",
    )
    story += code_cell(
        8,
        "import io\nimport pandas as pd\nimport requests\n"
        + example + "\n"
        f"respuesta = requests.get('https://ene-interactiva.alhen1970.chatgpt.site{example_endpoint}', params=params)\n"
        "respuesta.raise_for_status()\n"
        "ejemplo = pd.read_csv(io.StringIO(respuesta.text))\n"
        "ejemplo[['CATEGORY', 'INDICATOR', 'TIME_PERIOD', 'OBS_VALUE']].head()",
        "HTTP 200 | SDMX-CSV válido | 13 períodos más recientes",
    )
    story.append(PageBreak())
    story += [Paragraph("2. Estructura y calidad", styles["Section"])]
    story += markdown_cell(
        9,
        "Artefactos formales",
        "El archivo de estructuras reúne ConceptScheme, Codelists, DSD y "
        "Dataflow. La agencia mantenedora es INE.GOB.CL y cada versión queda "
        "identificada explícitamente.",
    )
    story += code_cell(
        10,
        "STRUCTURE = 'dataflow'\n"
        "ACTION = 'I'\n"
        "REF_AREA = 'CL'\n"
        "EST_QUALITY = 'F'",
        "F = estimación fiable cuando la fuente no informa marca a o b",
    )
    story += markdown_cell(
        11,
        "Reglas de validación",
        "Se controlan columnas obligatorias, códigos, formato temporal, valores "
        "numéricos, claves únicas, período base, unidades y cobertura. Una fila "
        "que no cumple las reglas no se incorpora a la salida.",
    )
    story += code_cell(
        12,
        "key = [DATASET, REF_AREA, BREAKDOWN, CATEGORY,\n"
        "       INDICATOR, TIME_PERIOD]\n"
        "assert not data.duplicated(key).any()\n"
        "assert data['TIME_PERIOD'].str.match(r'^\\\\d{4}-\\\\d{2}$').all()",
        "Validación: OK | claves duplicadas: 0",
    )
    story.append(PageBreak())
    story += [Paragraph("3. Actualización automática", styles["Section"])]
    story += markdown_cell(
        13,
        "Flujo de actualización",
        "La página y la API comparten una instantánea pública validada. El proceso "
        "de actualización descarga los archivos oficiales, valida todas las filas "
        "y solo entonces incorpora la nueva versión al despliegue.",
    )
    story += code_cell(
        14,
        "fuente_oficial -> verificación -> parser -> validación\n"
        "                 -> caché pública -> SDMX-CSV / API / página",
        "Resultado: una sola versión coherente para todos los canales",
    )
    story += markdown_cell(
        15,
        "Reproducibilidad",
        "El transformador descargable permite ejecutar el mismo proceso fuera "
        "del sitio. Se recomienda conservar el archivo original, la fecha de "
        "descarga y el informe de validación junto a cada extracción.",
    )
    story += code_cell(
        16,
        "python transformar_precios_sdmx.py IPC entrada.json salida.csv"
        if prices
        else "python transformar_empleo_sdmx.py --output empleo_sdmx.csv",
        "Archivo SDMX-CSV generado correctamente",
    )
    story.append(PageBreak())
    story += [Paragraph("4. Diccionario operativo", styles["Section"])]
    rows = [
        ["Campo", "Uso"],
        ["STRUCTURE_ID", "DSD que gobierna la observación"],
        ["FREQ", "M para mensual; M3 para trimestre móvil"],
        ["BREAKDOWN", "Nivel temático o clasificación"],
        ["CATEGORY", "Código normalizado de categoría"],
        ["INDICATOR", "Medida estadística"],
        ["TIME_PERIOD", "Mes de referencia AAAA-MM"],
        ["OBS_VALUE", "Valor con precisión de origen"],
        ["UNIT_MEASURE", "Índice, porcentaje o personas"],
        ["EST_QUALITY", "F, A o B según regla de calidad"],
    ]
    table = Table(
        [
            [
                Paragraph(a, styles["TableHeaderNB"])
                if row_index == 0
                else Paragraph(f"<b>{a}</b>", styles["BodyNB"]),
                Paragraph(b, styles["TableHeaderNB"])
                if row_index == 0
                else Paragraph(b, styles["BodyNB"]),
            ]
            for row_index, (a, b) in enumerate(rows)
        ],
        colWidths=[48 * mm, doc_width() - 48 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.45, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story += [table, Spacer(1, 8 * mm)]
    story += markdown_cell(
        17,
        "Interpretación final",
        "El dataflow es la referencia estable para integración. Las rutas de "
        "metadatos explican el modelo y la descarga SDMX-CSV entrega las "
        "observaciones listas para reutilización.",
    )
    document(path, title).build(story)


def build_structure_report(path: Path):
    """Genera el informe formal de estructura de precios."""
    story = cover(
        "Informe de estructura SDMX para IPC e IPP",
        "Especificación institucional de conceptos, códigos, dimensiones, "
        "atributos y cobertura de los dataflows de precios.",
        "INFORME DE ESTRUCTURA | 1.0",
    )
    story += [Paragraph("Resumen ejecutivo", styles["Section"])]
    story += [
        Paragraph(
            "Se definieron dos dataflows mensuales mantenidos por INE.GOB.CL: "
            "DF_IPC(1.0) y DF_IPP(1.0). Ambos comparten un modelo dimensional "
            "común, conservan la precisión de las fuentes y se actualizan desde "
            "la misma instantánea validada que alimenta las páginas interactivas.",
            styles["BodyNB"],
        )
    ]
    story += [Paragraph("Identificadores formales", styles["Section"])]
    identifiers = [
        ["Artefacto", "Identificador"],
        ["Dataflow IPC", "INE.GOB.CL:DF_IPC(1.0)"],
        ["DSD IPC", "INE.GOB.CL:DSD_IPC(1.0)"],
        ["Dataflow IPP", "INE.GOB.CL:DF_IPP(1.0)"],
        ["DSD IPP", "INE.GOB.CL:DSD_IPP(1.0)"],
        ["Estructuras", "00_Estructuras_Precios_1.0.xml"],
    ]
    table = Table(
        [
            [
                Paragraph(left, styles["TableHeaderNB"])
                if row_index == 0
                else Paragraph(f"<b>{left}</b>", styles["BodyNB"]),
                Paragraph(right, styles["TableHeaderNB"])
                if row_index == 0
                else Paragraph(right, styles["BodyNB"]),
            ]
            for row_index, (left, right) in enumerate(identifiers)
        ],
        colWidths=[55 * mm, doc_width() - 55 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story += [table, PageBreak()]
    story += [Paragraph("Modelo dimensional", styles["Section"])]
    for number, (name, text) in enumerate(
        [
            ("FREQ", "Frecuencia mensual M."),
            ("DATASET", "Operación estadística IPC o IPP."),
            ("REF_AREA", "Área de referencia CL."),
            ("BREAKDOWN", "Nivel de desagregación estadística."),
            ("CATEGORY", "Código normalizado de la categoría."),
            ("INDICATOR", "Índice, variación, incidencia o ponderación."),
            ("TIME_PERIOD", "Mes de referencia en formato AAAA-MM."),
        ],
        start=1,
    ):
        story += markdown_cell(number, name, text)
    story += [PageBreak(), Paragraph("Cobertura", styles["Section"])]
    story += markdown_cell(
        8,
        "IPC",
        "IPC general, divisiones CCIF e índices analíticos. Incluye índice, "
        "variación mensual, acumulada, anual, incidencia y ponderación cuando "
        "están disponibles. Período base 2023=100.",
    )
    story += markdown_cell(
        9,
        "IPP",
        "IPP Industrias, Industrias sin cobre, manufactura, minería, IPDEGA, "
        "divisiones manufactureras e impulsores. Período base 2019=100.",
    )
    story += [Paragraph("Controles de validación", styles["Section"])]
    story += markdown_cell(
        10,
        "Integridad",
        "Columnas obligatorias, claves únicas, período mensual válido, "
        "observaciones numéricas, período base, unidad, fuente y calidad.",
    )
    story += markdown_cell(
        11,
        "Actualización",
        "El proceso controlado revisa los archivos oficiales, regenera y valida "
        "las observaciones antes de publicar una nueva versión.",
    )
    story += [Paragraph("Conclusión", styles["Section"])]
    story += [
        Paragraph(
            "La estructura permite consumir IPC e IPP con una sintaxis común y "
            "separa claramente las clasificaciones de cada operación. El diseño "
            "es extensible a nuevos niveles sin modificar las claves existentes.",
            styles["BodyNB"],
        )
    ]
    document(path, "Informe de estructura SDMX para IPC e IPP").build(story)


def main():
    """Genera y reemplaza los PDF publicados por el sitio."""
    OUTPUT.mkdir(parents=True, exist_ok=True)
    build_notebook_guide(OUTPUT / "Guia_tecnica_Precios_SDMX_1.0.pdf", "prices")
    build_notebook_guide(OUTPUT / "Guia_tecnica_Empleo_SDMX_2.0.pdf", "labor")
    build_notebook_guide(OUTPUT / "Guia_tecnica_ENE_SDMX.pdf", "labor")
    build_structure_report(OUTPUT / "Informe_estructura_SDMX_Precios_1.0.pdf")


if __name__ == "__main__":
    main()
