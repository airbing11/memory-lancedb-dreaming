import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { MemoryDB } from "./memory-db.js";
export type CachedLancedbConfig = {
    dbPath: string;
    dimensions: number;
    storageOptions?: Record<string, string>;
};
/** Read OpenClaw config from disk (`OPENCLAW_CONFIG_PATH` or `~/.openclaw/openclaw.json`). */
export declare function loadConfigFromDisk(): Record<string, unknown> | undefined;
/** Resolve memory-lancedb plugin entry from api config, runtime, or disk. */
export declare function getMemoryLancedbEntry(api?: OpenClawPluginApi): Record<string, unknown> | undefined;
export declare function parseMemoryLancedbEntry(entry: Record<string, unknown>): CachedLancedbConfig;
/** Resolve and cache memory-lancedb paths at plugin register time. */
export declare function initLancedbConfigCache(api: OpenClawPluginApi): CachedLancedbConfig | null;
/** Re-read config; on failure keeps the previous cache. */
export declare function refreshLancedbConfigCache(api: OpenClawPluginApi): CachedLancedbConfig | null;
export declare function getCachedLancedbConfig(): CachedLancedbConfig | null;
export declare function createDreamingDb(): MemoryDB;
/** Serialize LanceDB reads for safe concurrent access from hooks/tools. */
export declare function withDbRead<T>(db: MemoryDB, fn: () => Promise<T>): Promise<T>;
//# sourceMappingURL=lancedb-client.d.ts.map