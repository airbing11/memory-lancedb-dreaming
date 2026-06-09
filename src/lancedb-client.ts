import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import {
  resolveLanceDbMemoryEntryFromConfig,
  resolveMemorySlotPluginId,
  type ResolvedLanceDbMemoryEntry,
} from "./lancedb-config-resolve.js";
import { MemoryDB, vectorDimsForModel } from "./memory-db.js";
import { resolveDbPathForLance, setLanceDbPathResolver } from "./lancedb-path.js";
import { createAsyncLock } from "./utils.js";

export type CachedLancedbConfig = {
  dbPath: string;
  dimensions: number;
  storageOptions?: Record<string, string>;
  pluginId?: string;
};

const DEFAULT_DB_PATH = "~/.openclaw/memory/lancedb";

const LANCEDB_CONFIG_HELP =
  "set plugins.slots.memory to your LanceDB plugin (e.g. memory-lancedb-pro) and ensure plugins.entries.<id>.config has embedding (and optional dbPath) in ~/.openclaw/openclaw.json";

let cachedLancedbCfg: CachedLancedbConfig | null = null;
let cachedLancedbPluginId: string | null = null;
let cachedDb: MemoryDB | null = null;
let cachedDbPathKey: string | null = null;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Read OpenClaw config from disk (`OPENCLAW_CONFIG_PATH` or `~/.openclaw/openclaw.json`). */
export function loadConfigFromDisk(): Record<string, unknown> | undefined {
  const candidates = [
    process.env.OPENCLAW_CONFIG_PATH,
    join(homedir(), ".openclaw", "openclaw.json"),
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  for (const configPath of candidates) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw);
      return asRecord(parsed);
    } catch {
      // try next candidate
    }
  }
  return undefined;
}

/** Resolve LanceDB memory plugin entry from api config, runtime, or disk. */
export function resolveLanceDbMemoryEntry(
  api?: OpenClawPluginApi
): ResolvedLanceDbMemoryEntry | null {
  if (api) {
    const fromApi = resolveLanceDbMemoryEntryFromConfig(asRecord(api.config));
    if (fromApi) return fromApi;

    const runtime = api.runtime as { config?: { current?: () => unknown } } | undefined;
    const fromRuntime = resolveLanceDbMemoryEntryFromConfig(
      asRecord(runtime?.config?.current?.())
    );
    if (fromRuntime) return fromRuntime;
  }

  return resolveLanceDbMemoryEntryFromConfig(loadConfigFromDisk());
}

/** @deprecated Use resolveLanceDbMemoryEntry — returns entry only for backward compatibility. */
export function getMemoryLancedbEntry(api?: OpenClawPluginApi): Record<string, unknown> | undefined {
  return resolveLanceDbMemoryEntry(api)?.entry;
}

export function parseMemoryLancedbEntry(
  entry: Record<string, unknown>,
  pluginId?: string
): CachedLancedbConfig {
  const label = pluginId ?? "LanceDB memory plugin";
  const raw = asRecord(entry.config) ?? {};
  const embeddingRaw = asRecord(raw.embedding);
  if (!embeddingRaw) {
    throw new Error(`memory-lancedb-dreaming: ${label} config missing embedding section`);
  }

  const model =
    typeof embeddingRaw.model === "string" ? embeddingRaw.model : "text-embedding-3-small";
  const dbPath = typeof raw.dbPath === "string" ? raw.dbPath : DEFAULT_DB_PATH;

  const storageOptionsRaw = asRecord(raw.storageOptions);
  const storageOptions = storageOptionsRaw
    ? Object.fromEntries(
        Object.entries(storageOptionsRaw).filter(
          (item): item is [string, string] => typeof item[1] === "string"
        )
      )
    : undefined;

  let dimensions: number | undefined;
  if (typeof embeddingRaw.dimensions === "number" && Number.isFinite(embeddingRaw.dimensions)) {
    dimensions = Math.floor(embeddingRaw.dimensions);
  } else {
    try {
      dimensions = vectorDimsForModel(model);
    } catch {
      dimensions = undefined;
    }
  }

  if (!dimensions) {
    throw new Error(
      `memory-lancedb-dreaming: could not resolve embedding dimensions for model ${model} (${label})`
    );
  }

  return {
    dbPath,
    dimensions,
    storageOptions,
    ...(pluginId ? { pluginId } : {}),
  };
}

function applyResolvedLanceDbConfig(
  resolved: ResolvedLanceDbMemoryEntry
): CachedLancedbConfig {
  const next = parseMemoryLancedbEntry(resolved.entry, resolved.pluginId);
  cachedLancedbPluginId = resolved.pluginId;
  return next;
}

function readLancedbConfigFromDisk(): CachedLancedbConfig | null {
  const resolved = resolveLanceDbMemoryEntryFromConfig(loadConfigFromDisk());
  if (!resolved) return null;
  return applyResolvedLanceDbConfig(resolved);
}

function formatLanceDbNotFoundMessage(api?: OpenClawPluginApi): string {
  const configRoots = [
    api ? asRecord(api.config) : undefined,
    loadConfigFromDisk(),
  ].filter(Boolean) as Record<string, unknown>[];

  const slotIds = configRoots
    .map((root) => resolveMemorySlotPluginId(root))
    .filter((value): value is string => Boolean(value));
  const slotHint =
    slotIds.length > 0
      ? ` (plugins.slots.memory=${slotIds[0]}, but no LanceDB config found on that entry)`
      : "";

  return `memory-lancedb-dreaming: LanceDB config not available${slotHint} — ${LANCEDB_CONFIG_HELP}`;
}

function cacheLanceDbConfig(next: CachedLancedbConfig, pluginId: string): CachedLancedbConfig {
  const changed =
    !cachedLancedbCfg ||
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
export function initLancedbConfigCache(api: OpenClawPluginApi): CachedLancedbConfig | null {
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

    api.logger.info(
      `memory-lancedb-dreaming: cached LanceDB config (plugin=${resolved.pluginId}, dbPath=${cached.dbPath}, dimensions=${cached.dimensions})`
    );
    return cached;
  } catch (err) {
    api.logger.warn(
      `memory-lancedb-dreaming: failed to cache LanceDB config, keeping existing cache: ${String(err)}`
    );
    return previous;
  }
}

/** Re-read config; on failure keeps the previous cache. */
export function refreshLancedbConfigCache(api: OpenClawPluginApi): CachedLancedbConfig | null {
  const previous = cachedLancedbCfg;
  setLanceDbPathResolver(api.resolvePath.bind(api));

  try {
    const resolved = resolveLanceDbMemoryEntry(api);
    if (!resolved) return previous ?? readLancedbConfigFromDisk();

    const next = applyResolvedLanceDbConfig(resolved);
    cacheLanceDbConfig(next, resolved.pluginId);
    return cachedLancedbCfg;
  } catch (err) {
    api.logger.warn(
      `memory-lancedb-dreaming: refresh failed, keeping existing cache: ${String(err)}`
    );
    return previous ?? cachedLancedbCfg;
  }
}

/** Resolve LanceDB config: (1) in-memory cache, (2) disk fallback, (3) throw. */
function resolveLancedbCfg(): CachedLancedbConfig {
  if (cachedLancedbCfg) return cachedLancedbCfg;

  const fromDisk = readLancedbConfigFromDisk();
  if (fromDisk) {
    cachedLancedbCfg = fromDisk;
    cachedDb = null;
    cachedDbPathKey = null;
    return fromDisk;
  }

  throw new Error(
    `memory-lancedb-dreaming: LanceDB config not cached and disk fallback failed — ${LANCEDB_CONFIG_HELP}`
  );
}

export function getCachedLancedbConfig(): CachedLancedbConfig | null {
  return cachedLancedbCfg;
}

export function getResolvedLanceDbPluginId(): string | null {
  return cachedLancedbPluginId ?? cachedLancedbCfg?.pluginId ?? null;
}

export function createDreamingDb(): MemoryDB {
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
export async function withDbRead<T>(db: MemoryDB, fn: () => Promise<T>): Promise<T> {
  return dbReadLock(async () => {
    await db.ensureInitialized();
    return fn();
  });
}
