import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import type { LlmCompleteFn, SubagentRuntime } from "./types.js";

export function resolveSubagentRuntime(api: OpenClawPluginApi): SubagentRuntime | undefined {
  const runtime = api.runtime as
    | {
        subagent?: SubagentRuntime;
        deps?: { subagent?: SubagentRuntime };
      }
    | undefined;
  const subagent = runtime?.subagent ?? runtime?.deps?.subagent;
  if (!subagent) return undefined;
  if (typeof subagent.run !== "function" || typeof subagent.waitForRun !== "function") {
    return undefined;
  }
  return subagent;
}

export function resolveLlmCompleteRuntime(api: OpenClawPluginApi): LlmCompleteFn | undefined {
  const runtime = api.runtime as unknown as {
    llm?: { complete?: LlmCompleteFn };
  };
  const complete = runtime?.llm?.complete;
  return typeof complete === "function" ? complete : undefined;
}

export function isSubagentRuntimeAvailable(api: OpenClawPluginApi): boolean {
  return resolveSubagentRuntime(api) !== undefined;
}

export function isLlmCompleteAvailable(api: OpenClawPluginApi): boolean {
  return resolveLlmCompleteRuntime(api) !== undefined;
}

export function resolveDreamingLlmRuntime(api: OpenClawPluginApi): {
  subagent?: SubagentRuntime;
  llmComplete?: LlmCompleteFn;
} {
  return {
    subagent: resolveSubagentRuntime(api),
    llmComplete: resolveLlmCompleteRuntime(api),
  };
}
