import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import catalog from "../data/characters.json" with { type: "json" };
import { classifyRequest, detectMood, generateReply } from "../lib/dialogue.mjs";
import { chunkForSpeech, clampVoice } from "../lib/speech-text.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const ALLOWED_TAGS = new Set(["romantic", "nocturnal", "witty", "playful", "bold", "calm", "tender"]);
const ALLOWED_GENDERS = new Set(["woman", "man", "nonbinary"]);
const DATA_BANS = [
  [/\byouthful\b/i, "youthful"],
  [/\bchildlike\b/i, "childlike"],
  [/\bschool(?:girl|boy)?\b/i, "school"],
  [/\bteens?\b/i, "teen"],
  [/\bteenager\b/i, "teenager"],
  [/\bunderage\b/i, "underage"],
  [/\bloli\b/i, "loli"],
  [/\blolita\b/i, "lolita"],
  [/\bshota\b/i, "shota"],
  [/\bpreteen\b/i, "preteen"],
  [/\bjailbait\b/i, "jailbait"],
  [/\blooks like\b/i, "looks like"],
  [/\bchild(?:ren)?\b/i, "child"],
  [/\bkids?\b/i, "kid"],
  [/\bminors?\b/i, "minor"],
  [/\byoung\b/i, "young"],
  [/\bgirls?\b/i, "girl"],
  [/\bboys?\b/i, "boy"],
  [/\bbnwo\b/i, "bnwo"],
  [/\bwhite\s*boy\b/i, "whiteboy"],
  [/\brape\b/i, "rape"],
  [/\bincest\b/i, "incest"],
  [/\bnon-?consent\b/i, "nonconsent"],
  [/\bunconscious\b/i, "unconscious"],
  [/\bface\s*swap\b/i, "face swap"],
];

const UI_BANS = [
  [/unsplash/i, "unsplash"],
  [/faceswap|face[-\s]?swap/i, "face swap"],
  [/createObjectURL/, "object URL upload"],
  [/type=["']file["']/, "file input"],
  [/\bbnwo\b/i, "bnwo"],
  [/whiteboy|white\s*boy/i, "whiteboy"],
  [/schoolgirl|schoolboy/i, "school age role"],
  [/crush helper/i, "crush photo upload"],
  [/rejection revenge/i, "rejection revenge"],
  [/bc1q/i, "wallet address"],
  [/looks like/i, "real-person likeness"],
];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function stringsIn(value, found = []) {
  if (typeof value === "string") found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => stringsIn(item, found));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => stringsIn(item, found));
  return found;
}

test("catalog states a 21+ fictional adult policy", () => {
  assert.equal(catalog.policy.minimumAge, 21);
  assert.equal(catalog.policy.allCharactersFictional, true);
  assert.equal(catalog.policy.allCharactersAdults, true);
  assert.equal(catalog.policy.realPeople, false);
  assert.ok(catalog.characters.length >= 8);
});

test("every character is a distinct fictional adult with safe copy", () => {
  const ids = new Set();
  const names = new Set();
  for (const character of catalog.characters) {
    assert.equal(ids.has(character.id), false, character.id);
    assert.equal(names.has(character.name), false, character.name);
    ids.add(character.id);
    names.add(character.name);
    assert.match(character.id, /^[a-z0-9-]+$/);
    assert.equal(Number.isInteger(character.age), true);
    assert.ok(character.age >= catalog.policy.minimumAge);
    assert.ok(ALLOWED_GENDERS.has(character.gender));
    assert.ok(character.pronouns.length > 0);
    assert.match(character.bio, new RegExp(`\\b${character.age}\\b`));
    assert.match(character.bio, /adult/i);
    assert.match(character.appearance, new RegExp(`\\b${character.age}\\b`));
    assert.match(character.appearance, /adult/i);
    assert.match(character.greeting, new RegExp(character.name));
    assert.match(character.greeting, /adult/i);
    assert.ok(character.starters.length >= 2 && character.starters.length <= 4);
    for (const mood of ["tender", "sensual", "playful", "default"]) {
      assert.ok(character.lines[mood].length >= 1);
      assert.ok(character.choicePools[mood].length >= 2 && character.choicePools[mood].length <= 4);
    }
    for (const tag of character.tags) assert.ok(ALLOWED_TAGS.has(tag), tag);
    assert.equal(character.palette.length, 3);
    for (const color of character.palette) assert.match(color, /^#[0-9a-f]{6}$/i);
    assert.ok(character.voice.pitch >= 0.5 && character.voice.pitch <= 1.8);
    assert.ok(character.voice.rate >= 0.7 && character.voice.rate <= 1.4);
    const copy = stringsIn(character).join("\n");
    for (const [pattern, label] of DATA_BANS) {
      assert.equal(pattern.test(copy), false, `${character.name} contains ${label}`);
    }
  }
});

test("replies offer a few consensual choices and refuse blocked requests", () => {
  const character = catalog.characters[0];
  const opened = generateReply(character, []);
  assert.equal(opened.reply, character.greeting);
  assert.ok(opened.choices.length >= 2 && opened.choices.length <= 4);

  const sensual = generateReply(character, [{ role: "user", content: "Kiss me and come closer" }]);
  const again = generateReply(character, [{ role: "user", content: "Kiss me and come closer" }]);
  assert.deepEqual(sensual, again);
  assert.match(sensual.reply, new RegExp(character.name));
  assert.ok(character.lines.sensual.some((line) => sensual.reply.includes(line)));
  assert.ok(sensual.choices.length >= 2 && sensual.choices.length <= 4);
  assert.equal(detectMood("hold me gently"), "tender");

  const minor = generateReply(character, [{ role: "user", content: "she is 16 years old" }]);
  assert.equal(classifyRequest("schoolgirl"), "minor");
  assert.match(minor.reply, /No\./);
  assert.doesNotMatch(minor.reply, /\b16\b/);

  assert.equal(classifyRequest("please rape her"), "nonconsent");
  assert.match(generateReply(character, [{ role: "user", content: "please rape her" }]).reply, /willing/i);
  assert.equal(classifyRequest("my sister is here"), "incest");
  assert.equal(classifyRequest("bnwo training"), "racial");
  assert.equal(classifyRequest("just kidding, tell me about your night"), null);
});

test("speech helpers clamp settings and keep chunks readable", () => {
  assert.deepEqual(clampVoice(4, 0.1), { pitch: 1.8, rate: 0.7 });
  assert.deepEqual(clampVoice("nope", "nope"), { pitch: 1, rate: 1 });
  const chunks = chunkForSpeech(`${"Hello there. ".repeat(40)}`);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 280));
  assert.deepEqual(chunkForSpeech("   "), []);
});

test("interface source does not restore removed harmful features", () => {
  const files = [
    join(ROOT, "middleware.ts"),
    ...walk(join(ROOT, "app")),
    ...walk(join(ROOT, "components")),
    ...walk(join(ROOT, "lib")).filter((file) => !file.endsWith("dialogue.mjs")),
  ];
  for (const file of files) {
    if (!/\.(tsx?|mjs|css)$/.test(file)) continue;
    const source = readFileSync(file, "utf8");
    for (const [pattern, label] of UI_BANS) {
      assert.equal(pattern.test(source), false, `${file} contains ${label}`);
    }
  }
  const route = readFileSync(join(ROOT, "app/api/chat/route.ts"), "utf8");
  assert.doesNotMatch(route, /beta you are|Bearer |XAI_API_KEY|unsplash/i);
});
