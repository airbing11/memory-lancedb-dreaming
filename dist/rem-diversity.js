import { createHash } from "node:crypto";
function compareEntriesByImportance(a, b) {
    return b.importance - a.importance || a.id.localeCompare(b.id);
}
function hashDay(day) {
    const hex = createHash("sha1").update(day).digest("hex").slice(0, 8);
    return Number.parseInt(hex, 16);
}
export function selectLastingTruths(params) {
    const sorted = [...params.entries].sort(compareEntriesByImportance);
    const selected = [];
    let skippedRecent = 0;
    for (const entry of sorted) {
        if (params.recentMemoryIds.has(entry.id)) {
            skippedRecent += 1;
            continue;
        }
        selected.push(entry);
        if (selected.length >= params.limit) {
            return { selected, skippedRecent, usedFallback: false };
        }
    }
    if (selected.length >= params.limit) {
        return { selected, skippedRecent, usedFallback: false };
    }
    for (const entry of sorted) {
        if (selected.some((item) => item.id === entry.id))
            continue;
        selected.push(entry);
        if (selected.length >= params.limit)
            break;
    }
    return { selected, skippedRecent, usedFallback: skippedRecent > 0 };
}
export function pickClusterSpotlightMemories(params) {
    const sorted = [...params.memories].sort(compareEntriesByImportance);
    if (sorted.length === 0)
        return [];
    const fresh = sorted.filter((entry) => !params.recentSpotlightIds.has(entry.id));
    const pool = fresh.length >= Math.min(params.count, sorted.length) ? fresh : sorted;
    const take = Math.min(params.count, pool.length);
    if (take <= 0)
        return [];
    const maxOffset = Math.max(0, pool.length - take);
    const offset = maxOffset === 0 ? 0 : hashDay(params.day) % (maxOffset + 1);
    return pool.slice(offset, offset + take);
}
//# sourceMappingURL=rem-diversity.js.map