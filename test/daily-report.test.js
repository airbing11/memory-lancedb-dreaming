import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSnapshotFromPipeline,
  parseRemThemeLines,
  renderDailyReport,
} from "../dist/daily-report/index.js";

describe("daily report", () => {
  it("parses named REM theme lines", () => {
    const themes = parseRemThemeLines([
      "- Theme: 用户偏好 / User Preferences (0.82)",
      "  - 覆盖: 12 条记忆",
    ]);
    assert.equal(themes.length, 1);
    assert.equal(themes[0]?.label, "用户偏好 / User Preferences");
    assert.equal(themes[0]?.confidence, 0.82);
  });

  it("renders zh daily report from snapshot", () => {
    const text = renderDailyReport(
      {
        version: 1,
        day: "2026-05-27",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-05-27T04:00:00.000Z",
        light: { candidateCount: 100, ran: true },
        rem: {
          themeCount: 1,
          themes: [{ label: "用户偏好 / User Preferences", confidence: 0.82 }],
          ran: true,
        },
        deep: { promotedCount: 5, ran: true },
        narrative: { written: true, excerpt: "昨夜的风很轻。" },
      },
      ["zh"]
    );
    assert.match(text, /梦境日报 2026-05-27/);
    assert.match(text, /Light 阶段：100 条观测候选/);
    assert.match(text, /用户偏好 \/ User Preferences/);
    assert.match(text, /昨夜的风很轻。/);
  });

  it("explains when recent REM themes are cooling down", () => {
    const text = renderDailyReport(
      {
        version: 1,
        day: "2026-08-07",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-08-07T04:00:00.000Z",
        light: { candidateCount: 100, ran: true },
        rem: { themeCount: 0, themes: [], ran: true },
        deep: { promotedCount: 0, ran: true },
        narrative: { written: false },
      },
      ["zh"]
    );
    assert.match(text, /暂无新的 REM 主题（近期主题已进入冷却）/);
    assert.match(text, /（暂无叙事条目）/);
  });

  it("does not turn analyzed REM memories into a phantom theme", () => {
    const snapshot = buildSnapshotFromPipeline({
      workspaceDir: "/tmp/test",
      day: "2026-08-10",
      timezone: "Asia/Shanghai",
      nowMs: Date.parse("2026-08-10T03:00:00.000Z"),
      lightCount: 100,
      remCount: 200,
      promotedCount: 0,
      narrativeWritten: false,
      remBodyLines: [
        "### Reflections",
        "- No novel REM themes surfaced; recent themes are cooling down.",
      ],
      phasesRan: { light: true, rem: true, deep: true },
    });
    assert.equal(snapshot.rem.themeCount, 0);
    assert.deepEqual(snapshot.rem.themes, []);
  });
});
