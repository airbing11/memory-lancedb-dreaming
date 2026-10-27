import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  entryHasLancedbConfig,
  resolveLanceDbMemoryEntryFromConfig,
  resolveMemorySlotPluginId,
} from "../dist/lancedb-config-resolve.js";
import {
  getCachedLancedbConfig,
  initLancedbConfigCache,
  parseMemoryLancedbEntry,
  refreshLancedbConfigCache,
  sanitizeLancedbError,
  summarizeLancedbConfig,
} from "../dist/lancedb-client.js";

const lancedbConfig = {
  dbPath: "~/.openclaw/memory/lancedb",
  embedding: { model: "text-embedding-3-small", dimensions: 1536 },
};

describe("lancedb config resolve", () => {
  it("prefers plugins.slots.memory entry (memory-lancedb-pro)", () => {
    const resolved = resolveLanceDbMemoryEntryFromConfig({
      plugins: {
        slots: { memory: "memory-lancedb-pro" },
        entries: {
          "memory-lancedb-pro": { config: lancedbConfig },
          "memory-lancedb": {
            config: {
              dbPath: "/legacy/path",
              embedding: { model: "text-embedding-3-small", dimensions: 1536 },
            },
          },
        },
      },
    });

    assert.ok(resolved);
    assert.equal(resolved.pluginId, "memory-lancedb-pro");
    const parsed = parseMemoryLancedbEntry(resolved.entry, resolved.pluginId);
    assert.equal(parsed.dbPath, "~/.openclaw/memory/lancedb");
    assert.equal(parsed.pluginId, "memory-lancedb-pro");
  });

  it("falls back to memory-lancedb when slot is unset", () => {
    const resolved = resolveLanceDbMemoryEntryFromConfig({
      plugins: {
        entries: {
          "memory-lancedb": { config: lancedbConfig },
        },
      },
    });

    assert.ok(resolved);
    assert.equal(resolved.pluginId, "memory-lancedb");
  });

  it("falls back to memory-lancedb-pro when slot points at memory-core", () => {
    const resolved = resolveLanceDbMemoryEntryFromConfig({
      plugins: {
        slots: { memory: "memory-core" },
        entries: {
          "memory-core": { config: {} },
          "memory-lancedb-pro": { config: lancedbConfig },
        },
      },
    });

    assert.ok(resolved);
    assert.equal(resolved.pluginId, "memory-lancedb-pro");
  });

  it("returns null when no LanceDB plugin config exists", () => {
    const resolved = resolveLanceDbMemoryEntryFromConfig({
      plugins: {
        slots: { memory: "memory-lancedb-pro" },
        entries: {
          "memory-lancedb-pro": { enabled: true },
        },
      },
    });

    assert.equal(resolved, null);
  });

  it("ignores plugins.slots.memory=none", () => {
    assert.equal(
      resolveMemorySlotPluginId({ plugins: { slots: { memory: "none" } } }),
      undefined
    );

    const resolved = resolveLanceDbMemoryEntryFromConfig({
      plugins: {
        slots: { memory: "none" },
        entries: {
          "memory-lancedb": { config: lancedbConfig },
        },
      },
    });

    assert.ok(resolved);
    assert.equal(resolved.pluginId, "memory-lancedb");
  });

  it("detects LanceDB config via embedding or dbPath", () => {
    assert.equal(
      entryHasLancedbConfig({ config: { embedding: { model: "m" } } }),
      true
    );
    assert.equal(entryHasLancedbConfig({ config: { dbPath: "/data/lance" } }), true);
    assert.equal(entryHasLancedbConfig({ config: { enabled: true } }), false);
  });

  it("refreshes the cached path when the active slot config changes", () => {
    const config = {
      plugins: {
        slots: { memory: "memory-lancedb-pro" },
        entries: {
          "memory-lancedb-pro": { config: structuredClone(lancedbConfig) },
        },
      },
    };
    const api = {
      config,
      resolvePath(value) {
        return value;
      },
      logger: { info() {}, warn() {}, error() {} },
    };

    initLancedbConfigCache(api);
    assert.equal(getCachedLancedbConfig()?.dbPath, "~/.openclaw/memory/lancedb");

    config.plugins.entries["memory-lancedb-pro"].config.dbPath = "/new/lancedb";
    refreshLancedbConfigCache(api);
    assert.equal(getCachedLancedbConfig()?.dbPath, "/new/lancedb");
  });

  it("never exposes storage credentials in the public status summary", () => {
    const summary = summarizeLancedbConfig({
      dbPath: "s3://user:password@example.test/memory?token=query-secret#fragment-secret",
      dimensions: 1536,
      pluginId: "memory-lancedb-pro",
      storageOptions: {
        accessKeyId: "AKIA_TEST_SECRET",
        secretAccessKey: "storage-secret-value",
        sessionToken: "session-secret-value",
      },
    });
    const serialized = JSON.stringify(summary);

    assert.deepEqual(summary, {
      dbPath: "s3://example.test/memory",
      dimensions: 1536,
      storageOptionsConfigured: true,
      pluginId: "memory-lancedb-pro",
    });
    for (const sensitiveText of [
      "user",
      "password",
      "query-secret",
      "fragment-secret",
      "accessKeyId",
      "AKIA_TEST_SECRET",
      "secretAccessKey",
      "storage-secret-value",
      "sessionToken",
      "session-secret-value",
    ]) {
      assert.equal(serialized.includes(sensitiveText), false);
    }
  });

  it("redacts known storage credentials and remote URI secrets from errors", () => {
    const config = {
      dbPath: "s3://user:password@example.test/memory?token=query-secret",
      dimensions: 1536,
      storageOptions: {
        accessKeyId: "AKIA_TEST_SECRET",
        secretAccessKey: "storage-secret-value",
      },
    };
    const sanitized = sanitizeLancedbError(
      new Error(
        `connect ${config.dbPath} failed for AKIA_TEST_SECRET / storage-secret-value`
      ),
      config
    );

    assert.equal(
      sanitized,
      "Error: connect s3://example.test/memory failed for [REDACTED] / [REDACTED]"
    );
  });
});
