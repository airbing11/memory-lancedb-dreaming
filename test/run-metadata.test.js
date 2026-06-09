import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { readDreamingRunMetadata, recordDreamingRun } from "../dist/run-metadata.js";

describe("run metadata", () => {
  it("records and reads lastRunAt", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "dreaming-run-"));
    try {
      const recorded = await recordDreamingRun({
        workspaceDir,
        phase: "all",
        result: {
          lightCount: 3,
          remCount: 2,
          promotedCount: 1,
          narrativeWritten: true,
        },
        nowMs: Date.parse("2026-05-25T03:00:00.000Z"),
      });

      assert.equal(recorded.lastRunAt, "2026-05-25T03:00:00.000Z");
      assert.equal(recorded.lastRunPhase, "all");
      assert.equal(recorded.lastRunResult?.promotedCount, 1);

      const loaded = await readDreamingRunMetadata(workspaceDir);
      assert.equal(loaded.lastRunAt, recorded.lastRunAt);
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
