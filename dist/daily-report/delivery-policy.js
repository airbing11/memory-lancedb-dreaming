import { readDailyReportDeliveryState } from "./delivery-state.js";
export async function evaluateDailyReportDelivery(params) {
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
//# sourceMappingURL=delivery-policy.js.map