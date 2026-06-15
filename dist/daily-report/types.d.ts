export type DailyReportTheme = {
    label: string;
    confidence: number;
    summary?: string;
};
export type DailyReportSnapshot = {
    version: 1;
    day: string;
    timezone: string;
    generatedAt: string;
    light: {
        candidateCount: number;
        ran: boolean;
    };
    rem: {
        themeCount: number;
        themes: DailyReportTheme[];
        ran: boolean;
    };
    deep: {
        promotedCount: number;
        ran: boolean;
    };
    narrative: {
        written: boolean;
        excerpt?: string;
    };
};
export type DailyReportPublishResult = {
    day: string;
    text: string;
    dailyMemoryPath: string;
    archivePath: string;
    snapshotPath: string;
    snapshot: DailyReportSnapshot;
    contentFingerprint: string;
};
//# sourceMappingURL=types.d.ts.map