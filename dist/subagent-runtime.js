export function resolveSubagentRuntime(api) {
    const runtime = api.runtime;
    const subagent = runtime?.subagent ?? runtime?.deps?.subagent;
    if (!subagent)
        return undefined;
    if (typeof subagent.run !== "function" || typeof subagent.waitForRun !== "function") {
        return undefined;
    }
    return subagent;
}
export function resolveLlmCompleteRuntime(api) {
    const runtime = api.runtime;
    const complete = runtime?.llm?.complete;
    return typeof complete === "function" ? complete : undefined;
}
export function isSubagentRuntimeAvailable(api) {
    return resolveSubagentRuntime(api) !== undefined;
}
export function isLlmCompleteAvailable(api) {
    return resolveLlmCompleteRuntime(api) !== undefined;
}
export function resolveDreamingLlmRuntime(api) {
    return {
        subagent: resolveSubagentRuntime(api),
        llmComplete: resolveLlmCompleteRuntime(api),
    };
}
//# sourceMappingURL=subagent-runtime.js.map