# memory-lancedb-dreaming

让 LanceDB 的记忆真正会做梦。

> **English:** OpenClaw has **one memory slot**; built-in **dreaming** runs under **memory-core**, not LanceDB vectors. This plugin keeps **memory-lancedb** / **lancedb-pro** as your store and restores the full Light → REM → Deep pipeline (LLM themes, promotion, bilingual `DREAMS.md`).

## 为什么需要这个插件

OpenClaw **同一时间只启用一个 memory 插槽**（`memory-core` 或 `memory-lancedb` / `lancedb-pro` 等，二选一）。内置 **dreaming**（Light / REM / Deep、叙事日记、记忆晋升）实现并运行在 **memory-core** 下面——它读写的是 core 侧记忆，**不是你的 LanceDB 向量表**。

因此当你把插槽换成 LanceDB 后：

| 方面 | 情况 |
|------|------|
| 日常检索 / 写入 | ✅ 走 LanceDB 向量库 |
| 原生 dreaming 对 LanceDB 数据跑完整管线 | ❌ 架构上接不上 |
| 偶发输出 | 常退化为 `fact` / `other` 标签，缺少主题反思与 `DREAMS.md` |

**memory-lancedb-dreaming** 解决的就是这个矛盾：**继续用 LanceDB 存向量记忆**，同时**补回（并增强）整套 dreaming**——独立 Light → REM → Deep、REM 可选 LLM 双语主题名、可配置晋升阈值、托管 cron、中英 `DREAMS.md`。

不必为了 dreaming 再切回 memory-core。

## 能力对比

| 能力 | OpenClaw 原生 dreaming（memory-core 插槽） | memory-lancedb-dreaming（LanceDB 插槽） |
|---|---|---|
| 与当前 memory 插槽一致 | 仅当插槽为 memory-core | ✅ 插槽为 memory-lancedb / lancedb-pro |
| 对 LanceDB 向量跑完整管线 | ❌（单插槽 + dreaming 在 core 下） | ✅ |
| 语义化主题命名 | ❌ | ✅（REM 可选 LLM 命名） |
| 多语种叙事输出（中/英） | ❌ | ✅ |
| 多级提升链 | Light→REM→Deep 简化版 | Light(近期观测)→REM(category 分布分析)→Deep(提升决策) |
| 结构化反思表 | ❌ | ✅ 主题+置信度+证据链 |
| 提升阈值自定义 | ❌ | ✅ 可配置 maxPromotions/minScore 等 |
| lookback 时间窗 | 部分支持 | ✅ Light/REM 按 recall 信号过滤 |
| 独立输出文件 | 写回 memory 日记 | DREAMS.md + light/rem/deep 各阶段独立文件 + **梦境日报** |
| 日报汇总 / 可选推送 | ❌ | ✅ 默认开启（`dailyReport`，可关闭） |

## 安装

> OpenClaw 2026.5.20：`openclaw plugin install` **仍不可用**（`Unknown command: openclaw plugin`）。请用手动安装。
>
> 推荐生产版本：**OpenClaw 2026.5.20**。2026.5.22 存在 event loop 回归（#86201/#86194），可能导致 3–8s 响应延迟。

### 方式 A：安装脚本（推荐）

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.2.3.tgz
```

### 方式 B：手动解压

```bash
mkdir -p ~/.openclaw/plugins/memory-lancedb-dreaming
tar -xzf memory-lancedb-dreaming-0.2.3.tgz -C /tmp
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

## 梦境日报（v0.2.0+）

`dailyReport` **默认开启**。每次 `phase=all` 跑完后会：

1. 写入结构化快照 `memory/.dreams/lancedb-dreaming-daily-snapshot.json`
2. 汇总三阶段 + `DREAMS.md` 叙事，写入 `memory/YYYY-MM-DD.md`（`## 梦境日报` 区块）
3. 归档副本 `memory/dreaming/daily/YYYY-MM-DD.md`

**不调用 LLM**——只读取已有文件 / pipeline 结果拼接。

默认另有一条 **4:00** managed cron（可在配置里改时间）。若配置了 `dailyReport.delivery`：

- **3:00 dreaming 跑完**（`phase=all`）后，插件通过 **channel outbound API** 立即推送到指定 channel（零 LLM）
- **4:00** 日报 cron 触发后同样推送（刷新文件后再发）

> OpenClaw 不允许 `sessionTarget=main` 的 cron 带 `delivery` 字段（仅 isolated 支持，但 isolated 又不支持 systemEvent）。因此推送由插件在 handler 内完成，cron 只负责触发。

关闭日报：

```json
"dailyReport": { "enabled": false }
```

仅写文件、不推送：省略 `delivery` 即可（默认行为）。

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

### 1. 安装 v0.2.3 并重启 gateway

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.2.3.tgz
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
| 9 | 梦境日报 | `memory/YYYY-MM-DD.md` 含三阶段概要 + 叙事 |
| 10 | 日报 cron | `openclaw cron list` 含 `Dreaming Daily Report` |

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

## 发布渠道

- [ClawHub](https://clawhub.ai/packages/memory-lancedb-dreaming)
- [GitHub Releases](https://github.com/airbing11/memory-lancedb-dreaming/releases)
- LanceDB Discussions
