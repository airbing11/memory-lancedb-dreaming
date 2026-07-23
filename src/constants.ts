export const DREAMING_TRIGGER_TOKEN = "__openclaw_memory_lancedb_dreaming_trigger__";

export const PLUGIN_VERSION = "0.3.12";

export const DAILY_REPORT_TRIGGER_TOKEN = "__openclaw_memory_lancedb_dreaming_daily_report__";

export const MANAGED_DREAMING_CRON_NAME = "LanceDB Memory Dreaming";
export const MANAGED_DAILY_REPORT_CRON_NAME = "Dreaming Daily Report";
export const MANAGED_DREAMING_CRON_TAG = "[managed-by=memory-lancedb-dreaming]";
export const MANAGED_DAILY_REPORT_CRON_TAG =
  "[managed-by=memory-lancedb-dreaming] daily-report";

export const PROMOTION_MARKER_PREFIX = "openclaw-memory-lancedb-promotion:";

export const RUNTIME_CRON_RECONCILE_INTERVAL_MS = 60_000;
export const STARTUP_CRON_RETRY_DELAY_MS = 5_000;
export const STARTUP_CRON_MAX_RETRIES = 120;

export const NARRATIVE_TIMEOUT_MS = 60_000;
export const NARRATIVE_DELETE_SETTLE_TIMEOUT_MS = 120_000;

export const DREAMING_STATE_RELATIVE_PATH = ["memory", ".dreams", "lancedb-dreaming-state.json"] as const;

export const MEMORY_CATEGORIES = [
  "preference",
  "fact",
  "decision",
  "entity",
  "other",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
