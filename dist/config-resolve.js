import { DEFAULT_DREAMING_CONFIG, } from "./config.js";
import { loadConfigFromDisk } from "./lancedb-client.js";
import { normalizeTrimmedString } from "./utils.js";
export const PLUGIN_ID = "memory-lancedb-dreaming";
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function readPluginEntry(api) {
    if (api) {
        const entries = asRecord(asRecord(asRecord(api.config)?.plugins)?.entries);
        const fromApi = entries?.[PLUGIN_ID];
        if (fromApi && typeof fromApi === "object" && !Array.isArray(fromApi)) {
            return fromApi;
        }
        const runtime = api.runtime;
        const runtimeRoot = asRecord(runtime?.config?.current?.());
        const fromRuntime = asRecord(asRecord(asRecord(runtimeRoot?.plugins)?.entries)?.[PLUGIN_ID]);
        if (fromRuntime)
            return fromRuntime;
    }
    const diskRoot = loadConfigFromDisk();
    return asRecord(asRecord(asRecord(diskRoot?.plugins)?.entries)?.[PLUGIN_ID]);
}
export function readRawPluginConfig(api) {
    const entry = readPluginEntry(api);
    const nested = asRecord(entry?.config);
    if (nested && Object.keys(nested).length > 0)
        return nested;
    if (api?.pluginConfig && Object.keys(api.pluginConfig).length > 0) {
        return api.pluginConfig;
    }
    return nested ?? undefined;
}
function resolveExecutionModel(source) {
    if (!source)
        return undefined;
    return (normalizeTrimmedString(source.model) ??
        normalizeTrimmedString(asRecord(source.execution)?.model) ??
        normalizeTrimmedString(asRecord(asRecord(source.execution)?.defaults)?.model));
}
function resolvePhaseRecord(root, phase, legacyPhases) {
    return (asRecord(asRecord(root[phase]) ?? legacyPhases?.[phase]) ??
        asRecord(asRecord(root.phases)?.[phase]));
}
function resolveRemModel(root, rem) {
    return (resolveExecutionModel(rem) ??
        resolveExecutionModel(root) ??
        normalizeTrimmedString(root.remModel));
}
function resolveNarrativeModel(root, narrative, remModel) {
    return (resolveExecutionModel(narrative) ??
        remModel ??
        resolveExecutionModel(root) ??
        normalizeTrimmedString(root.narrativeModel));
}
function normalizeLanguages(value) {
    if (Array.isArray(value)) {
        const langs = value
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item === "zh" || item === "en");
        return langs.length > 0 ? langs : undefined;
    }
    if (typeof value === "string") {
        const langs = value
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter((item) => item === "zh" || item === "en");
        return langs.length > 0 ? langs : undefined;
    }
    return undefined;
}
function mergePhaseConfig(defaults, raw) {
    if (!raw)
        return defaults;
    return { ...defaults, ...raw };
}
/** Resolve dreaming config from runtime, validated pluginConfig, and disk with legacy aliases. */
export function resolveDreamingConfig(seed, api) {
    const raw = {
        ...DEFAULT_DREAMING_CONFIG,
        ...(readRawPluginConfig(api) ?? {}),
        ...(seed ?? {}),
    };
    const legacyPhases = asRecord(raw.phases);
    const lightRaw = resolvePhaseRecord(raw, "light", legacyPhases);
    const remRaw = resolvePhaseRecord(raw, "rem", legacyPhases);
    const deepRaw = resolvePhaseRecord(raw, "deep", legacyPhases);
    const narrativeRaw = asRecord(raw.narrative);
    const remModel = resolveRemModel(raw, remRaw);
    const narrativeModel = resolveNarrativeModel(raw, narrativeRaw, remModel);
    const languages = normalizeLanguages(narrativeRaw?.languages) ??
        normalizeLanguages(raw.narrativeLanguages) ??
        DEFAULT_DREAMING_CONFIG.narrative.languages;
    const light = mergePhaseConfig(DEFAULT_DREAMING_CONFIG.light, lightRaw);
    const rem = mergePhaseConfig(DEFAULT_DREAMING_CONFIG.rem, {
        ...remRaw,
        ...(remModel ? { model: remModel } : {}),
    });
    const deep = mergePhaseConfig(DEFAULT_DREAMING_CONFIG.deep, deepRaw);
    const narrative = mergePhaseConfig(DEFAULT_DREAMING_CONFIG.narrative, {
        ...narrativeRaw,
        languages,
        ...(narrativeModel ? { model: narrativeModel } : {}),
    });
    const dailyReportRaw = asRecord(raw.dailyReport);
    const dailyReportLanguages = normalizeLanguages(dailyReportRaw?.languages) ?? DEFAULT_DREAMING_CONFIG.dailyReport.languages;
    const deliveryRaw = asRecord(dailyReportRaw?.delivery);
    const pushOnRaw = normalizeTrimmedString(deliveryRaw?.pushOn);
    const pushOn = pushOnRaw === "always" || pushOnRaw === "changed" ? pushOnRaw : "changed";
    const delivery = deliveryRaw &&
        normalizeTrimmedString(deliveryRaw.channel) &&
        normalizeTrimmedString(deliveryRaw.to)
        ? {
            channel: normalizeTrimmedString(deliveryRaw.channel),
            to: normalizeTrimmedString(deliveryRaw.to),
            pushOn,
            ...(normalizeTrimmedString(deliveryRaw.mode)
                ? { mode: normalizeTrimmedString(deliveryRaw.mode) }
                : {}),
            ...(deliveryRaw.threadId !== undefined ? { threadId: deliveryRaw.threadId } : {}),
            ...(normalizeTrimmedString(deliveryRaw.accountId)
                ? { accountId: normalizeTrimmedString(deliveryRaw.accountId) }
                : {}),
        }
        : undefined;
    const dailyReport = {
        enabled: dailyReportRaw?.enabled !== false,
        cron: normalizeTrimmedString(dailyReportRaw?.cron) ?? DEFAULT_DREAMING_CONFIG.dailyReport.cron,
        timezone: normalizeTrimmedString(dailyReportRaw?.timezone) ??
            normalizeTrimmedString(raw.timezone) ??
            DEFAULT_DREAMING_CONFIG.timezone,
        languages: dailyReportLanguages,
        ...(delivery ? { delivery } : {}),
    };
    return {
        enabled: raw.enabled !== false,
        cron: normalizeTrimmedString(raw.cron) ??
            normalizeTrimmedString(raw.frequency) ??
            DEFAULT_DREAMING_CONFIG.cron,
        timezone: normalizeTrimmedString(raw.timezone) ?? DEFAULT_DREAMING_CONFIG.timezone,
        light,
        rem,
        deep,
        narrative,
        dailyReport,
        autoManageCron: raw.autoManageCron !== false,
        verboseLogging: raw.verboseLogging === true,
    };
}
export function summarizeDreamingConfig(config) {
    return {
        remModel: config.rem.model ?? null,
        narrativeModel: config.narrative.model ?? null,
        narrativeLanguages: config.narrative.languages,
        dailyReportEnabled: config.dailyReport.enabled,
        dailyReportCron: config.dailyReport.cron,
        dailyReportDelivery: config.dailyReport.delivery ?? null,
    };
}
/** Read plugins.entries.<id>.hooks from runtime or disk. */
export function readPluginHooksPolicy(api) {
    const entry = readPluginEntry(api);
    const hooks = asRecord(entry?.hooks);
    const allowConversationAccess = typeof hooks?.allowConversationAccess === "boolean"
        ? hooks.allowConversationAccess
        : undefined;
    return { allowConversationAccess };
}
/** Read plugins.entries.<id>.subagent from runtime or disk. */
export function readPluginSubagentPolicy(api) {
    const entry = readPluginEntry(api);
    const subagent = asRecord(entry?.subagent);
    const allowModelOverride = typeof subagent?.allowModelOverride === "boolean"
        ? subagent.allowModelOverride
        : undefined;
    return { allowModelOverride };
}
export function dreamingConfigNeedsModelOverride(config) {
    return Boolean(config.rem?.model || config.narrative?.model);
}
/**
 * OpenClaw blocks before_agent_reply for non-bundled plugins unless
 * plugins.entries.<id>.hooks.allowConversationAccess=true.
 */
export function isCronDreamingHookAllowed(api) {
    return readPluginHooksPolicy(api).allowConversationAccess === true;
}
/**
 * OpenClaw blocks rem.model / narrative.model overrides unless
 * plugins.entries.<id>.subagent.allowModelOverride=true.
 */
export function isModelOverrideAllowed(api) {
    return readPluginSubagentPolicy(api).allowModelOverride === true;
}
//# sourceMappingURL=config-resolve.js.map