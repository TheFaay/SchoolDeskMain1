import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const nodeOptions = [process.env.NODE_OPTIONS, "--conditions=react-server"]
  .filter(Boolean)
  .join(" ");
const result = spawnSync(
  process.execPath,
  [resolve("node_modules/tsx/dist/cli.mjs"), "--test", ...process.argv.slice(2)],
  { stdio: "inherit", env: { ...process.env, NODE_OPTIONS: nodeOptions } },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
