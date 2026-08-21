/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  GMAIL_SENDER_EMAIL?: string;
  SITE_PUBLIC_URL?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function withSecurityHeaders(response: Response, request: Request): Response {
  // Estos encabezados se aplican a HTML y API sin interferir con los recursos de Vinext.
  const protectedResponse = new Response(response.body, response);
  protectedResponse.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet, noimageindex",
  );
  protectedResponse.headers.set("X-Content-Type-Options", "nosniff");
  protectedResponse.headers.set("X-Frame-Options", "DENY");
  protectedResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  protectedResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  protectedResponse.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (new URL(request.url).protocol === "https:") {
    protectedResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
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
    (globalThis as typeof globalThis & { __SITES_BUCKET?: R2Bucket }).__SITES_BUCKET = env.BUCKET;
    (globalThis as typeof globalThis & { __SITES_ASSETS?: Fetcher }).__SITES_ASSETS = env.ASSETS;
    (globalThis as typeof globalThis & { __SITES_EMAIL_ENV?: Record<string, string | undefined> }).__SITES_EMAIL_ENV = {
      GMAIL_CLIENT_ID: env.GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET: env.GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN: env.GMAIL_REFRESH_TOKEN,
      GMAIL_SENDER_EMAIL: env.GMAIL_SENDER_EMAIL,
      SITE_PUBLIC_URL: env.SITE_PUBLIC_URL,
    };
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
      return withSecurityHeaders(response, request);
    }

    const response = await handler.fetch(request, env, ctx);
    return withSecurityHeaders(response, request);
  },
};

export default worker;
