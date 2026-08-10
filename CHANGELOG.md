# Changelog

## [0.3.16] - 2026-08-10
### Fixed
- report zero novel REM themes as `themeCount=0` instead of converting a non-zero analyzed-memory count into one phantom theme

## [0.3.15] - 2026-08-07
### Fixed
- suppress REM theme labels similar to themes surfaced during the configurable 7-day cooldown
- persist narrative source history and skip recently narrated Light material before calling the LLM
- skip zero-promotion snapshot narratives unless at least 2 novel snippets remain
- reject generated narrative output that substantially repeats a recent diary entry
- make `pushOn: changed` ignore volatile counts, confidence, evidence summaries, and prose-only rewrites

## [0.3.14] - 2026-08-04
### Fixed
- restore ClawHub / manifest display name to `Memory LanceDB Dreaming` (0.3.13 accidentally published as `Dreaming (LanceDB)`)

## [0.3.13] - 2026-08-04
### Fixed
- migrate daily-report delivery from removed `openclaw/plugin-sdk/channel-message-runtime` to `openclaw/plugin-sdk/channel-outbound`
- remove top-level `uiHints` from `openclaw.plugin.json` so ClawHub Plugin Inspector against OpenClaw 2026.7.2-beta.7 no longer flags `manifest-unknown-fields` (fold critical help into `configSchema` descriptions)
- rebuild / validate against OpenClaw `2026.7.2-beta.7`

## [0.3.12] - 2026-07-23
### Fixed
- set both managed isolated cron jobs to `delivery.mode=none`
- prevent OpenClaw from trying to announce cron completion without a channel in multi-channel environments
- migrate existing managed cron jobs from missing/announce delivery to canonical `delivery: { mode: "none" }`
- keep plugin-owned `dailyReport.delivery` unchanged, so Feishu/WeCom report push continues normally
- add migration and idempotence coverage for the corrected cron delivery policy

## [0.3.11] - 2026-07-22
### Fixed
- synchronize `package.json`, `openclaw.plugin.json`, runtime `PLUGIN_VERSION`, lockfile, docs, and install examples
- declare both `openclaw.extensions` and `runtimeExtensions` against the packaged `dist/index.js` for OpenClaw 2026.7.1 loader compatibility
- raise the supported OpenClaw / plugin API security baseline to 2026.6.9
- serialize dreaming and daily-report operations through one shared lock
- keep in-flight work locked during Gateway/service shutdown instead of clearing the lock early
- refresh LanceDB slot configuration before each dreaming run
- atomically replace generated Markdown files to avoid partial documents after interruption
- migrate renamed legacy cron jobs carrying the old dreaming trigger
- update cron tests for `isolated` + `agentTurn` and add migration/lock coverage
- make the test runner work on Windows, Linux, and macOS

### Packaging
- publish only compiled JavaScript plus required metadata/docs/install script
- remove the unused direct `openai` dependency
- make `@openclaw/memory-lancedb` an optional peer because `memory-lancedb-pro` is also supported
- remove the unpublished `src/index.ts` entrypoint from ClawPack metadata
- require an exact Git commit/tag when publishing to ClawHub

### ClawHub
- 0.3.10 uploaded successfully as an npm-pack artifact, but its LLM review was
  `suspicious` because compatibility metadata allowed vulnerable OpenClaw
  versions; `latest` therefore remained on 0.3.9
- the earlier `legacy-zip` versus `code-plugin` diagnosis was not the 0.3.10
  blocker

## [0.3.8] - 2026-07-22
### Fixed
- rev bump and republish (v0.3.7 already existed on ClawHub from prior partial publish)

## [0.3.7] - 2026-07-22
### Fixed
- sync openclaw.plugin.json version with package.json
- add .clawhubignore for clean production-only publish (48 files vs 256)
### Security
- ClawHub ClawScan flagged `scripts/test.mjs` (used `spawnSync`) as `suspicious.dangerous_exec`. Fixed by: (a) adding `.clawhubignore` excluding `scripts/`, `test/`, `src/`, `.github/`, `*.ts`, etc., (b) rewriting `scripts/test.mjs` to use `fork()` instead of `spawnSync`, (c) trimming `package.json "files"` to production-only.
- TODO: verify the next `clawhub package publish --family code-plugin` produces an indexable release.

## 0.3.1 — 2026-07-22

主题：**Cron session 隔离 — 消除 Dreaming 对 main session 缓存前缀的污染**。

### Changed

- **Breaking: cron session 隔离。** 两个托管 cron（Dreaming Pipeline + Daily Report）从 `sessionTarget: "main"` + `payload.kind: "systemEvent"` 改为 `sessionTarget: "isolated"` + `payload.kind: "agentTurn"`。Dreaming 管道现在在隔离的 ephemeral session 里运行，不再污染 main session 的上下文，避免 DeepSeek 等 prefix-cache 模型因上下文前缀变化而丢失缓存命中率。
- `buildManagedDreamingCronJob` / `buildManagedDailyReportCronJob`：`sessionTarget` → `"isolated"`，`payload.kind` → `"agentTurn"`，`payload.text` → `payload.message`。
- `buildManagedDreamingPatch` / `buildManagedDailyReportPatch`：reconcile 时检测旧 `systemEvent`/`main` 配置并 patch 为新 `agentTurn`/`isolated` 配置。升级后自动迁移。
- `isManagedDreamingJob` / `isManagedDailyReportJob`：同时匹配 `payload.text` 和 `payload.message`，确保旧 `systemEvent` cron 和新 `agentTurn` cron 都能被正确识别。
- `CronJob.payload` 类型扩展：新增 `model`、`thinking`、`fallbacks`、`toolsAllow`、`lightContext` 字段（对齐 OpenClaw cron schema）。

### Effect

- main session 的上下文前缀不再被 Dreaming cron 改写
- DeepSeek V4 等前缀缓存模型的缓存命中率恢复至正常水平（88%+）
- 每日节省约 10–15 元 cache miss 多花的 token 费用
- `before_agent_reply` hook 无需改动：`ctx.trigger === "cron"` + `event.cleanedBody` 包含触发 token 的逻辑在 isolated session 中同样适用

### Compatibility

- 升级后首次 reconcile 自动将现有 `main`+`systemEvent` cron 更新为 `isolated`+`agentTurn`，无需手动干预
- `dreaming_trigger` 工具（手动触发）不受影响，仍然直接调用 pipeline
- 如果回退到 0.2.x，需手动将 cron 改回 `main`+`systemEvent`，否则 0.2.x reconcile 会自动修复

## 0.2.9 — 2026-06-24

### Fixed

- Emergency ClawHub packaging fix: include the generated `dist/doctor.*` and
  `dist/deep-history.*` modules that `dist/index.js` imports in v0.2.8.
- No runtime behavior changes from v0.2.8; this release exists because ClawHub
  does not allow overwriting the broken 0.2.8 artifact.

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
