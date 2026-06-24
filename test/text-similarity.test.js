import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { textSimilarityCjkAware, normalizeTextForCompare } from "../dist/utils.js";

describe("textSimilarityCjkAware", () => {
  it("treats reworded Chinese on the same topic as similar", () => {
    const a = "音色选择史：甜心小玲 vs 晓晓 vs 小艺的讨论";
    const b = "音色选择：甜心小玲、晓晓、小艺之间的反复比较";
    // Overlap-coefficient based; reworded same-topic lands above the 0.42 default.
    assert.ok(textSimilarityCjkAware(a, b) >= 0.42);
  });

  it("treats unrelated Chinese sentences as dissimilar", () => {
    const a = "音色选择史：甜心小玲 vs 晓晓";
    const b = "今天修复了支付回调的时区偏移问题";
    assert.ok(textSimilarityCjkAware(a, b) < 0.42);
  });

  it("returns 1 for identical normalized text", () => {
    assert.equal(textSimilarityCjkAware("Hello, world!", "hello world"), 1);
  });

  it("normalizes away punctuation and whitespace", () => {
    assert.equal(normalizeTextForCompare("A, b!  c"), "abc");
  });
});
