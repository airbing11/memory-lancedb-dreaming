import type { DailyReportLanguage } from "../config.js";
import type { DailyReportSnapshot } from "./types.js";

function phaseLineZh(snapshot: DailyReportSnapshot, phase: "light" | "rem" | "deep"): string {
  if (phase === "light") {
    if (!snapshot.light.ran) return "未运行";
    return `${snapshot.light.candidateCount} 条观测候选`;
  }
  if (phase === "rem") {
    if (!snapshot.rem.ran) return "未运行";
    return `${snapshot.rem.themeCount} 个主题模式`;
  }
  if (!snapshot.deep.ran) return "未运行";
  return `${snapshot.deep.promotedCount} 条提升至永久记忆`;
}

function phaseLineEn(snapshot: DailyReportSnapshot, phase: "light" | "rem" | "deep"): string {
  if (phase === "light") {
    if (!snapshot.light.ran) return "not run";
    return `${snapshot.light.candidateCount} observation candidate(s)`;
  }
  if (phase === "rem") {
    if (!snapshot.rem.ran) return "not run";
    return `${snapshot.rem.themeCount} theme pattern(s)`;
  }
  if (!snapshot.deep.ran) return "not run";
  return `${snapshot.deep.promotedCount} promoted to long-term memory`;
}

function renderZh(snapshot: DailyReportSnapshot): string {
  const lines: string[] = [
    `🌙 梦境日报 ${snapshot.day}`,
    "",
    "【三阶段概要】",
    `- 🌘 Light 阶段：${phaseLineZh(snapshot, "light")}`,
    `- 🌓 REM 阶段：${phaseLineZh(snapshot, "rem")}`,
    `- 🌒 Deep 阶段：${phaseLineZh(snapshot, "deep")}`,
    "",
    "【关键发现】",
  ];

  if (snapshot.rem.themes.length === 0) {
    lines.push("- 暂无 REM 主题（或未运行 REM 阶段）");
  } else {
    for (const theme of snapshot.rem.themes.slice(0, 8)) {
      const conf = theme.confidence > 0 ? `（${theme.confidence.toFixed(2)}）` : "";
      const summary = theme.summary ? ` — ${theme.summary}` : "";
      lines.push(`- ${theme.label}${conf}${summary}`);
    }
  }

  lines.push("", "【梦境叙事】");
  if (snapshot.narrative.excerpt) {
    lines.push(snapshot.narrative.excerpt);
  } else {
    lines.push("（暂无叙事条目）");
  }

  return lines.join("\n");
}

function renderEn(snapshot: DailyReportSnapshot): string {
  const lines: string[] = [
    `🌙 Dream Report ${snapshot.day}`,
    "",
    "[Phases]",
    `- Light: ${phaseLineEn(snapshot, "light")}`,
    `- REM: ${phaseLineEn(snapshot, "rem")}`,
    `- Deep: ${phaseLineEn(snapshot, "deep")}`,
    "",
    "[Key findings]",
  ];

  if (snapshot.rem.themes.length === 0) {
    lines.push("- No REM themes (or REM did not run)");
  } else {
    for (const theme of snapshot.rem.themes.slice(0, 8)) {
      const conf = theme.confidence > 0 ? ` (${theme.confidence.toFixed(2)})` : "";
      const summary = theme.summary ? ` — ${theme.summary}` : "";
      lines.push(`- ${theme.label}${conf}${summary}`);
    }
  }

  lines.push("", "[Dream narrative]");
  if (snapshot.narrative.excerpt) {
    lines.push(snapshot.narrative.excerpt);
  } else {
    lines.push("(No narrative entry yet)");
  }

  return lines.join("\n");
}

export function renderDailyReport(
  snapshot: DailyReportSnapshot,
  languages: DailyReportLanguage[]
): string {
  const langs = languages.length > 0 ? languages : (["zh"] as DailyReportLanguage[]);
  const sections: string[] = [];
  if (langs.includes("zh")) sections.push(renderZh(snapshot));
  if (langs.includes("en")) sections.push(renderEn(snapshot));
  return sections.join("\n\n---\n\n");
}
