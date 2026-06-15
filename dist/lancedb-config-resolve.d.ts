/** Known LanceDB memory plugin ids (fallback when slot is unset or entry lacks config). */
export declare const LANCEDB_MEMORY_PLUGIN_FALLBACK_IDS: readonly ["memory-lancedb-pro", "memory-lancedb", "lancedb-pro"];
export type ResolvedLanceDbMemoryEntry = {
    pluginId: string;
    entry: Record<string, unknown>;
};
/** Active memory slot owner from `plugins.slots.memory` (excludes `none`). */
export declare function resolveMemorySlotPluginId(configRoot: Record<string, unknown> | undefined): string | undefined;
/** Whether a plugin entry looks like a LanceDB memory store (dbPath and/or embedding). */
export declare function entryHasLancedbConfig(entry: Record<string, unknown> | undefined): boolean;
/**
 * Resolve LanceDB config source: (1) plugins.slots.memory entry, (2) known LanceDB plugin fallbacks.
 */
export declare function resolveLanceDbMemoryEntryFromConfig(configRoot: Record<string, unknown> | undefined): ResolvedLanceDbMemoryEntry | null;
//# sourceMappingURL=lancedb-config-resolve.d.ts.map