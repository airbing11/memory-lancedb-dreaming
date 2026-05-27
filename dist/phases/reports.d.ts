export declare function writePhaseReport(params: {
    workspaceDir: string;
    phase: "light" | "rem" | "deep";
    bodyLines: string[];
    nowMs: number;
    timezone: string;
}): Promise<string>;
export declare function appendDailyMemoryBlock(params: {
    workspaceDir: string;
    heading: string;
    startMarker: string;
    endMarker: string;
    bodyLines: string[];
    nowMs: number;
    timezone: string;
}): Promise<string>;
//# sourceMappingURL=reports.d.ts.map