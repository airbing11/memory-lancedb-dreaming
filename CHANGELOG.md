# Changelog

## 0.2.8 — 2026-06-22

主题：**REM 反重复 / 叙事新鲜度 + 安装自检**。解决长期运行后日报“换措辞但素材重复”（音色史、版本升级史等陈年旧事每天回炉）的问题。

### Fixed

- **叙事新鲜度（A）：** Deep `promoted=0` 当天不再用旧的 ranked 候选生成 promotion 叙事；改为优先用当天 Light 素材写 snapshot，没有新料则跳过。此前即使无新增也会围绕老候选写日记。
- **REM lasting truths 文本级去重（C）：** 选取前与最近 `truthDedupeWindowDays`（默认 30）天 REM 历史的 truth **文本**做相似度比对（overlap-coefficient，CJK 友好），相似度 ≥ `truthSimilarityThreshold`（默认 0.42）即跳过。此前只按 memoryId 去重，不同 ID 的同主题记忆仍会重复出现。
- **已提炼记忆闭环（D）：** REM 选 lasting truths 时排除已写入 MEMORY.md 的记忆（`state.promotedAt`），由 `rem.excludePromoted`（默认 true）控制。
- **REM 主题名占位符回显：** 当 LLM 把 prompt 的格式示例（`中文主题名（4-8字） / English Topic Name`）原样回显时，解析器不再当作有效主题，改为回退到 `category` 标签。

### Added

- **REM 空转 novelty 模式（E）：** 连续 `deep.idleNoveltyAfterDays`（默认 7）天 `promoted=0` 时，REM 自动收紧——强制排除已提炼记忆并提高去重力度，叙事停止复用旧候选。记录于 `memory/.dreams/lancedb-dreaming-deep-history.json`。
- **`dreaming_doctor` 工具 + `scripts/doctor.sh`：** 自检 hooks/subagent 权限、安装路径、LanceDB 插槽、cron 冲突、日报投递、以及 Deep 连续空转天数。开 issue 前请附 `dreaming_doctor` 输出。
- **REM 历史增存：** `lastingTruthTexts`、`clusterThemeNames`（供文本级去重与诊断；旧历史缺字段按空处理，向后兼容）。
- 新增配置：`rem.truthDedupeWindowDays`、`rem.truthSimilarityThreshold`、`rem.excludePromoted`、`deep.idleNoveltyAfterDays`，并在 `dreaming_status.effectiveConfig` 暴露。

### Compatibility

- 已知行为（OpenClaw 第三方 memory 插槽）：6.5/6.6 之前，managed dreaming cron 可能显示 `ok` 但无产物（sidecar 激活缺口，见 openclaw/openclaw#92536）；已由 openclaw/openclaw#93678 合并修复。若你在更老版本上遇到“cron 绿但无 light/rem/deep 文件”，请升级 OpenClaw 或把 `memory-core` 加入 `plugins.allow` 并设 `enabled: false`。
- 升级：替换 tgz → 完整重启 gateway。旧 `rem-history.json` 无需迁移；首次运行后开始写入文本/主题字段。

### Notes

- REM 仍按 `category` 聚类；本版主要在 **truth 选择与叙事素材** 层面去重，未引入向量语义聚类（计划后续版本）。
- 若你希望完全保留旧行为：设 `rem.truthSimilarityThreshold: 1`（关文本去重）、`rem.excludePromoted: false`、`deep.idleNoveltyAfterDays: 0`（关 novelty 模式）。

## 0.2.7 — 2026-06-15

**English-first bilingual listing** — metadata-only; **no runtime changes** from v0.2.6.

### Changed

- README: English introduction first, then `## 中文说明` (ClawHub / GitHub readability).
- `package.json` and `openclaw.plugin.json` descriptions: English-first for international discovery.

### Notes

- ClawHub Long description layout baseline for later releases (v0.2.8 adds content; keep EN → `---` → 中文说明).

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
