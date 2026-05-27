import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
/** Read agents.defaults.workspace from ~/.openclaw/openclaw.json (tool ctx often lacks api.config). */
export declare function readDefaultWorkspaceFromDisk(): string | null;
export declare function resolveWorkspaceDir(api: OpenClawPluginApi, ctxWorkspace?: string, cachedWorkspace?: string | null): string | null;
//# sourceMappingURL=workspace-path.d.ts.map