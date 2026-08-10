export type NarrativeHistoryRun = {
    day: string;
    sourceSnippets: string[];
    narrativeText: string;
};
export type NarrativeHistory = {
    version: 1;
    runs: NarrativeHistoryRun[];
};
export declare function readNarrativeHistory(workspaceDir: string): Promise<NarrativeHistory>;
export declare function appendNarrativeHistoryRun(params: {
    workspaceDir: string;
    day: string;
    sourceSnippets: string[];
    narrativeText: string;
}): Promise<void>;
export declare function filterNovelNarrativeSnippets(params: {
    snippets: string[];
    history: NarrativeHistory;
    nowMs: number;
    windowDays: number;
    similarityThreshold: number;
    excludeDay?: string;
}): {
    selected: string[];
    skipped: number;
};
export declare function isNarrativeOutputRepeated(params: {
    narrativeText: string;
    history: NarrativeHistory;
    nowMs: number;
    windowDays: number;
    similarityThreshold: number;
    excludeDay?: string;
}): boolean;
//# sourceMappingURL=narrative-history.d.ts.map