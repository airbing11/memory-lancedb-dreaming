import { countConsecutiveIdleDays, readDeepHistory } from "./deep-history.js";
function summarize(checks) {
    return checks.reduce((acc, check) => {
        acc[check.level] += 1;
        return acc;
    }, { pass: 0, warn: 0, fail: 0 });
}
/** Pure checks (everything except deep-history I/O) so they can be unit tested. */
export function evaluateDoctorChecks(input) {
    const checks = [];
    if (input.hooksAllowConversationAccess === true) {
        checks.push({
            id: "hooks.allowConversationAccess",
            level: "pass",
            message: "hooks.allowConversationAccess is true — cron dreaming hook can run.",
        });
    }
    else {
        checks.push({
            id: "hooks.allowConversationAccess",
            level: "fail",
            message: "hooks.allowConversationAccess is not true — the cron will idle ~120s and write no light/rem/deep files.",
            fix: 'Set plugins.entries.memory-lancedb-dreaming.hooks.allowConversationAccess = true, then fully restart the gateway (openclaw gateway stop && openclaw gateway run).',
        });
    }
    if (!input.needsModelOverride) {
        checks.push({
            id: "subagent.allowModelOverride",
            level: "pass",
            message: "No rem.model / narrative.model override configured — allowModelOverride not required.",
        });
    }
    else if (input.subagentAllowModelOverride === true) {
        checks.push({
            id: "subagent.allowModelOverride",
            level: "pass",
            message: "subagent.allowModelOverride is true — REM/narrative model override allowed.",
        });
    }
    else {
        checks.push({
            id: "subagent.allowModelOverride",
            level: "warn",
            message: "rem.model / narrative.model is set but subagent.allowModelOverride is not true — REM falls back to category labels.",
            fix: 'Set plugins.entries.memory-lancedb-dreaming.subagent.allowModelOverride = true and restart the gateway.',
        });
    }
    if (input.workspaceDir && /[\\/]workspace[\\/]/.test(input.workspaceDir)) {
        checks.push({
            id: "install.path",
            level: "warn",
            message: `Workspace path looks like a workspace/ subtree (${input.workspaceDir}); ensure the PLUGIN is installed under ~/.openclaw/plugins/, not ~/.openclaw/workspace/.`,
            fix: "Reinstall under ~/.openclaw/plugins/ and clean stale paths in openclaw.json + openclaw.json.last-good + plugins/installs.json.",
        });
    }
    if (input.lancedbError) {
        checks.push({
            id: "lancedb.resolve",
            level: "fail",
            message: `LanceDB access failed: ${input.lancedbError}`,
            fix: "Check plugins.slots.memory points at memory-lancedb / memory-lancedb-pro and the dbPath/embedding config is present.",
        });
    }
    else if (input.lancedbPluginId && input.lancedbDbPath) {
        checks.push({
            id: "lancedb.resolve",
            level: "pass",
            message: `LanceDB config resolved (plugin=${input.lancedbPluginId}, dbPath=${input.lancedbDbPath}).`,
        });
    }
    else {
        checks.push({
            id: "lancedb.resolve",
            level: "fail",
            message: "LanceDB config not resolved (no plugin id or dbPath).",
            fix: "Set plugins.slots.memory and ensure the selected memory plugin entry has config.dbPath / embedding.",
        });
    }
    if (input.memoryCount === null) {
        checks.push({
            id: "memory.count",
            level: "warn",
            message: "Could not read memory count (see lancedb.resolve).",
        });
    }
    else if (input.memoryCount > 0) {
        checks.push({
            id: "memory.count",
            level: "pass",
            message: `LanceDB has ${input.memoryCount} memories.`,
        });
    }
    else {
        checks.push({
            id: "memory.count",
            level: "warn",
            message: "LanceDB has 0 memories — dreaming will produce empty reports until memories accumulate.",
        });
    }
    if (input.config.autoManageCron) {
        if (input.mainCronExpr === input.dailyReportEffectiveCronExpr) {
            checks.push({
                id: "cron.collision",
                level: "warn",
                message: `Main dreaming cron and daily report cron resolve to the same expression (${input.mainCronExpr}); auto-stagger should offset the report cron.`,
            });
        }
        else {
            checks.push({
                id: "cron.collision",
                level: "pass",
                message: `Dreaming cron=${input.mainCronExpr}, daily report cron=${input.dailyReportEffectiveCronExpr} (no collision).`,
            });
        }
    }
    if (input.config.dailyReport.enabled) {
        const delivery = input.config.dailyReport.delivery;
        if (!delivery) {
            checks.push({
                id: "dailyReport.delivery",
                level: "pass",
                message: "Daily report enabled, files only (no delivery configured).",
            });
        }
        else if (delivery.channel && delivery.to) {
            checks.push({
                id: "dailyReport.delivery",
                level: "pass",
                message: `Daily report delivery configured (channel=${delivery.channel}, to=${delivery.to}).`,
            });
        }
        else {
            checks.push({
                id: "dailyReport.delivery",
                level: "fail",
                message: "Daily report delivery is missing channel or to.",
                fix: "Provide both dailyReport.delivery.channel and dailyReport.delivery.to.",
            });
        }
    }
    return checks;
}
export async function runDreamingDoctor(input) {
    const checks = evaluateDoctorChecks(input);
    if (input.workspaceDir) {
        try {
            const deepHistory = await readDeepHistory(input.workspaceDir);
            const idleDays = countConsecutiveIdleDays({ history: deepHistory });
            const threshold = input.config.deep.idleNoveltyAfterDays ?? 0;
            if (deepHistory.runs.length === 0) {
                checks.push({
                    id: "deep.idleStreak",
                    level: "pass",
                    message: "No deep history yet (plugin has not promoted/run, or pre-0.2.8).",
                });
            }
            else if (threshold > 0 && idleDays >= threshold) {
                checks.push({
                    id: "deep.idleStreak",
                    level: "warn",
                    message: `Deep promoted 0 for ${idleDays} consecutive day(s) (≥ idleNoveltyAfterDays=${threshold}); REM novelty mode is active. Repetitive reports are expected to ease as novelty mode filters stale themes.`,
                });
            }
            else {
                checks.push({
                    id: "deep.idleStreak",
                    level: "pass",
                    message: `Deep idle streak ${idleDays} day(s) (threshold ${threshold || "disabled"}).`,
                });
            }
        }
        catch (err) {
            checks.push({
                id: "deep.idleStreak",
                level: "warn",
                message: `Could not read deep history: ${String(err)}`,
            });
        }
    }
    const summary = summarize(checks);
    return {
        plugin: "memory-lancedb-dreaming",
        ok: summary.fail === 0,
        summary,
        checks,
    };
}
//# sourceMappingURL=doctor.js.map