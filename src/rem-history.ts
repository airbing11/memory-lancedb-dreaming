import fs from "node:fs/promises";
import path from "node:path";
import { calculateLookbackCutoffMs, formatDreamingDay } from "./utils.js";

export type RemHistoryRun = {
  day: string;
  lastingTruthIds: string[];
  clusterSpotlightIds: string[];
  /** Added v0.2.8: truth TEXTS surfaced that day, for semantic (text-level) repeat detection. */
  lastingTruthTexts?: string[];
  /** Added v0.2.8: REM cluster theme names surfaced that day. */
  clusterThemeNames?: string[];
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
  lastingTruthTexts?: string[];
  clusterThemeNames?: string[];
}): Promise<void> {
  const historyPath = resolveRemHistoryPath(params.workspaceDir);
  const history = await readRemHistory(params.workspaceDir);
  const existing = history.runs.find((run) => run.day === params.day);
  const filtered = history.runs.filter((run) => run.day !== params.day);
  const unique = (values: string[]) => [...new Set(values)];
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

/** Collect lasting-truth TEXTS surfaced within `windowDays` (for text-level repeat detection). */
export function collectRecentRemTruthTexts(params: {
  history: RemHistory;
  nowMs: number;
  windowDays: number;
  excludeDay?: string;
}): string[] {
  const cutoffMs = calculateLookbackCutoffMs(params.nowMs, params.windowDays);
  const texts: string[] = [];
  for (const run of params.history.runs) {
    if (params.excludeDay && run.day === params.excludeDay) continue;
    const dayMs = Date.parse(`${run.day}T12:00:00.000Z`);
    if (!Number.isFinite(dayMs) || dayMs < cutoffMs) continue;
    for (const text of run.lastingTruthTexts ?? []) {
      const trimmed = text.trim();
      if (trimmed.length > 0) texts.push(trimmed);
    }
  }
  return texts;
}

export function collectRecentRemThemeNames(params: {
  history: RemHistory;
  nowMs: number;
  windowDays: number;
  excludeDay?: string;
}): string[] {
  const cutoffMs = calculateLookbackCutoffMs(params.nowMs, params.windowDays);
  const names: string[] = [];
  for (const run of params.history.runs) {
    if (params.excludeDay && run.day === params.excludeDay) continue;
    const dayMs = Date.parse(`${run.day}T12:00:00.000Z`);
    if (!Number.isFinite(dayMs) || dayMs < cutoffMs) continue;
    for (const name of run.clusterThemeNames ?? []) {
      const trimmed = name.trim();
      if (trimmed.length > 0) names.push(trimmed);
    }
  }
  return names;
}

export function resolveRemReportDay(nowMs: number, timezone: string): string {
  return formatDreamingDay(nowMs, timezone);
}
