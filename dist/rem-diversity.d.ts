import type { LanceMemoryEntry } from "./memory-db.js";
export declare function selectLastingTruths(params: {
    entries: LanceMemoryEntry[];
    limit: number;
    recentMemoryIds: Set<string>;
}): {
    selected: LanceMemoryEntry[];
    skippedRecent: number;
    usedFallback: boolean;
};
export declare function pickClusterSpotlightMemories(params: {
    memories: LanceMemoryEntry[];
    recentSpotlightIds: Set<string>;
    day: string;
    count: number;
}): LanceMemoryEntry[];
//# sourceMappingURL=rem-diversity.d.ts.map