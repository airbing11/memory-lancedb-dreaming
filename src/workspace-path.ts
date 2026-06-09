import { isAbsolute, resolve } from "node:path";
import { homedir } from "node:os";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { loadConfigFromDisk } from "./lancedb-client.js";

function expandWorkspacePath(
  workspace: string,
  resolvePath: (input: string) => string
): string {
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
  } catch {
    // fall through
  }
  return resolve(process.cwd(), trimmed);
}

/** Read agents.defaults.workspace from ~/.openclaw/openclaw.json (tool ctx often lacks api.config). */
export function readDefaultWorkspaceFromDisk(): string | null {
  const disk = loadConfigFromDisk();
  const agents = disk?.agents as { defaults?: { workspace?: string } } | undefined;
  const workspace = agents?.defaults?.workspace;
  if (typeof workspace === "string" && workspace.trim().length > 0) {
    return workspace.trim();
  }
  return null;
}

export function resolveWorkspaceDir(
  api: OpenClawPluginApi,
  ctxWorkspace?: string,
  cachedWorkspace?: string | null
): string | null {
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

  const runtime = api.runtime as { config?: { current?: () => unknown } } | undefined;
  const runtimeConfig = runtime?.config?.current?.() as
    | { agents?: { defaults?: { workspace?: string } } }
    | undefined;
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
