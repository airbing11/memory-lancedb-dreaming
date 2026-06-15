import fs from "node:fs/promises";
import path from "node:path";

export type DailyReportDeliveryState = {
  version: 1;
  lastContentFingerprint: string;
  lastDeliveredDay: string;
  lastDeliveredAt: string;
};

const DELIVERY_STATE_RELATIVE_PATH = [
  "memory",
  ".dreams",
  "lancedb-dreaming-daily-delivery.json",
] as const;

function resolveDeliveryStatePath(workspaceDir: string): string {
  return path.join(workspaceDir, ...DELIVERY_STATE_RELATIVE_PATH);
}

export async function readDailyReportDeliveryState(
  workspaceDir: string
): Promise<DailyReportDeliveryState | null> {
  const statePath = resolveDeliveryStatePath(workspaceDir);
  try {
    const raw = await fs.readFile(statePath, "utf-8");
    const parsed = JSON.parse(raw) as DailyReportDeliveryState;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT" || err instanceof SyntaxError) return null;
    throw err;
  }
}

export async function writeDailyReportDeliveryState(params: {
  workspaceDir: string;
  state: DailyReportDeliveryState;
}): Promise<string> {
  const statePath = resolveDeliveryStatePath(params.workspaceDir);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  const tmpPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(params.state, null, 2)}\n`, "utf-8");
  await fs.rename(tmpPath, statePath);
  return statePath;
}
