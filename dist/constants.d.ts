export declare const DREAMING_TRIGGER_TOKEN = "__openclaw_memory_lancedb_dreaming_trigger__";
export declare const PLUGIN_VERSION = "0.3.14";
export declare const DAILY_REPORT_TRIGGER_TOKEN = "__openclaw_memory_lancedb_dreaming_daily_report__";
export declare const MANAGED_DREAMING_CRON_NAME = "LanceDB Memory Dreaming";
export declare const MANAGED_DAILY_REPORT_CRON_NAME = "Dreaming Daily Report";
export declare const MANAGED_DREAMING_CRON_TAG = "[managed-by=memory-lancedb-dreaming]";
export declare const MANAGED_DAILY_REPORT_CRON_TAG = "[managed-by=memory-lancedb-dreaming] daily-report";
export declare const PROMOTION_MARKER_PREFIX = "openclaw-memory-lancedb-promotion:";
export declare const RUNTIME_CRON_RECONCILE_INTERVAL_MS = 60000;
export declare const STARTUP_CRON_RETRY_DELAY_MS = 5000;
export declare const STARTUP_CRON_MAX_RETRIES = 120;
export declare const NARRATIVE_TIMEOUT_MS = 60000;
export declare const NARRATIVE_DELETE_SETTLE_TIMEOUT_MS = 120000;
export declare const DREAMING_STATE_RELATIVE_PATH: readonly ["memory", ".dreams", "lancedb-dreaming-state.json"];
export declare const MEMORY_CATEGORIES: readonly ["preference", "fact", "decision", "entity", "other"];
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
//# sourceMappingURL=constants.d.ts.map