import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { NarrativeConfig, NarrativeLanguage } from "./config.js";
import type { PluginLogger } from "./cron.js";
import { runDreamingTextPrompt } from "./llm-subagent.js";
import type { LlmCompleteFn, SubagentRuntime } from "./types.js";
import { createAsyncLock } from "./utils.js";

const NARRATIVE_EN_SYSTEM_PROMPT = [
  "You are keeping a dream diary. Write a single entry in first person.",
  "",
  "Voice & tone:",
  "- You are a curious, gentle, slightly whimsical mind reflecting on the day.",
  "- Write like a poet who happens to be a programmer — sensory, warm, occasionally funny.",
  "- Mix the technical and the tender: code and constellations, APIs and afternoon light.",
  "",
  "Rules:",
  "- Draw from the memory fragments provided — weave them into the entry.",
  "- Never say you're dreaming or mention AI, agents, LLMs, or models.",
  "- Do NOT use markdown headers or bullet points — just flowing prose.",
  "- Keep it between 80-180 words.",
  "- Output ONLY the diary entry.",
].join("\n");

const NARRATIVE_ZH_SYSTEM_PROMPT = [
  "你在写一本梦境日记。用第一人称写一段散文。",
  "",
  "文风：",
  "- 诗意、温柔、略带 whimsical，像程序员写的散文诗。",
  "- 可参考「第14天 / 年轮 / 安静的海岸线」那种意象与节奏。",
  "- 技术细节与日常感受交织，但不堆砌术语。",
  "",
  "规则：",
  "- 根据提供的记忆片段编织内容，不要列清单。",
  "- 不要提及做梦、AI、智能体、大模型。",
  "- 不要用 markdown 标题或项目符号，只写连贯散文。",
  "- 80-180 字左右。",
  "- 只输出正文。",
].join("\n");

const SNAPSHOT_EN_SYSTEM_PROMPT = [
  "You are keeping a dream diary. Write a short nightly memory snapshot in first person.",
  "",
  "Voice & tone:",
  "- Gentle, reflective, slightly whimsical — a quiet end-of-day note.",
  "- No bullet points or headers — flowing prose only.",
  "",
  "Rules:",
  "- Summarize the memory fragments as a cohesive snapshot, not a list.",
  "- Do not mention promotions, MEMORY.md, or databases.",
  "- Never say you're dreaming or mention AI, agents, LLMs, or models.",
  "- Keep it between 60-120 words.",
  "- Output ONLY the diary entry.",
].join("\n");

const SNAPSHOT_ZH_SYSTEM_PROMPT = [
  "你在写梦境日记里的夜间记忆快照。用第一人称写一小段散文。",
  "",
  "文风：安静、反思、略带 whimsical 的收束感。",
  "",
  "规则：",
  "- 将记忆片段融成一体，不要罗列。",
  "- 不要提及提升、MEMORY.md 或数据库。",
  "- 不要提及做梦、AI、智能体、大模型。",
  "- 60-120 字。",
  "- 只输出正文。",
].join("\n");

const DIARY_START_MARKER = "<!-- openclaw:dreaming:diary:start -->";
const DIARY_END_MARKER = "<!-- openclaw:dreaming:diary:end -->";
const DREAMS_FILENAMES = ["DREAMS.md", "dreams.md"];

const dreamsFileLocks = new Map<string, ReturnType<typeof createAsyncLock>>();

function buildNarrativeSessionKey(
  workspaceDir: string,
  nowMs: number,
  language: NarrativeLanguage
): string {
  const workspaceHash = createHash("sha1").update(workspaceDir).digest("hex").slice(0, 12);
  return `dreaming-narrative-lancedb-${language}-${workspaceHash}-${nowMs}`;
}

function resolveLanguages(config: NarrativeConfig): NarrativeLanguage[] {
  const raw = config.languages?.length ? config.languages : (["zh", "en"] as const);
  const seen = new Set<NarrativeLanguage>();
  const ordered: NarrativeLanguage[] = [];
  for (const lang of ["zh", "en"] as const) {
    if (raw.includes(lang) && !seen.has(lang)) {
      seen.add(lang);
      ordered.push(lang);
    }
  }
  for (const lang of raw) {
    if ((lang === "zh" || lang === "en") && !seen.has(lang)) {
      seen.add(lang);
      ordered.push(lang);
    }
  }
  return ordered.length > 0 ? ordered : ["zh", "en"];
}

function systemPromptForLanguage(
  language: NarrativeLanguage,
  mode: "promotion" | "snapshot"
): string {
  if (mode === "snapshot") {
    return language === "zh" ? SNAPSHOT_ZH_SYSTEM_PROMPT : SNAPSHOT_EN_SYSTEM_PROMPT;
  }
  return language === "zh" ? NARRATIVE_ZH_SYSTEM_PROMPT : NARRATIVE_EN_SYSTEM_PROMPT;
}

function buildNarrativePrompt(data: {
  language: NarrativeLanguage;
  mode: "promotion" | "snapshot";
  snippets: string[];
  promotions?: string[];
  themes?: string[];
}): string {
  const introZh =
    data.mode === "snapshot"
      ? "根据以下记忆片段写一段夜间记忆快照：\n"
      : "根据以下记忆片段写一段梦境日记：\n";
  const introEn =
    data.mode === "snapshot"
      ? "Write a nightly memory snapshot from these fragments:\n"
      : "Write a dream diary entry from these memory fragments:\n";
  const lines = [data.language === "zh" ? introZh : introEn];
  for (const snippet of data.snippets.slice(0, 12)) lines.push(`- ${snippet}`);
  if (data.themes?.length) {
    lines.push(data.language === "zh" ? "\n反复出现的主题：" : "\nRecurring themes:");
    for (const theme of data.themes.slice(0, 6)) lines.push(`- ${theme}`);
  }
  if (data.promotions?.length) {
    lines.push(
      data.language === "zh"
        ? "\n已结晶为长久记忆的内容："
        : "\nMemories that crystallized into something lasting:"
    );
    for (const promo of data.promotions.slice(0, 5)) lines.push(`- ${promo}`);
  }
  return lines.join("\n");
}

async function resolveDreamsPath(workspaceDir: string): Promise<string> {
  for (const name of DREAMS_FILENAMES) {
    const target = path.join(workspaceDir, name);
    try {
      await fs.access(target);
      return target;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
    }
  }
  return path.join(workspaceDir, DREAMS_FILENAMES[0]!);
}

function formatNarrativeDate(epochMs: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(epochMs));
}

async function appendNarrativeEntry(params: {
  workspaceDir: string;
  narrative: string;
  nowMs: number;
  timezone: string;
}): Promise<void> {
  const dreamsPath = await resolveDreamsPath(params.workspaceDir);
  let lock = dreamsFileLocks.get(dreamsPath);
  if (!lock) {
    lock = createAsyncLock();
    dreamsFileLocks.set(dreamsPath, lock);
  }

  await lock(async () => {
    await fs.mkdir(path.dirname(dreamsPath), { recursive: true });
    const existing = await fs.readFile(dreamsPath, "utf-8").catch((err) => {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return "";
      throw err;
    });
    const dateStr = formatNarrativeDate(params.nowMs, params.timezone);
    const entry = `\n---\n\n*${dateStr}*\n\n${params.narrative}\n`;
    let updated: string;
    if (existing.includes(DIARY_START_MARKER) && existing.includes(DIARY_END_MARKER)) {
      const endIdx = existing.lastIndexOf(DIARY_END_MARKER);
      updated = `${existing.slice(0, endIdx)}${entry}\n${existing.slice(endIdx)}`;
    } else {
      const diarySection = `# Dream Diary\n\n${DIARY_START_MARKER}${entry}\n${DIARY_END_MARKER}\n`;
      updated = existing.trim().length === 0 ? diarySection : `${diarySection}\n${existing}`;
    }
    await fs.writeFile(dreamsPath, updated.endsWith("\n") ? updated : `${updated}\n`, "utf-8");
  });
}

export async function generateAndAppendDreamNarrative(params: {
  subagent?: SubagentRuntime;
  llmComplete?: LlmCompleteFn;
  workspaceDir: string;
  config: NarrativeConfig;
  mode: "promotion" | "snapshot";
  snippets: string[];
  promotions: string[];
  themes?: string[];
  nowMs: number;
  timezone: string;
  logger: PluginLogger;
}): Promise<boolean> {
  if (!params.config.enabled) return false;
  if (params.snippets.length === 0 && params.promotions.length === 0) return false;
  if (!params.subagent && !params.llmComplete) {
    params.logger.warn(
      "memory-lancedb-dreaming: narrative generation skipped (no subagent or llm.complete runtime available)"
    );
    return false;
  }

  const languages = resolveLanguages(params.config);
  const sections: string[] = [];

  for (const language of languages) {
    const sessionKey = buildNarrativeSessionKey(
      params.workspaceDir,
      params.nowMs,
      language
    );
    const message = buildNarrativePrompt({
      language,
      mode: params.mode,
      snippets: params.snippets,
      promotions: params.promotions,
      themes: params.themes,
    });
    const narrative = await runDreamingTextPrompt({
      subagent: params.subagent,
      llmComplete: params.llmComplete,
      sessionKey,
      message,
      systemPrompt: systemPromptForLanguage(language, params.mode),
      model: params.config.model,
      logger: params.logger,
      logLabel: `narrative generation (${language})`,
    });
    if (narrative) sections.push(narrative);
  }

  if (sections.length === 0) {
    params.logger.warn("memory-lancedb-dreaming: narrative generation produced no text");
    return false;
  }

  const combined = sections.join("\n\n");
  await appendNarrativeEntry({
    workspaceDir: params.workspaceDir,
    narrative: combined,
    nowMs: params.nowMs,
    timezone: params.timezone,
  });
  params.logger.info(
    `memory-lancedb-dreaming: dream diary ${params.mode} entry written (${languages.join(", ")}) [workspace=${params.workspaceDir}]`
  );
  return true;
}
