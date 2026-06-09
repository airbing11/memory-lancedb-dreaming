import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dedupeMemories,
  filterMemoriesByLookback,
  jaccardSimilarity,
} from "../dist/utils.js";

describe("dedupeMemories", () => {
  it("removes near-duplicate text entries", () => {
    const deduped = dedupeMemories([
      { id: "1", text: "User prefers TypeScript for backend services" },
      { id: "2", text: "User prefers TypeScript for backend services" },
      { id: "3", text: "Completely unrelated memory about coffee" },
    ]);

    assert.equal(deduped.length, 2);
    assert.deepEqual(
      deduped.map((entry) => entry.id),
      ["1", "3"]
    );
  });

  it("removes near-duplicate vector entries", () => {
    const vector = [1, 0, 0];
    const nearDuplicate = [0.99, 0.01, 0];
    const deduped = dedupeMemories([
      { id: "1", text: "alpha", vector },
      { id: "2", text: "beta", vector: nearDuplicate },
      { id: "3", text: "gamma", vector: [0, 1, 0] },
    ]);

    assert.equal(deduped.length, 2);
    assert.deepEqual(
      deduped.map((entry) => entry.id),
      ["1", "3"]
    );
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical normalized snippets", () => {
    assert.equal(jaccardSimilarity("Hello World", "hello world"), 1);
  });
});

describe("filterMemoriesByLookback", () => {
  const nowMs = Date.parse("2026-05-24T12:00:00.000Z");

  it("keeps memories with recent recall signals", () => {
    const filtered = filterMemoriesByLookback(
      [
        { id: "recent", text: "recent memory" },
        { id: "stale", text: "stale memory" },
      ],
      {
        version: 1,
        updatedAt: new Date(nowMs).toISOString(),
        entries: {
          recent: {
            recallCount: 1,
            queryHashes: [],
            recallDays: ["2026-05-24"],
            lightHits: 0,
            remHits: 0,
            lastSeenAt: new Date(nowMs).toISOString(),
          },
          stale: {
            recallCount: 1,
            queryHashes: [],
            recallDays: ["2026-04-01"],
            lightHits: 0,
            remHits: 0,
            lastSeenAt: "2026-04-01T00:00:00.000Z",
          },
        },
      },
      nowMs,
      7
    );

    assert.deepEqual(
      filtered.map((entry) => entry.id),
      ["recent"]
    );
  });

  it("includes untracked memories by default", () => {
    const filtered = filterMemoriesByLookback(
      [{ id: "new", text: "brand new memory" }],
      { version: 1, updatedAt: new Date(nowMs).toISOString(), entries: {} },
      nowMs,
      2
    );

    assert.deepEqual(
      filtered.map((entry) => entry.id),
      ["new"]
    );
  });
});
