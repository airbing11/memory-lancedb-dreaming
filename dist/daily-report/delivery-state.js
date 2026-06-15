import fs from "node:fs/promises";
import path from "node:path";
const DELIVERY_STATE_RELATIVE_PATH = [
    "memory",
    ".dreams",
    "lancedb-dreaming-daily-delivery.json",
];
function resolveDeliveryStatePath(workspaceDir) {
    return path.join(workspaceDir, ...DELIVERY_STATE_RELATIVE_PATH);
}
export async function readDailyReportDeliveryState(workspaceDir) {
    const statePath = resolveDeliveryStatePath(workspaceDir);
    try {
        const raw = await fs.readFile(statePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1)
            return null;
        return parsed;
    }
    catch (err) {
        const code = err?.code;
        if (code === "ENOENT" || err instanceof SyntaxError)
            return null;
        throw err;
    }
}
export async function writeDailyReportDeliveryState(params) {
    const statePath = resolveDeliveryStatePath(params.workspaceDir);
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    const tmpPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, `${JSON.stringify(params.state, null, 2)}\n`, "utf-8");
    await fs.rename(tmpPath, statePath);
    return statePath;
}
//# sourceMappingURL=delivery-state.js.map