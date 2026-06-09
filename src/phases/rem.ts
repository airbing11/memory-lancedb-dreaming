import type { RemConfig } from "../config.js";
import type { MemoryDB } from "../memory-db.js";
import type { LanceMemoryEntry } from "../memory-db.js";
import type { PluginLogger } from "../cron.js";
import { readDreamingState, recordPhaseSignals } from "../state.js";
import type { DreamingPhaseResult, LlmCompleteFn, SubagentRuntime } from "../types.js";
import { filterMemoriesByLookback } from "../utils.js";
import { appendDailyMemoryBlock, writePhaseReport } from "./reports.js";
import {
  buildTagClusters,
  formatRemReflectionLines,
  nameRemClusters,
} from "./rem-themes.js";

function selectCandidateTruths(entries: LanceMemoryEntry[], limit: number): string[] {
  return [...entries]
    .sort((a, b) => b.importance - a.importance || a.text.localeCompare(b.text))
    .slice(0, limit)
    .map((entry) => entry.text);
}

export async function runRemSleep(params: {
  db: MemoryDB;
  workspaceDir: string;
  config: RemConfig;
  timezone: string;
  nowMs: number;
  listMemories: () => Promise<LanceMemoryEntry[]>;
  subagent?: SubagentRuntime;
  llmComplete?: LlmCompleteFn;
  logger?: PluginLogger;
}): Promise<DreamingPhaseResult> {
  const state = await readDreamingState(params.workspaceDir);
  const entries = filterMemoriesByLookback(
    (await params.listMemories()).filter(
      (entry) => entry.id !== "__schema__" && entry.text.trim().length > 0
    ),
    state,
    params.nowMs,
    params.config.lookbackDays
  )
    .sort((a, b) => b.importance - a.importance)
    .slice(0, Math.max(params.config.limit * 10, 200));

  const clusters = buildTagClusters(
    entries,
    params.config.limit,
    params.config.minPatternStrength
  );

  if (clusters.length === 0) {
    params.logger?.info(
      `memory-lancedb-dreaming: REM: no patterns found above threshold (minPatternStrength=${params.config.minPatternStrength})`
    );
  }

  let themeNames = clusters.map(() => null as { zh: string; en: string } | null);
  const remModel = params.config.model?.trim();
  if (remModel && clusters.length > 0) {
    if ((params.subagent || params.llmComplete) && params.logger) {
      themeNames = await nameRemClusters({
        clusters,
        config: params.config,
        subagent: params.subagent,
        llmComplete: params.llmComplete,
        workspaceDir: params.workspaceDir,
        nowMs: params.nowMs,
        logger: params.logger,
      });
    } else {
      params.logger?.warn(
        "memory-lancedb-dreaming: REM theme naming skipped (no subagent or llm.complete runtime available)"
      );
    }
  } else if (params.logger && clusters.length > 0) {
    params.logger.info(
      "memory-lancedb-dreaming: REM theme naming skipped (set rem.model or rem.execution.model)"
    );
  }

  const reflections = formatRemReflectionLines(clusters, themeNames);
  const candidateTruths = selectCandidateTruths(entries, Math.min(3, params.config.limit));
  const bodyLines = [
    "### Reflections",
    ...(clusters.length === 0
      ? [
          `- REM: no patterns found above threshold (minPatternStrength=${params.config.minPatternStrength}).`,
        ]
      : reflections),
    "",
    "### Possible Lasting Truths",
    ...(candidateTruths.length > 0
      ? candidateTruths.map((text) => `- ${text}`)
      : ["- No strong candidate truths surfaced."]),
  ];

  await writePhaseReport({
    workspaceDir: params.workspaceDir,
    phase: "rem",
    bodyLines,
    nowMs: params.nowMs,
    timezone: params.timezone,
  });
  await appendDailyMemoryBlock({
    workspaceDir: params.workspaceDir,
    heading: "## REM Sleep",
    startMarker: "<!-- openclaw:dreaming:rem:start -->",
    endMarker: "<!-- openclaw:dreaming:rem:end -->",
    bodyLines,
    nowMs: params.nowMs,
    timezone: params.timezone,
  });
  await recordPhaseSignals(
    params.workspaceDir,
    entries.map((entry) => entry.id),
    "rem",
    params.nowMs
  );

  return { phase: "rem", bodyLines, memoryIds: entries.map((entry) => entry.id) };
}
