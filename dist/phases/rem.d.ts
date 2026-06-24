import type { RemConfig } from "../config.js";
import type { MemoryDB } from "../memory-db.js";
import type { LanceMemoryEntry } from "../memory-db.js";
import type { PluginLogger } from "../cron.js";
import type { DreamingPhaseResult, LlmCompleteFn, SubagentRuntime } from "../types.js";
export declare function runRemSleep(params: {
    db: MemoryDB;
    workspaceDir: string;
    config: RemConfig;
    timezone: string;
    nowMs: number;
    listMemories: () => Promise<LanceMemoryEntry[]>;
    subagent?: SubagentRuntime;
    llmComplete?: LlmCompleteFn;
    logger?: PluginLogger;
    /** v0.2.8: set by the pipeline after a long promotion drought (Deep idle streak). */
    noveltyMode?: boolean;
}): Promise<DreamingPhaseResult>;
//# sourceMappingURL=rem.d.ts.map