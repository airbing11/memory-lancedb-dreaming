import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import {
  DEFAULT_DREAMING_CONFIG,
  type DreamingConfig,
  type NarrativeLanguage,
} from "./config.js";
import { loadConfigFromDisk } from "./lancedb-client.js";
import { normalizeTrimmedString } from "./utils.js";

export const PLUGIN_ID = "memory-lancedb-dreaming";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readPluginEntry(api?: OpenClawPluginApi): Record<string, unknown> | undefined {
  if (api) {
    const entries = asRecord(asRecord(asRecord(api.config)?.plugins)?.entries);
    const fromApi = entries?.[PLUGIN_ID];
    if (fromApi && typeof fromApi === "object" && !Array.isArray(fromApi)) {
      return fromApi as Record<string, unknown>;
    }

    const runtime = api.runtime as { config?: { current?: () => unknown } } | undefined;
    const runtimeRoot = asRecord(runtime?.config?.current?.());
    const fromRuntime = asRecord(asRecord(asRecord(runtimeRoot?.plugins)?.entries)?.[PLUGIN_ID]);
    if (fromRuntime) return fromRuntime;
  }

  const diskRoot = loadConfigFromDisk();
  return asRecord(asRecord(asRecord(diskRoot?.plugins)?.entries)?.[PLUGIN_ID]);
}

export function readRawPluginConfig(api?: OpenClawPluginApi): Record<string, unknown> | undefined {
  const entry = readPluginEntry(api);
  const nested = asRecord(entry?.config);
  if (nested && Object.keys(nested).length > 0) return nested;

  if (api?.pluginConfig && Object.keys(api.pluginConfig).length > 0) {
    return api.pluginConfig;
  }

  return nested ?? undefined;
}

function resolveExecutionModel(source: Record<string, unknown> | undefined): string | undefined {
  if (!source) return undefined;
  return (
    normalizeTrimmedString(source.model) ??
    normalizeTrimmedString(asRecord(source.execution)?.model) ??
    normalizeTrimmedString(asRecord(asRecord(source.execution)?.defaults)?.model)
  );
}

function resolvePhaseRecord(
  root: Record<string, unknown>,
  phase: "light" | "rem" | "deep",
  legacyPhases?: Record<string, unknown>
): Record<string, unknown> | undefined {
  return (
    asRecord(asRecord(root[phase]) ?? legacyPhases?.[phase]) ??
    asRecord(asRecord(root.phases)?.[phase])
  );
}

function resolveRemModel(
  root: Record<string, unknown>,
  rem?: Record<string, unknown>
): string | undefined {
  return (
    resolveExecutionModel(rem) ??
    resolveExecutionModel(root) ??
    normalizeTrimmedString(root.remModel)
  );
}

function resolveNarrativeModel(
  root: Record<string, unknown>,
  narrative?: Record<string, unknown>,
  remModel?: string
): string | undefined {
  return (
    resolveExecutionModel(narrative) ??
    remModel ??
    resolveExecutionModel(root) ??
    normalizeTrimmedString(root.narrativeModel)
  );
}

function normalizeLanguages(value: unknown): NarrativeLanguage[] | undefined {
  if (Array.isArray(value)) {
    const langs = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item): item is NarrativeLanguage => item === "zh" || item === "en");
    return langs.length > 0 ? langs : undefined;
  }
  if (typeof value === "string") {
    const langs = value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter((item): item is NarrativeLanguage => item === "zh" || item === "en");
    return langs.length > 0 ? langs : undefined;
  }
  return undefined;
}

function mergePhaseConfig<T extends Record<string, unknown>>(
  defaults: T,
  raw?: Record<string, unknown>
): T {
  if (!raw) return defaults;
  return { ...defaults, ...raw } as T;
}

/** Resolve dreaming config from runtime, validated pluginConfig, and disk with legacy aliases. */
export function resolveDreamingConfig(
  seed: Partial<DreamingConfig> | undefined,
  api?: OpenClawPluginApi
): DreamingConfig {
  const raw = {
    ...DEFAULT_DREAMING_CONFIG,
    ...(readRawPluginConfig(api) ?? {}),
    ...(seed ?? {}),
  } as Record<string, unknown>;

  const legacyPhases = asRecord(raw.phases);
  const lightRaw = resolvePhaseRecord(raw, "light", legacyPhases);
  const remRaw = resolvePhaseRecord(raw, "rem", legacyPhases);
  const deepRaw = resolvePhaseRecord(raw, "deep", legacyPhases);
  const narrativeRaw = asRecord(raw.narrative);

  const remModel = resolveRemModel(raw, remRaw);
  const narrativeModel = resolveNarrativeModel(raw, narrativeRaw, remModel);
  const languages =
    normalizeLanguages(narrativeRaw?.languages) ??
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
  const dailyReportLanguages =
    normalizeLanguages(dailyReportRaw?.languages) ?? DEFAULT_DREAMING_CONFIG.dailyReport.languages;
  const deliveryRaw = asRecord(dailyReportRaw?.delivery);
  const pushOnRaw = normalizeTrimmedString(deliveryRaw?.pushOn);
  const pushOn: "always" | "changed" =
    pushOnRaw === "always" || pushOnRaw === "changed" ? pushOnRaw : "changed";
  const delivery =
    deliveryRaw &&
    normalizeTrimmedString(deliveryRaw.channel) &&
    normalizeTrimmedString(deliveryRaw.to)
      ? {
          channel: normalizeTrimmedString(deliveryRaw.channel)!,
          to: normalizeTrimmedString(deliveryRaw.to)!,
          pushOn,
          ...(normalizeTrimmedString(deliveryRaw.mode)
            ? { mode: normalizeTrimmedString(deliveryRaw.mode) as "announce" | "direct" | "webhook" }
            : {}),
          ...(deliveryRaw.threadId !== undefined ? { threadId: deliveryRaw.threadId as string | number } : {}),
          ...(normalizeTrimmedString(deliveryRaw.accountId)
            ? { accountId: normalizeTrimmedString(deliveryRaw.accountId)! }
            : {}),
        }
      : undefined;

  const dailyReport = {
    enabled: dailyReportRaw?.enabled !== false,
    cron:
      normalizeTrimmedString(dailyReportRaw?.cron) ?? DEFAULT_DREAMING_CONFIG.dailyReport.cron,
    timezone:
      normalizeTrimmedString(dailyReportRaw?.timezone) ??
      normalizeTrimmedString(raw.timezone) ??
      DEFAULT_DREAMING_CONFIG.timezone,
    languages: dailyReportLanguages,
    ...(delivery ? { delivery } : {}),
  };

  return {
    enabled: raw.enabled !== false,
    cron:
      normalizeTrimmedString(raw.cron) ??
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

export function summarizeDreamingConfig(config: DreamingConfig) {
  return {
    remModel: config.rem.model ?? null,
    narrativeModel: config.narrative.model ?? null,
    narrativeLanguages: config.narrative.languages,
    narrativeSourceCooldownDays: config.narrative.sourceCooldownDays,
    narrativeMinNovelSnippets: config.narrative.minNovelSnippets,
    narrativeOutputDedupeWindowDays: config.narrative.outputDedupeWindowDays,
    remThemeCooldownDays: config.rem.themeCooldownDays,
    remThemeSimilarityThreshold: config.rem.themeSimilarityThreshold,
    remTruthDedupeWindowDays: config.rem.truthDedupeWindowDays,
    remTruthSimilarityThreshold: config.rem.truthSimilarityThreshold,
    remExcludePromoted: config.rem.excludePromoted,
    deepIdleNoveltyAfterDays: config.deep.idleNoveltyAfterDays,
    dailyReportEnabled: config.dailyReport.enabled,
    dailyReportCron: config.dailyReport.cron,
    dailyReportDelivery: config.dailyReport.delivery ?? null,
  };
}

export type PluginHooksPolicy = {
  allowConversationAccess: boolean | undefined;
};

/** Read plugins.entries.<id>.hooks from runtime or disk. */
export function readPluginHooksPolicy(api?: OpenClawPluginApi): PluginHooksPolicy {
  const entry = readPluginEntry(api);
  const hooks = asRecord(entry?.hooks);
  const allowConversationAccess =
    typeof hooks?.allowConversationAccess === "boolean"
      ? hooks.allowConversationAccess
      : undefined;
  return { allowConversationAccess };
}

export type PluginSubagentPolicy = {
  allowModelOverride: boolean | undefined;
};

/** Read plugins.entries.<id>.subagent from runtime or disk. */
export function readPluginSubagentPolicy(api?: OpenClawPluginApi): PluginSubagentPolicy {
  const entry = readPluginEntry(api);
  const subagent = asRecord(entry?.subagent);
  const allowModelOverride =
    typeof subagent?.allowModelOverride === "boolean"
      ? subagent.allowModelOverride
      : undefined;
  return { allowModelOverride };
}

export function dreamingConfigNeedsModelOverride(config: Pick<DreamingConfig, "rem" | "narrative">): boolean {
  return Boolean(config.rem?.model || config.narrative?.model);
}

/**
 * OpenClaw blocks before_agent_reply for non-bundled plugins unless
 * plugins.entries.<id>.hooks.allowConversationAccess=true.
 */
export function isCronDreamingHookAllowed(api?: OpenClawPluginApi): boolean {
  return readPluginHooksPolicy(api).allowConversationAccess === true;
}

/**
 * OpenClaw blocks rem.model / narrative.model overrides unless
 * plugins.entries.<id>.subagent.allowModelOverride=true.
 */
export function isModelOverrideAllowed(api?: OpenClawPluginApi): boolean {
  return readPluginSubagentPolicy(api).allowModelOverride === true;
}
