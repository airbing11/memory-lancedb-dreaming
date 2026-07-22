export type PipelineOperation = "dreaming" | "daily-report";

let activeOperation: PipelineOperation | null = null;

export function isPipelineRunning(): boolean {
  return activeOperation !== null;
}

export function getActivePipelineOperation(): PipelineOperation | null {
  return activeOperation;
}

/** Returns false when another dreaming or report operation is already in progress. */
export function tryBeginPipeline(operation: PipelineOperation = "dreaming"): boolean {
  if (activeOperation !== null) return false;
  activeOperation = operation;
  return true;
}

export function endPipeline(operation: PipelineOperation = "dreaming"): void {
  if (activeOperation === operation) {
    activeOperation = null;
  }
}
