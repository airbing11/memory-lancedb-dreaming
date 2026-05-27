import type { DailyReportSnapshot, DailyReportTheme } from "./types.js";
export declare function parseRemThemeLines(bodyLines: string[]): DailyReportTheme[];
export declare function extractLatestNarrativeExcerpt(workspaceDir: string): Promise<string | undefined>;
export declare function buildSnapshotFromWorkspace(params: {
    workspaceDir: string;
    day: string;
    timezone: string;
    nowMs?: number;
}): Promise<DailyReportSnapshot>;
export declare function buildSnapshotFromPipeline(params: {
    workspaceDir: string;
    day: string;
    timezone: string;
    nowMs: number;
    lightCount: number;
    remCount: number;
    promotedCount: number;
    narrativeWritten: boolean;
    remBodyLines?: string[];
    narrativeExcerpt?: string;
    phasesRan: {
        light: boolean;
        rem: boolean;
        deep: boolean;
    };
}): DailyReportSnapshot;
export declare function resolveReportDay(nowMs: number, timezone: string): string;
//# sourceMappingURL=extract.d.ts.map