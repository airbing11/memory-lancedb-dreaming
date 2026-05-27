import type { PluginLogger } from "./cron.js";
import type { LlmCompleteFn, SubagentRuntime } from "./types.js";
export declare function extractAssistantText(messages: unknown[]): string | null;
export declare function runDreamingTextPrompt(params: {
    subagent?: SubagentRuntime;
    llmComplete?: LlmCompleteFn;
    sessionKey: string;
    message: string;
    systemPrompt: string;
    model?: string;
    logger: PluginLogger;
    logLabel: string;
    timeoutMs?: number;
}): Promise<string | null>;
/** @deprecated Use runDreamingTextPrompt */
export declare function runSubagentTextPrompt(params: {
    subagent: SubagentRuntime;
    sessionKey: string;
    message: string;
    systemPrompt: string;
    model?: string;
    logger: PluginLogger;
    logLabel: string;
    timeoutMs?: number;
    llmComplete?: LlmCompleteFn;
}): Promise<string | null>;
//# sourceMappingURL=llm-subagent.d.ts.map