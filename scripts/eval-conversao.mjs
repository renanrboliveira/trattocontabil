#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  "npx",
  ["tsx", path.join(root, "..", "web", "scripts", "eval-conversao-cli.ts")],
  {
    stdio: "inherit",
    cwd: path.join(root, "..", "web"),
    env: process.env,
  }
);

process.exit(result.status ?? 1);
