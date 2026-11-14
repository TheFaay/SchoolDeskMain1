import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const temporaryDirectory = resolve(".tmp", "vitest");
mkdirSync(temporaryDirectory, { recursive: true });

const result = spawnSync(
  process.execPath,
  [resolve("node_modules/vitest/vitest.mjs"), "run"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      TEMP: temporaryDirectory,
      TMP: temporaryDirectory,
      TMPDIR: temporaryDirectory,
    },
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
