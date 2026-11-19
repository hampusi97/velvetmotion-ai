#!/usr/bin/env node
/**
 * Cross-platform Next.js dev launcher respecting PORT (default 3000) and binding 0.0.0.0
 * for Google Cloud Shell, GitHub Codespaces, Firebase Studio/IDX, and Docker.
 */
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const port = String(process.env.PORT || "3000");
const host = String(process.env.HOST || "0.0.0.0");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "dev", "-p", port, "-H", host], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
