import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dreamingConfigNeedsModelOverride,
  isCronDreamingHookAllowed,
  isModelOverrideAllowed,
  readPluginHooksPolicy,
  readPluginSubagentPolicy,
} from "../dist/config-resolve.js";

describe("readPluginHooksPolicy", () => {
  it("returns undefined when hooks are not configured", () => {
    const policy = readPluginHooksPolicy({
      config: { plugins: { entries: { "memory-lancedb-dreaming": { enabled: true } } } },
    });
    assert.equal(policy.allowConversationAccess, undefined);
    assert.equal(isCronDreamingHookAllowed({
      config: { plugins: { entries: { "memory-lancedb-dreaming": { enabled: true } } } },
    }), false);
  });

  it("allows cron hook when allowConversationAccess is true", () => {
    const api = {
      config: {
        plugins: {
          entries: {
            "memory-lancedb-dreaming": {
              enabled: true,
              hooks: { allowConversationAccess: true },
            },
          },
        },
      },
    };
    assert.equal(readPluginHooksPolicy(api).allowConversationAccess, true);
    assert.equal(isCronDreamingHookAllowed(api), true);
  });
});

describe("readPluginSubagentPolicy", () => {
  it("allows model override when subagent.allowModelOverride is true", () => {
    const api = {
      config: {
        plugins: {
          entries: {
            "memory-lancedb-dreaming": {
              subagent: { allowModelOverride: true },
            },
          },
        },
      },
    };
    assert.equal(readPluginSubagentPolicy(api).allowModelOverride, true);
    assert.equal(isModelOverrideAllowed(api), true);
  });

  it("detects when dreaming config needs model override", () => {
    assert.equal(
      dreamingConfigNeedsModelOverride({
        rem: { model: "deepseek/deepseek-v4-flash" },
        narrative: {},
      }),
      true
    );
    assert.equal(dreamingConfigNeedsModelOverride({ rem: {}, narrative: {} }), false);
  });
});
