# 03 — LanceDB Discussion #3441 跟进回复

**Where：** https://github.com/lancedb/lancedb/discussions/3441  
**Action：** New comment（不要编辑原帖）

**Body（直接粘贴）：**

---

Update: **v0.1.12** is now published 🎉

**Context:** OpenClaw has a **single memory slot**. Built-in dreaming lives under **memory-core**, so when your slot is **memory-lancedb** / **lancedb-pro**, native dreaming does not consolidate your LanceDB vectors (outputs often fall back to `fact`/`other` tags).

**memory-lancedb-dreaming** is a community plugin that keeps **LanceDB as your vector store** while running a **full Light / REM / Deep** pipeline (LLM themes, promotion, bilingual `DREAMS.md`).

For anyone on **OpenClaw + LanceDB** who wants that dreaming workflow back:

### What's new in v0.1.12

- **`scripts/install.sh`** — one-command install to `~/.openclaw/plugins/` (since `openclaw plugin install` isn't on 2026.5.20 yet)
- **`scripts/verify-smoke.sh`** — pre-publish tarball check
- **Legacy cron cleanup** — removes conflicting `dreaming-plugin-healthcheck` jobs
- **`dreaming_status.lastRun`** — tracks last pipeline run timestamp

### Production smoke (950+ vectors, bge-m3 @ 1024d)

```
dreaming_trigger phase=all → light=100, rem=200, promoted=5, narrative=true
cronHook=ready, modelOverride=ready
```

### Install pointers

Two **required** plugin entry fields (easy to miss):

```json
"hooks": { "allowConversationAccess": true },
"subagent": { "allowModelOverride": true }
```

Without them: cron runs ~120s with no output, or REM falls back to category tags.

### Links

- **ClawHub:** https://clawhub.ai/packages/memory-lancedb-dreaming
- **GitHub Release v0.1.12:** https://github.com/airbing11/memory-lancedb-dreaming/releases/tag/v0.1.12

Happy to answer install questions here or on the plugin repo. Feedback welcome — especially on REM clustering (vector semantic grouping planned for v0.2.0).

— airbing11

---
