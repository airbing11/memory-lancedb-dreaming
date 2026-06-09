import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveLanceDbMemoryEntryFromConfig, resolveMemorySlotPluginId, } from "./lancedb-config-resolve.js";
import { MemoryDB, vectorDimsForModel } from "./memory-db.js";
import { resolveDbPathForLance, setLanceDbPathResolver } from "./lancedb-path.js";
import { createAsyncLock } from "./utils.js";
const DEFAULT_DB_PATH = "~/.openclaw/memory/lancedb";
const LANCEDB_CONFIG_HELP = "set plugins.slots.memory to your LanceDB plugin (e.g. memory-lancedb-pro) and ensure plugins.entries.<id>.config has embedding (and optional dbPath) in ~/.openclaw/openclaw.json";
let cachedLancedbCfg = null;
let cachedLancedbPluginId = null;
let cachedDb = null;
let cachedDbPathKey = null;
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
/** Read OpenClaw config from disk (`OPENCLAW_CONFIG_PATH` or `~/.openclaw/openclaw.json`). */
export function loadConfigFromDisk() {
    const candidates = [
        process.env.OPENCLAW_CONFIG_PATH,
        join(homedir(), ".openclaw", "openclaw.json"),
    ].filter((value) => typeof value === "string" && value.trim().length > 0);
    for (const configPath of candidates) {
        try {
            const raw = readFileSync(configPath, "utf-8");
            const parsed = JSON.parse(raw);
            return asRecord(parsed);
        }
        catch {
            // try next candidate
        }
    }
    return undefined;
}
/** Resolve LanceDB memory plugin entry from api config, runtime, or disk. */
export function resolveLanceDbMemoryEntry(api) {
    if (api) {
        const fromApi = resolveLanceDbMemoryEntryFromConfig(asRecord(api.config));
        if (fromApi)
            return fromApi;
        const runtime = api.runtime;
        const fromRuntime = resolveLanceDbMemoryEntryFromConfig(asRecord(runtime?.config?.current?.()));
        if (fromRuntime)
            return fromRuntime;
    }
    return resolveLanceDbMemoryEntryFromConfig(loadConfigFromDisk());
}
/** @deprecated Use resolveLanceDbMemoryEntry — returns entry only for backward compatibility. */
export function getMemoryLancedbEntry(api) {
    return resolveLanceDbMemoryEntry(api)?.entry;
}
export function parseMemoryLancedbEntry(entry, pluginId) {
    const label = pluginId ?? "LanceDB memory plugin";
    const raw = asRecord(entry.config) ?? {};
    const embeddingRaw = asRecord(raw.embedding);
    if (!embeddingRaw) {
        throw new Error(`memory-lancedb-dreaming: ${label} config missing embedding section`);
    }
    const model = typeof embeddingRaw.model === "string" ? embeddingRaw.model : "text-embedding-3-small";
    const dbPath = typeof raw.dbPath === "string" ? raw.dbPath : DEFAULT_DB_PATH;
    const storageOptionsRaw = asRecord(raw.storageOptions);
    const storageOptions = storageOptionsRaw
        ? Object.fromEntries(Object.entries(storageOptionsRaw).filter((item) => typeof item[1] === "string"))
        : undefined;
    let dimensions;
    if (typeof embeddingRaw.dimensions === "number" && Number.isFinite(embeddingRaw.dimensions)) {
        dimensions = Math.floor(embeddingRaw.dimensions);
    }
    else {
        try {
            dimensions = vectorDimsForModel(model);
        }
        catch {
            dimensions = undefined;
        }
    }
    if (!dimensions) {
        throw new Error(`memory-lancedb-dreaming: could not resolve embedding dimensions for model ${model} (${label})`);
    }
    return {
        dbPath,
        dimensions,
        storageOptions,
        ...(pluginId ? { pluginId } : {}),
    };
}
function applyResolvedLanceDbConfig(resolved) {
    const next = parseMemoryLancedbEntry(resolved.entry, resolved.pluginId);
    cachedLancedbPluginId = resolved.pluginId;
    return next;
}
function readLancedbConfigFromDisk() {
    const resolved = resolveLanceDbMemoryEntryFromConfig(loadConfigFromDisk());
    if (!resolved)
        return null;
    return applyResolvedLanceDbConfig(resolved);
}
function formatLanceDbNotFoundMessage(api) {
    const configRoots = [
        api ? asRecord(api.config) : undefined,
        loadConfigFromDisk(),
    ].filter(Boolean);
    const slotIds = configRoots
        .map((root) => resolveMemorySlotPluginId(root))
        .filter((value) => Boolean(value));
    const slotHint = slotIds.length > 0
        ? ` (plugins.slots.memory=${slotIds[0]}, but no LanceDB config found on that entry)`
        : "";
    return `memory-lancedb-dreaming: LanceDB config not available${slotHint} — ${LANCEDB_CONFIG_HELP}`;
}
function cacheLanceDbConfig(next, pluginId) {
    const changed = !cachedLancedbCfg ||
        cachedLancedbCfg.dbPath !== next.dbPath ||
        cachedLancedbCfg.dimensions !== next.dimensions ||
        cachedLancedbPluginId !== pluginId ||
        JSON.stringify(cachedLancedbCfg.storageOptions ?? {}) !==
            JSON.stringify(next.storageOptions ?? {});
    cachedLancedbCfg = next;
    cachedLancedbPluginId = pluginId;
    if (changed) {
        cachedDb = null;
        cachedDbPathKey = null;
    }
    return cachedLancedbCfg;
}
/** Resolve and cache LanceDB paths at plugin register time. */
export function initLancedbConfigCache(api) {
    setLanceDbPathResolver(api.resolvePath.bind(api));
    const previous = cachedLancedbCfg;
    try {
        const resolved = resolveLanceDbMemoryEntry(api);
        if (!resolved) {
            api.logger.warn(formatLanceDbNotFoundMessage(api));
            return previous;
        }
        const next = applyResolvedLanceDbConfig(resolved);
        const cached = cacheLanceDbConfig(next, resolved.pluginId);
        api.logger.info(`memory-lancedb-dreaming: cached LanceDB config (plugin=${resolved.pluginId}, dbPath=${cached.dbPath}, dimensions=${cached.dimensions})`);
        return cached;
    }
    catch (err) {
        api.logger.warn(`memory-lancedb-dreaming: failed to cache LanceDB config, keeping existing cache: ${String(err)}`);
        return previous;
    }
}
/** Re-read config; on failure keeps the previous cache. */
export function refreshLancedbConfigCache(api) {
    const previous = cachedLancedbCfg;
    setLanceDbPathResolver(api.resolvePath.bind(api));
    try {
        const resolved = resolveLanceDbMemoryEntry(api);
        if (!resolved)
            return previous ?? readLancedbConfigFromDisk();
        const next = applyResolvedLanceDbConfig(resolved);
        cacheLanceDbConfig(next, resolved.pluginId);
        return cachedLancedbCfg;
    }
    catch (err) {
        api.logger.warn(`memory-lancedb-dreaming: refresh failed, keeping existing cache: ${String(err)}`);
        return previous ?? cachedLancedbCfg;
    }
}
/** Resolve LanceDB config: (1) in-memory cache, (2) disk fallback, (3) throw. */
function resolveLancedbCfg() {
    if (cachedLancedbCfg)
        return cachedLancedbCfg;
    const fromDisk = readLancedbConfigFromDisk();
    if (fromDisk) {
        cachedLancedbCfg = fromDisk;
        cachedDb = null;
        cachedDbPathKey = null;
        return fromDisk;
    }
    throw new Error(`memory-lancedb-dreaming: LanceDB config not cached and disk fallback failed — ${LANCEDB_CONFIG_HELP}`);
}
export function getCachedLancedbConfig() {
    return cachedLancedbCfg;
}
export function getResolvedLanceDbPluginId() {
    return cachedLancedbPluginId ?? cachedLancedbCfg?.pluginId ?? null;
}
export function createDreamingDb() {
    const cfg = resolveLancedbCfg();
    const resolvedDbPath = resolveDbPathForLance(cfg.dbPath);
    const pathKey = `${resolvedDbPath}|${cfg.dimensions}|${JSON.stringify(cfg.storageOptions ?? {})}`;
    if (!cachedDb || cachedDbPathKey !== pathKey) {
        cachedDb = new MemoryDB(resolvedDbPath, cfg.dimensions, cfg.storageOptions);
        cachedDbPathKey = pathKey;
    }
    return cachedDb;
}
const dbReadLock = createAsyncLock();
/** Serialize LanceDB reads for safe concurrent access from hooks/tools. */
export async function withDbRead(db, fn) {
    return dbReadLock(async () => {
        await db.ensureInitialized();
        return fn();
    });
}
//# sourceMappingURL=lancedb-client.js.map