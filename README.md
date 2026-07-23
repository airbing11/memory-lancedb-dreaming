# memory-lancedb-dreaming

Light/REM/Deep memory consolidation for OpenClaw agents using LanceDB / `memory-lancedb-pro`.

OpenClaw has one active memory slot and can resolve dreaming settings from that slot owner, but vector-native consolidation behavior depends on the selected provider. This companion plugin keeps LanceDB as the storage backend and supplies its own Light → REM → Deep pipeline, narrative diary, and daily report.

**v0.3.x** runs both dreaming and daily report cron in `sessionTarget: "isolated"` with `payload.kind: "agentTurn"` — no more main-session cache pollution, 88%+ prefix cache hit rate restored.

**v0.3.11+** publishes a production-only ClawPack controlled by `package.json#files`: compiled runtime JavaScript, `openclaw.plugin.json`, `README.md`, and `scripts/install.sh`. Source, tests, maps, declarations, and development tooling are excluded.

**v0.2.8** stops daily reports from recycling the same old material — text-level REM truth dedupe, exclude promoted memories, narrative freshness on zero-promotion days, idle novelty mode after Deep stalls, and `dreaming_doctor` install self-check.

**v0.2.6** fixes duplicate daily report pushes, adds `pushOn: "changed"` delivery dedupe, auto-staggers colliding report cron schedules, and rotates REM Lasting Truths / cluster exemplars across days.

**v0.2.4+** reads LanceDB `dbPath` / `embedding` from `plugins.slots.memory` (including `memory-lancedb-pro`).

## What You Get

With `dailyReport.delivery` configured, the agent can push a zero-LLM daily digest to Feishu, WeCom, or another OpenClaw channel:

| When | Output |
|------|--------|
| Daily dreaming cron | Light / REM / Deep consolidation, `DREAMS.md`, and report snapshot |
| Daily report cron | One IM digest from the latest snapshot (auto-staggered if it collides with dreaming) |
| Manual `dreaming_trigger phase=all` | Writes files only; IM delivery is owned by the report cron |

Local files are still written for audit and retrieval:

- `DREAMS.md` — bilingual dream diary at the workspace root
- `memory/YYYY-MM-DD.md` — daily memory journal with `## 梦境日报`
- `memory/dreaming/daily/YYYY-MM-DD.md` — report archive
- `memory/dreaming/light|rem|deep/YYYY-MM-DD.md` — phase reports
- `memory/.dreams/` — snapshots, delivery state, run metadata, REM diversity history

**v0.2.6+:** `delivery.pushOn: "changed"` by default; colliding `dailyReport.cron` auto-staggers 30 minutes; `rem.lastingTruthCooldownDays` (7) and `rem.clusterSpotlightCooldownDays` (5).

**v0.2.8 anti-repeat** (for long-running installs where the same themes reword daily):

- **Text-level dedupe:** compares truth **text** over `rem.truthDedupeWindowDays` (default 30); skip if similarity ≥ `rem.truthSimilarityThreshold` (default 0.42, CJK-friendly).
- **Exclude promoted:** memories already in `MEMORY.md` skipped by default (`rem.excludePromoted`).
- **Narrative freshness:** on Deep `promoted=0` days, diary uses today's Light snapshot or skips — no stale ranked candidates.
- **Idle novelty mode:** after `deep.idleNoveltyAfterDays` (default 7) zero-promotion days, REM tightens dedupe automatically.
- **Self-check:** run `dreaming_doctor` or `bash scripts/doctor.sh` before opening an issue.
- Restore old behavior: `rem.truthSimilarityThreshold: 1`, `rem.excludePromoted: false`, `deep.idleNoveltyAfterDays: 0`.

## Why This Plugin

The plugin resolves a practical OpenClaw trade-off:

| Area | Native dreaming (`memory-core`) | This plugin (LanceDB slot) |
|---|---|---|
| Uses the active LanceDB memory slot | No | Yes |
| Full Light / REM / Deep on LanceDB vectors | No | Yes |
| LLM-named REM themes | Limited | Yes |
| Bilingual narrative diary | No | Yes |
| Daily report + channel push | No | Yes |
| Duplicate push prevention | No | Yes (v0.2.6+) |
| REM truth / exemplar rotation | No | Yes (v0.2.6+) |
| REM text anti-repeat / narrative freshness | No | Yes (v0.2.8+) |
| Install self-check (`dreaming_doctor`) | No | Yes (v0.2.8+) |
| Main session cache isolation | No | Yes (v0.3.x+) |

You do not have to switch back to `memory-core` just to keep dreaming.

## Compatibility

| Item | Notes |
|------|-------|
| Supported OpenClaw | 2026.6.9+ (security baseline); v0.3.12 verified on 2026.7.1 |
| Third-party slot sidecar | Before 6.5/6.6, managed cron could show `ok` with no artifacts (#92536); fixed in #93678. Fallback: add `memory-core` to `plugins.allow` with `enabled: false` |
| Install | Prefer ClawHub: `openclaw plugins install clawhub:memory-lancedb-dreaming`; offline: `scripts/install.sh` |
| Troubleshooting | Run `dreaming_doctor` / `scripts/doctor.sh` first |

---

## 中文说明

让 LanceDB 的记忆真正会做梦。这个插件为使用 LanceDB / `memory-lancedb-pro` 的 OpenClaw 智能体恢复 Light → REM → Deep 梦境巩固能力：REM 主题命名、Deep 记忆提升、中英双语 `DREAMS.md`，以及可选飞书 / 企微日报推送。

**v0.3.x** 将梦境和日报 cron 改为独立 session 运行，不再污染主对话缓存，88%+ 前缀缓存命中率。

**v0.2.8** 解决长期运行后日报「换措辞但素材重复」：REM 文本级去重、排除已提炼记忆、叙事新鲜度、Deep 空转 novelty 模式、`dreaming_doctor` 自检。

**v0.2.6** 已修复日报双推、IM 相似内容重复推送，并增加 REM Lasting Truths 与聚类 exemplar 的跨天轮换。

### 每天你会看到什么

配置 `dailyReport.delivery` 后，无需打开文件即可在 IM 里收到当日摘要（零 LLM，插件拼接）。本地仍会写入 `DREAMS.md`、`memory/YYYY-MM-DD.md`、`memory/dreaming/daily/` 与各阶段报告，便于归档与检索。

| 时机 | 你会收到 |
|------|----------|
| 每天 **3:00** 梦境 cron | 跑 Light/REM/Deep + 写快照/文件（**不直接推 IM**，v0.2.6+） |
| 每天 **4:00** 日报 cron | 从快照刷新日报并 **负责 IM 推送**（与主 cron 冲突时自动错开 30 分钟） |
| 手动 `dreaming_trigger phase=all` | 仅写文件；推送由日报 cron 负责 |

不想推送、只要文件：保持 `dailyReport.enabled: true`，省略 `delivery` 即可。完全关闭日报：`dailyReport.enabled: false`。

**v0.2.8 反重复（针对长期运行后日报「素材重复」）：**

- **文本级去重：** 与最近 `rem.truthDedupeWindowDays`（默认 30）天 truth **文本** 比对，≥ `rem.truthSimilarityThreshold`（默认 0.42）即跳过。
- **排除已提炼：** 已在 `MEMORY.md` 的记忆默认不再进入 lasting truths（`rem.excludePromoted`）。
- **叙事新鲜度：** Deep `promoted=0` 当天不复用旧候选，改用当天 Light 或跳过。
- **空转 novelty：** 连续 `deep.idleNoveltyAfterDays`（默认 7）天无晋升后 REM 自动收紧。
- **自检：** `dreaming_doctor` 或 `bash scripts/doctor.sh`。
- 保留旧行为：`rem.truthSimilarityThreshold: 1` + `rem.excludePromoted: false` + `deep.idleNoveltyAfterDays: 0`。

### 兼容性

| 项 | 说明 |
|----|------|
| 支持的 OpenClaw | 2026.6.9+（安全基线）；v0.3.12 已在 2026.7.1 实机验证 |
| 第三方插槽 dreaming sidecar | 6.5/6.6 之前 managed cron 可能显示 `ok` 但无产物（#92536）；已由 #93678 修复 |
| 安装方式 | 优先 ClawHub：`openclaw plugins install clawhub:memory-lancedb-dreaming`；离线 `scripts/install.sh` |
| 排障第一步 | 先跑 `dreaming_doctor` / `scripts/doctor.sh`，再开 issue |

### v0.3.11 ClawHub 发布说明

0.3.11 统一发布元数据、来源版本与安全兼容基线，并把 ClawPack 精简为运行所需文件。开发测试脚本不进入发布 artifact。

**处理方式：**
1. `package.json#files` 仅包含 `dist/**/*.js`、manifest、README 与安装脚本
2. 最低 OpenClaw / Plugin API 基线提升到 2026.6.9
3. 发布前要求 package、manifest、运行时版本常量与 Git tag 完全一致
4. ClawHub 发布使用 npm ClawPack `.tgz`，并绑定准确的 Git commit/tag

验证：`npm pack --dry-run`、`clawhub package validate` 与 `clawhub package publish --dry-run` 必须全部通过。

### v0.3.12 Cron 完成投递修复

两条托管 cron 均使用 `isolated + agentTurn + delivery:none`。`delivery:none` 仅关闭
OpenClaw 对 cron 完成文本的额外 announce，避免多通道环境报
`Channel is required when multiple channels are configured`；插件自己的
`dailyReport.delivery`（飞书/企微等）不受影响。

### 为什么需要这个插件

OpenClaw **同一时间只启用一个 memory 插槽**。Dreaming 配置可以跟随 slot owner，但是否对 LanceDB 向量执行完整 Light / REM / Deep 取决于该 provider。本插件提供独立的 LanceDB 向量管线与可读日报层。

**memory-lancedb-dreaming** = **继续用 LanceDB** + **补回整套 dreaming** + 可选每日 IM 日报。

### 能力对比

| 能力 | 原生 dreaming（memory-core） | memory-lancedb-dreaming |
|---|---|---|
| 与 LanceDB 插槽一致 | 仅 memory-core 插槽 | ✅ |
| LanceDB 向量完整管线 | ❌ | ✅ |
| 语义化 REM 主题 | 有限 | ✅ |
| 中英叙事 `DREAMS.md` | ❌ | ✅ |
| 梦境日报 + IM 推送 | ❌ | ✅ |
| 日报双推修复 / IM 去重 | ❌ | ✅ v0.2.6+ |
| REM 反重复 / 叙事新鲜度 | ❌ | ✅ v0.2.8+ |
| `dreaming_doctor` 自检 | ❌ | ✅ v0.2.8+ |
| 主对话缓存隔离 | ❌ | ✅ v0.3.x+ |

## 安装

> v0.3.12 的最低安全基线是 **OpenClaw 2026.6.9**；已在 **2026.7.1** 实机验证。

### 方式 A：ClawHub（推荐）

```bash
openclaw plugins install clawhub:memory-lancedb-dreaming
```

### 方式 B：安装脚本

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.3.12.tgz
```

### 方式 C：手动解压

```bash
mkdir -p ~/.openclaw/plugins/memory-lancedb-dreaming
tar -xzf memory-lancedb-dreaming-0.3.12.tgz -C /tmp
cp -r /tmp/package/* ~/.openclaw/plugins/memory-lancedb-dreaming/
cd ~/.openclaw/plugins/memory-lancedb-dreaming && npm install --omit=dev
```

> **禁止** 安装到 `~/.openclaw/workspace/`。该路径会导致 `plugins.load.paths` 校验失败、gateway 无法启动。

在 `openclaw.json` 中配置。**必须同时配置以下两项 entry 级字段**（不是 `config` 内字段）：

| 字段 | 何时必须 | 缺少时的后果 |
|---|---|---|
| `hooks.allowConversationAccess: true` | 始终（启用 dreaming 时） | cron 不执行 pipeline，agent 空转 ~120s |
| `subagent.allowModelOverride: true` | 配置了 `rem.model` 或 `narrative.model` 时 | LLM 模型覆盖被拦截，REM 退化为 category 标签 |

```json
{
  "plugins": {
    "load": {
      "paths": [
        "/root/.openclaw/plugins/memory-lancedb-dreaming"
      ]
    },
    "allow": ["memory-lancedb-dreaming"],
    "entries": {
      "memory-lancedb-dreaming": {
        "enabled": true,
        "hooks": {
          "allowConversationAccess": true
        },
        "subagent": {
          "allowModelOverride": true
        },
        "config": {
          "enabled": true,
          "cron": "0 3 * * *",
          "timezone": "Asia/Shanghai",
          "autoManageCron": true,
          "light": { "enabled": true, "lookbackDays": 2, "limit": 100 },
          "rem": {
            "enabled": true,
            "lookbackDays": 7,
            "limit": 10,
            "minPatternStrength": 0.45,
            "model": "your-model-id"
          },
          "deep": {
            "enabled": true,
            "maxPromotions": 5,
            "minScore": 0.7,
            "minRecallCount": 3,
            "maxAgeDays": 30
          },
          "narrative": {
            "enabled": true,
            "languages": ["zh", "en"]
          },
          "dailyReport": {
            "enabled": true,
            "cron": "0 4 * * *",
            "languages": ["zh"],
            "delivery": {
              "channel": "feishu",
              "to": "your-open-id",
              "mode": "announce"
            }
          }
        }
      }
    }
  }
}
```

修改 `hooks`、`subagent` 或 `load.paths` 后必须 **完整重启 gateway**。

> ⚠️ **禁止依赖 config hot reload**：热加载后日志可能仍显示 `cronHook=ready`，但 hook **不会**重新注册。请执行 `openclaw gateway stop` → `openclaw gateway run`。

若曾安装到 workspace 路径，需同时清理三处残留：

```bash
grep -r "workspace/memory-lancedb-dreaming" ~/.openclaw --include="*.json"
# 清理 openclaw.json、openclaw.json.last-good、plugins/installs.json 中的 stale 路径/记录
```

启动后日志应出现 `cronHook=ready` 和 `modelOverride=ready`（若配置了 rem.model）。若为 `blocked` 或 `CONFIG BLOCKED` ERROR，说明对应 entry 字段未生效。

> 插件启用时会自动清理遗留冲突 cron（如 `dreaming-plugin-healthcheck`），避免与自管理 dreaming cron 冲突。

> `rem.model` 或 `rem.execution.model`：配置后 REM 阶段会按 **category 分组** 调用 LLM 生成中英文主题名；**必须**配合 `subagent.allowModelOverride: true`，否则回退到 category 标签。

> `narrative.model` 未配置时会自动回退到 `rem.model`。叙事语言由 `narrative.languages` 控制（如 `["zh","en"]`）。

> 每次 dreaming 运行时会从 runtime / 磁盘重新读取配置；`dreaming_status` 的 `effectiveConfig`、`hooks.llmModelOverrideReady`、`lastRun.lastRunAt`、`dailyReport` 可核对实际生效值。

### LanceDB 配置来源（v0.2.4+）

Dreaming 从 **当前 memory 插槽** 读取 LanceDB 的 `dbPath` / `embedding`：

1. `plugins.slots.memory` 指向的 entry（例如 `memory-lancedb-pro`）
2. 若 slot 未设或该 entry 无 config，再回退 `memory-lancedb-pro` → `memory-lancedb` → `lancedb-pro`

启动日志应出现：`cached LanceDB config (plugin=memory-lancedb-pro, dbPath=...)`。  
`dreaming_status` 会返回 `lancedbPluginId` 与 `lancedb`；若 pipeline 失败而日报仍在发，先查这两项。

## 梦境日报（v0.2.3+）

`dailyReport` **默认开启**（`enabled: true`）。目标：**每天自动看到昨晚梦境做了什么**——文件 + 可选 IM 推送。

### 做了什么

每次 dreaming（`phase=all`）或日报 cron 触发后，插件会：

1. 写入结构化快照 `memory/.dreams/lancedb-dreaming-daily-snapshot.json`
2. 汇总 Light / REM / Deep + `DREAMS.md` 叙事，写入 `memory/YYYY-MM-DD.md`（`## 梦境日报`）
3. 归档 `memory/dreaming/daily/YYYY-MM-DD.md`
4. 若配置了 `dailyReport.delivery` → 用 **`sendDurableMessageBatch`** 推到 `channel` + `to`（**零 LLM**）

### 两条托管 cron（`autoManageCron: true`）

| Cron | 默认时间 | 作用 |
|------|----------|------|
| LanceDB Memory Dreaming | `0 3 * * *` | 跑 Light/REM/Deep + 写快照/文件；**不直接推送 IM**（v0.2.6+） |
| Dreaming Daily Report | `0 4 * * *` | 刷新日报文件 + **负责唯一 IM 推送**；与主 cron 冲突时自动错开 30 分钟 |

两条均为 `isolated` + `agentTurn`，避免污染 main session 的前缀缓存。Cron 本身不配置 `delivery`；推送由插件在触发处理内完成。

### 推送配置示例（飞书）

```json
"dailyReport": {
  "enabled": true,
  "cron": "0 4 * * *",
  "languages": ["zh"],
  "delivery": {
    "channel": "feishu",
    "to": "ou_xxxxxxxx",
    "mode": "announce"
  }
}
```

- `channel` / `to`：与你在 OpenClaw 里用的通道一致（飞书填 `open_id`）。
- 成功时 gateway 日志：`daily report delivered via feishu to ...`
- v0.2.2 及以前可能静默失败，请升级到 **0.2.3+**。

### 关闭方式

```json
"dailyReport": { "enabled": false }
```

仅写文件、不推送：**不要写** `delivery`（保留 `enabled: true` 即可）。

## 输出文件

- `DREAMS.md` — 梦境叙事日记（叙事散文 + 结构化反思概览）
- `memory/dreaming/light/YYYY-MM-DD.md` — Light 阶段原始观测
- `memory/dreaming/rem/YYYY-MM-DD.md` — REM 阶段主题模式
- `memory/dreaming/deep/YYYY-MM-DD.md` — Deep 阶段提升记录
- `memory/YYYY-MM-DD.md` — 当日 memory 日记（含 **梦境日报** 区块）
- `memory/dreaming/daily/YYYY-MM-DD.md` — 日报归档副本
- `memory/.dreams/lancedb-dreaming-daily-snapshot.json` — 结构化快照（供日报/cron 读取）

## OpenClaw 测试流程

在 Ubuntu / OpenClaw 2026.7.1 上按顺序执行：

### 0. 前置检查

```bash
openclaw --version
node --version
ls ~/.openclaw/plugins/memory-lancedb-dreaming/dist/index.js
grep -r "workspace/memory-lancedb-dreaming" ~/.openclaw --include="*.json" || echo "no stale workspace path"
```

### 1. 安装 v0.3.12 并重启 gateway

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.3.12.tgz
openclaw gateway stop 2>/dev/null || true
openclaw gateway run
```

确认日志：

```bash
grep "memory-lancedb-dreaming" ~/.openclaw/logs/* 2>/dev/null | tail -5
# 期望: registered ... cronHook=ready ... modelOverride=ready
```

### 2. dreaming_status / dreaming_doctor 自检

| 字段 / 工具 | 期望 |
|---|---|
| `hooks.cronTriggerReady` | `true` |
| `hooks.llmModelOverrideReady` | `true`（若配置了 rem.model） |
| `dreaming_doctor` | hooks、LanceDB 插槽、cron、无路径错误 |
| `memoryCount` | > 0 |

### 3. 手动 trigger

调用 `dreaming_trigger`，`phase=all`。期望产出 light/rem/deep 文件及 DREAMS.md 更新。

### 4. cron 触发

```bash
openclaw cron list
openclaw cron run <dreaming-job-id>
```

期望数秒内完成，日志含 `dreaming trigger received` 与 `dreaming phases completed`。

### 5. 验收清单

| # | 测试项 | 通过标准 |
|---|---|---|
| 1 | 插件注册 | `cronHook=ready`, `modelOverride=ready` |
| 2 | dreaming_status | `hooks.cronTriggerReady=true` |
| 3 | dreaming_trigger | 产出 light/rem/deep 文件 |
| 4 | REM 语义主题 | rem 文件含 LLM 主题名 |
| 5 | 中文叙事 | DREAMS.md 含 zh + en |
| 6 | cron 触发 | trigger received + phases completed |
| 7 | 冲突 cron 清理 | 无 `dreaming-plugin-healthcheck` |
| 8 | dreaming_doctor | 无 blocking 项 |
| 9 | 梦境日报文件 | `memory/YYYY-MM-DD.md` 含 `## 梦境日报` |
| 10 | 日报 cron | `openclaw cron list` 含 `Dreaming Daily Report` |
| 11 | 通道推送 | 日志 `daily report delivered via ...` + IM 收到正文 |

## 自定义

```json
"deep": { "maxPromotions": 3, "minScore": 0.8 },
"narrative": { "languages": ["zh"] }
```

## 开发

```bash
npm run build
npm test
npm pack
```

## Credits

- **Project Owner & Tester**: airbing11
- **Developer**: Cursor IDE (AI-assisted development)
- **QA & Documentation**: 小泡 (AI assistant)

## 许可证

MIT © 2026 airbing11

## 版本与变更

- 当前版本：**0.3.12**（补充 cron `delivery:none`，修复多通道完成投递误报）
- 页面版式基线：**0.2.7**（README 英文在前 + `## 中文说明`）
- 变更记录：[CHANGELOG.md](./CHANGELOG.md)
- 验收报告：[docs/v0.2.8-OPENCLAW-TEST-STEPS.md](./docs/v0.2.8-OPENCLAW-TEST-STEPS.md)

## 发布渠道

- [ClawHub](https://clawhub.ai/plugins/memory-lancedb-dreaming)
- [GitHub Releases](https://github.com/airbing11/memory-lancedb-dreaming/releases)
- LanceDB Discussions
