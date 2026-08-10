export type RemHistoryRun = {
    day: string;
    lastingTruthIds: string[];
    clusterSpotlightIds: string[];
    /** Added v0.2.8: truth TEXTS surfaced that day, for semantic (text-level) repeat detection. */
    lastingTruthTexts?: string[];
    /** Added v0.2.8: REM cluster theme names surfaced that day. */
    clusterThemeNames?: string[];
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
    lastingTruthTexts?: string[];
    clusterThemeNames?: string[];
}): Promise<void>;
export declare function collectRecentRemMemoryIds(params: {
    history: RemHistory;
    nowMs: number;
    timezone: string;
    cooldownDays: number;
    field: "lastingTruthIds" | "clusterSpotlightIds";
    excludeDay?: string;
}): Set<string>;
/** Collect lasting-truth TEXTS surfaced within `windowDays` (for text-level repeat detection). */
export declare function collectRecentRemTruthTexts(params: {
    history: RemHistory;
    nowMs: number;
    windowDays: number;
    excludeDay?: string;
}): string[];
export declare function collectRecentRemThemeNames(params: {
    history: RemHistory;
    nowMs: number;
    windowDays: number;
    excludeDay?: string;
}): string[];
export declare function resolveRemReportDay(nowMs: number, timezone: string): string;
//# sourceMappingURL=rem-history.d.ts.map