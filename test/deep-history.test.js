import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  appendDeepHistoryRun,
  countConsecutiveIdleDays,
  readDeepHistory,
} from "../dist/deep-history.js";

describe("deep history", () => {
  it("records per-day promoted counts and trims order", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "dreaming-deep-history-"));
    await appendDeepHistoryRun({ workspaceDir, day: "2026-06-20", promoted: 0 });
    await appendDeepHistoryRun({ workspaceDir, day: "2026-06-21", promoted: 1 });
    await appendDeepHistoryRun({ workspaceDir, day: "2026-06-20", promoted: 2 });

    const history = await readDeepHistory(workspaceDir);
    assert.equal(history.runs.length, 2);
    assert.equal(history.runs[0].day, "2026-06-20");
    assert.equal(history.runs[0].promoted, 2);
  });

  it("counts consecutive idle days excluding today", () => {
    const history = {
      version: 1,
      runs: [
        { day: "2026-06-18", promoted: 1 },
        { day: "2026-06-19", promoted: 0 },
        { day: "2026-06-20", promoted: 0 },
        { day: "2026-06-21", promoted: 0 },
        { day: "2026-06-22", promoted: 0 },
      ],
    };
    const idle = countConsecutiveIdleDays({ history, excludeDay: "2026-06-22" });
    assert.equal(idle, 3);
  });

  it("breaks the streak on a promotion day", () => {
    const history = {
      version: 1,
      runs: [
        { day: "2026-06-20", promoted: 0 },
        { day: "2026-06-21", promoted: 2 },
        { day: "2026-06-22", promoted: 0 },
      ],
    };
    const idle = countConsecutiveIdleDays({ history });
    assert.equal(idle, 1);
  });
});
