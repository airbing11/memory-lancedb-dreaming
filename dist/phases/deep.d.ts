import { type DeepConfig } from "../config.js";
import type { PromotionCandidate } from "../types.js";
export declare function runDeepSleep(params: {
    workspaceDir: string;
    config: DeepConfig;
    timezone: string;
    nowMs: number;
    listMemories: () => Promise<Array<{
        id: string;
        text: string;
        importance: number;
        category: string;
    }>>;
}): Promise<{
    bodyLines: string[];
    applied: PromotionCandidate[];
    promotions: PromotionCandidate[];
}>;
//# sourceMappingURL=deep.d.ts.map