import { NARRATIVE_DELETE_SETTLE_TIMEOUT_MS, NARRATIVE_TIMEOUT_MS } from "./constants.js";
export function extractAssistantText(messages) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        const msg = messages[i];
        if (!msg || typeof msg !== "object" || Array.isArray(msg))
            continue;
        const record = msg;
        if (record.role !== "assistant")
            continue;
        if (typeof record.content === "string" && record.content.trim().length > 0) {
            return record.content.trim();
        }
        if (Array.isArray(record.content)) {
            const text = record.content
                .filter((part) => Boolean(part) &&
                typeof part === "object" &&
                !Array.isArray(part) &&
                part.type === "text" &&
                typeof part.text === "string")
                .map((part) => part.text)
                .join("\n")
                .trim();
            if (text.length > 0)
                return text;
        }
    }
    return null;
}
async function runLlmCompleteFallback(params) {
    try {
        const result = await params.llmComplete({
            model: params.model,
            systemPrompt: params.systemPrompt,
            messages: [{ role: "user", content: params.message }],
            purpose: `memory-lancedb-dreaming:${params.logLabel}`,
        });
        const text = (result.text ?? result.content ?? "").trim();
        if (text.length > 0) {
            params.logger.info(`memory-lancedb-dreaming: ${params.logLabel} succeeded via runtime.llm.complete`);
            return text;
        }
    }
    catch (err) {
        params.logger.warn(`memory-lancedb-dreaming: ${params.logLabel} llm.complete failed: ${String(err)}`);
    }
    return null;
}
export async function runDreamingTextPrompt(params) {
    if (!params.subagent && !params.llmComplete)
        return null;
    if (params.subagent) {
        const timeoutMs = params.timeoutMs ?? NARRATIVE_TIMEOUT_MS;
        let runId = null;
        let waitStatus = null;
        try {
            const run = await params.subagent.run({
                idempotencyKey: params.sessionKey,
                sessionKey: params.sessionKey,
                message: params.message,
                extraSystemPrompt: params.systemPrompt,
                deliver: false,
                ...(params.model ? { model: params.model } : {}),
            });
            runId = run.runId;
            const result = await params.subagent.waitForRun({ runId, timeoutMs });
            waitStatus = result.status;
            if (result.status !== "ok") {
                params.logger.warn(`memory-lancedb-dreaming: ${params.logLabel} ended with status=${result.status}`);
            }
            else {
                const { messages } = await params.subagent.getSessionMessages({
                    sessionKey: params.sessionKey,
                    limit: 5,
                });
                const text = extractAssistantText(messages);
                if (text)
                    return text;
                params.logger.warn(`memory-lancedb-dreaming: ${params.logLabel} produced no assistant text`);
            }
        }
        catch (err) {
            params.logger.warn(`memory-lancedb-dreaming: ${params.logLabel} failed: ${String(err)}`);
        }
        finally {
            if (runId && waitStatus === "timeout") {
                try {
                    await params.subagent.waitForRun({
                        runId,
                        timeoutMs: NARRATIVE_DELETE_SETTLE_TIMEOUT_MS,
                    });
                }
                catch {
                    // ignore settle failures
                }
            }
            try {
                await params.subagent.deleteSession({
                    sessionKey: params.sessionKey,
                    deleteTranscript: true,
                });
            }
            catch (err) {
                params.logger.warn(`memory-lancedb-dreaming: ${params.logLabel} session cleanup failed: ${String(err)}`);
            }
        }
    }
    if (!params.llmComplete)
        return null;
    return runLlmCompleteFallback({
        llmComplete: params.llmComplete,
        model: params.model,
        systemPrompt: params.systemPrompt,
        message: params.message,
        logger: params.logger,
        logLabel: params.logLabel,
    });
}
/** @deprecated Use runDreamingTextPrompt */
export async function runSubagentTextPrompt(params) {
    return runDreamingTextPrompt(params);
}
//# sourceMappingURL=llm-subagent.js.map