export type DailyReportDeliveryState = {
    version: 1;
    lastContentFingerprint: string;
    lastDeliveredDay: string;
    lastDeliveredAt: string;
};
export declare function readDailyReportDeliveryState(workspaceDir: string): Promise<DailyReportDeliveryState | null>;
export declare function writeDailyReportDeliveryState(params: {
    workspaceDir: string;
    state: DailyReportDeliveryState;
}): Promise<string>;
//# sourceMappingURL=delivery-state.d.ts.map