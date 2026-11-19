#!/usr/bin/env node
/**
 * scripts/audit-companions.mjs
 * Verifies:
 *  (a) zero duplicate avatar / portraitUrl paths across all companions
 *  (b) every referenced local portrait/companion file exists in public/
 *  (c) every companion has valid id, name, age >= 18, voiceId, and visualDna
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");

function fail(msg) {
  console.error(`❌ [audit-companions] ${msg}`);
  process.exitCode = 1;
}

function loadCompanionsViaTsx() {
  const inline = `
    import { FLAGSHIP_COMPANIONS } from "./data/companions";
    import { CHARACTERS } from "./lib/characters";
    console.log(JSON.stringify({
      flagship: FLAGSHIP_COMPANIONS.map((c) => ({
        id: c.id, name: c.name, age: c.age, voiceId: c.voiceId, visualDna: c.visualDna, portraitUrl: c.portraitUrl,
      })),
      characters: CHARACTERS.map((c) => ({
        id: c.id, name: c.name, age: c.age, voiceId: c.voiceId, visualDna: c.visualDna, avatar: c.avatar,
      })),
    }));
  `;
  const tsxBin = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
  const out = execFileSync(tsxBin, ["-e", inline], { cwd: ROOT, encoding: "utf8" });
  return JSON.parse(out);
}

function auditGroup(label, list, pathField) {
  const seenPaths = new Map();
  const seenIds = new Set();

  for (const item of list) {
    if (!item.id || typeof item.id !== "string") fail(`${label}: companion missing valid id`);
    if (seenIds.has(item.id)) fail(`${label}: duplicate companion id "${item.id}"`);
    seenIds.add(item.id);

    if (!item.name || typeof item.name !== "string") fail(`${label}/${item.id}: missing name`);
    if (typeof item.age !== "number" || item.age < 18) fail(`${label}/${item.id}: invalid age (${item.age})`);
    if (!item.voiceId || typeof item.voiceId !== "string") fail(`${label}/${item.id}: missing voiceId`);
    if (!item.visualDna || typeof item.visualDna !== "string") fail(`${label}/${item.id}: missing visualDna`);

    const assetPath = item[pathField];
    if (!assetPath || typeof assetPath !== "string") {
      fail(`${label}/${item.id}: missing ${pathField}`);
      continue;
    }

    if (assetPath.startsWith("/")) {
      const diskPath = path.join(PUBLIC_DIR, assetPath.slice(1));
      if (!fs.existsSync(diskPath)) {
        fail(`${label}/${item.id}: missing file in public/ -> ${assetPath}`);
      }
    }

    if (seenPaths.has(assetPath)) {
      fail(`${label}: duplicate portrait path "${assetPath}" shared by "${seenPaths.get(assetPath)}" and "${item.id}"`);
    } else {
      seenPaths.set(assetPath, item.id);
    }
  }
}

try {
  const { flagship, characters } = loadCompanionsViaTsx();
  auditGroup("FLAGSHIP_COMPANIONS", flagship, "portraitUrl");
  auditGroup("CHARACTERS", characters, "avatar");
  if (!process.exitCode) {
    console.log(
      `✅ [audit-companions] Passed: ${flagship.length} flagship + ${characters.length} roster companions, zero duplicate portraits, zero missing public/ assets.`,
    );
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
