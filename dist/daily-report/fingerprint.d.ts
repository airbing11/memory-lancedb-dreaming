import type { DailyReportSnapshot } from "./types.js";
/**
 * Semantic fingerprint for push dedupe.
 * Volatile counts, confidence, evidence summaries, and prose wording are
 * intentionally excluded so cosmetic rewrites do not trigger another push.
 */
export declare function computeDailyReportContentFingerprint(snapshot: DailyReportSnapshot): string;
//# sourceMappingURL=fingerprint.d.ts.map