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
const port = Number(process.env.PORT || process.argv[2] || 8080);
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
  ".mp4": "video/mp4",
  ".wasm": "application/wasm",
};

function resolveFile(cleanUrl) {
  const safeRel = path.normalize(cleanUrl).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  const candidates = [
    path.join(outDir, safeRel),
    path.join(outDir, safeRel, "index.html"),
    path.join(outDir, `${safeRel}.html`),
  ];
  for (const file of candidates) {
    if (!file.startsWith(outDir + path.sep)) continue;
    try {
      const stat = fs.statSync(file);
      if (stat.isFile()) return { file, status: 200, size: stat.size };
    } catch {
      /* continue */
    }
  }
  const notFound = path.join(outDir, "404.html");
  return fs.existsSync(notFound) ? { file: notFound, status: 404 } : null;
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Invalid URL path");
    return;
  }
  const target = resolveFile(pathname);
  if (!target) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const ext = path.extname(target.file).toLowerCase();
  const isBuildMeta = target.file.endsWith("build-meta.json");
  res.writeHead(target.status, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    ...(target.size === undefined ? {} : { "Content-Length": target.size }),
    ...(isBuildMeta ? { "Cache-Control": "no-store" } : {}),
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(target.file).on("error", () => res.destroy()).pipe(res);
});

server.listen(port, host, () => {
  console.log(`[serve-static] Serving out/ on http://${host}:${port} (Cloud Shell Web Preview port ${port})`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
