import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectLastingTruths, pickClusterSpotlightMemories } from "../dist/rem-diversity.js";
import {
  appendRemHistoryRun,
  collectRecentRemMemoryIds,
  readRemHistory,
} from "../dist/rem-history.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const STALE_TRUTHS = [
  "33f42266-3795-4bf8-aaa3-925ac88ac784",
  "f868767d-56fc-49f6-8e34-64f6a597d721",
  "5fa1bbed-da9d-41f9-819d-86ec8ad2dcd9",
];

function memory(id, importance, text = id) {
  return { id, importance, text, category: "fact" };
}

describe("REM diversity", () => {
  it("skips recently surfaced lasting truths by memoryId", () => {
    const entries = [
      memory(STALE_TRUTHS[0], 0.95, "飞书语音消息用「小艺」音色"),
      memory(STALE_TRUTHS[1], 0.95, "育儿群用途定位"),
      memory(STALE_TRUTHS[2], 0.95, "飞书语音能力限制"),
      memory("fresh-1", 0.94, "新的发现 A"),
      memory("fresh-2", 0.93, "新的发现 B"),
      memory("fresh-3", 0.92, "新的发现 C"),
    ];
    const result = selectLastingTruths({
      entries,
      limit: 3,
      recentMemoryIds: new Set(STALE_TRUTHS),
    });
    assert.equal(result.selected.length, 3);
    assert.deepEqual(
      result.selected.map((entry) => entry.id),
      ["fresh-1", "fresh-2", "fresh-3"]
    );
    assert.equal(result.skippedRecent, 3);
  });

  it("skips truths whose TEXT repeats a recent truth (CJK-aware)", () => {
    const entries = [
      memory("old-voice", 0.97, "音色选择：甜心小玲 vs 晓晓 vs 小艺的讨论"),
      memory("fresh-a", 0.96, "今天接入了新的支付回调流程"),
      memory("fresh-b", 0.95, "修复了定时任务的时区偏移"),
      memory("fresh-c", 0.94, "梳理了爱兔合资的股权结构"),
    ];
    const result = selectLastingTruths({
      entries,
      limit: 3,
      recentMemoryIds: new Set(),
      recentTruthTexts: ["音色选择史：甜心小玲、晓晓、小艺之间反复比较"],
      truthSimilarityThreshold: 0.42,
    });
    assert.equal(result.skippedSimilar >= 1, true);
    // Enough fresh candidates exist, so the similar one is not re-added by fallback.
    assert.equal(
      result.selected.some((entry) => entry.id === "old-voice"),
      false
    );
  });

  it("excludes promoted memories when excludePromoted is set", () => {
    const entries = [
      memory("promoted-1", 0.99, "已写入 MEMORY.md 的铁律"),
      memory("fresh-1", 0.9, "新的观察 A"),
      memory("fresh-2", 0.89, "新的观察 B"),
    ];
    const result = selectLastingTruths({
      entries,
      limit: 3,
      recentMemoryIds: new Set(),
      promotedMemoryIds: new Set(["promoted-1"]),
      excludePromoted: true,
    });
    assert.equal(result.skippedPromoted, 1);
    assert.equal(
      result.selected.some((entry) => entry.id === "promoted-1"),
      false
    );
  });

  it("rotates cluster spotlight memories by day", () => {
    const memories = Array.from({ length: 12 }, (_, index) =>
      memory(`m-${index}`, 0.9 - index * 0.01, `memory ${index}`)
    );
    const dayA = pickClusterSpotlightMemories({
      memories,
      recentSpotlightIds: new Set(["m-0"]),
      day: "2026-06-10",
      count: 3,
    });
    const dayB = pickClusterSpotlightMemories({
      memories,
      recentSpotlightIds: new Set(["m-0"]),
      day: "2026-06-11",
      count: 3,
    });
    assert.notDeepEqual(
      dayA.map((entry) => entry.id),
      dayB.map((entry) => entry.id)
    );
    assert.equal(dayA.some((entry) => entry.id === "m-0"), false);
  });
});

describe("REM history", () => {
  it("records and applies cooldown windows", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "dreaming-rem-history-"));
    await appendRemHistoryRun({
      workspaceDir,
      day: "2026-06-09",
      lastingTruthIds: [STALE_TRUTHS[0]],
      clusterSpotlightIds: ["spot-1"],
    });
    const history = await readRemHistory(workspaceDir);
    assert.equal(history.runs.length, 1);

    const recent = collectRecentRemMemoryIds({
      history,
      nowMs: Date.parse("2026-06-13T03:00:00.000+08:00"),
      timezone: "Asia/Shanghai",
      cooldownDays: 7,
      field: "lastingTruthIds",
    });
    assert.equal(recent.has(STALE_TRUTHS[0]), true);
  });
});
