import { DAILY_REPORT_TRIGGER_TOKEN, DREAMING_TRIGGER_TOKEN, MANAGED_DAILY_REPORT_CRON_NAME, MANAGED_DAILY_REPORT_CRON_TAG, MANAGED_DREAMING_CRON_NAME, MANAGED_DREAMING_CRON_TAG, } from "./constants.js";
import { normalizeTrimmedString } from "./utils.js";
function resolveManagedCronDescription(config) {
    return `${MANAGED_DREAMING_CRON_TAG} LanceDB dreaming pipeline (deep limit=${config.deep.limit}, minScore=${config.deep.minScore.toFixed(3)}, cron=${config.cron}).`;
}
export function buildManagedDreamingCronJob(config) {
    return {
        name: MANAGED_DREAMING_CRON_NAME,
        description: resolveManagedCronDescription(config),
        enabled: true,
        schedule: {
            kind: "cron",
            expr: config.cron,
            ...(config.timezone ? { tz: config.timezone } : {}),
        },
        sessionTarget: "isolated",
        wakeMode: "now",
        payload: {
            kind: "agentTurn",
            message: DREAMING_TRIGGER_TOKEN,
        },
    };
}
function isManagedDreamingJob(job) {
    if (normalizeTrimmedString(job.description)?.includes(MANAGED_DREAMING_CRON_TAG))
        return true;
    const name = normalizeTrimmedString(job.name);
    const payloadText = normalizeTrimmedString(job.payload?.text ?? job.payload?.message);
    return name === MANAGED_DREAMING_CRON_NAME && payloadText === DREAMING_TRIGGER_TOKEN;
}
/** Legacy crons that conflict with plugin-managed dreaming schedules. */
export function isLegacyConflictCronJob(job) {
    if (isManagedDreamingJob(job))
        return false;
    const name = normalizeTrimmedString(job.name)?.toLowerCase() ?? "";
    const description = normalizeTrimmedString(job.description)?.toLowerCase() ?? "";
    const payloadText = normalizeTrimmedString(job.payload?.text ?? job.payload?.message);
    if (payloadText === DREAMING_TRIGGER_TOKEN)
        return true;
    if (name === "dreaming-plugin-healthcheck")
        return true;
    if (name.includes("dreaming") && name.includes("healthcheck"))
        return true;
    if (description.includes("dreaming-plugin-healthcheck"))
        return true;
    return false;
}
export async function removeLegacyConflictCronJobs(params) {
    const allJobs = await params.cron.list({ includeDisabled: true });
    let removed = 0;
    for (const job of allJobs) {
        if (!isLegacyConflictCronJob(job))
            continue;
        try {
            if ((await params.cron.remove(job.id)).removed === true) {
                removed += 1;
                params.logger.warn(`memory-lancedb-dreaming: removed legacy conflict cron job "${job.name ?? job.id}" (${job.id})`);
            }
        }
        catch (err) {
            params.logger.warn(`memory-lancedb-dreaming: failed to remove legacy conflict cron job ${job.id}: ${String(err)}`);
        }
    }
    return removed;
}
function sortManagedJobs(managed) {
    return [...managed].sort((a, b) => {
        const aCreated = typeof a.createdAtMs === "number" && Number.isFinite(a.createdAtMs)
            ? a.createdAtMs
            : Number.MAX_SAFE_INTEGER;
        const bCreated = typeof b.createdAtMs === "number" && Number.isFinite(b.createdAtMs)
            ? b.createdAtMs
            : Number.MAX_SAFE_INTEGER;
        if (aCreated !== bCreated)
            return aCreated - bCreated;
        return a.id.localeCompare(b.id);
    });
}
function buildManagedDreamingPatch(job, desired) {
    const schedule = desired.schedule;
    const payload = desired.payload;
    if (!schedule?.expr || !payload?.message)
        return null;
    const patch = {};
    if (normalizeTrimmedString(job.name) !== desired.name)
        patch.name = desired.name;
    if (normalizeTrimmedString(job.description) !== desired.description) {
        patch.description = desired.description;
    }
    if (job.enabled !== true)
        patch.enabled = true;
    const scheduleKind = normalizeTrimmedString(job.schedule?.kind)?.toLowerCase();
    const scheduleExpr = normalizeTrimmedString(job.schedule?.expr);
    const scheduleTz = normalizeTrimmedString(job.schedule?.tz);
    if (scheduleKind !== "cron" ||
        scheduleExpr !== schedule.expr ||
        scheduleTz !== (schedule.tz ?? undefined)) {
        patch.schedule = schedule;
    }
    const desiredTarget = normalizeTrimmedString(desired.sessionTarget)?.toLowerCase();
    const currentTarget = normalizeTrimmedString(job.sessionTarget)?.toLowerCase();
    if (currentTarget !== desiredTarget)
        patch.sessionTarget = desired.sessionTarget;
    if (normalizeTrimmedString(job.wakeMode)?.toLowerCase() !== "now") {
        patch.wakeMode = "now";
    }
    const payloadKind = normalizeTrimmedString(job.payload?.kind)?.toLowerCase();
    const payloadText = normalizeTrimmedString(job.payload?.text ?? job.payload?.message);
    if (payloadKind !== "agentturn" || payloadText !== payload.message) {
        patch.payload = payload;
    }
    if (job.delivery !== undefined)
        patch.delivery = undefined;
    return Object.keys(patch).length > 0 ? patch : null;
}
export async function reconcileManagedDreamingCron(params) {
    const { cron, config, logger } = params;
    if (!cron)
        return { status: "unavailable", removed: 0 };
    let removed = 0;
    if (config.enabled) {
        removed += await removeLegacyConflictCronJobs({ cron, logger });
    }
    const dreaming = await reconcileSingleManagedCron({
        cron: params.cron,
        config: params.config,
        logger: params.logger,
        enabled: params.config.enabled,
        isManaged: isManagedDreamingJob,
        buildDesired: buildManagedDreamingCronJob,
        buildPatch: buildManagedDreamingPatch,
        createLog: "memory-lancedb-dreaming: created managed dreaming cron job.",
        updateLog: "memory-lancedb-dreaming: updated managed dreaming cron job.",
        pruneLog: "memory-lancedb-dreaming: pruned duplicate managed dreaming cron jobs.",
    });
    removed += dreaming.removed;
    const dailyReportCron = resolveEffectiveDailyReportCronExpr(params.config);
    if (dailyReportCron.collidedWithDreamingCron) {
        params.logger.warn(`memory-lancedb-dreaming: dailyReport.cron matches dreaming cron (${params.config.cron}); auto-staggered daily report to ${dailyReportCron.expr}`);
    }
    const daily = await reconcileSingleManagedCron({
        cron: params.cron,
        config: params.config,
        logger: params.logger,
        enabled: params.config.enabled && params.config.dailyReport.enabled,
        isManaged: isManagedDailyReportJob,
        buildDesired: buildManagedDailyReportCronJob,
        buildPatch: buildManagedDailyReportPatch,
        createLog: "memory-lancedb-dreaming: created managed daily report cron job.",
        updateLog: "memory-lancedb-dreaming: updated managed daily report cron job.",
        pruneLog: "memory-lancedb-dreaming: pruned duplicate managed daily report cron jobs.",
    });
    removed += daily.removed;
    if (!params.config.enabled) {
        return { status: dreaming.status === "disabled" ? "disabled" : daily.status, removed };
    }
    if (dreaming.status === "added" || daily.status === "added") {
        return { status: "added", removed };
    }
    if (dreaming.status === "updated" || daily.status === "updated") {
        return { status: "updated", removed };
    }
    if (removed > 0)
        return { status: "noop", removed };
    return { status: dreaming.status === "unavailable" ? dreaming.status : daily.status, removed };
}
async function reconcileSingleManagedCron(params) {
    const { cron, config, logger } = params;
    if (!cron)
        return { status: "unavailable", removed: 0 };
    const allJobs = await cron.list({ includeDisabled: true });
    const managed = allJobs.filter(params.isManaged);
    if (!params.enabled) {
        let disabledRemoved = 0;
        for (const job of managed) {
            try {
                if ((await cron.remove(job.id)).removed === true)
                    disabledRemoved += 1;
            }
            catch (err) {
                logger.warn(`memory-lancedb-dreaming: failed to remove managed cron job ${job.id}: ${String(err)}`);
            }
        }
        if (disabledRemoved > 0) {
            logger.info(`memory-lancedb-dreaming: removed ${disabledRemoved} managed cron job(s).`);
        }
        return { status: "disabled", removed: disabledRemoved };
    }
    const desired = params.buildDesired(config);
    if (managed.length === 0) {
        try {
            await cron.add(desired);
            logger.info(params.createLog);
            return { status: "added", removed: 0 };
        }
        catch (err) {
            logger.error(`memory-lancedb-dreaming: failed to create managed cron job "${desired.name ?? "unknown"}": ${String(err)}`);
            return { status: "unavailable", removed: 0 };
        }
    }
    const [primary, ...duplicates] = sortManagedJobs(managed);
    let removed = 0;
    for (const duplicate of duplicates) {
        try {
            if ((await cron.remove(duplicate.id)).removed === true)
                removed += 1;
        }
        catch (err) {
            logger.warn(`memory-lancedb-dreaming: failed to prune duplicate cron job ${duplicate.id}: ${String(err)}`);
        }
    }
    const patch = params.buildPatch(primary, desired);
    if (!patch) {
        if (removed > 0)
            logger.info(params.pruneLog);
        return { status: "noop", removed };
    }
    try {
        await cron.update(primary.id, patch);
        logger.info(params.updateLog);
        return { status: "updated", removed };
    }
    catch (err) {
        logger.error(`memory-lancedb-dreaming: failed to update managed cron job "${primary.name ?? primary.id}": ${String(err)}`);
        return { status: "unavailable", removed };
    }
}
function resolveManagedDailyReportDescription(config) {
    const delivery = config.dailyReport.delivery;
    const deliveryHint = delivery ? `delivery=${delivery.channel}` : "file-only";
    const { expr, collidedWithDreamingCron } = resolveEffectiveDailyReportCronExpr(config);
    const cronHint = collidedWithDreamingCron
        ? `cron=${expr} (staggered from ${config.dailyReport.cron})`
        : `cron=${expr}`;
    return `${MANAGED_DAILY_REPORT_CRON_TAG} Daily report (${deliveryHint}, ${cronHint}).`;
}
/** Avoid daily report cron firing before/at the same instant as the dreaming pipeline. */
export function resolveEffectiveDailyReportCronExpr(config) {
    const dreamingCron = config.cron.trim();
    const dailyCron = config.dailyReport.cron.trim();
    if (dreamingCron !== dailyCron) {
        return { expr: dailyCron, collidedWithDreamingCron: false };
    }
    const parts = dailyCron.split(/\s+/);
    if (parts.length === 5 && parts[0] === "0" && /^\d+$/.test(parts[1] ?? "")) {
        return {
            expr: `30 ${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]}`,
            collidedWithDreamingCron: true,
        };
    }
    return { expr: "0 4 * * *", collidedWithDreamingCron: true };
}
export function buildManagedDailyReportCronJob(config) {
    const tz = config.dailyReport.timezone ?? config.timezone;
    const { expr } = resolveEffectiveDailyReportCronExpr(config);
    return {
        name: MANAGED_DAILY_REPORT_CRON_NAME,
        description: resolveManagedDailyReportDescription(config),
        enabled: true,
        schedule: {
            kind: "cron",
            expr,
            ...(tz ? { tz } : {}),
        },
        sessionTarget: "isolated",
        wakeMode: "now",
        payload: {
            kind: "agentTurn",
            message: DAILY_REPORT_TRIGGER_TOKEN,
        },
    };
}
function isManagedDailyReportJob(job) {
    if (normalizeTrimmedString(job.description)?.includes(MANAGED_DAILY_REPORT_CRON_TAG))
        return true;
    const name = normalizeTrimmedString(job.name);
    const payloadText = normalizeTrimmedString(job.payload?.text ?? job.payload?.message);
    return name === MANAGED_DAILY_REPORT_CRON_NAME && payloadText === DAILY_REPORT_TRIGGER_TOKEN;
}
function buildManagedDailyReportPatch(job, desired) {
    const patch = {};
    if (normalizeTrimmedString(job.name) !== desired.name)
        patch.name = desired.name;
    if (normalizeTrimmedString(job.description) !== desired.description) {
        patch.description = desired.description;
    }
    if (job.enabled !== true)
        patch.enabled = true;
    const scheduleKind = normalizeTrimmedString(job.schedule?.kind)?.toLowerCase();
    const scheduleExpr = normalizeTrimmedString(job.schedule?.expr);
    const scheduleTz = normalizeTrimmedString(job.schedule?.tz);
    if (scheduleKind !== "cron" ||
        scheduleExpr !== desired.schedule?.expr ||
        scheduleTz !== (desired.schedule?.tz ?? undefined)) {
        patch.schedule = desired.schedule;
    }
    const desiredTarget = normalizeTrimmedString(desired.sessionTarget)?.toLowerCase();
    const currentTarget = normalizeTrimmedString(job.sessionTarget)?.toLowerCase();
    if (currentTarget !== desiredTarget)
        patch.sessionTarget = desired.sessionTarget;
    if (normalizeTrimmedString(job.wakeMode)?.toLowerCase() !== "now") {
        patch.wakeMode = "now";
    }
    const payloadKind = normalizeTrimmedString(job.payload?.kind)?.toLowerCase();
    const payloadText = normalizeTrimmedString(job.payload?.text ?? job.payload?.message);
    if (payloadKind !== "agentturn" || payloadText !== desired.payload?.message) {
        patch.payload = desired.payload;
    }
    if (job.delivery !== undefined)
        patch.delivery = undefined;
    return Object.keys(patch).length > 0 ? patch : null;
}
export function resolveCronServiceFromCandidate(candidate) {
    if (!candidate || typeof candidate !== "object")
        return null;
    const cron = candidate;
    if (typeof cron.list !== "function" ||
        typeof cron.add !== "function" ||
        typeof cron.update !== "function" ||
        typeof cron.remove !== "function") {
        return null;
    }
    return cron;
}
export function resolveCronFromGatewayStartupEvent(event) {
    const payload = event;
    if (payload?.type !== "gateway" || payload?.action !== "startup")
        return null;
    const context = payload.context;
    if (!context)
        return null;
    return (resolveCronServiceFromCandidate(context.cron) ??
        resolveCronServiceFromCandidate(context.deps && typeof context.deps === "object"
            ? context.deps.cron
            : null));
}
//# sourceMappingURL=cron.js.map