import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRemThemeLines, renderDailyReport } from "../dist/daily-report/index.js";

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
});
