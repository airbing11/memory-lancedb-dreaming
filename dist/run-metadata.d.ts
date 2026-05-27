import type { DreamingRunResult } from "./pipeline.js";
export type DreamingRunMetadata = {
    version: 1;
    lastRunAt: string | null;
    lastRunPhase?: string;
    lastRunResult?: DreamingRunResult;
};
export declare function readDreamingRunMetadata(workspaceDir: string): Promise<DreamingRunMetadata>;
export declare function recordDreamingRun(params: {
    workspaceDir: string;
    phase?: string;
    result: DreamingRunResult;
    nowMs?: number;
}): Promise<DreamingRunMetadata>;
//# sourceMappingURL=run-metadata.d.ts.map