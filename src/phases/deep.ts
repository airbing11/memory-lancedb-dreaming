import fs from "node:fs/promises";
import path from "node:path";
import { resolveDeepConfig, type DeepConfig } from "../config.js";
import { PROMOTION_MARKER_PREFIX } from "../constants.js";
import { appendDeepHistoryRun } from "../deep-history.js";
import type { MemoryDB } from "../memory-db.js";
import { readDreamingState, writeDreamingState } from "../state.js";
import type { PromotionCandidate } from "../types.js";
import { atomicWriteTextFile, formatDreamingDay, withTrailingNewline } from "../utils.js";
import { writePhaseReport } from "./reports.js";
import { rankPromotionCandidates } from "./scoring.js";

function extractPromotionMarkers(memoryText: string): Set<string> {
  const markers = new Set<string>();
  const re = new RegExp(`<!--\\s*${PROMOTION_MARKER_PREFIX}([^\\n]+?)\\s*-->`, "gi");
  for (const match of memoryText.matchAll(re)) {
    const key = match[1]?.trim();
    if (key) markers.add(key);
  }
  return markers;
}

function buildPromotionSection(
  candidates: PromotionCandidate[],
  nowMs: number,
  timezone: string
): string {
  const lines = [
    "",
    `## Promoted From LanceDB Memory (${formatDreamingDay(nowMs, timezone)})`,
    "",
  ];
  for (const candidate of candidates) {
    lines.push(`<!-- ${PROMOTION_MARKER_PREFIX}${candidate.memoryId} -->`);
    lines.push(
      `- ${candidate.text} [score=${candidate.score.toFixed(3)} recalls=${candidate.recallCount} category=${candidate.category} source=lancedb:${candidate.memoryId}]`
    );
  }
  lines.push("");
  return lines.join("\n");
}

export async function runDeepSleep(params: {
  workspaceDir: string;
  config: DeepConfig;
  timezone: string;
  nowMs: number;
  listMemories: () => Promise<
    Array<{
      id: string;
      text: string;
      importance: number;
      category: string;
    }>
  >;
}): Promise<{
  bodyLines: string[];
  applied: PromotionCandidate[];
  promotions: PromotionCandidate[];
}> {
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
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return "";
    throw err;
  });
  const existingMarkers = extractPromotionMarkers(existingMemory);
  const toAppend = candidates.filter((candidate) => !existingMarkers.has(candidate.memoryId));

  if (toAppend.length > 0) {
    const header = existingMemory.trim().length > 0 ? "" : "# Long-Term Memory\n\n";
    const section = buildPromotionSection(toAppend, params.nowMs, params.timezone);
    await atomicWriteTextFile(
      memoryPath,
      `${header}${withTrailingNewline(existingMemory)}${section}`
    );

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

  await appendDeepHistoryRun({
    workspaceDir: params.workspaceDir,
    day: formatDreamingDay(params.nowMs, params.timezone),
    promoted: toAppend.length,
  });

  return {
    bodyLines,
    applied: toAppend,
    promotions: candidates,
  };
}
