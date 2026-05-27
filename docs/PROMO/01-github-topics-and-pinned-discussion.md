# 01 — GitHub Topics + 置顶 Discussion

## A. Repository Topics（About 里添加）

```
openclaw
lancedb
vector-memory
ai-agent
dreaming
memory-consolidation
openclaw-plugin
```

---

## B. README 顶部 Badges（可选 PR 或 Web 编辑）

```markdown
[![ClawHub](https://img.shields.io/badge/ClawHub-memory--lancedb--dreaming-blue)](https://clawhub.ai/packages/memory-lancedb-dreaming)
[![Release](https://img.shields.io/github/v/release/airbing11/memory-lancedb-dreaming)](https://github.com/airbing11/memory-lancedb-dreaming/releases/latest)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-%3E%3D2026.5.18-green)](https://github.com/openclaw/openclaw)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
```

---

## C. 置顶 Discussion 帖

**Category：** Announcements（或 General）  
**Title：** `[Guide] 5 分钟装好 LanceDB dreaming（OpenClaw 2026.5.20）`  
**Pin：** Yes

**Body（直接粘贴）：**

---

### 为什么需要这个插件？

OpenClaw **同一时间只启用一个 memory 插槽**。内置 **dreaming**（Light / REM / Deep、叙事、晋升）挂在 **memory-core** 下面——它读写的是 core 记忆，**不是** LanceDB 向量库里的条目。

因此当你把插槽换成 **memory-lancedb** / **lancedb-pro** 时：

- 向量记忆在 LanceDB ✅  
- 原生 dreaming **无法**对你的 LanceDB 数据跑完整管线 ❌  
- 偶发输出也常只剩 `fact` / `other` 标签，缺少主题反思与 `DREAMS.md` 叙事 ❌  

**memory-lancedb-dreaming** 解决的就是这个矛盾：**继续用 LanceDB 存记忆**，同时**补回（并增强）整套 dreaming**——独立 Light → REM → Deep、LLM 双语主题、可配置晋升、托管 cron（v0.1.12 已发布）。

---

### 安装（约 2 分钟）

```bash
# 下载 release tarball 后：
bash scripts/install.sh memory-lancedb-dreaming-0.1.12.tgz
```

然后在 `~/.openclaw/openclaw.json` 的 **plugin entry**（不是 config 里）配置：

```json
"memory-lancedb-dreaming": {
  "enabled": true,
  "hooks": { "allowConversationAccess": true },
  "subagent": { "allowModelOverride": true },
  "config": {
    "enabled": true,
    "autoManageCron": true,
    "rem": { "model": "your-provider/your-model" },
    "narrative": { "languages": ["zh", "en"] }
  }
}
```

`plugins.load.paths` 指向：

```
~/.openclaw/plugins/memory-lancedb-dreaming
```

**禁止**安装到 `~/.openclaw/workspace/`。

---

### 重启 Gateway（必须）

```bash
openclaw gateway stop
openclaw gateway run
```

日志应出现：

```
registered ... cronHook=ready, modelOverride=ready
```

> config hot reload **不能**代替重启（hook 不会重新注册）。

---

### 自检

1. 调用 tool **`dreaming_status`** → `hooks.cronTriggerReady: true`
2. 调用 **`dreaming_trigger`** `phase=all`
3. 检查 workspace：`memory/dreaming/light|rem|deep/`、`DREAMS.md`

冒烟脚本（可选）：

```bash
bash scripts/verify-smoke.sh memory-lancedb-dreaming-0.1.12.tgz
```

---

### 链接

- ClawHub: https://clawhub.ai/packages/memory-lancedb-dreaming
- Release v0.1.12: https://github.com/airbing11/memory-lancedb-dreaming/releases/tag/v0.1.12
- LanceDB 讨论: https://github.com/lancedb/lancedb/discussions/3441

有问题请开 Issue 并附上 `dreaming_status` JSON（可脱敏）。

---
