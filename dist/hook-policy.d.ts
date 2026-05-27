import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import type { DreamingConfig } from "./config.js";
export declare const CRON_HOOK_REQUIREMENT = "plugins.entries.memory-lancedb-dreaming.hooks.allowConversationAccess=true";
export declare const MODEL_OVERRIDE_REQUIREMENT = "plugins.entries.memory-lancedb-dreaming.subagent.allowModelOverride=true";
export declare function warnIfCronHookBlocked(api: OpenClawPluginApi, enabled: boolean): void;
export declare function warnIfModelOverrideBlocked(api: OpenClawPluginApi, config: DreamingConfig): void;
export declare function summarizePluginEntryPolicy(api: OpenClawPluginApi, config: DreamingConfig): {
    allowConversationAccess: boolean;
    cronTriggerReady: boolean;
    allowModelOverride: boolean;
    llmModelOverrideReady: boolean;
    requirements: {
        cronHook: string;
        modelOverride: string | null;
    };
};
/** @deprecated Use summarizePluginEntryPolicy */
export declare function summarizeHookPolicy(api: OpenClawPluginApi, config?: DreamingConfig): {
    allowConversationAccess: boolean;
    cronTriggerReady: boolean;
    allowModelOverride: boolean;
    llmModelOverrideReady: boolean;
    requirements: {
        cronHook: string;
        modelOverride: string | null;
    };
} | {
    allowConversationAccess: boolean;
    cronTriggerReady: boolean;
    requirement: string;
};
//# sourceMappingURL=hook-policy.d.ts.map