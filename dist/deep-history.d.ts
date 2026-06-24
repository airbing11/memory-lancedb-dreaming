export type DeepHistoryRun = {
    day: string;
    promoted: number;
};
export type DeepHistory = {
    version: 1;
    runs: DeepHistoryRun[];
};
export declare function readDeepHistory(workspaceDir: string): Promise<DeepHistory>;
export declare function appendDeepHistoryRun(params: {
    workspaceDir: string;
    day: string;
    promoted: number;
}): Promise<void>;
/**
 * Count the most recent consecutive days (optionally excluding `excludeDay`,
 * i.e. today) whose deep phase promoted 0 memories. Used to trigger REM novelty
 * mode after a long promotion drought.
 */
export declare function countConsecutiveIdleDays(params: {
    history: DeepHistory;
    excludeDay?: string;
}): number;
//# sourceMappingURL=deep-history.d.ts.map