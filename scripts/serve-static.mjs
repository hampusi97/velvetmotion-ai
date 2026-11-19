#!/usr/bin/env node
/**
 * Zero-dependency static export server for Google Cloud Shell, Codespaces, IDX, and SSH previews.
 * Usage: PORT=8080 node scripts/serve-static.mjs
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "out");
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";

if (!fs.existsSync(outDir)) {
  console.error(`[serve-static] Missing ${outDir}. Run "NODE_ENV=production npm run build" first.`);
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webm": "video/webm",
  ".wasm": "application/wasm",
};

function resolveFile(reqPath) {
  const cleanUrl = decodeURIComponent((reqPath || "/").split("?")[0]);
  const safeRel = path.normalize(cleanUrl).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  const candidates = [
    path.join(outDir, safeRel),
    path.join(outDir, safeRel, "index.html"),
    path.join(outDir, `${safeRel}.html`),
  ];
  for (const file of candidates) {
    if (!file.startsWith(outDir)) continue;
    try {
      const stat = fs.statSync(file);
      if (stat.isFile()) return file;
    } catch {
      /* continue */
    }
  }
  const notFound = path.join(outDir, "404.html");
  return fs.existsSync(notFound) ? notFound : null;
}

const server = http.createServer((req, res) => {
  const target = resolveFile(req.url || "/");
  if (!target) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const ext = path.extname(target).toLowerCase();
  const isNotFoundPage = target.endsWith("404.html") && !(req.url || "").includes("404");
  const isBuildMeta = target.endsWith("build-meta.json");
  res.writeHead(isNotFoundPage ? 404 : 200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    ...(isBuildMeta ? { "Cache-Control": "no-store" } : {}),
  });
  fs.createReadStream(target).pipe(res);
});

server.listen(port, host, () => {
  console.log(`[serve-static] Serving out/ on http://${host}:${port} (Cloud Shell Web Preview port ${port})`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
