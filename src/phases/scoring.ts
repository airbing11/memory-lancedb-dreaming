import type { ResolvedDeepConfig } from "../config.js";
import type { LanceMemoryEntry } from "../memory-db.js";
import type { DreamingState, DreamingStateEntry } from "../state.js";
import type { PromotionCandidate } from "../types.js";
import { clampScore } from "../utils.js";

const DEFAULT_WEIGHTS = {
  frequency: 0.18,
  relevance: 0.3,
  diversity: 0.12,
  recency: 0.15,
  consolidation: 0.1,
  conceptual: 0.15,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function phaseBoost(entry: DreamingStateEntry | undefined, nowMs: number): number {
  if (!entry) return 0;
  let boost = 0;
  if (entry.lightHits > 0) boost += Math.min(0.08, entry.lightHits * 0.025);
  if (entry.remHits > 0) boost += Math.min(0.08, entry.remHits * 0.025);
  const lastSeenMs = Date.parse(entry.lastSeenAt);
  if (Number.isFinite(lastSeenMs) && nowMs - lastSeenMs < 3 * DAY_MS) boost += 0.03;
  return boost;
}

function conceptualScore(category: string): number {
  switch (category) {
    case "preference":
    case "decision":
      return 0.9;
    case "entity":
      return 0.72;
    case "fact":
      return 0.58;
    default:
      return 0.4;
  }
}

/** Recency proxy when LanceDB has no createdAt column: higher importance → lower age. */
function resolveMemoryAgeDays(
  memory: LanceMemoryEntry,
  entry: DreamingStateEntry | undefined,
  nowMs: number
): number {
  const lastSeenMs = Date.parse(entry?.lastSeenAt ?? "");
  if (Number.isFinite(lastSeenMs) && lastSeenMs > 0) {
    return Math.max(0, (nowMs - lastSeenMs) / DAY_MS);
  }
  const importance = clampScore(memory.importance);
  return Math.max(0, 7 * (1 - importance));
}

function resolveContextDiversity(
  entry: DreamingStateEntry | undefined,
  uniqueQueries: number,
  recallDays: string[]
): number {
  const phaseSignals =
    (entry?.lightHits ?? 0) > 0 || (entry?.remHits ?? 0) > 0 ? 1 : 0;
  return Math.max(uniqueQueries, recallDays.length, phaseSignals);
}

function recencyFromAgeDays(ageDays: number, halfLifeDays: number): number {
  const halfLife = Math.max(1, halfLifeDays);
  return clampScore(Math.pow(0.5, ageDays / halfLife));
}

export function rankPromotionCandidates(params: {
  memories: LanceMemoryEntry[];
  state: DreamingState;
  config: ResolvedDeepConfig;
  nowMs: number;
}): PromotionCandidate[] {
  const { memories, state, config, nowMs } = params;
  const candidates: PromotionCandidate[] = [];

  for (const memory of memories) {
    if (!memory.text?.trim() || memory.id === "__schema__") continue;

    const entry = state.entries[memory.id];
    if (entry?.promotedAt) continue;

    const recallCount = entry?.recallCount ?? 0;
    const lightHits = entry?.lightHits ?? 0;
    const remHits = entry?.remHits ?? 0;
    const signalCount = recallCount + lightHits + remHits;

    const uniqueQueries = entry?.queryHashes.length ?? 0;
    const recallDays = entry?.recallDays ?? [];
    const contextDiversity = resolveContextDiversity(entry, uniqueQueries, recallDays);

    const importance = clampScore(memory.importance);
    const passesRecallGate =
      signalCount >= config.minRecallCount ||
      (importance >= 0.72 && (lightHits > 0 || remHits > 0));

    if (!passesRecallGate) continue;
    if (contextDiversity < config.minUniqueQueries && importance < 0.8) continue;

    const ageDays = resolveMemoryAgeDays(memory, entry, nowMs);
    if (ageDays > config.maxAgeDays) continue;

    const frequency = clampScore(Math.log1p(Math.max(signalCount, 1)) / Math.log1p(10));
    const relevance = importance;
    const diversity = clampScore(contextDiversity / 3);
    const recency = recencyFromAgeDays(ageDays, config.recencyHalfLifeDays);
    const consolidation = clampScore(Math.min(1, recallDays.length / 3 + (lightHits + remHits) * 0.1));
    const conceptual = conceptualScore(memory.category);
    const boost = phaseBoost(entry, nowMs);

    const score = clampScore(
      DEFAULT_WEIGHTS.frequency * frequency +
        DEFAULT_WEIGHTS.relevance * relevance +
        DEFAULT_WEIGHTS.diversity * diversity +
        DEFAULT_WEIGHTS.recency * recency +
        DEFAULT_WEIGHTS.consolidation * consolidation +
        DEFAULT_WEIGHTS.conceptual * conceptual +
        boost
    );

    if (score < config.minScore) continue;

    candidates.push({
      memoryId: memory.id,
      text: memory.text,
      category: memory.category,
      importance: memory.importance,
      recallCount,
      uniqueQueries,
      recallDays,
      ageDays,
      score,
      components: {
        frequency,
        relevance,
        diversity,
        recency,
        consolidation,
        conceptual,
      },
      state: entry ?? {
        recallCount: 0,
        queryHashes: [],
        recallDays: [],
        lightHits: 0,
        remHits: 0,
        lastSeenAt: new Date(nowMs).toISOString(),
      },
    });
  }

  return [...candidates]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.importance !== a.importance) return b.importance - a.importance;
      if (b.recallCount !== a.recallCount) return b.recallCount - a.recallCount;
      return a.memoryId.localeCompare(b.memoryId);
    })
    .slice(0, config.maxPromotions);
}
