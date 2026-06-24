import type { LanceMemoryEntry } from "./memory-db.js";
export type LastingTruthSelection = {
    selected: LanceMemoryEntry[];
    skippedRecent: number;
    skippedSimilar: number;
    skippedPromoted: number;
    usedFallback: boolean;
};
export declare function selectLastingTruths(params: {
    entries: LanceMemoryEntry[];
    limit: number;
    recentMemoryIds: Set<string>;
    /** v0.2.8: TEXTS surfaced in recent REM runs; near-duplicates are skipped. */
    recentTruthTexts?: string[];
    /** v0.2.8: similarity (0-1) at/above which a candidate is a repeat. >1 disables. */
    truthSimilarityThreshold?: number;
    /** v0.2.8: memoryIds already promoted into MEMORY.md; skipped when excludePromoted. */
    promotedMemoryIds?: Set<string>;
    excludePromoted?: boolean;
}): LastingTruthSelection;
export declare function pickClusterSpotlightMemories(params: {
    memories: LanceMemoryEntry[];
    recentSpotlightIds: Set<string>;
    day: string;
    count: number;
}): LanceMemoryEntry[];
//# sourceMappingURL=rem-diversity.d.ts.map