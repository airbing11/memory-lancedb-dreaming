# v0.1.9 — LanceDB Dreaming Plugin (First Public Release)

## Summary

First public release of `memory-lancedb-dreaming`, an OpenClaw plugin that restores and extends memory dreaming for LanceDB vector stores (memory-lancedb-pro / @openclaw/memory-lancedb).

Validated on **OpenClaw 2026.5.20** (Ubuntu 24.04) with **8/8 integration tests passing**.

## Features

- Light / REM / Deep three-phase dreaming pipeline
- LanceDB vector memory integration (lookback filtering, dedupe, scoring)
- REM semantic theme naming via LLM (bilingual zh/en theme labels)
- Narrative dream diary appended to DREAMS.md (configurable languages)
- Deep phase memory promotion to MEMORY.md with configurable thresholds
- Auto-managed cron job + global pipeline mutex
- Tools: `dreaming_status`, `dreaming_trigger`

### Output files
- `DREAMS.md`
- `memory/dreaming/{light|rem|deep}/YYYY-MM-DD.md`
- `memory/dreaming/YYYY-MM-DD-consolidation.md`

## Required Configuration

Two entry-level fields are mandatory for full functionality:

| Field | Required when | If missing |
|-------|--------------|------------|
| `hooks.allowConversationAccess: true` | Always | Cron runs but pipeline never executes (~120s agent idle) |
| `subagent.allowModelOverride: true` | When `rem.model` is set | REM falls back to category tags; narrative LLM fails silently |

```json
{
  "plugins": {
    "load": { "paths": ["~/.openclaw/plugins/memory-lancedb-dreaming"] },
    "entries": {
      "memory-lancedb-dreaming": {
        "enabled": true,
        "hooks": { "allowConversationAccess": true },
        "subagent": { "allowModelOverride": true },
        "config": {
          "rem": { "model": "deepseek/deepseek-v4-flash" },
          "narrative": { "languages": ["zh", "en"] }
        }
      }
    }
  }
}
```

> **Restart gateway** after changing hooks — config hot reload does not re-register hooks.

## Install (manual, OpenClaw 2026.5.20)

```bash
mkdir -p ~/.openclaw/plugins/memory-lancedb-dreaming
tar -xzf memory-lancedb-dreaming-0.1.9.tgz -C /tmp
cp -r /tmp/package/* ~/.openclaw/plugins/memory-lancedb-dreaming/
cd ~/.openclaw/plugins/memory-lancedb-dreaming && npm install --omit=dev
```

> Do **not** install under `~/.openclaw/workspace/` — it breaks `plugins.load.paths` validation.

## Changelog (0.1.5 → 0.1.9)

- Wire lookbackDays in Light/REM phases
- Fix Deep promotedAt (only mark actually promoted entries)
- Pipeline mutex for concurrent triggers
- Runtime config reload + model alias support (`rem.execution.model`)
- LLM fallback via `runtime.llm.complete`
- Startup diagnostics for hook/model-override permissions
- 16 unit tests

## Known Limitations

- REM clustering is category-based + LLM naming; semantic vector clustering planned for v0.2.0
- `openclaw plugin install` unavailable on 2026.5.20 — manual tarball install required
- Manual install may show `plugin not found (stale config entry)` in cron list — harmless if plugin loads via `load.paths`
