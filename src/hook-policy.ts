import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import type { DreamingConfig } from "./config.js";
import {
  PLUGIN_ID,
  dreamingConfigNeedsModelOverride,
  isCronDreamingHookAllowed,
  isModelOverrideAllowed,
} from "./config-resolve.js";

export const CRON_HOOK_REQUIREMENT =
  `plugins.entries.${PLUGIN_ID}.hooks.allowConversationAccess=true`;

export const MODEL_OVERRIDE_REQUIREMENT =
  `plugins.entries.${PLUGIN_ID}.subagent.allowModelOverride=true`;

export function warnIfCronHookBlocked(api: OpenClawPluginApi, enabled: boolean): void {
  if (!enabled) return;
  if (isCronDreamingHookAllowed(api)) return;

  api.logger.error(
    [
      "memory-lancedb-dreaming: ===== CONFIG BLOCKED — cron dreaming disabled =====",
      `memory-lancedb-dreaming: set ${CRON_HOOK_REQUIREMENT} and restart gateway (hot reload does not re-register hooks)`,
      "memory-lancedb-dreaming: =====================================================",
    ].join("\n")
  );
}

export function warnIfModelOverrideBlocked(
  api: OpenClawPluginApi,
  config: DreamingConfig
): void {
  if (!config.enabled) return;
  if (!dreamingConfigNeedsModelOverride(config)) return;
  if (isModelOverrideAllowed(api)) return;

  api.logger.error(
    [
      "memory-lancedb-dreaming: ===== CONFIG BLOCKED — LLM model override disabled =====",
      `memory-lancedb-dreaming: set ${MODEL_OVERRIDE_REQUIREMENT} and restart gateway (REM will fall back to category tags)`,
      "memory-lancedb-dreaming: ========================================================",
    ].join("\n")
  );
}

export function summarizePluginEntryPolicy(api: OpenClawPluginApi, config: DreamingConfig) {
  const cronTriggerReady = isCronDreamingHookAllowed(api);
  const needsModelOverride = dreamingConfigNeedsModelOverride(config);
  const modelOverrideReady = !needsModelOverride || isModelOverrideAllowed(api);

  return {
    allowConversationAccess: cronTriggerReady,
    cronTriggerReady,
    allowModelOverride: isModelOverrideAllowed(api),
    llmModelOverrideReady: modelOverrideReady,
    requirements: {
      cronHook: CRON_HOOK_REQUIREMENT,
      modelOverride: needsModelOverride ? MODEL_OVERRIDE_REQUIREMENT : null,
    },
  };
}

/** @deprecated Use summarizePluginEntryPolicy */
export function summarizeHookPolicy(api: OpenClawPluginApi, config?: DreamingConfig) {
  if (config) return summarizePluginEntryPolicy(api, config);
  const cronTriggerReady = isCronDreamingHookAllowed(api);
  return {
    allowConversationAccess: cronTriggerReady,
    cronTriggerReady,
    requirement: CRON_HOOK_REQUIREMENT,
  };
}
