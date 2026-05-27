import fs from "node:fs/promises";
import path from "node:path";
import { DREAMING_STATE_RELATIVE_PATH } from "./constants.js";
import { formatDreamingDay, hashQuery } from "./utils.js";
function emptyState(nowIso) {
    return { version: 1, updatedAt: nowIso, entries: {} };
}
function resolveStatePath(workspaceDir) {
    return path.join(workspaceDir, ...DREAMING_STATE_RELATIVE_PATH);
}
export async function readDreamingState(workspaceDir) {
    const statePath = resolveStatePath(workspaceDir);
    try {
        const raw = await fs.readFile(statePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1 || typeof parsed.entries !== "object") {
            return emptyState(new Date().toISOString());
        }
        return parsed;
    }
    catch (err) {
        const code = err?.code;
        if (code === "ENOENT")
            return emptyState(new Date().toISOString());
        if (err instanceof SyntaxError)
            return emptyState(new Date().toISOString());
        throw err;
    }
}
export async function writeDreamingState(workspaceDir, state) {
    const statePath = resolveStatePath(workspaceDir);
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    const tmpPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
    state.updatedAt = new Date().toISOString();
    await fs.writeFile(tmpPath, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
    await fs.rename(tmpPath, statePath);
}
export async function touchMemoryRecall(workspaceDir, memoryId, options) {
    const nowIso = new Date(options.nowMs).toISOString();
    const day = formatDreamingDay(options.nowMs, options.timezone);
    const state = await readDreamingState(workspaceDir);
    const entry = state.entries[memoryId] ?? {
        recallCount: 0,
        queryHashes: [],
        recallDays: [],
        lightHits: 0,
        remHits: 0,
        lastSeenAt: nowIso,
    };
    entry.recallCount += 1;
    entry.lastSeenAt = nowIso;
    if (!entry.recallDays.includes(day))
        entry.recallDays.push(day);
    if (options.query) {
        const queryHash = hashQuery(options.query.trim().toLowerCase());
        if (!entry.queryHashes.includes(queryHash))
            entry.queryHashes.push(queryHash);
    }
    state.entries[memoryId] = entry;
    await writeDreamingState(workspaceDir, state);
}
export async function recordPhaseSignals(workspaceDir, memoryIds, phase, nowMs) {
    const nowIso = new Date(nowMs).toISOString();
    const state = await readDreamingState(workspaceDir);
    for (const memoryId of memoryIds) {
        const entry = state.entries[memoryId] ?? {
            recallCount: 0,
            queryHashes: [],
            recallDays: [],
            lightHits: 0,
            remHits: 0,
            lastSeenAt: nowIso,
        };
        if (phase === "light")
            entry.lightHits += 1;
        else
            entry.remHits += 1;
        entry.lastSeenAt = nowIso;
        state.entries[memoryId] = entry;
    }
    await writeDreamingState(workspaceDir, state);
}
export function getStateEntry(state, memoryId) {
    return state.entries[memoryId];
}
//# sourceMappingURL=state.js.map