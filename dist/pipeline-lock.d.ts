export type PipelineOperation = "dreaming" | "daily-report";
export declare function isPipelineRunning(): boolean;
export declare function getActivePipelineOperation(): PipelineOperation | null;
/** Returns false when another dreaming or report operation is already in progress. */
export declare function tryBeginPipeline(operation?: PipelineOperation): boolean;
export declare function endPipeline(operation?: PipelineOperation): void;
//# sourceMappingURL=pipeline-lock.d.ts.map