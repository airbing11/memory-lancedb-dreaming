import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
let loadPromise = null;
function moduleRootsForLanceDb() {
    const roots = new Set();
    const pluginPackageJson = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    roots.add(dirname(pluginPackageJson));
    roots.add(process.cwd());
    roots.add(join(homedir(), ".openclaw"));
    if (process.env.OPENCLAW_STATE_DIR?.trim()) {
        roots.add(process.env.OPENCLAW_STATE_DIR.trim());
    }
    return [...roots];
}
function tryRequireLanceDbFromRoot(root) {
    try {
        const req = createRequire(join(root, "package.json"));
        const mod = req("@lancedb/lancedb");
        if (typeof mod.connect === "function")
            return mod;
        if (mod.default && typeof mod.default.connect === "function")
            return mod.default;
        return mod;
    }
    catch {
        return null;
    }
}
async function tryImportLanceDbEsm() {
    try {
        const mod = await import("@lancedb/lancedb");
        return mod;
    }
    catch {
        return null;
    }
}
async function tryBundledLanceDbLoader(logger) {
    try {
        const bundled = await import("@openclaw/memory-lancedb/dist/lancedb-runtime.js");
        return (await bundled.loadLanceDbModule(logger ?? { info: () => { }, warn: () => { }, error: () => { } }));
    }
    catch {
        return null;
    }
}
/**
 * Load LanceDB with fallbacks: memory-lancedb bundled loader → ESM import → require() from known roots.
 */
export async function loadLanceDbModule(logger) {
    if (!loadPromise) {
        loadPromise = (async () => {
            const bundled = await tryBundledLanceDbLoader(logger);
            if (bundled)
                return bundled;
            const esm = await tryImportLanceDbEsm();
            if (esm)
                return esm;
            for (const root of moduleRootsForLanceDb()) {
                const required = tryRequireLanceDbFromRoot(root);
                if (required) {
                    logger?.info?.(`memory-lancedb-dreaming: loaded @lancedb/lancedb via require from ${root}`);
                    return required;
                }
            }
            throw new Error("memory-lancedb-dreaming: could not load @lancedb/lancedb (install dependencies or ensure @openclaw/memory-lancedb is present)");
        })().catch((err) => {
            loadPromise = null;
            throw err;
        });
    }
    return loadPromise;
}
export function resolveLanceDbConnectFn(lancedb) {
    const mod = lancedb;
    const connectFn = mod.connect ?? mod.default?.connect;
    if (typeof connectFn !== "function") {
        throw new Error("memory-lancedb-dreaming: @lancedb/lancedb connect() not found on module");
    }
    return connectFn.bind(mod.default ?? mod);
}
//# sourceMappingURL=lancedb-runtime.js.map