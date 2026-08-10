import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseThemeLines, suppressRepeatedRemThemes } from "../dist/phases/rem-themes.js";

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

describe("suppressRepeatedRemThemes", () => {
  const clusters = [
    {
      tag: "technical",
      strength: 1,
      count: 10,
      memories: [],
      spotlightMemories: [],
    },
    {
      tag: "business",
      strength: 0.7,
      count: 7,
      memories: [],
      spotlightMemories: [],
    },
  ];

  it("suppresses recent bilingual themes instead of renaming them", () => {
    const result = suppressRepeatedRemThemes({
      clusters,
      themeNames: [
        { zh: "技术运维排障", en: "Technical Troubleshooting" },
        { zh: "企业合作进展", en: "Business Partnership" },
      ],
      recentThemeNames: ["技术运维排障 / Technical Operations"],
      similarityThreshold: 0.55,
    });
    assert.equal(result.skipped, 1);
    assert.equal(result.clusters.length, 1);
    assert.equal(result.themeNames[0].zh, "企业合作进展");
  });

  it("keeps genuinely new themes", () => {
    const result = suppressRepeatedRemThemes({
      clusters: clusters.slice(1),
      themeNames: [{ zh: "企业合作进展", en: "Business Partnership" }],
      recentThemeNames: ["技术运维排障 / Technical Troubleshooting"],
      similarityThreshold: 0.55,
    });
    assert.equal(result.skipped, 0);
    assert.equal(result.clusters.length, 1);
  });
});
