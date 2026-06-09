import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildManagedDailyReportCronJob,
  buildManagedDreamingCronJob,
} from "../dist/cron.js";
import { DAILY_REPORT_TRIGGER_TOKEN, DREAMING_TRIGGER_TOKEN } from "../dist/constants.js";

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

describe("managed cron jobs (no cron.delivery — OpenClaw forbids main+delivery)", () => {
  it("daily report cron uses main + systemEvent without delivery field", () => {
    const job = buildManagedDailyReportCronJob(configWithDelivery());
    assert.equal(job.sessionTarget, "main");
    assert.equal(job.payload?.kind, "systemEvent");
    assert.equal(job.payload?.text, DAILY_REPORT_TRIGGER_TOKEN);
    assert.equal(job.delivery, undefined);
  });

  it("dreaming cron uses main + systemEvent without delivery field", () => {
    const job = buildManagedDreamingCronJob(configWithDelivery());
    assert.equal(job.sessionTarget, "main");
    assert.equal(job.payload?.text, DREAMING_TRIGGER_TOKEN);
    assert.equal(job.delivery, undefined);
  });
});
