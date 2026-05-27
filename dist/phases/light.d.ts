import type { LightConfig } from "../config.js";
import type { MemoryDB } from "../memory-db.js";
import type { LanceMemoryEntry } from "../memory-db.js";
import type { DreamingPhaseResult } from "../types.js";
export declare function runLightSleep(params: {
    db: MemoryDB;
    workspaceDir: string;
    config: LightConfig;
    timezone: string;
    nowMs: number;
    listMemories: () => Promise<LanceMemoryEntry[]>;
}): Promise<DreamingPhaseResult>;
//# sourceMappingURL=light.d.ts.map