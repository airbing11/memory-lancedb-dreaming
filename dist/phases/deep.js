import fs from "node:fs/promises";
import path from "node:path";
import { resolveDeepConfig } from "../config.js";
import { PROMOTION_MARKER_PREFIX } from "../constants.js";
import { readDreamingState, writeDreamingState } from "../state.js";
import { formatDreamingDay, withTrailingNewline } from "../utils.js";
import { writePhaseReport } from "./reports.js";
import { rankPromotionCandidates } from "./scoring.js";
function extractPromotionMarkers(memoryText) {
    const markers = new Set();
    const re = new RegExp(`<!--\\s*${PROMOTION_MARKER_PREFIX}([^\\n]+?)\\s*-->`, "gi");
    for (const match of memoryText.matchAll(re)) {
        const key = match[1]?.trim();
        if (key)
            markers.add(key);
    }
    return markers;
}
function buildPromotionSection(candidates, nowMs, timezone) {
    const lines = [
        "",
        `## Promoted From LanceDB Memory (${formatDreamingDay(nowMs, timezone)})`,
        "",
    ];
    for (const candidate of candidates) {
        lines.push(`<!-- ${PROMOTION_MARKER_PREFIX}${candidate.memoryId} -->`);
        lines.push(`- ${candidate.text} [score=${candidate.score.toFixed(3)} recalls=${candidate.recallCount} category=${candidate.category} source=lancedb:${candidate.memoryId}]`);
    }
    lines.push("");
    return lines.join("\n");
}
export async function runDeepSleep(params) {
    const state = await readDreamingState(params.workspaceDir);
    const memories = await params.listMemories();
    const deepConfig = resolveDeepConfig(params.config);
    const candidates = rankPromotionCandidates({
        memories,
        state,
        config: deepConfig,
        nowMs: params.nowMs,
    });
    const memoryPath = path.join(params.workspaceDir, "MEMORY.md");
    const existingMemory = await fs.readFile(memoryPath, "utf-8").catch((err) => {
        if (err?.code === "ENOENT")
            return "";
        throw err;
    });
    const existingMarkers = extractPromotionMarkers(existingMemory);
    const toAppend = candidates.filter((candidate) => !existingMarkers.has(candidate.memoryId));
    if (toAppend.length > 0) {
        const header = existingMemory.trim().length > 0 ? "" : "# Long-Term Memory\n\n";
        const section = buildPromotionSection(toAppend, params.nowMs, params.timezone);
        await fs.writeFile(memoryPath, `${header}${withTrailingNewline(existingMemory)}${section}`, "utf-8");
        const nowIso = new Date(params.nowMs).toISOString();
        for (const candidate of toAppend) {
            const entry = state.entries[candidate.memoryId] ?? candidate.state;
            entry.promotedAt = nowIso;
            state.entries[candidate.memoryId] = entry;
        }
        await writeDreamingState(params.workspaceDir, state);
    }
    const bodyLines = [
        `- Ranked ${candidates.length} candidate(s) for durable promotion.`,
        `- Promoted ${toAppend.length} new candidate(s) into MEMORY.md.`,
        ...(candidates.length > toAppend.length
            ? [`- Skipped ${candidates.length - toAppend.length} already-promoted candidate(s).`]
            : []),
    ];
    await writePhaseReport({
        workspaceDir: params.workspaceDir,
        phase: "deep",
        bodyLines,
        nowMs: params.nowMs,
        timezone: params.timezone,
    });
    return {
        bodyLines,
        applied: toAppend,
        promotions: candidates,
    };
}
//# sourceMappingURL=deep.js.map