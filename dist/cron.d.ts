import type { DreamingConfig } from "./config.js";
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
    schedule?: {
        kind?: string;
        expr?: string;
        tz?: string;
    };
    sessionTarget?: string;
    wakeMode?: string;
    payload?: {
        kind?: string;
        text?: string;
        message?: string;
        timeoutSeconds?: number;
    };
    delivery?: CronDelivery;
    createdAtMs?: number;
};
export type CronService = {
    list: (opts?: {
        includeDisabled?: boolean;
    }) => Promise<CronJob[]>;
    add: (job: Omit<CronJob, "id">) => Promise<unknown>;
    update: (id: string, patch: Partial<Omit<CronJob, "id">>) => Promise<unknown>;
    remove: (id: string) => Promise<{
        removed?: boolean;
    }>;
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
export declare function buildManagedDreamingCronJob(config: DreamingConfig): {
    name: string;
    description: string;
    enabled: boolean;
    schedule: {
        tz?: string | undefined;
        kind: "cron";
        expr: string;
    };
    sessionTarget: "main";
    wakeMode: "now";
    payload: {
        kind: "systemEvent";
        text: string;
    };
};
/** Legacy crons that conflict with plugin-managed dreaming schedules. */
export declare function isLegacyConflictCronJob(job: CronJob): boolean;
export declare function removeLegacyConflictCronJobs(params: {
    cron: CronService;
    logger: PluginLogger;
}): Promise<number>;
export declare function reconcileManagedDreamingCron(params: {
    cron: CronService | null;
    config: DreamingConfig;
    logger: PluginLogger;
}): Promise<ReconcileResult>;
/** Avoid daily report cron firing before/at the same instant as the dreaming pipeline. */
export declare function resolveEffectiveDailyReportCronExpr(config: DreamingConfig): {
    expr: string;
    collidedWithDreamingCron: boolean;
};
export declare function buildManagedDailyReportCronJob(config: DreamingConfig): Omit<CronJob, "id">;
export declare function resolveCronServiceFromCandidate(candidate: unknown): CronService | null;
export declare function resolveCronFromGatewayStartupEvent(event: unknown): CronService | null;
export {};
//# sourceMappingURL=cron.d.ts.map