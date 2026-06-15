import { createHash } from "node:crypto";
/** Content-only fingerprint (excludes day / generatedAt) for push dedupe. */
export function computeDailyReportContentFingerprint(snapshot) {
    const payload = {
        light: snapshot.light.candidateCount,
        rem: snapshot.rem.themes.map((theme) => ({
            label: theme.label,
            confidence: theme.confidence,
            summary: theme.summary ?? "",
        })),
        deep: snapshot.deep.promotedCount,
        narrative: (snapshot.narrative.excerpt ?? "").trim(),
    };
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}
//# sourceMappingURL=fingerprint.js.map