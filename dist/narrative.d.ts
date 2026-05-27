import type { NarrativeConfig } from "./config.js";
import type { PluginLogger } from "./cron.js";
import type { LlmCompleteFn, SubagentRuntime } from "./types.js";
export declare function generateAndAppendDreamNarrative(params: {
    subagent?: SubagentRuntime;
    llmComplete?: LlmCompleteFn;
    workspaceDir: string;
    config: NarrativeConfig;
    mode: "promotion" | "snapshot";
    snippets: string[];
    promotions: string[];
    themes?: string[];
    nowMs: number;
    timezone: string;
    logger: PluginLogger;
}): Promise<boolean>;
//# sourceMappingURL=narrative.d.ts.map