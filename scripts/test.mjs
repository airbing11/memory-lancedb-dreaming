#!/usr/bin/env node
// Development-only runner; excluded from the published ClawPack.
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { once } from "node:events";

async function runNode(args) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    windowsHide: true,
  });
  const [code, signal] = await once(child, "exit");
  if (signal) {
    throw new Error(`node ${args.join(" ")} terminated by signal ${signal}`);
  }
  return code ?? 1;
}

async function main() {
  const tscPath = join(process.cwd(), "node_modules", "typescript", "bin", "tsc");
  const buildCode = await runNode([tscPath, "-p", join(process.cwd(), "tsconfig.json")]);
  if (buildCode !== 0) process.exit(buildCode);

  // Run node --test on test/ files
  const testDir = join(process.cwd(), "test");
  const testFiles = readdirSync(testDir)
    .filter((name) => name.endsWith(".test.js"))
    .map((name) => join(testDir, name));

  if (testFiles.length === 0) {
    console.log("No test files found.");
    process.exit(0);
  }

  const testCode = await runNode(["--test", ...testFiles]);
  process.exit(testCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
