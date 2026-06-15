# memory-lancedb-dreaming

Light/REM/Deep memory consolidation for OpenClaw agents using LanceDB / `memory-lancedb-pro`.

OpenClaw currently has one active memory slot. The built-in dreaming pipeline is tied to `memory-core`, so agents that use LanceDB for vector memory can lose meaningful Light → REM → Deep consolidation. This plugin keeps LanceDB as the storage backend and runs dreaming as an external OpenClaw plugin.

**v0.2.6** fixes duplicate daily report pushes, adds `pushOn: "changed"` delivery dedupe, auto-staggers colliding report cron schedules, and rotates REM Lasting Truths / cluster exemplars across days.

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

## Why This Plugin

The plugin resolves a practical OpenClaw trade-off:

| Area | Native dreaming (`memory-core`) | This plugin (LanceDB slot) |
|---|---|---|
| Uses the active LanceDB memory slot | No | Yes |
| Full Light / REM / Deep on LanceDB vectors | No | Yes |
| LLM-named REM themes | Limited | Yes |
| Bilingual narrative diary | No | Yes |
| Daily report + channel push | No | Yes |
| Duplicate push prevention | No | Yes |
| REM truth / exemplar rotation | No | Yes |

You do not have to switch back to `memory-core` just to keep dreaming.

---

## 中文说明

让 LanceDB 的记忆真正会做梦。这个插件为使用 LanceDB / `memory-lancedb-pro` 的 OpenClaw 智能体恢复 Light → REM → Deep 梦境巩固能力：REM 主题命名、Deep 记忆提升、中英双语 `DREAMS.md`，以及可选飞书 / 企微日报推送。

**v0.2.6** 已修复日报双推、IM 相似内容重复推送，并增加 REM Lasting Truths 与聚类 exemplar 的跨天轮换。

### 每天你会看到什么

配置 `dailyReport.delivery` 后，无需打开文件即可在 IM 里收到当日摘要（零 LLM，插件拼接）。本地仍会写入 `DREAMS.md`、`memory/YYYY-MM-DD.md`、`memory/dreaming/daily/` 与各阶段报告，便于归档与检索。

如果不想推送、只要文件：保持 `dailyReport.enabled: true`，省略 `delivery` 即可。完全关闭日报：`dailyReport.enabled: false`。

## 安装

> OpenClaw 2026.5.20：`openclaw plugin install` **仍不可用**（`Unknown command: openclaw plugin`）。请用手动安装。
>
> 推荐生产版本：**OpenClaw 2026.5.20**。2026.5.22 存在 event loop 回归（#86201/#86194），可能导致 3–8s 响应延迟。

### 方式 A：安装脚本（推荐）

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.2.6.tgz
```

### 方式 B：手动解压

```bash
mkdir -p ~/.openclaw/plugins/memory-lancedb-dreaming
tar -xzf memory-lancedb-dreaming-0.2.6.tgz -C /tmp
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

> OpenClaw 2026.5.20 可能自动将插件加入 `plugins.allow`；显式配置 `allow` 可确保万无一失。

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
| LanceDB Memory Dreaming | `0 3 * * *` | 跑 Light/REM/Deep + 写快照/文件；不直接推送 IM |
| Dreaming Daily Report | `0 4 * * *` | 刷新日报文件 + 负责唯一 IM 推送；若与主 cron 冲突会自动错开 30 分钟 |

两条均为 `main` + `systemEvent`（零 LLM 触发）。OpenClaw **不允许** 在 main cron 上挂 `delivery`，因此推送在插件 `before_agent_reply` 内完成，不依赖 cron.delivery。

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

- `channel` / `to`：与你在 OpenClaw 里用的通道一致（飞书填 `open_id`，企微/其他通道填对应目标 ID）。
- 成功时 gateway 日志：`daily report delivered via feishu to ...`
- 失败时会有 **warn/error**，便于排查（v0.2.2 及以前可能静默失败，请升级到 **0.2.3**）。

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

在 Ubuntu / OpenClaw 2026.5.20 上按顺序执行：

### 0. 前置检查

```bash
openclaw --version
node --version
ls ~/.openclaw/plugins/memory-lancedb-dreaming/dist/index.js
grep -r "workspace/memory-lancedb-dreaming" ~/.openclaw --include="*.json" || echo "no stale workspace path"
```

### 1. 安装 v0.2.6 并重启 gateway

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.2.6.tgz
openclaw gateway stop 2>/dev/null || true
openclaw gateway run
```

确认日志：

```bash
grep "memory-lancedb-dreaming" ~/.openclaw/logs/* 2>/dev/null | tail -5
# 期望: registered ... cronHook=ready ... modelOverride=ready
# 禁止: cronHook=blocked 或 CONFIG BLOCKED
```

### 2. dreaming_status 自检

| 字段 | 期望 |
|---|---|
| `hooks.cronTriggerReady` | `true` |
| `hooks.llmModelOverrideReady` | `true`（若配置了 rem.model） |
| `lastRun.lastRunAt` | 触发后有 ISO 时间戳 |
| `effectiveConfig.remModel` | 你的 model id |
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
| 9 | 梦境日报文件 | `memory/YYYY-MM-DD.md` 含 `## 梦境日报` |
| 10 | 日报 cron | `openclaw cron list` 含 `Dreaming Daily Report` |
| 11 | 通道推送（v0.2.3） | 日志 `daily report delivered via ...` + IM 收到正文 |

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

- 当前推荐版本：**0.2.6**（日报推送去重 + REM 内容轮换；0.2.4 插槽兼容已保留）
- 变更记录：[CHANGELOG.md](./CHANGELOG.md)
- 验收报告：[docs/v0.2.6-ACCEPTANCE-REPORT.md](./docs/v0.2.6-ACCEPTANCE-REPORT.md)
- 发布步骤：[docs/RELEASE-0.2.4.md](./docs/RELEASE-0.2.4.md)（旧版流程参考）

## 发布渠道

- [ClawHub](https://clawhub.ai/packages/memory-lancedb-dreaming)
- [GitHub Releases](https://github.com/airbing11/memory-lancedb-dreaming/releases)
- LanceDB Discussions
