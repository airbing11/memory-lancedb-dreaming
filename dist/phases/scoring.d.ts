import type { ResolvedDeepConfig } from "../config.js";
import type { LanceMemoryEntry } from "../memory-db.js";
import type { DreamingState } from "../state.js";
import type { PromotionCandidate } from "../types.js";
export declare function rankPromotionCandidates(params: {
    memories: LanceMemoryEntry[];
    state: DreamingState;
    config: ResolvedDeepConfig;
    nowMs: number;
}): PromotionCandidate[];
//# sourceMappingURL=scoring.d.ts.map