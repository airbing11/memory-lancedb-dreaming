let activeOperation = null;
export function isPipelineRunning() {
    return activeOperation !== null;
}
export function getActivePipelineOperation() {
    return activeOperation;
}
/** Returns false when another dreaming or report operation is already in progress. */
export function tryBeginPipeline(operation = "dreaming") {
    if (activeOperation !== null)
        return false;
    activeOperation = operation;
    return true;
}
export function endPipeline(operation = "dreaming") {
    if (activeOperation === operation) {
        activeOperation = null;
    }
}
//# sourceMappingURL=pipeline-lock.js.map