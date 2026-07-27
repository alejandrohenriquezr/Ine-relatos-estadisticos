/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function withNoIndexHeaders(response: Response): Response {
  // El encabezado protege también recursos no HTML y rutas que no procesan metadatos.
  const protectedResponse = new Response(response.body, response);
  protectedResponse.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet, noimageindex",
  );
  return protectedResponse;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // La vinculación es estable durante la vida del isolate y queda accesible
    // para las rutas sin importar módulos exclusivos de Workers en el build.
    (globalThis as typeof globalThis & { __SITES_DB?: D1Database }).__SITES_DB = env.DB;
    const url = new URL(request.url);

    // Normaliza barras duplicadas para que enlaces copiados como "//api/..."
    // lleguen a la misma ruta que su versión canónica.
    const normalizedPath = url.pathname.replace(/\/{2,}/g, "/");
    if (normalizedPath !== url.pathname) {
      url.pathname = normalizedPath;
      request = new Request(url, request);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withNoIndexHeaders(response);
    }

    const response = await handler.fetch(request, env, ctx);
    return withNoIndexHeaders(response);
  },
};

export default worker;
