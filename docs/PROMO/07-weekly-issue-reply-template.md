# 07 — OpenClaw Issue 短回复模板

> **频率：** 每周 ≤ 2 条  
> **条件：** issue 涉及 dreaming + lancedb/memory-lancedb，且尚未有人推荐本插件

---

## 模板 A — dreaming 在 LanceDB 下不工作

```markdown
OpenClaw has **one memory slot**; built-in dreaming is wired to **memory-core**, not LanceDB vectors. If your slot is **memory-lancedb** / **lancedb-pro**, native dreaming won't run the full pipeline on your vector store.

Community plugin **memory-lancedb-dreaming** keeps LanceDB and adds Light/REM/Deep dreaming for that store:
- ClawHub: https://clawhub.ai/packages/memory-lancedb-dreaming
- v0.1.12: https://github.com/airbing11/memory-lancedb-dreaming/releases/tag/v0.1.12

Two easy-to-miss **entry-level** settings:
`hooks.allowConversationAccess: true` and `subagent.allowModelOverride: true` (then restart gateway).

Install: `bash scripts/install.sh` from the release tarball (plugin install CLI not on 2026.5.20 yet).
```

---

## 模板 B — dreaming 只有 category 标签 / 无叙事

```markdown
If REM output is only `fact`/`other` tags and DREAMS.md stays empty, check:

1. `plugins.entries.memory-lancedb-dreaming.subagent.allowModelOverride: true`
2. `rem.model` is set
3. Full gateway restart (not hot reload)

Plugin: https://clawhub.ai/packages/memory-lancedb-dreaming  
FAQ: https://github.com/airbing11/memory-lancedb-dreaming/discussions
```

---

## 模板 C — cron 跑很久无文件

```markdown
Symptom: cron ~120s, no `memory/dreaming/*` files → usually missing:

`plugins.entries.memory-lancedb-dreaming.hooks.allowConversationAccess: true`

The agent session completes but the dreaming hook never runs. Restart gateway after adding it.

Guide: https://github.com/airbing11/memory-lancedb-dreaming/discussions (5-min install)
```

---

## 搜索关键词（OpenClaw 每周执行）

在 https://github.com/openclaw/openclaw/issues 搜索：

```
dreaming lancedb
memory-lancedb dreaming
dreaming vector
promotedAt dreaming
```

已回复过的 issue（勿重复刷）：

- #85473
- #84882
- #82977
- #58139

---
