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
  MANAGED_DAILY_REPORT_CRON_TAG,
  MANAGED_DREAMING_CRON_NAME,
  MANAGED_DREAMING_CRON_TAG,
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

describe("managed cron jobs (isolated sessions with completion delivery disabled)", () => {
  it("daily report cron uses isolated + agentTurn + delivery:none", () => {
    const job = buildManagedDailyReportCronJob(configWithDelivery());
    assert.equal(job.sessionTarget, "isolated");
    assert.equal(job.payload?.kind, "agentTurn");
    assert.equal(job.payload?.message, DAILY_REPORT_TRIGGER_TOKEN);
    assert.deepEqual(job.delivery, { mode: "none" });
  });

  it("dreaming cron uses isolated + agentTurn + delivery:none", () => {
    const job = buildManagedDreamingCronJob(configWithDelivery());
    assert.equal(job.sessionTarget, "isolated");
    assert.equal(job.payload?.kind, "agentTurn");
    assert.equal(job.payload?.message, DREAMING_TRIGGER_TOKEN);
    assert.deepEqual(job.delivery, { mode: "none" });
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
        name: "renamed legacy dream",
        enabled: true,
        schedule: { kind: "cron", expr: "0 3 * * *", tz: "Asia/Shanghai" },
        sessionTarget: "main",
        wakeMode: "now",
        payload: { kind: "systemEvent", text: DREAMING_TRIGGER_TOKEN },
        delivery: { mode: "announce", channel: "wecom", to: "legacy-target" },
      },
      {
        id: "report",
        name: "renamed legacy report",
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
    assert.equal(updates.get("dream").name, MANAGED_DREAMING_CRON_NAME);
    assert.equal(updates.get("dream").sessionTarget, "isolated");
    assert.deepEqual(updates.get("dream").payload, {
      kind: "agentTurn",
      message: DREAMING_TRIGGER_TOKEN,
    });
    assert.deepEqual(updates.get("dream").delivery, { mode: "none" });
    assert.equal(updates.get("report").sessionTarget, "isolated");
    assert.equal(updates.get("report").name, MANAGED_DAILY_REPORT_CRON_NAME);
    assert.deepEqual(updates.get("report").payload, {
      kind: "agentTurn",
      message: DAILY_REPORT_TRIGGER_TOKEN,
    });
    assert.deepEqual(updates.get("report").delivery, { mode: "none" });
  });

  it("leaves already-canonical delivery:none jobs unchanged", async () => {
    const config = configWithDelivery();
    const jobs = [
      { id: "dream", ...buildManagedDreamingCronJob(config) },
      { id: "report", ...buildManagedDailyReportCronJob(config) },
    ];
    const cron = {
      async list() {
        return jobs;
      },
      async add() {
        throw new Error("unexpected add");
      },
      async update() {
        throw new Error("unexpected update");
      },
      async remove() {
        throw new Error("unexpected remove");
      },
    };
    const logger = { info() {}, warn() {}, error() {} };

    const result = await reconcileManagedDreamingCron({ cron, config, logger });
    assert.equal(result.status, "noop");
  });

  it("keeps dreaming and daily-report job identities stable across reconcile ticks", async () => {
    const config = configWithDelivery();
    const jobs = [];
    const mutations = { added: 0, updated: 0, removed: 0 };
    let nextId = 1;

    const cron = {
      async list() {
        return jobs;
      },
      async add(job) {
        jobs.push({ id: `j${nextId++}`, createdAtMs: nextId, ...job });
        mutations.added += 1;
        return { added: true };
      },
      async update(id, patch) {
        const index = jobs.findIndex((job) => job.id === id);
        assert.notEqual(index, -1);
        jobs[index] = { ...jobs[index], ...patch };
        mutations.updated += 1;
        return { updated: true };
      },
      async remove(id) {
        const index = jobs.findIndex((job) => job.id === id);
        if (index === -1) return { removed: false };
        jobs.splice(index, 1);
        mutations.removed += 1;
        return { removed: true };
      },
    };
    const logger = { info() {}, warn() {}, error() {} };

    for (let tick = 0; tick < 5; tick += 1) {
      await reconcileManagedDreamingCron({ cron, config, logger });
    }

    assert.deepEqual(
      jobs.map((job) => ({ id: job.id, name: job.name })),
      [
        { id: "j1", name: MANAGED_DREAMING_CRON_NAME },
        { id: "j2", name: MANAGED_DAILY_REPORT_CRON_NAME },
      ]
    );
    assert.deepEqual(mutations, { added: 2, updated: 0, removed: 0 });
  });

  it("never adopts or deletes jobs based only on managed description tags", async () => {
    const config = configWithDelivery();
    const jobs = [
      {
        id: "user-dream",
        name: "dreaming-plugin-healthcheck",
        description: `${MANAGED_DREAMING_CRON_TAG} copied text`,
      },
      {
        id: "user-report",
        name: "User report task",
        description: `${MANAGED_DAILY_REPORT_CRON_TAG} copied text`,
      },
    ];
    const mutations = { added: 0, updated: 0, removed: 0 };
    let nextId = 1;
    const cron = {
      async list() {
        return jobs;
      },
      async add(job) {
        jobs.push({ id: `managed-${nextId++}`, ...job });
        mutations.added += 1;
        return { added: true };
      },
      async update() {
        mutations.updated += 1;
        return { updated: true };
      },
      async remove() {
        mutations.removed += 1;
        return { removed: true };
      },
    };
    const logger = { info() {}, warn() {}, error() {} };

    await reconcileManagedDreamingCron({ cron, config, logger });

    assert.deepEqual(mutations, { added: 2, updated: 0, removed: 0 });
    assert.equal(jobs.some((job) => job.id === "user-dream"), true);
    assert.equal(jobs.some((job) => job.id === "user-report"), true);
  });

  it("does not remove description-tag-only jobs when the plugin is disabled", async () => {
    const config = configWithDelivery();
    config.enabled = false;
    const jobs = [
      {
        id: "user-dream",
        description: MANAGED_DREAMING_CRON_TAG,
      },
      {
        id: "user-report",
        description: MANAGED_DAILY_REPORT_CRON_TAG,
      },
    ];
    let removeCalls = 0;
    const cron = {
      async list() {
        return jobs;
      },
      async add() {
        throw new Error("unexpected add");
      },
      async update() {
        throw new Error("unexpected update");
      },
      async remove() {
        removeCalls += 1;
        return { removed: true };
      },
    };
    const logger = { info() {}, warn() {}, error() {} };

    const result = await reconcileManagedDreamingCron({ cron, config, logger });

    assert.equal(result.status, "disabled");
    assert.equal(removeCalls, 0);
  });

  it("removes only token-owned jobs when the plugin is disabled", async () => {
    const config = configWithDelivery();
    config.enabled = false;
    const jobs = [
      { id: "user-name", name: "dreaming-plugin-healthcheck" },
      { id: "user-tag", description: MANAGED_DREAMING_CRON_TAG },
      {
        id: "owned-dream",
        payload: { kind: "agentTurn", message: DREAMING_TRIGGER_TOKEN },
      },
      {
        id: "owned-report",
        payload: { kind: "agentTurn", message: DAILY_REPORT_TRIGGER_TOKEN },
      },
    ];
    const removedIds = [];
    const cron = {
      async list() {
        return jobs;
      },
      async add() {
        throw new Error("unexpected add");
      },
      async update() {
        throw new Error("unexpected update");
      },
      async remove(id) {
        removedIds.push(id);
        return { removed: true };
      },
    };
    const logger = { info() {}, warn() {}, error() {} };

    await reconcileManagedDreamingCron({ cron, config, logger });

    assert.deepEqual(removedIds.sort(), ["owned-dream", "owned-report"]);
  });
});