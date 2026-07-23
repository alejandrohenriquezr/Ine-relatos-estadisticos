#!/usr/bin/env python3
"""Genera paths SVG simplificados para el mapa coroplético regional."""

import json
import math
import sys
from pathlib import Path


REGION_NAMES = {
    15: "ARICA Y PARINACOTA",
    1: "TARAPACÁ",
    2: "ANTOFAGASTA",
    3: "ATACAMA",
    4: "COQUIMBO",
    5: "VALPARAÍSO",
    13: "METROPOLITANA",
    6: "O'HIGGINS",
    7: "MAULE",
    16: "ÑUBLE",
    8: "BIOBÍO",
    9: "LA ARAUCANÍA",
    14: "LOS RÍOS",
    10: "LOS LAGOS",
    11: "AYSÉN",
    12: "MAGALLANES",
}


def distance(point, start, end):
    if start == end:
        return math.dist(point, start)
    x, y = point
    x1, y1 = start
    x2, y2 = end
    numerator = abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1)
    return numerator / math.hypot(y2 - y1, x2 - x1)


def simplify(points, tolerance=0.018):
    if len(points) <= 3:
        return points
    maximum, index = 0, 0
    for i in range(1, len(points) - 1):
        value = distance(points[i], points[0], points[-1])
        if value > maximum:
            maximum, index = value, i
    if maximum <= tolerance:
        return [points[0], points[-1]]
    left = simplify(points[: index + 1], tolerance)
    right = simplify(points[index:], tolerance)
    return left[:-1] + right


def project(point):
    lon, lat = point
    return ((lon + 76.2) * 32 + 18, (-lat - 17.2) * 20.2 + 16)


def main():
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/chile-regiones.json")
    output = Path(sys.argv[2] if len(sys.argv) > 2 else "public/chile-regions-map.json")
    geo = json.loads(source.read_text(encoding="utf-8"))
    result = []
    for feature in geo["features"]:
        code = int(feature["properties"]["codregion"])
        geometry = feature["geometry"]
        polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        paths = []
        for polygon in polygons:
            outer = polygon[0]
            center_lon = sum(point[0] for point in outer) / len(outer)
            center_lat = sum(point[1] for point in outer) / len(outer)
            # La vista principal conserva Chile continental y Patagonia; las islas
            # oceánicas y el territorio antártico se excluyen para evitar distorsión.
            if center_lon < -77 or center_lat < -60:
                continue
            for ring in polygon:
                clean = [point for point in ring if point[0] > -77 and point[1] > -60]
                if len(clean) < 3:
                    continue
                reduced = simplify(clean)
                coordinates = [project(point) for point in reduced]
                paths.append(
                    "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in coordinates) + "Z"
                )
        result.append({"code": code, "region": REGION_NAMES[code], "path": "".join(paths)})
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"regions": len(result), "bytes": output.stat().st_size}))


if __name__ == "__main__":
    main()
