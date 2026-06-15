# Changelog

## 0.2.7 — 2026-06-15

### Changed

- Metadata-only release: make GitHub / ClawHub listing copy English-first and bilingual.
- Update package and plugin descriptions for clearer international discovery.

### Notes

- No runtime behavior changes from 0.2.6.
- 0.2.6 remains the functional release that fixed duplicate daily report pushes and REM repetition.

## 0.2.6 — 2026-06-13

### Fixed

- **Duplicate daily report push:** dreaming pipeline no longer pushes after Light/REM/Deep; IM push is owned solely by the `Dreaming Daily Report` cron.
- **Cron collision:** when `dailyReport.cron` equals main dreaming `cron`, daily report cron auto-staggers (e.g. `0 3 * * *` → `30 3 * * *`).
- **REM content repetition:** `Possible Lasting Truths` skip memory IDs shown within `rem.lastingTruthCooldownDays` (default 7); cluster exemplars rotate via `rem.clusterSpotlightCooldownDays` (default 5). History: `memory/.dreams/lancedb-dreaming-rem-history.json`.

### Added

- **`dailyReport.delivery.pushOn`:** `changed` (default) skips IM push when report fingerprint unchanged; `always` pushes every run. State: `memory/.dreams/lancedb-dreaming-daily-delivery.json`.
- Skip IM push when no dreaming phases ran (`no_phases`).
- `dreaming_status.dailyReport.effectiveCron` for reconciled cron expression.
- **`rem.lastingTruthCooldownDays`**, **`rem.clusterSpotlightCooldownDays`** config knobs.

### Notes

- Narrative (`DREAMS.md`) unchanged — still nightly LLM prose at workspace root.
- REM still groups by memory `category`; cooldown/rotation reduces repeated truths and stale cluster anchors.
- Set `pushOn: "always"` if you want a daily IM ping even when REM summary is stable.

## 0.2.4 — 2026-06-09

### Fixed

- **LanceDB config resolution:** read `dbPath` / `embedding` from the active memory slot owner (`plugins.slots.memory`), including `memory-lancedb-pro` and `lancedb-pro`, instead of only `plugins.entries.memory-lancedb`.
- Clearer errors and startup logs when LanceDB config is missing (`lancedbPlugin=...` on register; `lancedbPluginId` in `dreaming_status`).

### Verified

- 腾讯云 VPS · `plugins.slots.memory: memory-lancedb-pro` · 1153 memories · trigger + 3:00 cron + 飞书推送 GO（见 `docs/v0.2.4-ACCEPTANCE-REPORT.md`）。

### Notes

- Fixes Dreaming pipeline stall after migrating from `memory-lancedb` to `memory-lancedb-pro` (Daily Report could still run while Light/REM/Deep failed silently in cron).
- 从 0.2.3 升级：替换 tgz 并重启 gateway；**不必**再保留 duplicate `memory-lancedb` entry。

## 0.2.3 — 2026-05-27

**OpenClaw 验收：GO**（腾讯云 Lighthouse，OpenClaw 2026.5.20）

### Added

- 梦境日报（`dailyReport`）：零 LLM 文件报告 + 可选通道推送（`memory/YYYY-MM-DD.md`、snapshot JSON）。
- 第二条托管 cron「Dreaming Daily Report」（默认 `0 4 * * *`）。
- `dailyReport.delivery`：按 `channel` / `to` 推送（经 `sendDurableMessageBatch`）。

### Fixed

- 日报推送：改用 `openclaw/plugin-sdk/channel-message-runtime` 的 `sendDurableMessageBatch`，不再依赖不可用的 `api.runtime.channel.outbound.loadAdapter`。
- Cron：不在 `main` + `systemEvent` 任务上挂载 `cron.delivery`（避免 OpenClaw 拒绝创建日报 cron）。
- 推送失败时输出 `warn`/`error` 日志，不再静默。
- 启动 cron reconcile 重试：`STARTUP_CRON_MAX_RETRIES` 120（约 10 分钟）。

### Notes

- 需 `hooks.allowConversationAccess: true`；REM/叙事若用子代理需 `subagent.allowModelOverride: true`。
- 验收报告见 `docs/v0.2.3-OPENCLAW-TEST-STEPS.md` 与用户侧 `v0.2.3-test-report.md`。

## 0.2.2 — 2026-05-27

- 首次尝试插件内 `loadAdapter` 推送；cron 无 `delivery`（日报 cron 可创建）。
- 推送在生产环境未通过（runtime outbound 不可用）。

## 0.2.1 / 0.2.0

- 梦境日报文件管线、cron 托管、配置 schema；0.2.1 推送方案因 `main`+`delivery` 与 OpenClaw 约束未通过。
