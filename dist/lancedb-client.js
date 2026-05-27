import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { MemoryDB, vectorDimsForModel } from "./memory-db.js";
import { resolveDbPathForLance, setLanceDbPathResolver } from "./lancedb-path.js";
import { createAsyncLock } from "./utils.js";
const DEFAULT_DB_PATH = "~/.openclaw/memory/lancedb";
let cachedLancedbCfg = null;
let cachedDb = null;
let cachedDbPathKey = null;
function resolveEnvVars(value) {
    return value.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
        const envValue = process.env[envVar];
        if (!envValue)
            throw new Error(`Environment variable ${envVar} is not set`);
        return envValue;
    });
}
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
function getPluginEntry(configRoot, pluginId) {
    const plugins = asRecord(configRoot?.plugins);
    const entries = asRecord(plugins?.entries);
    return asRecord(entries?.[pluginId]);
}
/** Resolve memory-lancedb plugin entry from api config, runtime, or disk. */
export function getMemoryLancedbEntry(api) {
    if (api) {
        const entryFromApi = getPluginEntry(asRecord(api.config), "memory-lancedb");
        if (entryFromApi?.config)
            return entryFromApi;
        const runtime = api.runtime;
        const runtimeConfig = asRecord(runtime?.config?.current?.());
        const entryFromRuntime = getPluginEntry(runtimeConfig, "memory-lancedb");
        if (entryFromRuntime?.config)
            return entryFromRuntime;
    }
    const diskConfig = loadConfigFromDisk();
    return getPluginEntry(diskConfig, "memory-lancedb");
}
export function parseMemoryLancedbEntry(entry) {
    const raw = asRecord(entry.config) ?? {};
    const embeddingRaw = asRecord(raw.embedding);
    if (!embeddingRaw) {
        throw new Error("memory-lancedb-dreaming: memory-lancedb config missing embedding section");
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
        throw new Error(`memory-lancedb-dreaming: could not resolve embedding dimensions for model ${model}`);
    }
    return { dbPath, dimensions, storageOptions };
}
function readLancedbConfigFromEntry(entry) {
    if (!entry?.config)
        return null;
    return parseMemoryLancedbEntry(entry);
}
function readLancedbConfigFromDisk() {
    const entry = getPluginEntry(loadConfigFromDisk(), "memory-lancedb");
    return readLancedbConfigFromEntry(entry);
}
/** Resolve and cache memory-lancedb paths at plugin register time. */
export function initLancedbConfigCache(api) {
    setLanceDbPathResolver(api.resolvePath.bind(api));
    const previous = cachedLancedbCfg;
    try {
        const entry = getMemoryLancedbEntry(api);
        if (!entry) {
            api.logger.warn("memory-lancedb-dreaming: memory-lancedb plugin entry not found in api.config, runtime, or ~/.openclaw/openclaw.json");
            return previous;
        }
        const next = parseMemoryLancedbEntry(entry);
        const changed = !previous ||
            previous.dbPath !== next.dbPath ||
            previous.dimensions !== next.dimensions ||
            JSON.stringify(previous.storageOptions ?? {}) !== JSON.stringify(next.storageOptions ?? {});
        cachedLancedbCfg = next;
        if (changed) {
            cachedDb = null;
            cachedDbPathKey = null;
        }
        api.logger.info(`memory-lancedb-dreaming: cached LanceDB config (dbPath=${cachedLancedbCfg.dbPath}, dimensions=${cachedLancedbCfg.dimensions})`);
        return cachedLancedbCfg;
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
        const entry = getMemoryLancedbEntry(api);
        if (!entry)
            return previous ?? readLancedbConfigFromDisk();
        const next = parseMemoryLancedbEntry(entry);
        const changed = !previous ||
            previous.dbPath !== next.dbPath ||
            previous.dimensions !== next.dimensions ||
            JSON.stringify(previous.storageOptions ?? {}) !== JSON.stringify(next.storageOptions ?? {});
        if (changed) {
            cachedLancedbCfg = next;
            cachedDb = null;
            cachedDbPathKey = null;
        }
        return cachedLancedbCfg;
    }
    catch (err) {
        api.logger.warn(`memory-lancedb-dreaming: refresh failed, keeping existing cache: ${String(err)}`);
        return previous ?? cachedLancedbCfg;
    }
}
/**
 * Resolve LanceDB config: (1) in-memory cache, (2) disk fallback, (3) throw.
 */
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
    throw new Error("memory-lancedb-dreaming: LanceDB config not cached and disk fallback failed — ensure memory-lancedb is installed and configured in ~/.openclaw/openclaw.json");
}
export function getCachedLancedbConfig() {
    return cachedLancedbCfg;
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