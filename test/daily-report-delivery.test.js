import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeDailyReportContentFingerprint } from "../dist/daily-report/fingerprint.js";
import { evaluateDailyReportDelivery } from "../dist/daily-report/delivery-policy.js";
import {
  readDailyReportDeliveryState,
  writeDailyReportDeliveryState,
} from "../dist/daily-report/delivery-state.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseSnapshot = {
  version: 1,
  day: "2026-06-10",
  timezone: "Asia/Shanghai",
  generatedAt: "2026-06-10T04:00:00.000Z",
  light: { candidateCount: 44, ran: true },
  rem: {
    themeCount: 2,
    themes: [{ label: "用户偏好 / User Preferences", confidence: 0.82 }],
    ran: true,
  },
  deep: { promotedCount: 5, ran: true },
  narrative: { written: true, excerpt: "昨夜的风很轻。" },
};

describe("daily report delivery policy", () => {
  it("fingerprint ignores day and generatedAt", () => {
    const a = computeDailyReportContentFingerprint(baseSnapshot);
    const b = computeDailyReportContentFingerprint({
      ...baseSnapshot,
      day: "2026-06-11",
      generatedAt: "2026-06-11T04:00:00.000Z",
    });
    assert.equal(a, b);
  });

  it("fingerprint changes when narrative excerpt changes", () => {
    const a = computeDailyReportContentFingerprint(baseSnapshot);
    const b = computeDailyReportContentFingerprint({
      ...baseSnapshot,
      narrative: { written: true, excerpt: "不同的叙事。" },
    });
    assert.notEqual(a, b);
  });

  it("skips push when content fingerprint unchanged", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "dreaming-delivery-"));
    const published = {
      day: "2026-06-10",
      text: "report",
      dailyMemoryPath: "",
      archivePath: "",
      snapshotPath: "",
      snapshot: baseSnapshot,
      contentFingerprint: computeDailyReportContentFingerprint(baseSnapshot),
    };
    await writeDailyReportDeliveryState({
      workspaceDir,
      state: {
        version: 1,
        lastContentFingerprint: published.contentFingerprint,
        lastDeliveredDay: "2026-06-09",
        lastDeliveredAt: new Date().toISOString(),
      },
    });

    const decision = await evaluateDailyReportDelivery({
      workspaceDir,
      published,
      pushOn: "changed",
    });
    assert.equal(decision.deliver, false);
    if (!decision.deliver) assert.equal(decision.reason, "unchanged");

    const always = await evaluateDailyReportDelivery({
      workspaceDir,
      published,
      pushOn: "always",
    });
    assert.equal(always.deliver, true);

    const state = await readDailyReportDeliveryState(workspaceDir);
    assert.equal(state?.lastContentFingerprint, published.contentFingerprint);
  });

  it("skips push when no dreaming phases ran", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "dreaming-delivery-"));
    const published = {
      day: "2026-06-10",
      text: "report",
      dailyMemoryPath: "",
      archivePath: "",
      snapshotPath: "",
      snapshot: {
        ...baseSnapshot,
        light: { candidateCount: 0, ran: false },
        rem: { themeCount: 0, themes: [], ran: false },
        deep: { promotedCount: 0, ran: false },
      },
      contentFingerprint: "abc",
    };

    const decision = await evaluateDailyReportDelivery({
      workspaceDir,
      published,
      pushOn: "changed",
    });
    assert.equal(decision.deliver, false);
    if (!decision.deliver) assert.equal(decision.reason, "no_phases");
  });
});
