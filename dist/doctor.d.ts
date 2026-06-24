import type { DreamingConfig } from "./config.js";
export type DoctorLevel = "pass" | "warn" | "fail";
export type DoctorCheck = {
    id: string;
    level: DoctorLevel;
    message: string;
    fix?: string;
};
export type DoctorReport = {
    plugin: "memory-lancedb-dreaming";
    ok: boolean;
    summary: {
        pass: number;
        warn: number;
        fail: number;
    };
    checks: DoctorCheck[];
};
export type DoctorInputs = {
    config: DreamingConfig;
    workspaceDir: string | null;
    hooksAllowConversationAccess: boolean | undefined;
    subagentAllowModelOverride: boolean | undefined;
    needsModelOverride: boolean;
    lancedbPluginId: string | null;
    lancedbDbPath: string | null;
    lancedbError?: string;
    memoryCount: number | null;
    mainCronExpr: string;
    dailyReportEffectiveCronExpr: string;
};
/** Pure checks (everything except deep-history I/O) so they can be unit tested. */
export declare function evaluateDoctorChecks(input: DoctorInputs): DoctorCheck[];
export declare function runDreamingDoctor(input: DoctorInputs): Promise<DoctorReport>;
//# sourceMappingURL=doctor.d.ts.map