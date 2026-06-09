import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDreamingConfig } from "../dist/config-resolve.js";

describe("resolveDreamingConfig", () => {
  it("reads rem.model and narrative.languages from nested config", () => {
    const config = resolveDreamingConfig({
      rem: { model: "deepseek/deepseek-v4-flash" },
      narrative: { languages: ["zh", "en"] },
    });

    assert.equal(config.rem.model, "deepseek/deepseek-v4-flash");
    assert.deepEqual(config.narrative.languages, ["zh", "en"]);
  });

  it("supports memory-core style rem.execution.model alias", () => {
    const config = resolveDreamingConfig({
      rem: {
        execution: { model: "deepseek/deepseek-v4-flash" },
      },
      narrative: {
        execution: { model: "deepseek/deepseek-v4-flash" },
      },
    });

    assert.equal(config.rem.model, "deepseek/deepseek-v4-flash");
    assert.equal(config.narrative.model, "deepseek/deepseek-v4-flash");
  });

  it("falls back narrative model to rem model", () => {
    const config = resolveDreamingConfig({
      rem: { model: "deepseek/deepseek-v4-flash" },
      narrative: { languages: ["zh"] },
    });

    assert.equal(config.narrative.model, "deepseek/deepseek-v4-flash");
  });

  it("defaults dailyReport to enabled", () => {
    const config = resolveDreamingConfig({});
    assert.equal(config.dailyReport.enabled, true);
    assert.equal(config.dailyReport.cron, "0 4 * * *");
  });
});
