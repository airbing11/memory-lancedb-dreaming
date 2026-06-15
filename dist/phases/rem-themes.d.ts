import type { RemConfig } from "../config.js";
import type { LanceMemoryEntry } from "../memory-db.js";
import type { PluginLogger } from "../cron.js";
import type { LlmCompleteFn, SubagentRuntime } from "../types.js";
export type RemCluster = {
    tag: string;
    strength: number;
    count: number;
    memories: LanceMemoryEntry[];
    spotlightMemories: LanceMemoryEntry[];
};
export declare function buildTagClusters(entries: LanceMemoryEntry[], limit: number, minPatternStrength: number): RemCluster[];
export declare function formatRemReflectionLines(clusters: RemCluster[], themeNames: Array<{
    zh: string;
    en: string;
} | null>): string[];
export declare function nameRemClusters(params: {
    clusters: RemCluster[];
    config: RemConfig;
    subagent?: SubagentRuntime;
    llmComplete?: LlmCompleteFn;
    workspaceDir: string;
    nowMs: number;
    logger: PluginLogger;
}): Promise<Array<{
    zh: string;
    en: string;
} | null>>;
//# sourceMappingURL=rem-themes.d.ts.map