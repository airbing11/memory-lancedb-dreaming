import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseThemeLines } from "../dist/phases/rem-themes.js";

describe("parseThemeLines", () => {
  it("parses valid bilingual theme lines", () => {
    const raw = ["系统运维排故 / System Maintenance", "音色与语音 / Voice & TTS"].join("\n");
    const parsed = parseThemeLines(raw, 2);
    assert.deepEqual(parsed, [
      { zh: "系统运维排故", en: "System Maintenance" },
      { zh: "音色与语音", en: "Voice & TTS" },
    ]);
  });

  it("rejects the echoed format placeholder", () => {
    const raw = "中文主题名（4-8字） / English Topic Name";
    const parsed = parseThemeLines(raw, 1);
    assert.deepEqual(parsed, [null]);
  });

  it("keeps real themes and drops placeholder echoes mixed together", () => {
    const raw = [
      "中文主题名（4-8字） / English Topic Name",
      "爱兔合资谈判 / Joint Venture",
    ].join("\n");
    const parsed = parseThemeLines(raw, 2);
    assert.equal(parsed[0].zh, "爱兔合资谈判");
    assert.equal(parsed[1], null);
  });

  it("pads with null up to clusterCount", () => {
    const parsed = parseThemeLines("", 3);
    assert.deepEqual(parsed, [null, null, null]);
  });
});
