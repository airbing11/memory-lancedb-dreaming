import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterNovelNarrativeSnippets,
  isNarrativeOutputRepeated,
} from "../dist/narrative-history.js";

const nowMs = Date.parse("2026-08-07T12:00:00.000Z");
const history = {
  version: 1,
  runs: [
    {
      day: "2026-08-06",
      sourceSnippets: [
        "甜心小玲成为微信、企业微信和QQ统一使用的声音。",
        "配置文件截断后通过备份恢复了插件运行。",
      ],
      narrativeText:
        "夜里想起甜心小玲的声音已经安放在每个通道，也想起配置损坏后靠备份恢复的惊险。",
    },
  ],
};

describe("narrative source novelty", () => {
  it("filters the same source memories even before the LLM rewords them", () => {
    const result = filterNovelNarrativeSnippets({
      snippets: [
        "甜心小玲成为微信、企业微信和QQ统一使用的声音。",
        "今天新增了供应商合同审批流程。",
      ],
      history,
      nowMs,
      windowDays: 7,
      similarityThreshold: 0.42,
    });
    assert.equal(result.skipped, 1);
    assert.deepEqual(result.selected, ["今天新增了供应商合同审批流程。"]);
  });

  it("dedupes similar snippets within today's candidate list", () => {
    const result = filterNovelNarrativeSnippets({
      snippets: [
        "今天新增了供应商合同审批流程。",
        "今天新增供应商合同审批流程并完成配置。",
      ],
      history: { version: 1, runs: [] },
      nowMs,
      windowDays: 7,
      similarityThreshold: 0.42,
    });
    assert.equal(result.selected.length, 1);
    assert.equal(result.skipped, 1);
  });
});

describe("narrative output novelty", () => {
  it("rejects a substantially repeated diary entry", () => {
    assert.equal(
      isNarrativeOutputRepeated({
        narrativeText:
          "夜里想起甜心小玲的声音已经安放在每个通道，也想起配置损坏后靠备份恢复的惊险。",
        history,
        nowMs,
        windowDays: 14,
        similarityThreshold: 0.55,
      }),
      true
    );
  });

  it("accepts unrelated new material", () => {
    assert.equal(
      isNarrativeOutputRepeated({
        narrativeText: "新的供应商合同审批完成，仓库也迎来了第一批入库单。",
        history,
        nowMs,
        windowDays: 14,
        similarityThreshold: 0.55,
      }),
      false
    );
  });
});
