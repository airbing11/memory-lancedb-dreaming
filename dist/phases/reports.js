import fs from "node:fs/promises";
import path from "node:path";
import { formatDreamingDay, withTrailingNewline } from "../utils.js";
export async function writePhaseReport(params) {
    const isoDay = formatDreamingDay(params.nowMs, params.timezone);
    const reportPath = path.join(params.workspaceDir, "memory", "dreaming", params.phase, `${isoDay}.md`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    const title = params.phase === "light"
        ? "Light Sleep"
        : params.phase === "rem"
            ? "REM Sleep"
            : "Deep Sleep";
    const body = params.bodyLines.length > 0 ? params.bodyLines.join("\n") : "- No notable updates.";
    await fs.writeFile(reportPath, `# ${title}\n\n${body}\n`, "utf-8");
    return reportPath;
}
export async function appendDailyMemoryBlock(params) {
    const isoDay = formatDreamingDay(params.nowMs, params.timezone);
    const dailyPath = path.join(params.workspaceDir, "memory", `${isoDay}.md`);
    await fs.mkdir(path.dirname(dailyPath), { recursive: true });
    const original = await fs.readFile(dailyPath, "utf-8").catch((err) => {
        if (err?.code === "ENOENT")
            return "";
        throw err;
    });
    const body = params.bodyLines.length > 0 ? params.bodyLines.join("\n") : "- No notable updates.";
    const block = [
        params.heading,
        "",
        params.startMarker,
        body,
        params.endMarker,
        "",
    ].join("\n");
    const startIdx = original.indexOf(params.startMarker);
    let updated;
    if (startIdx >= 0) {
        const endIdx = original.indexOf(params.endMarker, startIdx);
        if (endIdx >= 0) {
            updated = `${original.slice(0, startIdx)}${block}${original.slice(endIdx + params.endMarker.length)}`;
        }
        else {
            updated = `${original.trimEnd()}\n\n${block}`;
        }
    }
    else {
        updated = original.trim().length > 0 ? `${original.trimEnd()}\n\n${block}` : `${block}`;
    }
    await fs.writeFile(dailyPath, withTrailingNewline(updated), "utf-8");
    return dailyPath;
}
//# sourceMappingURL=reports.js.map