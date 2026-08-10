import fs from "node:fs/promises";
import path from "node:path";
import { calculateLookbackCutoffMs, formatDreamingDay } from "./utils.js";
const REM_HISTORY_RELATIVE_PATH = ["memory", ".dreams", "lancedb-dreaming-rem-history.json"];
const MAX_RETAINED_RUNS = 30;
function emptyHistory() {
    return { version: 1, runs: [] };
}
function resolveRemHistoryPath(workspaceDir) {
    return path.join(workspaceDir, ...REM_HISTORY_RELATIVE_PATH);
}
export async function readRemHistory(workspaceDir) {
    const historyPath = resolveRemHistoryPath(workspaceDir);
    try {
        const raw = await fs.readFile(historyPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.runs)) {
            return emptyHistory();
        }
        return parsed;
    }
    catch (err) {
        const code = err?.code;
        if (code === "ENOENT" || err instanceof SyntaxError)
            return emptyHistory();
        throw err;
    }
}
export async function appendRemHistoryRun(params) {
    const historyPath = resolveRemHistoryPath(params.workspaceDir);
    const history = await readRemHistory(params.workspaceDir);
    const existing = history.runs.find((run) => run.day === params.day);
    const filtered = history.runs.filter((run) => run.day !== params.day);
    const unique = (values) => [...new Set(values)];
    filtered.push({
        day: params.day,
        lastingTruthIds: unique([...(existing?.lastingTruthIds ?? []), ...params.lastingTruthIds]),
        clusterSpotlightIds: unique([
            ...(existing?.clusterSpotlightIds ?? []),
            ...params.clusterSpotlightIds,
        ]),
        ...((existing?.lastingTruthTexts?.length ?? 0) > 0 ||
            (params.lastingTruthTexts?.length ?? 0) > 0
            ? {
                lastingTruthTexts: unique([
                    ...(existing?.lastingTruthTexts ?? []),
                    ...(params.lastingTruthTexts ?? []),
                ]),
            }
            : {}),
        ...((existing?.clusterThemeNames?.length ?? 0) > 0 ||
            (params.clusterThemeNames?.length ?? 0) > 0
            ? {
                clusterThemeNames: unique([
                    ...(existing?.clusterThemeNames ?? []),
                    ...(params.clusterThemeNames ?? []),
                ]),
            }
            : {}),
    });
    filtered.sort((a, b) => a.day.localeCompare(b.day));
    const trimmed = filtered.slice(-MAX_RETAINED_RUNS);
    const next = { version: 1, runs: trimmed };
    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    const tmpPath = `${historyPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
    await fs.rename(tmpPath, historyPath);
}
export function collectRecentRemMemoryIds(params) {
    const cutoffMs = calculateLookbackCutoffMs(params.nowMs, params.cooldownDays);
    const ids = new Set();
    for (const run of params.history.runs) {
        if (params.excludeDay && run.day === params.excludeDay)
            continue;
        const dayMs = Date.parse(`${run.day}T12:00:00.000Z`);
        if (!Number.isFinite(dayMs) || dayMs < cutoffMs)
            continue;
        for (const id of run[params.field])
            ids.add(id);
    }
    return ids;
}
/** Collect lasting-truth TEXTS surfaced within `windowDays` (for text-level repeat detection). */
export function collectRecentRemTruthTexts(params) {
    const cutoffMs = calculateLookbackCutoffMs(params.nowMs, params.windowDays);
    const texts = [];
    for (const run of params.history.runs) {
        if (params.excludeDay && run.day === params.excludeDay)
            continue;
        const dayMs = Date.parse(`${run.day}T12:00:00.000Z`);
        if (!Number.isFinite(dayMs) || dayMs < cutoffMs)
            continue;
        for (const text of run.lastingTruthTexts ?? []) {
            const trimmed = text.trim();
            if (trimmed.length > 0)
                texts.push(trimmed);
        }
    }
    return texts;
}
export function collectRecentRemThemeNames(params) {
    const cutoffMs = calculateLookbackCutoffMs(params.nowMs, params.windowDays);
    const names = [];
    for (const run of params.history.runs) {
        if (params.excludeDay && run.day === params.excludeDay)
            continue;
        const dayMs = Date.parse(`${run.day}T12:00:00.000Z`);
        if (!Number.isFinite(dayMs) || dayMs < cutoffMs)
            continue;
        for (const name of run.clusterThemeNames ?? []) {
            const trimmed = name.trim();
            if (trimmed.length > 0)
                names.push(trimmed);
        }
    }
    return names;
}
export function resolveRemReportDay(nowMs, timezone) {
    return formatDreamingDay(nowMs, timezone);
}
//# sourceMappingURL=rem-history.js.map