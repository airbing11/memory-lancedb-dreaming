let pipelineRunning = false;
export function isPipelineRunning() {
    return pipelineRunning;
}
/** Returns false when another dreaming run is already in progress. */
export function tryBeginPipeline() {
    if (pipelineRunning)
        return false;
    pipelineRunning = true;
    return true;
}
export function endPipeline() {
    pipelineRunning = false;
}
export function resetPipelineForShutdown() {
    pipelineRunning = false;
}
//# sourceMappingURL=pipeline-lock.js.map