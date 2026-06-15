import type { RemConfig } from "../config.js";
import type { MemoryDB } from "../memory-db.js";
import type { LanceMemoryEntry } from "../memory-db.js";
import type { PluginLogger } from "../cron.js";
import { readDreamingState, recordPhaseSignals } from "../state.js";
import type { DreamingPhaseResult, LlmCompleteFn, SubagentRuntime } from "../types.js";
import { filterMemoriesByLookback, formatDreamingDay } from "../utils.js";
import { pickClusterSpotlightMemories, selectLastingTruths } from "../rem-diversity.js";
import {
  appendRemHistoryRun,
  collectRecentRemMemoryIds,
  readRemHistory,
} from "../rem-history.js";
import { appendDailyMemoryBlock, writePhaseReport } from "./reports.js";
import {
  buildTagClusters,
  formatRemReflectionLines,
  nameRemClusters,
  type RemCluster,
} from "./rem-themes.js";

function applyClusterSpotlights(params: {
  clusters: RemCluster[];
  recentSpotlightIds: Set<string>;
  day: string;
}): RemCluster[] {
  return params.clusters.map((cluster) => ({
    ...cluster,
    spotlightMemories: pickClusterSpotlightMemories({
      memories: cluster.memories,
      recentSpotlightIds: params.recentSpotlightIds,
      day: params.day,
      count: 8,
    }),
  }));
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
  const remHistory = await readRemHistory(params.workspaceDir);
  const reportDay = formatDreamingDay(params.nowMs, params.timezone);
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

  const recentLastingTruthIds = collectRecentRemMemoryIds({
    history: remHistory,
    nowMs: params.nowMs,
    timezone: params.timezone,
    cooldownDays: params.config.lastingTruthCooldownDays,
    field: "lastingTruthIds",
    excludeDay: reportDay,
  });
  const recentSpotlightIds = collectRecentRemMemoryIds({
    history: remHistory,
    nowMs: params.nowMs,
    timezone: params.timezone,
    cooldownDays: params.config.clusterSpotlightCooldownDays,
    field: "clusterSpotlightIds",
    excludeDay: reportDay,
  });

  const truthLimit = Math.min(3, params.config.limit);
  const truthSelection = selectLastingTruths({
    entries,
    limit: truthLimit,
    recentMemoryIds: recentLastingTruthIds,
  });

  let clusters = buildTagClusters(
    entries,
    params.config.limit,
    params.config.minPatternStrength
  );
  clusters = applyClusterSpotlights({
    clusters,
    recentSpotlightIds,
    day: reportDay,
  });

  if (clusters.length === 0) {
    params.logger?.info(
      `memory-lancedb-dreaming: REM: no patterns found above threshold (minPatternStrength=${params.config.minPatternStrength})`
    );
  }

  if (truthSelection.skippedRecent > 0) {
    params.logger?.info(
      `memory-lancedb-dreaming: REM lasting truths rotated (${truthSelection.skippedRecent} recent id(s) skipped${truthSelection.usedFallback ? ", fallback used" : ""})`
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
  const bodyLines = [
    "### Reflections",
    ...(clusters.length === 0
      ? [
          `- REM: no patterns found above threshold (minPatternStrength=${params.config.minPatternStrength}).`,
        ]
      : reflections),
    "",
    "### Possible Lasting Truths",
    ...(truthSelection.selected.length > 0
      ? truthSelection.selected.map((entry) => `- ${entry.text}`)
      : ["- No strong candidate truths surfaced."]),
  ];

  const clusterSpotlightIds = clusters.flatMap((cluster) =>
    cluster.spotlightMemories.slice(0, 1).map((entry) => entry.id)
  );

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
  await appendRemHistoryRun({
    workspaceDir: params.workspaceDir,
    day: reportDay,
    lastingTruthIds: truthSelection.selected.map((entry) => entry.id),
    clusterSpotlightIds,
  });

  return { phase: "rem", bodyLines, memoryIds: entries.map((entry) => entry.id) };
}
