import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { type DreamingConfig } from "./config.js";
export declare const PLUGIN_ID = "memory-lancedb-dreaming";
export declare function readRawPluginConfig(api?: OpenClawPluginApi): Record<string, unknown> | undefined;
/** Resolve dreaming config from runtime, validated pluginConfig, and disk with legacy aliases. */
export declare function resolveDreamingConfig(seed: Partial<DreamingConfig> | undefined, api?: OpenClawPluginApi): DreamingConfig;
export declare function summarizeDreamingConfig(config: DreamingConfig): {
    remModel: string | null;
    narrativeModel: string | null;
    narrativeLanguages: ("zh" | "en")[];
    narrativeSourceCooldownDays: number;
    narrativeMinNovelSnippets: number;
    narrativeOutputDedupeWindowDays: number;
    remThemeCooldownDays: number;
    remThemeSimilarityThreshold: number;
    remTruthDedupeWindowDays: number;
    remTruthSimilarityThreshold: number;
    remExcludePromoted: boolean;
    deepIdleNoveltyAfterDays: number;
    dailyReportEnabled: boolean;
    dailyReportCron: string;
    dailyReportDelivery: {
        pushOn?: "always" | "changed" | undefined;
        mode?: "announce" | "direct" | "webhook" | undefined;
        threadId?: string | number | undefined;
        accountId?: string | undefined;
        channel: string;
        to: string;
    } | null;
};
export type PluginHooksPolicy = {
    allowConversationAccess: boolean | undefined;
};
/** Read plugins.entries.<id>.hooks from runtime or disk. */
export declare function readPluginHooksPolicy(api?: OpenClawPluginApi): PluginHooksPolicy;
export type PluginSubagentPolicy = {
    allowModelOverride: boolean | undefined;
};
/** Read plugins.entries.<id>.subagent from runtime or disk. */
export declare function readPluginSubagentPolicy(api?: OpenClawPluginApi): PluginSubagentPolicy;
export declare function dreamingConfigNeedsModelOverride(config: Pick<DreamingConfig, "rem" | "narrative">): boolean;
/**
 * OpenClaw blocks before_agent_reply for non-bundled plugins unless
 * plugins.entries.<id>.hooks.allowConversationAccess=true.
 */
export declare function isCronDreamingHookAllowed(api?: OpenClawPluginApi): boolean;
/**
 * OpenClaw blocks rem.model / narrative.model overrides unless
 * plugins.entries.<id>.subagent.allowModelOverride=true.
 */
export declare function isModelOverrideAllowed(api?: OpenClawPluginApi): boolean;
//# sourceMappingURL=config-resolve.d.ts.map