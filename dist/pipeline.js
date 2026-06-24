import { countConsecutiveIdleDays, readDeepHistory } from "./deep-history.js";
import { withDbRead } from "./lancedb-client.js";
import { generateAndAppendDreamNarrative } from "./narrative.js";
import { runDeepSleep } from "./phases/deep.js";
import { runLightSleep } from "./phases/light.js";
import { runRemSleep } from "./phases/rem.js";
import { formatDreamingDay } from "./utils.js";
function needsLlmRuntime(config) {
    if (config.narrative.enabled)
        return true;
    if (config.rem.enabled && Boolean(config.rem.model?.trim()))
        return true;
    return false;
}
export async function runDreamingPipeline(params) {
    const phase = params.phase ?? "all";
    const nowMs = Date.now();
    const { timezone } = params.config;
    const useLlm = needsLlmRuntime(params.config);
    const subagent = useLlm ? params.llm?.subagent : undefined;
    const llmComplete = useLlm ? params.llm?.llmComplete : undefined;
    const listMemories = (opts) => withDbRead(params.db, () => params.db.list(undefined, {
        orderByImportance: opts.orderByImportance ?? true,
        includeVector: opts.includeVector ?? false,
    }));
    let lightCount = 0;
    let remCount = 0;
    let promotedCount = 0;
    let narrativeWritten = false;
    let lightSnippets = [];
    let remThemes = [];
    let remBodyLines = [];
    const phasesRan = { light: false, rem: false, deep: false };
    if (params.config.light.enabled && (phase === "all" || phase === "light")) {
        const light = await runLightSleep({
            db: params.db,
            workspaceDir: params.workspaceDir,
            config: params.config.light,
            timezone,
            nowMs,
            listMemories: () => listMemories({ includeVector: true, orderByImportance: true }),
        });
        lightCount = light.memoryIds.length;
        lightSnippets = light.snippets ?? [];
        phasesRan.light = true;
        params.logger.info(`memory-lancedb-dreaming: light sleep staged ${lightCount} candidate(s)`);
    }
    // Detect a promotion drought from prior days (excludes today, which Deep
    // writes later this run) to drive REM novelty mode.
    const idleNoveltyAfterDays = params.config.deep.idleNoveltyAfterDays ?? 0;
    let noveltyMode = false;
    if (idleNoveltyAfterDays > 0) {
        try {
            const deepHistory = await readDeepHistory(params.workspaceDir);
            const idleDays = countConsecutiveIdleDays({
                history: deepHistory,
                excludeDay: formatDreamingDay(nowMs, timezone),
            });
            noveltyMode = idleDays >= idleNoveltyAfterDays;
            if (noveltyMode) {
                params.logger.info(`memory-lancedb-dreaming: REM novelty mode ON (Deep idle ${idleDays}d ≥ ${idleNoveltyAfterDays}d)`);
            }
        }
        catch (err) {
            params.logger.warn(`memory-lancedb-dreaming: failed to read deep history for novelty mode: ${String(err)}`);
        }
    }
    if (params.config.rem.enabled && (phase === "all" || phase === "rem")) {
        const rem = await runRemSleep({
            db: params.db,
            workspaceDir: params.workspaceDir,
            config: params.config.rem,
            timezone,
            nowMs,
            listMemories: () => listMemories({ orderByImportance: true }),
            subagent,
            llmComplete,
            logger: params.logger,
            noveltyMode,
        });
        remCount = rem.memoryIds.length;
        remBodyLines = rem.bodyLines ?? [];
        remThemes = remBodyLines
            .filter((line) => line.startsWith("- Theme:"))
            .map((line) => line.replace(/^- Theme:\s*/, "").trim());
        phasesRan.rem = true;
        params.logger.info(`memory-lancedb-dreaming: REM sleep analyzed ${remCount} recent memories`);
    }
    let promotionSnippets = [];
    let rankedSnippets = [];
    if (params.config.deep.enabled && (phase === "all" || phase === "deep")) {
        const deep = await runDeepSleep({
            workspaceDir: params.workspaceDir,
            config: params.config.deep,
            timezone,
            nowMs,
            listMemories: () => listMemories({ orderByImportance: true }),
        });
        promotedCount = deep.applied.length;
        promotionSnippets = deep.applied.map((candidate) => candidate.text);
        rankedSnippets = deep.promotions.map((candidate) => candidate.text);
        phasesRan.deep = true;
        params.logger.info(`memory-lancedb-dreaming: deep sleep promoted ${promotedCount} memory(ies) (ranked ${deep.promotions.length})`);
        if (params.config.narrative.enabled && (subagent || llmComplete)) {
            // Freshness gate (v0.2.8): only write a "promotion" narrative when there
            // is something actually new (promotedCount > 0). On a 0-promotion day we
            // no longer reuse stale ranked candidates — fall back to a snapshot of
            // today's light material, or skip if nothing new surfaced.
            if (promotedCount > 0) {
                narrativeWritten = await generateAndAppendDreamNarrative({
                    subagent,
                    llmComplete,
                    workspaceDir: params.workspaceDir,
                    config: params.config.narrative,
                    mode: "promotion",
                    snippets: promotionSnippets.length > 0 ? promotionSnippets : rankedSnippets,
                    promotions: promotionSnippets,
                    themes: remThemes,
                    nowMs,
                    timezone,
                    logger: params.logger,
                });
            }
            else if (lightCount > 0 && lightSnippets.length > 0) {
                narrativeWritten = await generateAndAppendDreamNarrative({
                    subagent,
                    llmComplete,
                    workspaceDir: params.workspaceDir,
                    config: params.config.narrative,
                    mode: "snapshot",
                    snippets: lightSnippets.slice(0, 12),
                    promotions: [],
                    themes: remThemes,
                    nowMs,
                    timezone,
                    logger: params.logger,
                });
            }
        }
    }
    else if (params.config.narrative.enabled &&
        (subagent || llmComplete) &&
        lightCount > 0 &&
        lightSnippets.length > 0 &&
        (phase === "all" || phase === "light")) {
        narrativeWritten = await generateAndAppendDreamNarrative({
            subagent,
            llmComplete,
            workspaceDir: params.workspaceDir,
            config: params.config.narrative,
            mode: "snapshot",
            snippets: lightSnippets.slice(0, 12),
            promotions: [],
            themes: remThemes,
            nowMs,
            timezone,
            logger: params.logger,
        });
    }
    if (params.config.verboseLogging) {
        params.logger.info(`memory-lancedb-dreaming: pipeline complete (light=${lightCount}, rem=${remCount}, promoted=${promotedCount}, narrative=${narrativeWritten})`);
    }
    return {
        lightCount,
        remCount,
        promotedCount,
        narrativeWritten,
        remBodyLines,
        phasesRan,
    };
}
//# sourceMappingURL=pipeline.js.map