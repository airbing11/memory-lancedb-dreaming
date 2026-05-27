import { isAbsolute, resolve } from "node:path";
import { homedir } from "node:os";
let resolvePathFn = null;
export function setLanceDbPathResolver(fn) {
    resolvePathFn = fn;
}
/**
 * Resolve LanceDB filesystem path without letting OpenClaw resolvePath strip absolute
 * out-of-workspace paths (a common cause of connect(undefined) in tool contexts).
 */
export function resolveDbPathForLance(cfgPath) {
    const trimmed = cfgPath.trim();
    if (!trimmed) {
        throw new Error("memory-lancedb-dreaming: LanceDB dbPath is empty");
    }
    if (trimmed.startsWith("~/")) {
        return resolve(homedir(), trimmed.slice(2));
    }
    // Absolute paths: keep as-is (do not pass through resolvePath — may return undefined)
    if (isAbsolute(trimmed)) {
        return trimmed;
    }
    if (resolvePathFn) {
        try {
            const resolved = resolvePathFn(trimmed);
            if (typeof resolved === "string" && resolved.trim().length > 0) {
                return resolved.trim();
            }
        }
        catch {
            // fall through to cwd-relative resolve
        }
    }
    return resolve(process.cwd(), trimmed);
}
/** URI passed to lancedb.connect — plain absolute/relative paths (not file://). */
export function toLanceDbConnectUri(resolvedPath) {
    const trimmed = resolvedPath.trim();
    if (!trimmed) {
        throw new Error("memory-lancedb-dreaming: resolved LanceDB path is empty");
    }
    // Remote / object-store URIs: pass through unchanged
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^[A-Za-z]:[\\/]/.test(trimmed)) {
        return trimmed;
    }
    return trimmed;
}
//# sourceMappingURL=lancedb-path.js.map