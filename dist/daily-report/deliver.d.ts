import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import type { DailyReportDelivery } from "../config.js";
import type { PluginLogger } from "../cron.js";
export declare function deliverDailyReportMessage(params: {
    api: OpenClawPluginApi;
    delivery: DailyReportDelivery;
    text: string;
    logger: PluginLogger;
}): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}>;
//# sourceMappingURL=deliver.d.ts.map