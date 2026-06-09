let pipelineRunning = false;

export function isPipelineRunning(): boolean {
  return pipelineRunning;
}

/** Returns false when another dreaming run is already in progress. */
export function tryBeginPipeline(): boolean {
  if (pipelineRunning) return false;
  pipelineRunning = true;
  return true;
}

export function endPipeline(): void {
  pipelineRunning = false;
}

export function resetPipelineForShutdown(): void {
  pipelineRunning = false;
}
