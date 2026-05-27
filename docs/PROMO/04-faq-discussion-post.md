# 04 — FAQ Discussion 帖（本仓库）

**Repo：** airbing11/memory-lancedb-dreaming  
**Category：** Q&A  
**Title：** `[FAQ] 安装踩坑：120s 空转、fact/other 标签、gateway 起不来`  
**Pin：** Optional（若已有安装指南 Pin，本篇不 Pin）

**Body（直接粘贴）：**

---

## 原生 dreaming 为什么在 LanceDB 下“用不了”？

不是配置写错那么简单：**OpenClaw 同时只启用一个 memory 后端**，而 **dreaming 集成在 memory-core 下面**。插槽是 **memory-lancedb** / **lancedb-pro** 时，日常记忆在 LanceDB，但 core dreaming **不会**对你的向量跑完整管线。

**memory-lancedb-dreaming** 的作用：继续用 LanceDB，同时用插件补回 Light / REM / Deep + 叙事。下面 4 个坑是**装上插件之后**仍常见的配置问题。

---

## 最常见 4 个坑

| # | 症状 | 根因 | 修复 |
|---|------|------|------|
| 1 | cron 跑 ~120s，无 light/rem/deep 文件 | 缺少 `hooks.allowConversationAccess: true` | 加到 **plugin entry**，完整重启 gateway |
| 2 | REM 只有 `fact/other` 标签，无 LLM 主题名 | 缺少 `subagent.allowModelOverride: true` | 同上 + 确认配置了 `rem.model` |
| 3 | gateway 启动报 `plugin path not found` (workspace) | 装到了 `~/.openclaw/workspace/` | 改到 `~/.openclaw/plugins/`，清理 json + last-good |
| 4 | 改了 hooks 仍不生效 | 只用了 config hot reload | `gateway stop` → `gateway run` |

---

## 正确配置片段（entry 级）

```json
"memory-lancedb-dreaming": {
  "enabled": true,
  "hooks": { "allowConversationAccess": true },
  "subagent": { "allowModelOverride": true },
  "config": {
    "enabled": true,
    "autoManageCron": true,
    "rem": { "model": "deepseek/deepseek-v4-flash" },
    "narrative": { "languages": ["zh", "en"] }
  }
}
```

---

## 如何确认已修好

调用 **`dreaming_status`**，期望：

```json
{
  "version": "0.1.12",
  "hooks": {
    "cronTriggerReady": true,
    "llmModelOverrideReady": true
  }
}
```

Gateway 日志：

```
registered ... cronHook=ready, modelOverride=ready
```

手动跑一轮 **`dreaming_trigger`** `phase=all`，检查 workspace 下 `memory/dreaming/` 与 `DREAMS.md`。

---

## 安装命令

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.1.12.tgz
```

---

## 仍不行？

请开 Issue 并附上：

1. `openclaw --version`
2. `dreaming_status` 完整 JSON（可脱敏路径）
3. gateway 日志里含 `memory-lancedb-dreaming` 的最后 10 行

---

**相关：** [5 分钟安装指南](链接到置顶帖) · [ClawHub](https://clawhub.ai/packages/memory-lancedb-dreaming)

---
