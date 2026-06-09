import type { DreamingConfig } from "./config.js";
import {
  DAILY_REPORT_TRIGGER_TOKEN,
  DREAMING_TRIGGER_TOKEN,
  MANAGED_DAILY_REPORT_CRON_NAME,
  MANAGED_DAILY_REPORT_CRON_TAG,
  MANAGED_DREAMING_CRON_NAME,
  MANAGED_DREAMING_CRON_TAG,
} from "./constants.js";
import { normalizeTrimmedString } from "./utils.js";

export type CronDelivery = {
  mode?: string;
  channel?: string;
  to?: string;
  threadId?: string | number;
  accountId?: string;
};

export type CronJob = {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  schedule?: { kind?: string; expr?: string; tz?: string };
  sessionTarget?: string;
  wakeMode?: string;
  payload?: { kind?: string; text?: string; message?: string; timeoutSeconds?: number };
  delivery?: CronDelivery;
  createdAtMs?: number;
};

export type CronService = {
  list: (opts?: { includeDisabled?: boolean }) => Promise<CronJob[]>;
  add: (job: Omit<CronJob, "id">) => Promise<unknown>;
  update: (id: string, patch: Partial<Omit<CronJob, "id">>) => Promise<unknown>;
  remove: (id: string) => Promise<{ removed?: boolean }>;
};

export type PluginLogger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug?: (message: string) => void;
};

type ReconcileResult = {
  status: "unavailable" | "disabled" | "added" | "updated" | "noop";
  removed: number;
};

function resolveManagedCronDescription(config: DreamingConfig): string {
  return `${MANAGED_DREAMING_CRON_TAG} LanceDB dreaming pipeline (deep limit=${config.deep.limit}, minScore=${config.deep.minScore.toFixed(3)}, cron=${config.cron}).`;
}

export function buildManagedDreamingCronJob(config: DreamingConfig) {
  return {
    name: MANAGED_DREAMING_CRON_NAME,
    description: resolveManagedCronDescription(config),
    enabled: true,
    schedule: {
      kind: "cron" as const,
      expr: config.cron,
      ...(config.timezone ? { tz: config.timezone } : {}),
    },
    sessionTarget: "main" as const,
    wakeMode: "now" as const,
    payload: {
      kind: "systemEvent" as const,
      text: DREAMING_TRIGGER_TOKEN,
    },
  };
}

function isManagedDreamingJob(job: CronJob): boolean {
  if (normalizeTrimmedString(job.description)?.includes(MANAGED_DREAMING_CRON_TAG)) return true;
  const name = normalizeTrimmedString(job.name);
  const payloadText = normalizeTrimmedString(job.payload?.text);
  return name === MANAGED_DREAMING_CRON_NAME && payloadText === DREAMING_TRIGGER_TOKEN;
}

/** Legacy crons that conflict with plugin-managed dreaming schedules. */
export function isLegacyConflictCronJob(job: CronJob): boolean {
  if (isManagedDreamingJob(job)) return false;

  const name = normalizeTrimmedString(job.name)?.toLowerCase() ?? "";
  const description = normalizeTrimmedString(job.description)?.toLowerCase() ?? "";

  if (name === "dreaming-plugin-healthcheck") return true;
  if (name.includes("dreaming") && name.includes("healthcheck")) return true;
  if (description.includes("dreaming-plugin-healthcheck")) return true;

  return false;
}

export async function removeLegacyConflictCronJobs(params: {
  cron: CronService;
  logger: PluginLogger;
}): Promise<number> {
  const allJobs = await params.cron.list({ includeDisabled: true });
  let removed = 0;

  for (const job of allJobs) {
    if (!isLegacyConflictCronJob(job)) continue;
    try {
      if ((await params.cron.remove(job.id)).removed === true) {
        removed += 1;
        params.logger.warn(
          `memory-lancedb-dreaming: removed legacy conflict cron job "${job.name ?? job.id}" (${job.id})`
        );
      }
    } catch (err) {
      params.logger.warn(
        `memory-lancedb-dreaming: failed to remove legacy conflict cron job ${job.id}: ${String(err)}`
      );
    }
  }

  return removed;
}

function sortManagedJobs(managed: CronJob[]): CronJob[] {
  return [...managed].sort((a, b) => {
    const aCreated =
      typeof a.createdAtMs === "number" && Number.isFinite(a.createdAtMs)
        ? a.createdAtMs
        : Number.MAX_SAFE_INTEGER;
    const bCreated =
      typeof b.createdAtMs === "number" && Number.isFinite(b.createdAtMs)
        ? b.createdAtMs
        : Number.MAX_SAFE_INTEGER;
    if (aCreated !== bCreated) return aCreated - bCreated;
    return a.id.localeCompare(b.id);
  });
}

function buildManagedDreamingPatch(
  job: CronJob,
  desired: Omit<CronJob, "id">
): Partial<Omit<CronJob, "id">> | null {
  const schedule = desired.schedule;
  const payload = desired.payload;
  if (!schedule?.expr || !payload?.text) return null;

  const patch: Partial<Omit<CronJob, "id">> = {};
  if (normalizeTrimmedString(job.name) !== desired.name) patch.name = desired.name;
  if (normalizeTrimmedString(job.description) !== desired.description) {
    patch.description = desired.description;
  }
  if (job.enabled !== true) patch.enabled = true;
  const scheduleKind = normalizeTrimmedString(job.schedule?.kind)?.toLowerCase();
  const scheduleExpr = normalizeTrimmedString(job.schedule?.expr);
  const scheduleTz = normalizeTrimmedString(job.schedule?.tz);
  if (
    scheduleKind !== "cron" ||
    scheduleExpr !== schedule.expr ||
    scheduleTz !== (schedule.tz ?? undefined)
  ) {
    patch.schedule = schedule;
  }
  if (normalizeTrimmedString(job.sessionTarget)?.toLowerCase() !== "main") {
    patch.sessionTarget = "main";
  }
  if (normalizeTrimmedString(job.wakeMode)?.toLowerCase() !== "now") {
    patch.wakeMode = "now";
  }
  const payloadKind = normalizeTrimmedString(job.payload?.kind)?.toLowerCase();
  const payloadText = normalizeTrimmedString(job.payload?.text);
  if (payloadKind !== "systemevent" || payloadText !== payload.text) {
    patch.payload = payload;
  }
  if (job.delivery !== undefined) patch.delivery = undefined;
  return Object.keys(patch).length > 0 ? patch : null;
}

export async function reconcileManagedDreamingCron(params: {
  cron: CronService | null;
  config: DreamingConfig;
  logger: PluginLogger;
}): Promise<ReconcileResult> {
  const { cron, config, logger } = params;
  if (!cron) return { status: "unavailable", removed: 0 };

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
  if (removed > 0) return { status: "noop", removed };
  return { status: dreaming.status === "unavailable" ? dreaming.status : daily.status, removed };
}

async function reconcileSingleManagedCron(params: {
  cron: CronService | null;
  config: DreamingConfig;
  logger: PluginLogger;
  enabled: boolean;
  isManaged: (job: CronJob) => boolean;
  buildDesired: (config: DreamingConfig) => Omit<CronJob, "id">;
  buildPatch: (
    job: CronJob,
    desired: Omit<CronJob, "id">
  ) => Partial<Omit<CronJob, "id">> | null;
  createLog: string;
  updateLog: string;
  pruneLog: string;
}): Promise<ReconcileResult> {
  const { cron, config, logger } = params;
  if (!cron) return { status: "unavailable", removed: 0 };

  const allJobs = await cron.list({ includeDisabled: true });
  const managed = allJobs.filter(params.isManaged);

  if (!params.enabled) {
    let disabledRemoved = 0;
    for (const job of managed) {
      try {
        if ((await cron.remove(job.id)).removed === true) disabledRemoved += 1;
      } catch (err) {
        logger.warn(
          `memory-lancedb-dreaming: failed to remove managed cron job ${job.id}: ${String(err)}`
        );
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
    } catch (err) {
      logger.error(
        `memory-lancedb-dreaming: failed to create managed cron job "${desired.name ?? "unknown"}": ${String(err)}`
      );
      return { status: "unavailable", removed: 0 };
    }
  }

  const [primary, ...duplicates] = sortManagedJobs(managed);
  let removed = 0;
  for (const duplicate of duplicates) {
    try {
      if ((await cron.remove(duplicate.id)).removed === true) removed += 1;
    } catch (err) {
      logger.warn(
        `memory-lancedb-dreaming: failed to prune duplicate cron job ${duplicate.id}: ${String(err)}`
      );
    }
  }

  const patch = params.buildPatch(primary, desired);
  if (!patch) {
    if (removed > 0) logger.info(params.pruneLog);
    return { status: "noop", removed };
  }

  try {
    await cron.update(primary.id, patch);
    logger.info(params.updateLog);
    return { status: "updated", removed };
  } catch (err) {
    logger.error(
      `memory-lancedb-dreaming: failed to update managed cron job "${primary.name ?? primary.id}": ${String(err)}`
    );
    return { status: "unavailable", removed };
  }
}

function resolveManagedDailyReportDescription(config: DreamingConfig): string {
  const delivery = config.dailyReport.delivery;
  const deliveryHint = delivery ? `delivery=${delivery.channel}` : "file-only";
  return `${MANAGED_DAILY_REPORT_CRON_TAG} Daily report (${deliveryHint}, cron=${config.dailyReport.cron}).`;
}

export function buildManagedDailyReportCronJob(config: DreamingConfig): Omit<CronJob, "id"> {
  const tz = config.dailyReport.timezone ?? config.timezone;
  return {
    name: MANAGED_DAILY_REPORT_CRON_NAME,
    description: resolveManagedDailyReportDescription(config),
    enabled: true,
    schedule: {
      kind: "cron" as const,
      expr: config.dailyReport.cron,
      ...(tz ? { tz } : {}),
    },
    // systemEvent requires main; channel delivery is done in-plugin (see daily-report/deliver.ts).
    sessionTarget: "main" as const,
    wakeMode: "now" as const,
    payload: {
      kind: "systemEvent" as const,
      text: DAILY_REPORT_TRIGGER_TOKEN,
    },
  };
}

function isManagedDailyReportJob(job: CronJob): boolean {
  if (normalizeTrimmedString(job.description)?.includes(MANAGED_DAILY_REPORT_CRON_TAG)) return true;
  const name = normalizeTrimmedString(job.name);
  const payloadText = normalizeTrimmedString(job.payload?.text);
  return name === MANAGED_DAILY_REPORT_CRON_NAME && payloadText === DAILY_REPORT_TRIGGER_TOKEN;
}

function buildManagedDailyReportPatch(
  job: CronJob,
  desired: Omit<CronJob, "id">
): Partial<Omit<CronJob, "id">> | null {
  const patch: Partial<Omit<CronJob, "id">> = {};
  if (normalizeTrimmedString(job.name) !== desired.name) patch.name = desired.name;
  if (normalizeTrimmedString(job.description) !== desired.description) {
    patch.description = desired.description;
  }
  if (job.enabled !== true) patch.enabled = true;
  const scheduleKind = normalizeTrimmedString(job.schedule?.kind)?.toLowerCase();
  const scheduleExpr = normalizeTrimmedString(job.schedule?.expr);
  const scheduleTz = normalizeTrimmedString(job.schedule?.tz);
  if (
    scheduleKind !== "cron" ||
    scheduleExpr !== desired.schedule?.expr ||
    scheduleTz !== (desired.schedule?.tz ?? undefined)
  ) {
    patch.schedule = desired.schedule;
  }
  const desiredTarget = normalizeTrimmedString(desired.sessionTarget)?.toLowerCase();
  const currentTarget = normalizeTrimmedString(job.sessionTarget)?.toLowerCase();
  if (currentTarget !== desiredTarget) patch.sessionTarget = desired.sessionTarget;
  if (normalizeTrimmedString(job.wakeMode)?.toLowerCase() !== "now") {
    patch.wakeMode = "now";
  }
  const payloadKind = normalizeTrimmedString(job.payload?.kind)?.toLowerCase();
  const payloadText = normalizeTrimmedString(job.payload?.text);
  if (payloadKind !== "systemevent" || payloadText !== desired.payload?.text) {
    patch.payload = desired.payload;
  }
  if (job.delivery !== undefined) patch.delivery = undefined;
  return Object.keys(patch).length > 0 ? patch : null;
}

export function resolveCronServiceFromCandidate(candidate: unknown): CronService | null {
  if (!candidate || typeof candidate !== "object") return null;
  const cron = candidate as CronService;
  if (
    typeof cron.list !== "function" ||
    typeof cron.add !== "function" ||
    typeof cron.update !== "function" ||
    typeof cron.remove !== "function"
  ) {
    return null;
  }
  return cron;
}

export function resolveCronFromGatewayStartupEvent(event: unknown): CronService | null {
  const payload = event as { type?: string; action?: string; context?: { cron?: unknown; deps?: { cron?: unknown } } };
  if (payload?.type !== "gateway" || payload?.action !== "startup") return null;
  const context = payload.context;
  if (!context) return null;
  return (
    resolveCronServiceFromCandidate(context.cron) ??
    resolveCronServiceFromCandidate(
      context.deps && typeof context.deps === "object"
        ? (context.deps as { cron?: unknown }).cron
        : null
    )
  );
}
