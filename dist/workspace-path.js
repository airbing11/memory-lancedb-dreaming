import { isAbsolute, resolve } from "node:path";
import { homedir } from "node:os";
import { loadConfigFromDisk } from "./lancedb-client.js";
function expandWorkspacePath(workspace, resolvePath) {
    const trimmed = workspace.trim();
    if (trimmed.startsWith("~/")) {
        return resolve(homedir(), trimmed.slice(2));
    }
    if (isAbsolute(trimmed)) {
        return trimmed;
    }
    try {
        const resolved = resolvePath(trimmed);
        if (typeof resolved === "string" && resolved.trim().length > 0) {
            return resolved.trim();
        }
    }
    catch {
        // fall through
    }
    return resolve(process.cwd(), trimmed);
}
/** Read agents.defaults.workspace from ~/.openclaw/openclaw.json (tool ctx often lacks api.config). */
export function readDefaultWorkspaceFromDisk() {
    const disk = loadConfigFromDisk();
    const agents = disk?.agents;
    const workspace = agents?.defaults?.workspace;
    if (typeof workspace === "string" && workspace.trim().length > 0) {
        return workspace.trim();
    }
    return null;
}
export function resolveWorkspaceDir(api, ctxWorkspace, cachedWorkspace) {
    const fromCtx = ctxWorkspace?.trim();
    if (fromCtx) {
        return expandWorkspacePath(fromCtx, api.resolvePath.bind(api));
    }
    if (cachedWorkspace?.trim()) {
        return expandWorkspacePath(cachedWorkspace, api.resolvePath.bind(api));
    }
    const defaults = api.config.agents?.defaults;
    const workspace = defaults?.workspace;
    if (typeof workspace === "string" && workspace.trim().length > 0) {
        return expandWorkspacePath(workspace, api.resolvePath.bind(api));
    }
    const runtime = api.runtime;
    const runtimeConfig = runtime?.config?.current?.();
    const runtimeWorkspace = runtimeConfig?.agents?.defaults?.workspace;
    if (typeof runtimeWorkspace === "string" && runtimeWorkspace.trim().length > 0) {
        return expandWorkspacePath(runtimeWorkspace, api.resolvePath.bind(api));
    }
    const fromDisk = readDefaultWorkspaceFromDisk();
    if (fromDisk) {
        return expandWorkspacePath(fromDisk, api.resolvePath.bind(api));
    }
    return null;
}
//# sourceMappingURL=workspace-path.js.map