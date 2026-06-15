/** Known LanceDB memory plugin ids (fallback when slot is unset or entry lacks config). */
export const LANCEDB_MEMORY_PLUGIN_FALLBACK_IDS = [
    "memory-lancedb-pro",
    "memory-lancedb",
    "lancedb-pro",
];
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function getPluginEntry(configRoot, pluginId) {
    const plugins = asRecord(configRoot?.plugins);
    const entries = asRecord(plugins?.entries);
    return asRecord(entries?.[pluginId]);
}
/** Active memory slot owner from `plugins.slots.memory` (excludes `none`). */
export function resolveMemorySlotPluginId(configRoot) {
    const plugins = asRecord(configRoot?.plugins);
    const slots = asRecord(plugins?.slots);
    const memory = slots?.memory;
    if (typeof memory !== "string")
        return undefined;
    const trimmed = memory.trim();
    if (!trimmed || trimmed === "none")
        return undefined;
    return trimmed;
}
/** Whether a plugin entry looks like a LanceDB memory store (dbPath and/or embedding). */
export function entryHasLancedbConfig(entry) {
    const raw = asRecord(entry?.config);
    if (!raw)
        return false;
    if (asRecord(raw.embedding))
        return true;
    return typeof raw.dbPath === "string" && raw.dbPath.trim().length > 0;
}
/**
 * Resolve LanceDB config source: (1) plugins.slots.memory entry, (2) known LanceDB plugin fallbacks.
 */
export function resolveLanceDbMemoryEntryFromConfig(configRoot) {
    if (!configRoot)
        return null;
    const slotId = resolveMemorySlotPluginId(configRoot);
    if (slotId) {
        const slotEntry = getPluginEntry(configRoot, slotId);
        if (slotEntry && entryHasLancedbConfig(slotEntry)) {
            return { pluginId: slotId, entry: slotEntry };
        }
    }
    for (const pluginId of LANCEDB_MEMORY_PLUGIN_FALLBACK_IDS) {
        if (pluginId === slotId)
            continue;
        const entry = getPluginEntry(configRoot, pluginId);
        if (entry && entryHasLancedbConfig(entry)) {
            return { pluginId, entry };
        }
    }
    return null;
}
//# sourceMappingURL=lancedb-config-resolve.js.map