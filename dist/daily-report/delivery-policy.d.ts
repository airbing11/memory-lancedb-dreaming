import type { DailyReportPublishResult } from "./types.js";
export type DailyReportDeliverySkipReason = "no_phases" | "unchanged";
export declare function evaluateDailyReportDelivery(params: {
    workspaceDir: string;
    published: DailyReportPublishResult;
    pushOn: "always" | "changed";
}): Promise<{
    deliver: true;
} | {
    deliver: false;
    reason: DailyReportDeliverySkipReason;
}>;
//# sourceMappingURL=delivery-policy.d.ts.map