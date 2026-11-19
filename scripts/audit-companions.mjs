#!/usr/bin/env node
/**
 * scripts/audit-companions.mjs
 * Verifies:
 *  (a) zero duplicate avatar / portraitUrl paths across all companions
 *  (b) every referenced image in data/companions.ts, lib/characters.ts,
 *      public/data/community-featured.json, public/data/daily-drops.json,
 *      and public/promos/ exists inside public/ AND is a real image >= 1024 bytes
 *  (c) every companion has valid id, name, age >= 18, voiceId, and visualDna
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const MIN_IMAGE_BYTES = 1024;

function fail(msg) {
  console.error(`❌ [audit-companions] ${msg}`);
  process.exitCode = 1;
}

function verifyPublicImage(label, assetPath) {
  if (!assetPath || typeof assetPath !== "string" || !assetPath.startsWith("/")) {
    fail(`${label}: invalid public asset path "${assetPath}"`);
    return;
  }
  const diskPath = path.join(PUBLIC_DIR, assetPath.slice(1));
  if (!fs.existsSync(diskPath)) {
    fail(`${label}: missing file in public/ -> ${assetPath}`);
    return;
  }
  const stat = fs.statSync(diskPath);
  if (!stat.isFile() || stat.size < MIN_IMAGE_BYTES) {
    fail(`${label}: corrupt or stub image in public/ (${stat.size} bytes < ${MIN_IMAGE_BYTES}) -> ${assetPath}`);
  }
}

function loadCompanionsViaTsx() {
  const inline = `
    import { FLAGSHIP_COMPANIONS } from "./data/companions";
    import { CHARACTERS } from "./lib/characters";
    import { staticPortraitUrl } from "./lib/portraitFallback";
    console.log(JSON.stringify({
      flagship: FLAGSHIP_COMPANIONS.map((c) => ({
        id: c.id, name: c.name, age: c.age, voiceId: c.voiceId, visualDna: c.visualDna, portraitUrl: c.portraitUrl,
      })),
      characters: CHARACTERS.map((c) => ({
        id: c.id, name: c.name, age: c.age, voiceId: c.voiceId, visualDna: c.visualDna, avatar: c.avatar,
      })),
      byId: Object.fromEntries(FLAGSHIP_COMPANIONS.concat(CHARACTERS.map((c) => ({ id: c.id }))).map((x) => [x.id, staticPortraitUrl(x.id)])),
    }));
  `;
  const tsxCli = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const out = execFileSync(process.execPath, [tsxCli, "-e", inline], { cwd: ROOT, encoding: "utf8" });
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

    verifyPublicImage(`${label}/${item.id}`, assetPath);

    if (seenPaths.has(assetPath)) {
      fail(`${label}: duplicate portrait path "${assetPath}" shared by "${seenPaths.get(assetPath)}" and "${item.id}"`);
    } else {
      seenPaths.set(assetPath, item.id);
    }
  }
}

function auditJsonFeeds(byId) {
  let validated = 0;

  const spotlightPath = path.join(PUBLIC_DIR, "data", "community-featured.json");
  if (!fs.existsSync(spotlightPath)) {
    fail("Missing public/data/community-featured.json");
  } else {
    const spotlight = JSON.parse(fs.readFileSync(spotlightPath, "utf8"));
    for (const item of spotlight) {
      verifyPublicImage(`community-featured/${item.id}`, item.portraitUrl);
      validated += 1;
    }
  }

  const dailyPath = path.join(PUBLIC_DIR, "data", "daily-drops.json");
  if (!fs.existsSync(dailyPath)) {
    fail("Missing public/data/daily-drops.json");
  } else {
    const drops = JSON.parse(fs.readFileSync(dailyPath, "utf8"));
    for (const drop of drops) {
      const resolved = byId[drop.companionId];
      if (!resolved) {
        fail(`daily-drops/day-${drop.day}: unknown companionId "${drop.companionId}"`);
      } else {
        verifyPublicImage(`daily-drops/day-${drop.day}`, resolved);
        validated += 1;
      }
    }
  }

  for (const promo of ["/promos/hero-banner.webp", "/promos/shorts-card.webp", "/promos/private-card.webp"]) {
    verifyPublicImage("promo-asset", promo);
    validated += 1;
  }

  return validated;
}

try {
  const { flagship, characters, byId } = loadCompanionsViaTsx();
  auditGroup("FLAGSHIP_COMPANIONS", flagship, "portraitUrl");
  auditGroup("CHARACTERS", characters, "avatar");
  const jsonCount = auditJsonFeeds(byId);
  if (!process.exitCode) {
    console.log(
      `✅ [audit-companions] Passed: ${flagship.length} flagship + ${characters.length} roster companions + ${jsonCount} feed/promo visuals, zero duplicate portraits, zero missing/stub assets.`,
    );
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
