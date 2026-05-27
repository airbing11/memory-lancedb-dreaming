import { readDreamingState, recordPhaseSignals, touchMemoryRecall } from "../state.js";
import { dedupeMemories, filterMemoriesByLookback } from "../utils.js";
import { appendDailyMemoryBlock, writePhaseReport } from "./reports.js";
function buildLightBody(entries) {
    if (entries.length === 0)
        return ["- No notable updates."];
    const lines = [];
    for (const entry of entries) {
        lines.push(`- Candidate: ${entry.text}`);
        lines.push(`  - category: ${entry.category}`);
        lines.push(`  - importance: ${entry.importance.toFixed(2)}`);
        lines.push(`  - memoryId: ${entry.id}`);
        lines.push(`  - status: staged`);
    }
    return lines;
}
export async function runLightSleep(params) {
    const state = await readDreamingState(params.workspaceDir);
    const raw = await params.listMemories();
    const recent = filterMemoriesByLookback(raw.filter((entry) => entry.id !== "__schema__" && entry.text.trim().length > 0), state, params.nowMs, params.config.lookbackDays).sort((a, b) => b.importance - a.importance);
    const deduped = dedupeMemories(recent).slice(0, params.config.limit);
    for (const entry of deduped) {
        await touchMemoryRecall(params.workspaceDir, entry.id, {
            query: entry.text.slice(0, 120),
            timezone: params.timezone,
            nowMs: params.nowMs,
        });
    }
    const bodyLines = buildLightBody(deduped);
    await writePhaseReport({
        workspaceDir: params.workspaceDir,
        phase: "light",
        bodyLines,
        nowMs: params.nowMs,
        timezone: params.timezone,
    });
    await appendDailyMemoryBlock({
        workspaceDir: params.workspaceDir,
        heading: "## Light Sleep",
        startMarker: "<!-- openclaw:dreaming:light:start -->",
        endMarker: "<!-- openclaw:dreaming:light:end -->",
        bodyLines,
        nowMs: params.nowMs,
        timezone: params.timezone,
    });
    await recordPhaseSignals(params.workspaceDir, deduped.map((entry) => entry.id), "light", params.nowMs);
    return {
        phase: "light",
        bodyLines,
        memoryIds: deduped.map((entry) => entry.id),
        snippets: deduped.map((entry) => entry.text).filter(Boolean),
    };
}
//# sourceMappingURL=light.js.map