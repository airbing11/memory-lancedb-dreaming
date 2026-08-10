import fs from "node:fs/promises";
import path from "node:path";
import { calculateLookbackCutoffMs, textSimilarityCjkAware } from "./utils.js";
const NARRATIVE_HISTORY_RELATIVE_PATH = [
    "memory",
    ".dreams",
    "lancedb-dreaming-narrative-history.json",
];
const MAX_RETAINED_RUNS = 60;
function emptyHistory() {
    return { version: 1, runs: [] };
}
function resolveNarrativeHistoryPath(workspaceDir) {
    return path.join(workspaceDir, ...NARRATIVE_HISTORY_RELATIVE_PATH);
}
export async function readNarrativeHistory(workspaceDir) {
    try {
        const raw = await fs.readFile(resolveNarrativeHistoryPath(workspaceDir), "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.runs))
            return emptyHistory();
        return parsed;
    }
    catch (err) {
        const code = err?.code;
        if (code === "ENOENT" || err instanceof SyntaxError)
            return emptyHistory();
        throw err;
    }
}
export async function appendNarrativeHistoryRun(params) {
    const historyPath = resolveNarrativeHistoryPath(params.workspaceDir);
    const history = await readNarrativeHistory(params.workspaceDir);
    const runs = history.runs.slice();
    runs.push({
        day: params.day,
        sourceSnippets: params.sourceSnippets.map((text) => text.trim()).filter(Boolean),
        narrativeText: params.narrativeText.trim(),
    });
    runs.sort((a, b) => a.day.localeCompare(b.day));
    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    const tmpPath = `${historyPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, `${JSON.stringify({ version: 1, runs: runs.slice(-MAX_RETAINED_RUNS) }, null, 2)}\n`, "utf-8");
    await fs.rename(tmpPath, historyPath);
}
function recentRuns(params) {
    const cutoffMs = calculateLookbackCutoffMs(params.nowMs, params.windowDays);
    return params.history.runs.filter((run) => {
        if (params.excludeDay && run.day === params.excludeDay)
            return false;
        const dayMs = Date.parse(`${run.day}T12:00:00.000Z`);
        return Number.isFinite(dayMs) && dayMs >= cutoffMs;
    });
}
export function filterNovelNarrativeSnippets(params) {
    const recentSources = recentRuns(params).flatMap((run) => run.sourceSnippets);
    const selected = [];
    let skipped = 0;
    for (const snippet of params.snippets) {
        const text = snippet.trim();
        if (!text)
            continue;
        const isRepeat = [...recentSources, ...selected].some((recent) => textSimilarityCjkAware(text, recent) >= params.similarityThreshold);
        if (isRepeat)
            skipped += 1;
        else
            selected.push(text);
    }
    return { selected, skipped };
}
export function isNarrativeOutputRepeated(params) {
    const candidate = params.narrativeText.trim();
    if (!candidate)
        return false;
    return recentRuns(params).some((run) => run.narrativeText.trim().length > 0 &&
        textSimilarityCjkAware(candidate, run.narrativeText) >= params.similarityThreshold);
}
//# sourceMappingURL=narrative-history.js.map