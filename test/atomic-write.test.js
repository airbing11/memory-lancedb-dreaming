import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { atomicWriteTextFile } from "../dist/utils.js";

const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  );
});

describe("atomicWriteTextFile", () => {
  it("creates parent directories and replaces existing content", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "dreaming-atomic-"));
    tempDirs.push(root);
    const target = path.join(root, "nested", "report.md");

    await atomicWriteTextFile(target, "first\n");
    await atomicWriteTextFile(target, "second\n");

    assert.equal(await fs.readFile(target, "utf-8"), "second\n");
    assert.deepEqual(await fs.readdir(path.dirname(target)), ["report.md"]);
  });
});
