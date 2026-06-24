import { createHash } from "node:crypto";
import { runDreamingTextPrompt } from "../llm-subagent.js";
const THEME_NAMING_SYSTEM_PROMPT = [
    "You name thematic clusters in a memory reflection journal.",
    "For each numbered cluster, output exactly one line:",
    "中文主题名（4-8字） / English Topic Name",
    "Use concise, semantic names — not category labels like fact or other.",
    "Output only the numbered lines, no extra commentary.",
].join("\n");
const THEME_LINE_RE = /^\s*(?:\d+[\.\)、]\s*)?(.+?)\s*\/\s*(.+?)\s*$/;
function buildThemeNamingSessionKey(workspaceDir, nowMs) {
    const workspaceHash = createHash("sha1").update(workspaceDir).digest("hex").slice(0, 12);
    return `dreaming-rem-themes-lancedb-${workspaceHash}-${nowMs}`;
}
function buildThemeNamingPrompt(clusters) {
    const lines = [
        "以下是今天记忆观测中的一组聚类话题，请为每组生成一个4-8字的中文主题名和一个对应的英文主题名：",
        "",
    ];
    for (let i = 0; i < clusters.length; i += 1) {
        const cluster = clusters[i];
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
function isPlaceholderTheme(zh, en) {
    const zhLower = zh.toLowerCase();
    const enLower = en.toLowerCase();
    const zhPlaceholder = zh.includes("主题名") ||
        zh.includes("中文主题") ||
        /[（(]\s*\d+\s*[-~]\s*\d+\s*字\s*[）)]/.test(zh);
    const enPlaceholder = enLower.includes("english topic name") ||
        enLower === "topic name" ||
        enLower.includes("topic name") && enLower.startsWith("english");
    return zhPlaceholder || enPlaceholder;
}
export function parseThemeLines(raw, clusterCount) {
    const lines = raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    const parsed = [];
    for (const line of lines) {
        const match = line.match(THEME_LINE_RE);
        if (!match)
            continue;
        const zh = match[1]?.trim();
        const en = match[2]?.trim();
        if (!zh || !en)
            continue;
        if (isPlaceholderTheme(zh, en))
            continue;
        parsed.push({ zh, en });
    }
    while (parsed.length < clusterCount)
        parsed.push(null);
    return parsed.slice(0, clusterCount);
}
function summarizeCoverage(cluster) {
    const top = cluster.spotlightMemories[0] ?? cluster.memories
        .slice()
        .sort((a, b) => b.importance - a.importance)[0];
    const hint = top?.text.trim().slice(0, 48);
    if (hint)
        return `${cluster.count} 条记忆（${hint}${hint.length >= 48 ? "…" : ""}）`;
    return `${cluster.count} 条记忆`;
}
export function buildTagClusters(entries, limit, minPatternStrength) {
    const tagToMemories = new Map();
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
        .sort((a, b) => b.strength - a.strength ||
        b.count - a.count ||
        a.tag.localeCompare(b.tag))
        .slice(0, limit);
}
export function formatRemReflectionLines(clusters, themeNames) {
    if (clusters.length === 0)
        return ["- No strong patterns surfaced."];
    const lines = [];
    for (let i = 0; i < clusters.length; i += 1) {
        const cluster = clusters[i];
        const named = themeNames[i];
        if (named) {
            lines.push(`- Theme: ${named.zh} / ${named.en} (${cluster.strength.toFixed(2)})`);
            lines.push(`  - 覆盖: ${summarizeCoverage(cluster)}`);
        }
        else {
            lines.push(`- Theme: \`${cluster.tag}\` kept surfacing across ${cluster.count} memories.`);
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
export async function nameRemClusters(params) {
    const empty = params.clusters.map(() => null);
    if (!params.config.model?.trim() || params.clusters.length === 0)
        return empty;
    if (!params.subagent && !params.llmComplete)
        return empty;
    const sessionKey = buildThemeNamingSessionKey(params.workspaceDir, params.nowMs);
    const message = buildThemeNamingPrompt(params.clusters);
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
    if (!raw)
        return empty;
    return parseThemeLines(raw, params.clusters.length);
}
//# sourceMappingURL=rem-themes.js.map