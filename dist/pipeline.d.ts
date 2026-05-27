import type { DreamingConfig } from "./config.js";
import type { PluginLogger } from "./cron.js";
import type { MemoryDB } from "./memory-db.js";
import type { DreamingLlmRuntime } from "./types.js";
export type DreamingRunResult = {
    lightCount: number;
    remCount: number;
    promotedCount: number;
    narrativeWritten: boolean;
    remBodyLines?: string[];
    phasesRan: {
        light: boolean;
        rem: boolean;
        deep: boolean;
    };
};
export declare function runDreamingPipeline(params: {
    db: MemoryDB;
    workspaceDir: string;
    config: DreamingConfig;
    logger: PluginLogger;
    llm?: DreamingLlmRuntime;
    phase?: "light" | "rem" | "deep" | "all";
}): Promise<DreamingRunResult>;
//# sourceMappingURL=pipeline.d.ts.map