import type { DailyReportPublishResult } from "./types.js";
import { readDailyReportDeliveryState } from "./delivery-state.js";

export type DailyReportDeliverySkipReason = "no_phases" | "unchanged";

export async function evaluateDailyReportDelivery(params: {
  workspaceDir: string;
  published: DailyReportPublishResult;
  pushOn: "always" | "changed";
}): Promise<{ deliver: true } | { deliver: false; reason: DailyReportDeliverySkipReason }> {
  const { snapshot } = params.published;
  if (!snapshot.light.ran && !snapshot.rem.ran && !snapshot.deep.ran) {
    return { deliver: false, reason: "no_phases" };
  }
  if (params.pushOn === "always") {
    return { deliver: true };
  }
  const state = await readDailyReportDeliveryState(params.workspaceDir);
  if (state?.lastContentFingerprint === params.published.contentFingerprint) {
    return { deliver: false, reason: "unchanged" };
  }
  return { deliver: true };
}
