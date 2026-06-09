import fs from "node:fs/promises";
import path from "node:path";
import type { DailyReportSnapshot } from "./types.js";

export const SNAPSHOT_RELATIVE_PATH = [
  "memory",
  ".dreams",
  "lancedb-dreaming-daily-snapshot.json",
] as const;

export function resolveSnapshotPath(workspaceDir: string): string {
  return path.join(workspaceDir, ...SNAPSHOT_RELATIVE_PATH);
}

export async function readDailyReportSnapshot(
  workspaceDir: string
): Promise<DailyReportSnapshot | null> {
  const snapshotPath = resolveSnapshotPath(workspaceDir);
  try {
    const raw = await fs.readFile(snapshotPath, "utf-8");
    const parsed = JSON.parse(raw) as DailyReportSnapshot;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT" || err instanceof SyntaxError) return null;
    throw err;
  }
}

export async function writeDailyReportSnapshot(params: {
  workspaceDir: string;
  snapshot: DailyReportSnapshot;
}): Promise<string> {
  const snapshotPath = resolveSnapshotPath(params.workspaceDir);
  await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  const tmpPath = `${snapshotPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(params.snapshot, null, 2)}\n`, "utf-8");
  await fs.rename(tmpPath, snapshotPath);
  return snapshotPath;
}
