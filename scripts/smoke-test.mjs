import assert from "node:assert/strict";
import fs from "node:fs";
import { execSync } from "node:child_process";

// 1. Verify GLSL Shaders (Vertex & Fragment)
const vertShader = fs.readFileSync("./public/shaders/velvet_boudoir.vert", "utf8");
const fragShader = fs.readFileSync("./public/shaders/velvet_boudoir.frag", "utf8");
assert.ok(vertShader.includes("varying vec2 vUv;"), "Vertex shader missing vUv varying");
assert.ok(vertShader.includes("void main()"), "Vertex shader missing main()");
assert.ok(fragShader.includes("uniform float uTime;"), "Fragment shader missing uTime uniform");
assert.ok(fragShader.includes("uniform float uIntimacy;"), "Fragment shader missing uIntimacy uniform");
assert.ok(fragShader.includes("gl_FragColor"), "Fragment shader missing gl_FragColor output");

// 2. Verify Shell Launcher Syntax
execSync("bash -n ./scripts/start-local.sh");

// 3. Verify Windows Batch Launcher & Docker Stack
const winCmd = fs.readFileSync("./scripts/start-windows.cmd", "utf8");
assert.ok(winCmd.includes("workers\\local_media_proxy.py"), "Windows launcher missing proxy startup");
const dockerfile = fs.readFileSync("./Dockerfile", "utf8");
assert.ok(dockerfile.includes(".next/standalone"), "Dockerfile must package Next.js standalone build");
const compose = fs.readFileSync("./docker-compose.yml", "utf8");
assert.ok(compose.includes("velvetmotion-web:"), "docker-compose missing web service");
assert.ok(compose.includes("local-media-proxy:"), "docker-compose missing local-media-proxy service");
assert.ok(compose.includes("telegram-bridge:"), "docker-compose missing telegram-bridge service");

// 4. Verify Firestore Lounge Rules, Firebase CLI Config, & PWA Assets
const rules = fs.readFileSync("./firestore.rules", "utf8");
assert.ok(
  rules.includes("match /loungeRooms/{roomId}/messages/{messageId}"),
  "firestore.rules missing loungeRooms collection match",
);
assert.ok(rules.includes("isValidLoungeMessage"), "firestore.rules missing isValidLoungeMessage");
const firebaseJson = JSON.parse(fs.readFileSync("./firebase.json", "utf8"));
assert.ok(Array.isArray(firebaseJson.firestore) && firebaseJson.firestore.length === 2, "firebase.json missing firestore targets");
assert.equal(firebaseJson.auth?.providers?.emailPassword, true, "firebase.json missing emailPassword auth provider");
const appletConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
assert.equal(appletConfig.projectId, "ivory-sunset-mxq1s", "firebase-applet-config.json projectId mismatch");
assert.equal(appletConfig.appId, "1:738750089666:web:8950a5b6c603c03ac32e5b", "firebase-applet-config.json appId mismatch");
const firebaserc = JSON.parse(fs.readFileSync("./.firebaserc", "utf8"));
assert.equal(firebaserc.projects?.default, "ivory-sunset-mxq1s", ".firebaserc project mismatch");
assert.ok(fs.existsSync("./public/icon-192.png"), "Missing public/icon-192.png");
assert.ok(fs.existsSync("./public/icon-512.png"), "Missing public/icon-512.png");

// 5. Verify HTTP Security Headers in next.config.ts & scan for corrupted stub files
const nextConfigText = fs.readFileSync("./next.config.ts", "utf8");
assert.ok(nextConfigText.includes("X-Content-Type-Options"), "next.config.ts missing X-Content-Type-Options header");
assert.ok(nextConfigText.includes("Strict-Transport-Security"), "next.config.ts missing HSTS header");
assert.ok(nextConfigText.includes("Cross-Origin-Opener-Policy"), "next.config.ts missing COOP header");

for (const dir of ["./app", "./components", "./lib"]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(`${dir}/${entry.name}`, "utf8").trim();
      assert.ok(
        !/^(see_file_local|see local|see \/tmp\/|PLACEHOLDER)/i.test(content) && !content.includes("WILL REPLACE"),
        `Corrupted placeholder file detected: ${dir}/${entry.name}`,
      );
    }
  }
}

console.log("ok: multi-language smoke check passed (GLSL, Bash, Batch, Docker, Firestore Lounge, PWA)");
