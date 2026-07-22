import type { DreamingState, DreamingStateEntry } from "./state.js";
export declare const VECTOR_DEDUPE_THRESHOLD = 0.92;
export declare const TEXT_DEDUPE_THRESHOLD = 0.88;
/** Replace a text file atomically so interruption cannot leave a partial document. */
export declare function atomicWriteTextFile(filePath: string, content: string): Promise<void>;
export declare function normalizeTrimmedString(value: unknown): string | undefined;
export declare function includesSystemEventToken(body: string, token: string): boolean;
export declare function calculateLookbackCutoffMs(nowMs: number, lookbackDays: number): number;
export declare function isDayWithinLookback(day: string, cutoffMs: number): boolean;
export declare function memoryEntryWithinLookback(entry: DreamingStateEntry | undefined, cutoffMs: number, options?: {
    includeWhenNoState?: boolean;
}): boolean;
export declare function filterMemoriesByLookback<T extends {
    id: string;
}>(memories: T[], state: DreamingState, nowMs: number, lookbackDays: number, options?: {
    includeWhenNoState?: boolean;
}): T[];
export declare function dedupeMemories<T extends {
    id: string;
    text: string;
    vector?: number[];
}>(entries: T[], textThreshold?: number, vectorThreshold?: number): T[];
export declare function clampScore(value: number): number;
export declare function formatDreamingDay(epochMs: number, timezone: string): string;
export declare function cosineSimilarity(left: number[], right: number[]): number;
export declare function tokenizeSnippet(snippet: string): Set<string>;
export declare function jaccardSimilarity(left: string, right: string): number;
/** Lowercase and strip punctuation/whitespace, keeping CJK + alphanumerics. */
export declare function normalizeTextForCompare(value: string): string;
/**
 * Similarity (0-1) that handles both Latin and CJK text. Uses the max of
 * token-level Jaccard (good for English) and character-bigram Jaccard (good for
 * Chinese), so "同一主题、不同措辞" still scores high enough to dedupe.
 */
export declare function textSimilarityCjkAware(left: string, right: string): number;
export declare function hashQuery(value: string): string;
export declare function createAsyncLock(): <T>(fn: () => Promise<T>) => Promise<T>;
export declare function withTrailingNewline(content: string): string;
export declare function calculateRecencyComponent(ageDays: number, halfLifeDays: number): number;
//# sourceMappingURL=utils.d.ts.map