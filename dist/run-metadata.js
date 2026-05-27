import fs from "node:fs/promises";
import path from "node:path";
const RUN_METADATA_RELATIVE_PATH = ["memory", ".dreams", "lancedb-dreaming-run.json"];
function emptyMetadata() {
    return { version: 1, lastRunAt: null };
}
function resolveRunMetadataPath(workspaceDir) {
    return path.join(workspaceDir, ...RUN_METADATA_RELATIVE_PATH);
}
export async function readDreamingRunMetadata(workspaceDir) {
    const metadataPath = resolveRunMetadataPath(workspaceDir);
    try {
        const raw = await fs.readFile(metadataPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1)
            return emptyMetadata();
        return parsed;
    }
    catch (err) {
        const code = err?.code;
        if (code === "ENOENT" || err instanceof SyntaxError)
            return emptyMetadata();
        throw err;
    }
}
export async function recordDreamingRun(params) {
    const metadataPath = resolveRunMetadataPath(params.workspaceDir);
    const metadata = {
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
//# sourceMappingURL=run-metadata.js.map