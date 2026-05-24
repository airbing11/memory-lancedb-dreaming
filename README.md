# memory-lancedb-dreaming

让 OpenClaw 的记忆会做梦。

## 为什么需要这个插件？

OpenClaw 自带的 dreaming 功能在切换向量存储（lancedb-pro / lancedb）后无法正常工作。
即使能跑，输出也只是 entity 级别的聚类标签，几乎没有可用的结论。

本插件专为 memory-lancedb(-pro) 打造，恢复并增强了 dreaming 能力。

## 能力对比

| 能力 | OpenClaw 原生 dreaming | memory-lancedb-dreaming |
|---|---|---|
| lancedb 兼容 | ❌ | ✅ |
| 语义化主题命名 | ❌ | ✅（REM 可选 LLM 命名） |
| 多语种叙事输出（中/英） | ❌ | ✅ |
| 多级提升链 | Light→REM→Deep 简化版 | Light(近期观测)→REM(category 分布分析)→Deep(提升决策) |
| 结构化反思表 | ❌ | ✅ 主题+置信度+证据链 |
| 提升阈值自定义 | ❌ | ✅ 可配置 maxPromotions/minScore 等 |
| lookback 时间窗 | 部分支持 | ✅ Light/REM 按 recall 信号过滤 |
| 独立输出文件 | 写回 memory 日记 | DREAMS.md + light/rem/deep 各阶段独立文件 |

## 安装

OpenClaw 2026.5.20 若 `openclaw plugin install` 不可用，请用手动方式：

```bash
# 方式 A：从 tarball 解压安装（推荐测试）
mkdir -p ~/.openclaw/plugins/memory-lancedb-dreaming
tar -xzf memory-lancedb-dreaming-0.1.9.tgz -C /tmp
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

启动后日志应出现 `cronHook=ready` 和 `modelOverride=ready`（若配置了 rem.model）。若为 `blocked` 或 ERROR，说明对应 entry 字段未生效。

> OpenClaw 2026.5.20 可能自动将插件加入 `plugins.allow`；显式配置 `allow` 可确保万无一失。

> `rem.model` 或 `rem.execution.model`：配置后 REM 阶段会按 **category 分组** 调用 LLM 生成中英文主题名；**必须**配合 `subagent.allowModelOverride: true`，否则回退到 category 标签。

> `narrative.model` 未配置时会自动回退到 `rem.model`。叙事语言由 `narrative.languages` 控制（如 `["zh","en"]`）。

> 每次 dreaming 运行时会从 runtime / 磁盘重新读取配置；`dreaming_status` 的 `effectiveConfig` 与 `hooks.llmModelOverrideReady` 可核对实际生效值。

## 输出文件

- `DREAMS.md` — 梦境叙事日记（叙事散文 + 结构化反思概览）
- `memory/dreaming/light/YYYY-MM-DD.md` — Light 阶段原始观测
- `memory/dreaming/rem/YYYY-MM-DD.md` — REM 阶段主题模式
- `memory/dreaming/deep/YYYY-MM-DD.md` — Deep 阶段提升记录
- `memory/dreaming/YYYY-MM-DD-consolidation.md` — 完整报告

## OpenClaw 测试流程

在 Ubuntu / OpenClaw 2026.5.20 上按顺序执行：

### 0. 前置检查

```bash
openclaw --version
node --version
ls ~/.openclaw/plugins/memory-lancedb-dreaming/dist/index.js
grep -r "workspace/memory-lancedb-dreaming" ~/.openclaw --include="*.json" || echo "no stale workspace path"
```

### 1. 安装 v0.1.9 并重启 gateway

```bash
# 解压安装（见上方安装节）
openclaw gateway stop 2>/dev/null || true
openclaw gateway run   # 或 systemd / 你的启动方式
```

确认日志：

```bash
grep "memory-lancedb-dreaming" ~/.openclaw/logs/* 2>/dev/null | tail -5
# 期望: registered ... cronHook=ready ... modelOverride=ready
# 禁止: cronHook=blocked 或 allowConversationAccess DISABLED
```

### 2. dreaming_status 自检

在 agent 会话中调用 `dreaming_status` tool，或：

```bash
# 若 CLI 支持 tool 调用则用 CLI；否则在 Web UI / agent 里触发
```

检查 JSON 字段：

| 字段 | 期望 |
|---|---|
| `hooks.cronTriggerReady` | `true` |
| `hooks.llmModelOverrideReady` | `true`（若配置了 rem.model） |
| `effectiveConfig.remModel` | 你的 model id |
| `effectiveConfig.narrativeLanguages` | `["zh","en"]` |
| `llm.subagentAvailable` 或 `llm.llmCompleteAvailable` | 至少一个 `true`（REM/叙事需要） |
| `memoryCount` | > 0（否则 REM/Deep 可能无内容） |

### 3. 手动 trigger（不依赖 cron hook 路径）

调用 `dreaming_trigger`，`phase=all`。

期望：

- 返回 `ok: true`
- workspace 下生成 `memory/dreaming/light|rem|deep/` 当日 md
- 若 narrative 启用且 LLM 可用：`DREAMS.md` 有新段落

```bash
WORKSPACE=$(jq -r '.agents.defaults.workspace // empty' ~/.openclaw/openclaw.json)
DATE=$(date +%F)
ls -la "$WORKSPACE/memory/dreaming/light/$DATE.md" 2>/dev/null
ls -la "$WORKSPACE/memory/dreaming/rem/$DATE.md" 2>/dev/null
ls -la "$WORKSPACE/DREAMS.md" 2>/dev/null
grep -E "Theme:|主题" "$WORKSPACE/memory/dreaming/rem/$DATE.md" | head
```

REM 成功标志：主题行含 LLM 生成的中英文名称，而非仅 `fact 1.00 / other 0.94` 分类标签。

### 4. cron 触发测试

```bash
openclaw cron list
# 应看到 memory-lancedb-dreaming 管理的 job，不应再报 plugin not found

openclaw cron run <dreaming-job-id>
```

期望 gateway 日志（约数秒内完成，**不应**再跑满 120s LLM）：

```
memory-lancedb-dreaming: dreaming trigger received, running phases...
memory-lancedb-dreaming: dreaming phases completed (light=..., rem=..., promoted=..., narrative=...)
```

### 5. 互斥锁（可选）

连续两次快速 `dreaming_trigger` 或 `cron run`：第二次应返回 `pipeline busy` / 日志 `pipeline already running`。

### 6. 验收清单

| # | 测试项 | 通过标准 |
|---|---|---|
| 1 | 插件注册 | 日志 `registered`, `cronHook=ready` |
| 2 | dreaming_status | `hooks.cronTriggerReady=true` |
| 3 | dreaming_trigger | 产出 light/rem/deep 文件 |
| 4 | REM 语义主题 | rem 文件含 LLM 主题名 |
| 5 | 中文叙事 | DREAMS.md 含 zh + en 段落 |
| 6 | cron 触发 | 日志 trigger received + phases completed |
| 7 | Deep promotedAt | 仅实际 append 的条目带 promotedAt |
| 8 | 并发互斥 | 第二次 trigger 被 skip |

## 自定义

所有阈值参数和语言设置均可通过 openclaw.json 中的 config 自定义：

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

- Clawhub 主站
- Clawhub 镜像站（skillhub 等）
- GitHub Release + Discussions
