import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import type { LlmCompleteFn, SubagentRuntime } from "./types.js";
export declare function resolveSubagentRuntime(api: OpenClawPluginApi): SubagentRuntime | undefined;
export declare function resolveLlmCompleteRuntime(api: OpenClawPluginApi): LlmCompleteFn | undefined;
export declare function isSubagentRuntimeAvailable(api: OpenClawPluginApi): boolean;
export declare function isLlmCompleteAvailable(api: OpenClawPluginApi): boolean;
export declare function resolveDreamingLlmRuntime(api: OpenClawPluginApi): {
    subagent?: SubagentRuntime;
    llmComplete?: LlmCompleteFn;
};
//# sourceMappingURL=subagent-runtime.d.ts.map