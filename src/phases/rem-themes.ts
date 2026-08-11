import { createHash } from "node:crypto";
import type { RemConfig } from "../config.js";
import type { LanceMemoryEntry } from "../memory-db.js";
import { runDreamingTextPrompt } from "../llm-subagent.js";
import type { PluginLogger } from "../cron.js";
import type { LlmCompleteFn, SubagentRuntime } from "../types.js";
import { textSimilarityCjkAware } from "../utils.js";

export type RemCluster = {
  tag: string;
  strength: number;
  count: number;
  memories: LanceMemoryEntry[];
  spotlightMemories: LanceMemoryEntry[];
};

const THEME_NAMING_SYSTEM_PROMPT = [
  "You name thematic clusters in a memory reflection journal.",
  "For each numbered cluster, output exactly one line:",
  "中文主题名（4-8字） / English Topic Name",
  "Use concise, semantic names — not category labels like fact or other.",
  "Keep names semantically consistent with the recent-theme list; do not invent synonyms to make an old topic look new.",
  "Output only the numbered lines, no extra commentary.",
].join("\n");

const THEME_LINE_RE =
  /^\s*(?:(?:\d+[\.\)、]\s*)|(?:聚类\s*\d+\s*[:：、]?\s*))?(.+?)\s*\/\s*(.+?)\s*$/;

function buildThemeNamingSessionKey(workspaceDir: string, nowMs: number): string {
  const workspaceHash = createHash("sha1").update(workspaceDir).digest("hex").slice(0, 12);
  return `dreaming-rem-themes-lancedb-${workspaceHash}-${nowMs}`;
}

function buildThemeNamingPrompt(clusters: RemCluster[], recentThemeNames: string[]): string {
  const lines = [
    "以下是今天记忆观测中的一组聚类话题，请为每组生成一个4-8字的中文主题名和一个对应的英文主题名：",
    "",
  ];
  if (recentThemeNames.length > 0) {
    lines.push("最近已出现的主题（同一话题请沿用语义，不要为了显得新鲜而换同义词）：");
    for (const name of recentThemeNames.slice(-20)) lines.push(`- ${name}`);
    lines.push("");
  }
  for (let i = 0; i < clusters.length; i += 1) {
    const cluster = clusters[i]!;
    lines.push(`## 聚类 ${i + 1}（标签: ${cluster.tag}，${cluster.count} 条记忆）`);
    for (const memory of cluster.spotlightMemories.slice(0, 8)) {
      const snippet = memory.text.trim().slice(0, 160);
      lines.push(`- ${snippet}`);
    }
    lines.push("");
  }
  lines.push("输出格式（每组一行）：中文主题名 / English Topic Name");
  return lines.join("\n");
}

/**
 * Reject lines where the model echoed the prompt's format template/placeholder
 * (e.g. "中文主题名（4-8字） / English Topic Name") instead of a real theme.
 */
function isPlaceholderTheme(zh: string, en: string): boolean {
  const zhLower = zh.toLowerCase();
  const enLower = en.toLowerCase();
  const zhPlaceholder =
    zh.includes("主题名") ||
    zh.includes("中文主题") ||
    /[（(]\s*\d+\s*[-~]\s*\d+\s*字\s*[）)]/.test(zh);
  const enPlaceholder =
    enLower.includes("english topic name") ||
    enLower === "topic name" ||
    enLower.includes("topic name") && enLower.startsWith("english");
  return zhPlaceholder || enPlaceholder;
}

export function parseThemeLines(
  raw: string,
  clusterCount: number
): Array<{ zh: string; en: string } | null> {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const parsed: Array<{ zh: string; en: string } | null> = [];

  for (const line of lines) {
    const match = line.match(THEME_LINE_RE);
    if (!match) continue;
    const zh = match[1]?.trim();
    const en = match[2]?.trim();
    if (!zh || !en) continue;
    if (isPlaceholderTheme(zh, en)) continue;
    parsed.push({ zh, en });
  }

  while (parsed.length < clusterCount) parsed.push(null);
  return parsed.slice(0, clusterCount);
}

function summarizeCoverage(cluster: RemCluster): string {
  const top = cluster.spotlightMemories[0] ?? cluster.memories
    .slice()
    .sort((a, b) => b.importance - a.importance)[0];
  const hint = top?.text.trim().slice(0, 48);
  if (hint) return `${cluster.count} 条记忆（${hint}${hint.length >= 48 ? "…" : ""}）`;
  return `${cluster.count} 条记忆`;
}

export function buildTagClusters(
  entries: LanceMemoryEntry[],
  limit: number,
  minPatternStrength: number
): RemCluster[] {
  const tagToMemories = new Map<string, LanceMemoryEntry[]>();
  for (const entry of entries) {
    const tag = entry.category?.trim() || "other";
    const list = tagToMemories.get(tag) ?? [];
    list.push(entry);
    tagToMemories.set(tag, list);
  }

  return [...tagToMemories.entries()]
    .map(([tag, memories]) => ({
      tag,
      count: memories.length,
      strength: Math.min(1, (memories.length / Math.max(1, entries.length)) * 2),
      memories,
      spotlightMemories: memories,
    }))
    .filter((cluster) => cluster.strength >= minPatternStrength)
    .sort(
      (a, b) =>
        b.strength - a.strength ||
        b.count - a.count ||
        a.tag.localeCompare(b.tag)
    )
    .slice(0, limit);
}

export function formatRemReflectionLines(
  clusters: RemCluster[],
  themeNames: Array<{ zh: string; en: string } | null>
): string[] {
  if (clusters.length === 0) return ["- No strong patterns surfaced."];

  const lines: string[] = [];
  for (let i = 0; i < clusters.length; i += 1) {
    const cluster = clusters[i]!;
    const named = themeNames[i];
    if (named) {
      lines.push(
        `- Theme: ${named.zh} / ${named.en} (${cluster.strength.toFixed(2)})`
      );
      lines.push(`  - 覆盖: ${summarizeCoverage(cluster)}`);
    } else {
      lines.push(
        `- Theme: \`${cluster.tag}\` kept surfacing across ${cluster.count} memories.`
      );
      lines.push(`  - confidence: ${cluster.strength.toFixed(2)}`);
      lines.push(`  - evidence: ${cluster.memories
        .slice(0, 3)
        .map((m) => m.id.slice(0, 8))
        .join(", ")}`);
      lines.push(`  - note: reflection`);
    }
  }
  return lines;
}

function themeSimilarity(left: string, right: string): number {
  const leftParts = left.split("/").map((part) => part.trim()).filter(Boolean);
  const rightParts = right.split("/").map((part) => part.trim()).filter(Boolean);
  let best = textSimilarityCjkAware(left, right);
  for (const leftPart of leftParts) {
    for (const rightPart of rightParts) {
      best = Math.max(best, textSimilarityCjkAware(leftPart, rightPart));
    }
  }
  return best;
}

export function suppressRepeatedRemThemes(params: {
  clusters: RemCluster[];
  themeNames: Array<{ zh: string; en: string } | null>;
  recentThemeNames: string[];
  similarityThreshold: number;
}): {
  clusters: RemCluster[];
  themeNames: Array<{ zh: string; en: string } | null>;
  skipped: number;
} {
  const clusters: RemCluster[] = [];
  const themeNames: Array<{ zh: string; en: string } | null> = [];
  let skipped = 0;
  for (let index = 0; index < params.clusters.length; index += 1) {
    const cluster = params.clusters[index]!;
    const named = params.themeNames[index] ?? null;
    const label = named ? `${named.zh} / ${named.en}` : cluster.tag;
    const repeated = params.recentThemeNames.some(
      (recent) => themeSimilarity(label, recent) >= params.similarityThreshold
    );
    if (repeated) {
      skipped += 1;
      continue;
    }
    clusters.push(cluster);
    themeNames.push(named);
  }
  return { clusters, themeNames, skipped };
}

export async function nameRemClusters(params: {
  clusters: RemCluster[];
  config: RemConfig;
  subagent?: SubagentRuntime;
  llmComplete?: LlmCompleteFn;
  workspaceDir: string;
  nowMs: number;
  logger: PluginLogger;
  recentThemeNames?: string[];
}): Promise<Array<{ zh: string; en: string } | null>> {
  const empty = params.clusters.map(() => null);
  if (!params.config.model?.trim() || params.clusters.length === 0) return empty;
  if (!params.subagent && !params.llmComplete) return empty;

  const sessionKey = buildThemeNamingSessionKey(params.workspaceDir, params.nowMs);
  const message = buildThemeNamingPrompt(params.clusters, params.recentThemeNames ?? []);
  const raw = await runDreamingTextPrompt({
    subagent: params.subagent,
    llmComplete: params.llmComplete,
    sessionKey,
    message,
    systemPrompt: THEME_NAMING_SYSTEM_PROMPT,
    model: params.config.model,
    logger: params.logger,
    logLabel: "REM theme naming",
  });

  if (!raw) return empty;
  return parseThemeLines(raw, params.clusters.length);
}
