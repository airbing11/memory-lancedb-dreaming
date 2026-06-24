import fs from "node:fs/promises";
import path from "node:path";
const DEEP_HISTORY_RELATIVE_PATH = [
    "memory",
    ".dreams",
    "lancedb-dreaming-deep-history.json",
];
const MAX_RETAINED_RUNS = 60;
function emptyHistory() {
    return { version: 1, runs: [] };
}
function resolveDeepHistoryPath(workspaceDir) {
    return path.join(workspaceDir, ...DEEP_HISTORY_RELATIVE_PATH);
}
export async function readDeepHistory(workspaceDir) {
    const historyPath = resolveDeepHistoryPath(workspaceDir);
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
export async function appendDeepHistoryRun(params) {
    const historyPath = resolveDeepHistoryPath(params.workspaceDir);
    const history = await readDeepHistory(params.workspaceDir);
    const filtered = history.runs.filter((run) => run.day !== params.day);
    filtered.push({ day: params.day, promoted: params.promoted });
    filtered.sort((a, b) => a.day.localeCompare(b.day));
    const trimmed = filtered.slice(-MAX_RETAINED_RUNS);
    const next = { version: 1, runs: trimmed };
    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    const tmpPath = `${historyPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
    await fs.rename(tmpPath, historyPath);
}
/**
 * Count the most recent consecutive days (optionally excluding `excludeDay`,
 * i.e. today) whose deep phase promoted 0 memories. Used to trigger REM novelty
 * mode after a long promotion drought.
 */
export function countConsecutiveIdleDays(params) {
    const runs = [...params.history.runs]
        .filter((run) => !params.excludeDay || run.day !== params.excludeDay)
        .sort((a, b) => b.day.localeCompare(a.day));
    let streak = 0;
    for (const run of runs) {
        if (run.promoted === 0)
            streak += 1;
        else
            break;
    }
    return streak;
}
//# sourceMappingURL=deep-history.js.map