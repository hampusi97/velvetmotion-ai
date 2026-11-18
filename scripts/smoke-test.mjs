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

// 4. Verify Firestore Lounge Rules & PWA Assets
const rules = fs.readFileSync("./firestore.rules", "utf8");
assert.ok(
  rules.includes("match /loungeRooms/{roomId}/messages/{messageId}"),
  "firestore.rules missing loungeRooms collection match",
);
assert.ok(rules.includes("isValidLoungeMessage"), "firestore.rules missing isValidLoungeMessage");
assert.ok(fs.existsSync("./public/icon-192.png"), "Missing public/icon-192.png");
assert.ok(fs.existsSync("./public/icon-512.png"), "Missing public/icon-512.png");

console.log("ok: multi-language smoke check passed (GLSL, Bash, Batch, Docker, Firestore Lounge, PWA)");
