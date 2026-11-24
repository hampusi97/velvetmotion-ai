import { readFileSync, writeFileSync } from "node:fs";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const pkg = read("package.json");
const [major, minor, patch] = pkg.version.split(".").map(Number);
const next = `${major}.${minor}.${patch + 1}`;
pkg.version = next;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
console.log(next);
