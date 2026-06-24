import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateDoctorChecks } from "../dist/doctor.js";
import { DEFAULT_DREAMING_CONFIG } from "../dist/config.js";

function baseInputs(overrides = {}) {
  return {
    config: DEFAULT_DREAMING_CONFIG,
    workspaceDir: "/root/.openclaw/workspace",
    hooksAllowConversationAccess: true,
    subagentAllowModelOverride: true,
    needsModelOverride: false,
    lancedbPluginId: "memory-lancedb-pro",
    lancedbDbPath: "/root/.openclaw/memory/lancedb",
    lancedbError: undefined,
    memoryCount: 953,
    mainCronExpr: "0 3 * * *",
    dailyReportEffectiveCronExpr: "30 3 * * *",
    ...overrides,
  };
}

function findCheck(checks, id) {
  return checks.find((check) => check.id === id);
}

describe("doctor checks", () => {
  it("passes a healthy config", () => {
    const checks = evaluateDoctorChecks(baseInputs());
    assert.equal(findCheck(checks, "hooks.allowConversationAccess").level, "pass");
    assert.equal(findCheck(checks, "lancedb.resolve").level, "pass");
    assert.equal(findCheck(checks, "memory.count").level, "pass");
  });

  it("fails when allowConversationAccess is missing", () => {
    const checks = evaluateDoctorChecks(
      baseInputs({ hooksAllowConversationAccess: undefined })
    );
    assert.equal(findCheck(checks, "hooks.allowConversationAccess").level, "fail");
  });

  it("warns when model override is needed but not granted", () => {
    const checks = evaluateDoctorChecks(
      baseInputs({ needsModelOverride: true, subagentAllowModelOverride: undefined })
    );
    assert.equal(findCheck(checks, "subagent.allowModelOverride").level, "warn");
  });

  it("fails when LanceDB cannot be resolved", () => {
    const checks = evaluateDoctorChecks(
      baseInputs({ lancedbPluginId: null, lancedbDbPath: null })
    );
    assert.equal(findCheck(checks, "lancedb.resolve").level, "fail");
  });

  it("warns on cron collision", () => {
    const checks = evaluateDoctorChecks(
      baseInputs({ dailyReportEffectiveCronExpr: "0 3 * * *" })
    );
    assert.equal(findCheck(checks, "cron.collision").level, "warn");
  });
});
