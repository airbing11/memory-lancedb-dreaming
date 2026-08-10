import fs from "node:fs/promises";
import path from "node:path";
import { formatDreamingDay } from "../utils.js";
import type { DailyReportSnapshot, DailyReportTheme } from "./types.js";
import { readDailyReportSnapshot } from "./snapshot.js";

const DIARY_START_MARKER = "<!-- openclaw:dreaming:diary:start -->";
const DIARY_END_MARKER = "<!-- openclaw:dreaming:diary:end -->";
const DREAMS_FILENAMES = ["DREAMS.md", "dreams.md"];

const REM_THEME_NAMED_RE =
  /^-\s*Theme:\s*(.+?)\s*\/\s*(.+?)\s*\((\d+(?:\.\d+)?)\)\s*$/;
const REM_THEME_TAG_RE =
  /^-\s*Theme:\s*`([^`]+)` kept surfacing across (\d+) memories\.\s*$/;
const REM_CONFIDENCE_RE = /^\s*-\s*confidence:\s*(\d+(?:\.\d+)?)\s*$/;

export function parseRemThemeLines(bodyLines: string[]): DailyReportTheme[] {
  const themes: DailyReportTheme[] = [];
  for (let i = 0; i < bodyLines.length; i += 1) {
    const line = bodyLines[i] ?? "";
    const named = line.match(REM_THEME_NAMED_RE);
    if (named) {
      const zh = named[1]?.trim() ?? "";
      const en = named[2]?.trim() ?? "";
      const confidence = Number(named[3]);
      const summaryLine = bodyLines[i + 1]?.trim();
      themes.push({
        label: zh && en ? `${zh} / ${en}` : zh || en,
        confidence: Number.isFinite(confidence) ? confidence : 0,
        summary: summaryLine?.startsWith("- 覆盖:") ? summaryLine.replace(/^-\s*覆盖:\s*/, "") : undefined,
      });
      continue;
    }
    const tagged = line.match(REM_THEME_TAG_RE);
    if (tagged) {
      let confidence = 0;
      const confLine = bodyLines[i + 1]?.trim() ?? "";
      const confMatch = confLine.match(REM_CONFIDENCE_RE);
      if (confMatch) confidence = Number(confMatch[1]);
      themes.push({
        label: tagged[1] ?? "unknown",
        confidence: Number.isFinite(confidence) ? confidence : 0,
      });
    }
  }
  return themes;
}

export async function extractLatestNarrativeExcerpt(
  workspaceDir: string
): Promise<string | undefined> {
  for (const filename of DREAMS_FILENAMES) {
    const dreamsPath = path.join(workspaceDir, filename);
    const content = await fs.readFile(dreamsPath, "utf-8").catch((err) => {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return null;
      throw err;
    });
    if (!content) continue;

    const diaryStart = content.indexOf(DIARY_START_MARKER);
    const diaryEnd = content.indexOf(DIARY_END_MARKER);
    const diarySection =
      diaryStart >= 0 && diaryEnd > diaryStart
        ? content.slice(diaryStart + DIARY_START_MARKER.length, diaryEnd)
        : content;

    const blocks = diarySection
      .split(/\n---\n/)
      .map((block) => block.trim())
      .filter((block) => block.length > 0);
    if (blocks.length === 0) continue;

    const latest = blocks[blocks.length - 1] ?? "";
    const withoutDate = latest.replace(/^\*[^*]+\*\s*/m, "").trim();
    return withoutDate.length > 0 ? withoutDate : latest;
  }
  return undefined;
}

async function readPhaseReportLines(
  workspaceDir: string,
  phase: "light" | "rem" | "deep",
  day: string
): Promise<string[]> {
  const reportPath = path.join(workspaceDir, "memory", "dreaming", phase, `${day}.md`);
  const content = await fs.readFile(reportPath, "utf-8").catch((err) => {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw err;
  });
  if (!content) return [];
  return content
    .split("\n")
    .slice(2)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function countLightCandidates(lines: string[]): number {
  if (lines.some((line) => line.includes("No notable updates"))) return 0;
  return lines.filter((line) => line.startsWith("- ")).length;
}

function countDeepPromotions(lines: string[]): number {
  const promoted = lines.find((line) => /^-\s*Promoted\s+\d+/i.test(line));
  if (promoted) {
    const match = promoted.match(/Promoted\s+(\d+)/i);
    if (match) return Number(match[1]);
  }
  const bullets = lines.filter((line) => line.startsWith("- ") && !line.startsWith("- Ranked"));
  return bullets.length;
}

export async function buildSnapshotFromWorkspace(params: {
  workspaceDir: string;
  day: string;
  timezone: string;
  nowMs?: number;
}): Promise<DailyReportSnapshot> {
  const existing = await readDailyReportSnapshot(params.workspaceDir);
  if (existing && existing.day === params.day) return existing;

  const [lightLines, remLines, deepLines] = await Promise.all([
    readPhaseReportLines(params.workspaceDir, "light", params.day),
    readPhaseReportLines(params.workspaceDir, "rem", params.day),
    readPhaseReportLines(params.workspaceDir, "deep", params.day),
  ]);
  const themes = parseRemThemeLines(remLines);
  const narrativeExcerpt = await extractLatestNarrativeExcerpt(params.workspaceDir);

  return {
    version: 1,
    day: params.day,
    timezone: params.timezone,
    generatedAt: new Date(params.nowMs ?? Date.now()).toISOString(),
    light: {
      candidateCount: countLightCandidates(lightLines),
      ran: lightLines.length > 0,
    },
    rem: {
      themeCount: themes.length,
      themes,
      ran: remLines.length > 0,
    },
    deep: {
      promotedCount: countDeepPromotions(deepLines),
      ran: deepLines.length > 0,
    },
    narrative: {
      written: Boolean(narrativeExcerpt),
      excerpt: narrativeExcerpt,
    },
  };
}

export function buildSnapshotFromPipeline(params: {
  workspaceDir: string;
  day: string;
  timezone: string;
  nowMs: number;
  lightCount: number;
  remCount: number;
  promotedCount: number;
  narrativeWritten: boolean;
  remBodyLines?: string[];
  narrativeExcerpt?: string;
  phasesRan: { light: boolean; rem: boolean; deep: boolean };
}): DailyReportSnapshot {
  const themes = parseRemThemeLines(params.remBodyLines ?? []);
  return {
    version: 1,
    day: params.day,
    timezone: params.timezone,
    generatedAt: new Date(params.nowMs).toISOString(),
    light: {
      candidateCount: params.lightCount,
      ran: params.phasesRan.light,
    },
    rem: {
      themeCount: themes.length,
      themes,
      ran: params.phasesRan.rem,
    },
    deep: {
      promotedCount: params.promotedCount,
      ran: params.phasesRan.deep,
    },
    narrative: {
      written: params.narrativeWritten || Boolean(params.narrativeExcerpt),
      excerpt: params.narrativeExcerpt,
    },
  };
}

export function resolveReportDay(nowMs: number, timezone: string): string {
  return formatDreamingDay(nowMs, timezone);
}
