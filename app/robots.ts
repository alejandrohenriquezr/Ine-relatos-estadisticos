import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Impide el rastreo de cualquier ruta a todos los motores de búsqueda.
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
