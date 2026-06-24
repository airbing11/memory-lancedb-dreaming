import { createHash } from "node:crypto";
import type { LanceMemoryEntry } from "./memory-db.js";
import { textSimilarityCjkAware } from "./utils.js";

function compareEntriesByImportance(a: LanceMemoryEntry, b: LanceMemoryEntry): number {
  return b.importance - a.importance || a.id.localeCompare(b.id);
}

function hashDay(day: string): number {
  const hex = createHash("sha1").update(day).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16);
}

export type LastingTruthSelection = {
  selected: LanceMemoryEntry[];
  skippedRecent: number;
  skippedSimilar: number;
  skippedPromoted: number;
  usedFallback: boolean;
};

/**
 * Returns true when `text` is close enough to any of `priorTexts` (or any
 * already-selected truth this run) to count as a repeat.
 */
function isTextRepeat(
  text: string,
  priorTexts: string[],
  threshold: number
): boolean {
  if (threshold > 1 || priorTexts.length === 0) return false;
  for (const prior of priorTexts) {
    if (textSimilarityCjkAware(text, prior) >= threshold) return true;
  }
  return false;
}

export function selectLastingTruths(params: {
  entries: LanceMemoryEntry[];
  limit: number;
  recentMemoryIds: Set<string>;
  /** v0.2.8: TEXTS surfaced in recent REM runs; near-duplicates are skipped. */
  recentTruthTexts?: string[];
  /** v0.2.8: similarity (0-1) at/above which a candidate is a repeat. >1 disables. */
  truthSimilarityThreshold?: number;
  /** v0.2.8: memoryIds already promoted into MEMORY.md; skipped when excludePromoted. */
  promotedMemoryIds?: Set<string>;
  excludePromoted?: boolean;
}): LastingTruthSelection {
  const sorted = [...params.entries].sort(compareEntriesByImportance);
  const recentTexts = params.recentTruthTexts ?? [];
  const threshold = params.truthSimilarityThreshold ?? 2; // >1 → text dedupe off
  const promoted = params.promotedMemoryIds ?? new Set<string>();
  const excludePromoted = params.excludePromoted ?? false;

  const selected: LanceMemoryEntry[] = [];
  const selectedTexts: string[] = [];
  let skippedRecent = 0;
  let skippedSimilar = 0;
  let skippedPromoted = 0;

  for (const entry of sorted) {
    if (selected.length >= params.limit) break;
    if (params.recentMemoryIds.has(entry.id)) {
      skippedRecent += 1;
      continue;
    }
    if (excludePromoted && promoted.has(entry.id)) {
      skippedPromoted += 1;
      continue;
    }
    if (isTextRepeat(entry.text, [...recentTexts, ...selectedTexts], threshold)) {
      skippedSimilar += 1;
      continue;
    }
    selected.push(entry);
    selectedTexts.push(entry.text);
  }

  if (selected.length >= params.limit) {
    return { selected, skippedRecent, skippedSimilar, skippedPromoted, usedFallback: false };
  }

  // Fallback: relax the soft filters (recent-id / text-repeat) but still honor
  // excludePromoted and avoid duplicating an already-selected memory, so a quiet
  // day surfaces *something* rather than an empty section.
  for (const entry of sorted) {
    if (selected.length >= params.limit) break;
    if (selected.some((item) => item.id === entry.id)) continue;
    if (excludePromoted && promoted.has(entry.id)) continue;
    selected.push(entry);
  }

  const usedFallback = skippedRecent > 0 || skippedSimilar > 0;
  return { selected, skippedRecent, skippedSimilar, skippedPromoted, usedFallback };
}

export function pickClusterSpotlightMemories(params: {
  memories: LanceMemoryEntry[];
  recentSpotlightIds: Set<string>;
  day: string;
  count: number;
}): LanceMemoryEntry[] {
  const sorted = [...params.memories].sort(compareEntriesByImportance);
  if (sorted.length === 0) return [];

  const fresh = sorted.filter((entry) => !params.recentSpotlightIds.has(entry.id));
  const pool = fresh.length >= Math.min(params.count, sorted.length) ? fresh : sorted;
  const take = Math.min(params.count, pool.length);
  if (take <= 0) return [];

  const maxOffset = Math.max(0, pool.length - take);
  const offset = maxOffset === 0 ? 0 : hashDay(params.day) % (maxOffset + 1);
  return pool.slice(offset, offset + take);
}
