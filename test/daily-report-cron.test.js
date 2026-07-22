import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildManagedDailyReportCronJob,
  buildManagedDreamingCronJob,
  reconcileManagedDreamingCron,
  resolveEffectiveDailyReportCronExpr,
} from "../dist/cron.js";
import {
  DAILY_REPORT_TRIGGER_TOKEN,
  DREAMING_TRIGGER_TOKEN,
  MANAGED_DAILY_REPORT_CRON_NAME,
  MANAGED_DREAMING_CRON_NAME,
} from "../dist/constants.js";
function configWithDelivery() {
  return {
    enabled: true,
    cron: "0 3 * * *",
    timezone: "Asia/Shanghai",
    light: { enabled: true, lookbackDays: 2, limit: 100 },
    rem: { enabled: true, lookbackDays: 7, limit: 10, minPatternStrength: 0.45 },
    deep: {
      enabled: true,
      maxPromotions: 5,
      minScore: 0.7,
      minRecallCount: 3,
      minUniqueQueries: 1,
      recencyHalfLifeDays: 14,
      maxAgeDays: 30,
    },
    narrative: { enabled: true, languages: ["zh"] },
    dailyReport: {
      enabled: true,
      cron: "0 4 * * *",
      languages: ["zh"],
      delivery: {
        channel: "feishu",
        to: "ou_test",
        mode: "announce",
      },
    },
    autoManageCron: true,
    verboseLogging: false,
  };
}

describe("managed cron jobs (isolated sessions without cron.delivery)", () => {
  it("daily report cron uses isolated + agentTurn without delivery field", () => {
    const job = buildManagedDailyReportCronJob(configWithDelivery());
    assert.equal(job.sessionTarget, "isolated");
    assert.equal(job.payload?.kind, "agentTurn");
    assert.equal(job.payload?.message, DAILY_REPORT_TRIGGER_TOKEN);
    assert.equal(job.delivery, undefined);
  });

  it("dreaming cron uses isolated + agentTurn without delivery field", () => {
    const job = buildManagedDreamingCronJob(configWithDelivery());
    assert.equal(job.sessionTarget, "isolated");
    assert.equal(job.payload?.kind, "agentTurn");
    assert.equal(job.payload?.message, DREAMING_TRIGGER_TOKEN);
    assert.equal(job.delivery, undefined);
  });

  it("staggers daily report cron when it collides with dreaming cron", () => {
    const config = configWithDelivery();
    config.dailyReport.cron = "0 3 * * *";
    const resolved = resolveEffectiveDailyReportCronExpr(config);
    assert.equal(resolved.collidedWithDreamingCron, true);
    assert.equal(resolved.expr, "30 3 * * *");
    const job = buildManagedDailyReportCronJob(config);
    assert.equal(job.schedule?.expr, "30 3 * * *");
  });

  it("migrates legacy main/systemEvent jobs to isolated/agentTurn", async () => {
    const jobs = [
      {
        id: "dream",
        name: MANAGED_DREAMING_CRON_NAME,
        enabled: true,
        schedule: { kind: "cron", expr: "0 3 * * *", tz: "Asia/Shanghai" },
        sessionTarget: "main",
        wakeMode: "now",
        payload: { kind: "systemEvent", text: DREAMING_TRIGGER_TOKEN },
      },
      {
        id: "report",
        name: MANAGED_DAILY_REPORT_CRON_NAME,
        enabled: true,
        schedule: { kind: "cron", expr: "0 4 * * *", tz: "Asia/Shanghai" },
        sessionTarget: "main",
        wakeMode: "now",
        payload: { kind: "systemEvent", text: DAILY_REPORT_TRIGGER_TOKEN },
      },
    ];
    const updates = new Map();
    const cron = {
      async list() {
        return jobs;
      },
      async add() {
        throw new Error("unexpected add");
      },
      async update(id, patch) {
        updates.set(id, patch);
        return { updated: true };
      },
      async remove() {
        return { removed: false };
      },
    };
    const logger = { info() {}, warn() {}, error() {} };

    const result = await reconcileManagedDreamingCron({
      cron,
      config: configWithDelivery(),
      logger,
    });

    assert.equal(result.status, "updated");
    assert.equal(updates.get("dream").sessionTarget, "isolated");
    assert.deepEqual(updates.get("dream").payload, {
      kind: "agentTurn",
      message: DREAMING_TRIGGER_TOKEN,
    });
    assert.equal(updates.get("report").sessionTarget, "isolated");
    assert.deepEqual(updates.get("report").payload, {
      kind: "agentTurn",
      message: DAILY_REPORT_TRIGGER_TOKEN,
    });
  });
});