# memory-lancedb-dreaming v0.3.19

> **Date:** 2026-10-26
> **Package:** `memory-lancedb-dreaming-0.3.19.tgz`

## Fixed

- Prevent the daily-report managed tag from also matching the broader dreaming tag.
- Stop the 60-second reconciler from deleting and recreating the daily-report cron.
- Preserve both managed cron IDs, run history, and last-run state across reconcile ticks.
- Add a stateful five-tick regression test covering a clean installation.
- Remove the obsolete `contracts.tools` manifest declaration for current ClawHub compatibility.

## Verification

- `npm test`: 77 tests passed.
- Repeated reconcile from an empty cron store creates exactly two jobs.
- Five subsequent ticks perform no updates or removals and retain the original IDs.

## Upgrade

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.3.19.tgz
openclaw gateway restart
```

No cron migration or manual recreation is required.
