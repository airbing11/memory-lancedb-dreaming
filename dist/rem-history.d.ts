export type RemHistoryRun = {
    day: string;
    lastingTruthIds: string[];
    clusterSpotlightIds: string[];
};
export type RemHistory = {
    version: 1;
    runs: RemHistoryRun[];
};
export declare function readRemHistory(workspaceDir: string): Promise<RemHistory>;
export declare function appendRemHistoryRun(params: {
    workspaceDir: string;
    day: string;
    lastingTruthIds: string[];
    clusterSpotlightIds: string[];
}): Promise<void>;
export declare function collectRecentRemMemoryIds(params: {
    history: RemHistory;
    nowMs: number;
    timezone: string;
    cooldownDays: number;
    field: "lastingTruthIds" | "clusterSpotlightIds";
    excludeDay?: string;
}): Set<string>;
export declare function resolveRemReportDay(nowMs: number, timezone: string): string;
//# sourceMappingURL=rem-history.d.ts.map