import type { DailyReportSnapshot } from "./types.js";
export declare const SNAPSHOT_RELATIVE_PATH: readonly ["memory", ".dreams", "lancedb-dreaming-daily-snapshot.json"];
export declare function resolveSnapshotPath(workspaceDir: string): string;
export declare function readDailyReportSnapshot(workspaceDir: string): Promise<DailyReportSnapshot | null>;
export declare function writeDailyReportSnapshot(params: {
    workspaceDir: string;
    snapshot: DailyReportSnapshot;
}): Promise<string>;
//# sourceMappingURL=snapshot.d.ts.map