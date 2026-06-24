const DAY_MS = 24 * 60 * 60 * 1000;
export const VECTOR_DEDUPE_THRESHOLD = 0.92;
export const TEXT_DEDUPE_THRESHOLD = 0.88;
export function normalizeTrimmedString(value) {
    if (typeof value !== "string")
        return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
export function includesSystemEventToken(body, token) {
    return body.includes(token);
}
export function calculateLookbackCutoffMs(nowMs, lookbackDays) {
    return nowMs - Math.max(0, lookbackDays) * DAY_MS;
}
export function isDayWithinLookback(day, cutoffMs) {
    const dayMs = Date.parse(`${day}T23:59:59.999Z`);
    return Number.isFinite(dayMs) && dayMs >= cutoffMs;
}
export function memoryEntryWithinLookback(entry, cutoffMs, options) {
    if (!entry)
        return options?.includeWhenNoState ?? true;
    if ((entry.recallDays ?? []).some((day) => isDayWithinLookback(day, cutoffMs)))
        return true;
    const lastSeenMs = Date.parse(entry.lastSeenAt);
    return Number.isFinite(lastSeenMs) && lastSeenMs >= cutoffMs;
}
export function filterMemoriesByLookback(memories, state, nowMs, lookbackDays, options) {
    const cutoffMs = calculateLookbackCutoffMs(nowMs, lookbackDays);
    return memories.filter((memory) => memoryEntryWithinLookback(state.entries[memory.id], cutoffMs, options));
}
export function dedupeMemories(entries, textThreshold = TEXT_DEDUPE_THRESHOLD, vectorThreshold = VECTOR_DEDUPE_THRESHOLD) {
    const deduped = [];
    for (const entry of entries) {
        const duplicate = deduped.find((candidate) => {
            if (entry.vector && candidate.vector) {
                return cosineSimilarity(entry.vector, candidate.vector) >= vectorThreshold;
            }
            return jaccardSimilarity(candidate.text, entry.text) >= textThreshold;
        });
        if (!duplicate)
            deduped.push(entry);
    }
    return deduped;
}
export function clampScore(value) {
    if (!Number.isFinite(value))
        return 0;
    return Math.max(0, Math.min(1, value));
}
export function formatDreamingDay(epochMs, timezone) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(epochMs));
}
export function cosineSimilarity(left, right) {
    if (left.length === 0 || right.length === 0 || left.length !== right.length)
        return 0;
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let i = 0; i < left.length; i += 1) {
        dot += left[i] * right[i];
        leftNorm += left[i] * left[i];
        rightNorm += right[i] * right[i];
    }
    if (leftNorm <= 0 || rightNorm <= 0)
        return 0;
    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}
export function tokenizeSnippet(snippet) {
    return new Set(snippet
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter(Boolean));
}
export function jaccardSimilarity(left, right) {
    const leftTokens = tokenizeSnippet(left);
    const rightTokens = tokenizeSnippet(right);
    if (leftTokens.size === 0 || rightTokens.size === 0) {
        return left.trim().toLowerCase() === right.trim().toLowerCase() ? 1 : 0;
    }
    let intersection = 0;
    for (const token of leftTokens) {
        if (rightTokens.has(token))
            intersection += 1;
    }
    const union = new Set([...leftTokens, ...rightTokens]).size;
    return union > 0 ? intersection / union : 0;
}
/** Lowercase and strip punctuation/whitespace, keeping CJK + alphanumerics. */
export function normalizeTextForCompare(value) {
    return value
        .toLowerCase()
        .replace(/[\s\p{P}\p{S}]+/gu, "")
        .trim();
}
/** Character bigram set over normalized text; works for CJK where word tokenization fails. */
function charBigrams(normalized) {
    const grams = new Set();
    if (normalized.length === 0)
        return grams;
    if (normalized.length === 1) {
        grams.add(normalized);
        return grams;
    }
    for (let i = 0; i < normalized.length - 1; i += 1) {
        grams.add(normalized.slice(i, i + 2));
    }
    return grams;
}
/**
 * Similarity (0-1) that handles both Latin and CJK text. Uses the max of
 * token-level Jaccard (good for English) and character-bigram Jaccard (good for
 * Chinese), so "同一主题、不同措辞" still scores high enough to dedupe.
 */
export function textSimilarityCjkAware(left, right) {
    const leftNorm = normalizeTextForCompare(left);
    const rightNorm = normalizeTextForCompare(right);
    if (leftNorm.length === 0 || rightNorm.length === 0)
        return 0;
    if (leftNorm === rightNorm)
        return 1;
    const tokenScore = jaccardSimilarity(left, right);
    const leftGrams = charBigrams(leftNorm);
    const rightGrams = charBigrams(rightNorm);
    let intersection = 0;
    for (const gram of leftGrams) {
        if (rightGrams.has(gram))
            intersection += 1;
    }
    // Overlap coefficient (intersection / smaller set) rather than Jaccard: a
    // reworded truth on the same topic shares most of the shorter string's
    // bigrams even when the longer one adds connective filler, so this catches
    // "同一主题、不同措辞" that Jaccard would miss.
    const minSize = Math.min(leftGrams.size, rightGrams.size);
    const bigramScore = minSize > 0 ? intersection / minSize : 0;
    return Math.max(tokenScore, bigramScore);
}
export function hashQuery(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return `q${Math.abs(hash)}`;
}
export function createAsyncLock() {
    let chain = Promise.resolve();
    return async (fn) => {
        const run = chain.then(fn);
        chain = run.then(() => undefined, () => undefined);
        return run;
    };
}
export function withTrailingNewline(content) {
    if (!content)
        return "";
    return content.endsWith("\n") ? content : `${content}\n`;
}
export function calculateRecencyComponent(ageDays, halfLifeDays) {
    const halfLife = Math.max(1, halfLifeDays);
    return Math.pow(0.5, ageDays / halfLife);
}
//# sourceMappingURL=utils.js.map