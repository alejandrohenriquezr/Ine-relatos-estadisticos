import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;
const robotsMeta =
  /<meta(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*noindex[^"']*nofollow[^"']*["'])[^>]*>/i;

test("Informalidad incorpora el menú secundario de recursos", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const page = source.slice(
    source.indexOf("function InformalityPage("),
    source.indexOf("function ", source.indexOf("function InformalityPage(") + 1),
  );
  assert.match(page, /<ResourceTabs current="informality"\s*\/>/);
});

test("IPC incorpora el menú secundario de recursos", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const start = source.indexOf("function IpcPage(");
  const page = source.slice(start, source.indexOf("function ", start + 1));
  assert.match(page, /<ResourceTabs current="ipc"\s*\/>/);
});

test("IPP incorpora el menú secundario de recursos", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const start = source.indexOf("function IppPage(");
  const page = source.slice(start, source.indexOf("function ", start + 1));
  assert.match(page, /<ResourceTabs current="ipp"\s*\/>/);
});

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(
    response.headers.get("x-robots-tag") ?? "",
    /\bnoindex\b.*\bnofollow\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, robotsMeta);
});

test("blocks crawler access through robots.txt", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("robots-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/robots.txt"),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(await response.text(), /User-Agent:\s*\*\s*Disallow:\s*\//i);
});
