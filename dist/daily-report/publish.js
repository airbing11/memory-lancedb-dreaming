import fs from "node:fs/promises";
import path from "node:path";
import { appendDailyMemoryBlock } from "../phases/reports.js";
import { buildSnapshotFromWorkspace } from "./extract.js";
import { computeDailyReportContentFingerprint } from "./fingerprint.js";
import { renderDailyReport } from "./render.js";
import { readDailyReportSnapshot, writeDailyReportSnapshot } from "./snapshot.js";
export const DAILY_REPORT_START_MARKER = "<!-- openclaw:dreaming:daily-report:start -->";
export const DAILY_REPORT_END_MARKER = "<!-- openclaw:dreaming:daily-report:end -->";
export async function writeDailyReportArchive(params) {
    const archivePath = path.join(params.workspaceDir, "memory", "dreaming", "daily", `${params.day}.md`);
    await fs.mkdir(path.dirname(archivePath), { recursive: true });
    await fs.writeFile(archivePath, `${params.text.trimEnd()}\n`, "utf-8");
    return archivePath;
}
export async function publishDailyReport(params) {
    const snapshot = params.snapshot ??
        (await readDailyReportSnapshot(params.workspaceDir)) ??
        (await buildSnapshotFromWorkspace({
            workspaceDir: params.workspaceDir,
            day: params.day,
            timezone: params.timezone,
            nowMs: params.nowMs,
        }));
    const snapshotPath = await writeDailyReportSnapshot({
        workspaceDir: params.workspaceDir,
        snapshot,
    });
    const text = renderDailyReport(snapshot, params.config.languages);
    const bodyLines = text.split("\n");
    const dailyMemoryPath = await appendDailyMemoryBlock({
        workspaceDir: params.workspaceDir,
        heading: "## 梦境日报",
        startMarker: DAILY_REPORT_START_MARKER,
        endMarker: DAILY_REPORT_END_MARKER,
        bodyLines,
        nowMs: params.nowMs ?? Date.now(),
        timezone: params.timezone,
    });
    const archivePath = await writeDailyReportArchive({
        workspaceDir: params.workspaceDir,
        day: params.day,
        text,
    });
    params.logger?.info(`memory-lancedb-dreaming: daily report written (day=${params.day}, archive=${archivePath})`);
    return {
        day: params.day,
        text,
        dailyMemoryPath,
        archivePath,
        snapshotPath,
        snapshot,
        contentFingerprint: computeDailyReportContentFingerprint(snapshot),
    };
}
//# sourceMappingURL=publish.js.map