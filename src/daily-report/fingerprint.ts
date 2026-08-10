import { createHash } from "node:crypto";
import { normalizeTextForCompare } from "../utils.js";
import type { DailyReportSnapshot } from "./types.js";

/**
 * Semantic fingerprint for push dedupe.
 * Volatile counts, confidence, evidence summaries, and prose wording are
 * intentionally excluded so cosmetic rewrites do not trigger another push.
 */
export function computeDailyReportContentFingerprint(snapshot: DailyReportSnapshot): string {
  const payload = {
    phases: {
      light: snapshot.light.ran,
      rem: snapshot.rem.ran,
      deep: snapshot.deep.ran,
    },
    rem: snapshot.rem.themes.map((theme) => normalizeTextForCompare(theme.label)).sort(),
    deep: snapshot.deep.promotedCount,
    narrative: Boolean(snapshot.narrative.excerpt?.trim()),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}
