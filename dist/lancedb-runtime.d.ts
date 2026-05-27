import type { PluginLogger } from "./cron.js";
type LanceDbModule = typeof import("@lancedb/lancedb");
/**
 * Load LanceDB with fallbacks: memory-lancedb bundled loader → ESM import → require() from known roots.
 */
export declare function loadLanceDbModule(logger?: PluginLogger): Promise<LanceDbModule>;
export declare function resolveLanceDbConnectFn(lancedb: LanceDbModule): (uri: string, options?: Record<string, unknown>) => Promise<unknown>;
export {};
//# sourceMappingURL=lancedb-runtime.d.ts.map