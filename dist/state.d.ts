export type DreamingStateEntry = {
    recallCount: number;
    queryHashes: string[];
    recallDays: string[];
    lightHits: number;
    remHits: number;
    promotedAt?: string;
    lastSeenAt: string;
};
export type DreamingState = {
    version: 1;
    updatedAt: string;
    entries: Record<string, DreamingStateEntry>;
};
export declare function readDreamingState(workspaceDir: string): Promise<DreamingState>;
export declare function writeDreamingState(workspaceDir: string, state: DreamingState): Promise<void>;
export declare function touchMemoryRecall(workspaceDir: string, memoryId: string, options: {
    query?: string;
    timezone: string;
    nowMs: number;
}): Promise<void>;
export declare function recordPhaseSignals(workspaceDir: string, memoryIds: string[], phase: "light" | "rem", nowMs: number): Promise<void>;
export declare function getStateEntry(state: DreamingState, memoryId: string): DreamingStateEntry | undefined;
//# sourceMappingURL=state.d.ts.map