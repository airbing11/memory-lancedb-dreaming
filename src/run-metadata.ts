import fs from "node:fs/promises";
import path from "node:path";
import type { DreamingRunResult } from "./pipeline.js";

export type DreamingRunMetadata = {
  version: 1;
  lastRunAt: string | null;
  lastRunPhase?: string;
  lastRunResult?: DreamingRunResult;
};

const RUN_METADATA_RELATIVE_PATH = ["memory", ".dreams", "lancedb-dreaming-run.json"] as const;

function emptyMetadata(): DreamingRunMetadata {
  return { version: 1, lastRunAt: null };
}

function resolveRunMetadataPath(workspaceDir: string): string {
  return path.join(workspaceDir, ...RUN_METADATA_RELATIVE_PATH);
}

export async function readDreamingRunMetadata(
  workspaceDir: string
): Promise<DreamingRunMetadata> {
  const metadataPath = resolveRunMetadataPath(workspaceDir);
  try {
    const raw = await fs.readFile(metadataPath, "utf-8");
    const parsed = JSON.parse(raw) as DreamingRunMetadata;
    if (!parsed || parsed.version !== 1) return emptyMetadata();
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT" || err instanceof SyntaxError) return emptyMetadata();
    throw err;
  }
}

export async function recordDreamingRun(params: {
  workspaceDir: string;
  phase?: string;
  result: DreamingRunResult;
  nowMs?: number;
}): Promise<DreamingRunMetadata> {
  const metadataPath = resolveRunMetadataPath(params.workspaceDir);
  const metadata: DreamingRunMetadata = {
    version: 1,
    lastRunAt: new Date(params.nowMs ?? Date.now()).toISOString(),
    lastRunPhase: params.phase ?? "all",
    lastRunResult: params.result,
  };
  await fs.mkdir(path.dirname(metadataPath), { recursive: true });
  const tmpPath = `${metadataPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf-8");
  await fs.rename(tmpPath, metadataPath);
  return metadata;
}
