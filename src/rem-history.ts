import fs from "node:fs/promises";
import path from "node:path";
import { calculateLookbackCutoffMs, formatDreamingDay } from "./utils.js";

export type RemHistoryRun = {
  day: string;
  lastingTruthIds: string[];
  clusterSpotlightIds: string[];
};

export type RemHistory = {
  version: 1;
  runs: RemHistoryRun[];
};

const REM_HISTORY_RELATIVE_PATH = ["memory", ".dreams", "lancedb-dreaming-rem-history.json"] as const;
const MAX_RETAINED_RUNS = 30;

function emptyHistory(): RemHistory {
  return { version: 1, runs: [] };
}

function resolveRemHistoryPath(workspaceDir: string): string {
  return path.join(workspaceDir, ...REM_HISTORY_RELATIVE_PATH);
}

export async function readRemHistory(workspaceDir: string): Promise<RemHistory> {
  const historyPath = resolveRemHistoryPath(workspaceDir);
  try {
    const raw = await fs.readFile(historyPath, "utf-8");
    const parsed = JSON.parse(raw) as RemHistory;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.runs)) {
      return emptyHistory();
    }
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT" || err instanceof SyntaxError) return emptyHistory();
    throw err;
  }
}

export async function appendRemHistoryRun(params: {
  workspaceDir: string;
  day: string;
  lastingTruthIds: string[];
  clusterSpotlightIds: string[];
}): Promise<void> {
  const historyPath = resolveRemHistoryPath(params.workspaceDir);
  const history = await readRemHistory(params.workspaceDir);
  const filtered = history.runs.filter((run) => run.day !== params.day);
  filtered.push({
    day: params.day,
    lastingTruthIds: params.lastingTruthIds,
    clusterSpotlightIds: params.clusterSpotlightIds,
  });
  filtered.sort((a, b) => a.day.localeCompare(b.day));
  const trimmed = filtered.slice(-MAX_RETAINED_RUNS);
  const next: RemHistory = { version: 1, runs: trimmed };
  await fs.mkdir(path.dirname(historyPath), { recursive: true });
  const tmpPath = `${historyPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  await fs.rename(tmpPath, historyPath);
}

export function collectRecentRemMemoryIds(params: {
  history: RemHistory;
  nowMs: number;
  timezone: string;
  cooldownDays: number;
  field: "lastingTruthIds" | "clusterSpotlightIds";
  excludeDay?: string;
}): Set<string> {
  const cutoffMs = calculateLookbackCutoffMs(params.nowMs, params.cooldownDays);
  const ids = new Set<string>();
  for (const run of params.history.runs) {
    if (params.excludeDay && run.day === params.excludeDay) continue;
    const dayMs = Date.parse(`${run.day}T12:00:00.000Z`);
    if (!Number.isFinite(dayMs) || dayMs < cutoffMs) continue;
    for (const id of run[params.field]) ids.add(id);
  }
  return ids;
}

export function resolveRemReportDay(nowMs: number, timezone: string): string {
  return formatDreamingDay(nowMs, timezone);
}
