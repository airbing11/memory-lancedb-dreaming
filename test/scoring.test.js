import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankPromotionCandidates } from "../dist/phases/scoring.js";

const NOW_MS = Date.parse("2026-05-24T12:00:00.000Z");

function baseDeepConfig() {
  return {
    enabled: true,
    maxPromotions: 5,
    minScore: 0.7,
    minRecallCount: 3,
    minUniqueQueries: 1,
    recencyHalfLifeDays: 14,
    maxAgeDays: 30,
  };
}

describe("rankPromotionCandidates", () => {
  it("excludes memories below recall gate and minScore", () => {
    const ranked = rankPromotionCandidates({
      memories: [
        {
          id: "low-signal",
          text: "Minor note",
          importance: 0.4,
          category: "other",
        },
      ],
      state: { version: 1, updatedAt: new Date(NOW_MS).toISOString(), entries: {} },
      config: baseDeepConfig(),
      nowMs: NOW_MS,
    });

    assert.equal(ranked.length, 0);
  });

  it("promotes high-signal preference memories with strong scores", () => {
    const ranked = rankPromotionCandidates({
      memories: [
        {
          id: "pref-1",
          text: "User prefers dark mode in all tools",
          importance: 0.85,
          category: "preference",
        },
      ],
      state: {
        version: 1,
        updatedAt: new Date(NOW_MS).toISOString(),
        entries: {
          "pref-1": {
            recallCount: 4,
            queryHashes: ["q1", "q2"],
            recallDays: ["2026-05-22", "2026-05-23", "2026-05-24"],
            lightHits: 2,
            remHits: 1,
            lastSeenAt: new Date(NOW_MS - 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      },
      config: baseDeepConfig(),
      nowMs: NOW_MS,
    });

    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]?.memoryId, "pref-1");
    assert.ok((ranked[0]?.score ?? 0) >= 0.7);
  });

  it("skips memories already marked promotedAt", () => {
    const ranked = rankPromotionCandidates({
      memories: [
        {
          id: "done-1",
          text: "Already promoted fact",
          importance: 0.9,
          category: "fact",
        },
      ],
      state: {
        version: 1,
        updatedAt: new Date(NOW_MS).toISOString(),
        entries: {
          "done-1": {
            recallCount: 5,
            queryHashes: ["q1"],
            recallDays: ["2026-05-24"],
            lightHits: 1,
            remHits: 1,
            promotedAt: "2026-05-20T00:00:00.000Z",
            lastSeenAt: new Date(NOW_MS).toISOString(),
          },
        },
      },
      config: baseDeepConfig(),
      nowMs: NOW_MS,
    });

    assert.equal(ranked.length, 0);
  });

  it("respects maxPromotions cap and stable sort order", () => {
    const memories = ["a", "b", "c", "d"].map((id, index) => ({
      id,
      text: `Candidate ${id}`,
      importance: 0.8 - index * 0.01,
      category: "decision",
    }));

    const ranked = rankPromotionCandidates({
      memories,
      state: {
        version: 1,
        updatedAt: new Date(NOW_MS).toISOString(),
        entries: Object.fromEntries(
          memories.map((memory) => [
            memory.id,
            {
              recallCount: 4,
              queryHashes: ["q1", "q2"],
              recallDays: ["2026-05-24"],
              lightHits: 1,
              remHits: 1,
              lastSeenAt: new Date(NOW_MS).toISOString(),
            },
          ])
        ),
      },
      config: { ...baseDeepConfig(), maxPromotions: 2 },
      nowMs: NOW_MS,
    });

    assert.equal(ranked.length, 2);
    assert.ok((ranked[0]?.score ?? 0) >= (ranked[1]?.score ?? 0));
  });
});
