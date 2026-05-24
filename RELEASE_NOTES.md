# v0.1.9 — LanceDB Dreaming Plugin (First Public Release)

## The Problem

OpenClaw's built-in dreaming stops working when you switch to LanceDB vector storage. Even when it limps along, the output is just category labels — `fact`, `other` — barely useful.

## This Plugin Fixes That

It restores the full Light→REM→Deep dreaming pipeline, replaces meaningless category labels with LLM-powered bilingual semantic themes（系统运维排故 / System Maintenance Troubleshooting）, and generates poetic dream diary entries (zh + en) that capture the texture of a day's work.

## Features

- Light / REM / Deep three-phase dreaming pipeline
- LanceDB vector memory integration (lookback filtering, dedupe, scoring)
- REM semantic theme naming via LLM (bilingual zh/en theme labels)
- Narrative dream diary appended to DREAMS.md (configurable languages)
- Deep phase memory promotion to MEMORY.md with configurable thresholds
- Auto-managed cron job + global pipeline mutex
- Tools: `dreaming_status`, `dreaming_trigger`

## Required Configuration

Two entry-level fields are mandatory for full functionality:

| Field | Required when | If missing |
|-------|--------------|------------|
| `hooks.allowConversationAccess: true` | Always | Cron runs but pipeline never executes (~120s agent idle) |
| `subagent.allowModelOverride: true` | When `rem.model` is set | REM falls back to category tags; narrative LLM fails silently |

## Install (manual, OpenClaw 2026.5.20)

```bash
mkdir -p ~/.openclaw/plugins/memory-lancedb-dreaming
tar -xzf memory-lancedb-dreaming-0.1.9.tgz -C /tmp
cp -r /tmp/package/* ~/.openclaw/plugins/memory-lancedb-dreaming/
cd ~/.openclaw/plugins/memory-lancedb-dreaming && npm install --omit=dev
```

Do **not** install under workspace/ — it breaks plugins.load.paths validation. Restart gateway after changing hooks.

## Changelog (0.1.5 → 0.1.9)

- Wire lookbackDays in Light/REM phases
- Fix Deep promotedAt (only mark actually promoted entries)
- Pipeline mutex for concurrent triggers
- Runtime config reload + model alias support
- LLM fallback via runtime.llm.complete
- Startup diagnostics for hook/model-override permissions
- 16 unit tests

## Known Limitations

- REM clustering is category-based + LLM naming; semantic vector clustering planned for v0.2.0
- openclaw plugin install unavailable on 2026.5.20 — manual tarball required
