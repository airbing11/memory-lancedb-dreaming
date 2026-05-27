import type { DailyReportConfig } from "../config.js";
import type { PluginLogger } from "../cron.js";
import type { DailyReportPublishResult, DailyReportSnapshot } from "./types.js";
export declare const DAILY_REPORT_START_MARKER = "<!-- openclaw:dreaming:daily-report:start -->";
export declare const DAILY_REPORT_END_MARKER = "<!-- openclaw:dreaming:daily-report:end -->";
export declare function writeDailyReportArchive(params: {
    workspaceDir: string;
    day: string;
    text: string;
}): Promise<string>;
export declare function publishDailyReport(params: {
    workspaceDir: string;
    config: DailyReportConfig;
    timezone: string;
    day: string;
    nowMs?: number;
    snapshot?: DailyReportSnapshot;
    logger?: PluginLogger;
}): Promise<DailyReportPublishResult>;
//# sourceMappingURL=publish.d.ts.map