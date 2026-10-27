# memory-lancedb-dreaming v0.3.20

> **Date:** 2026-10-27
> **Package:** `memory-lancedb-dreaming-0.3.20.tgz`

## Security

- Redact LanceDB `storageOptions`, remote URI credentials, query parameters, and raw database errors from agent-visible status, doctor, and trigger results; scrub known credential values from related Gateway errors.
- Manage, update, deduplicate, or remove cron jobs only when their payload carries the plugin's dedicated trigger token.
- Never infer cron ownership from user-controlled names or descriptions, including `dreaming-plugin-healthcheck` and managed-tag text.

## Verification

- `npm test`: 78 tests passed.
- Credential regression covers storage keys/values plus URI username, password, query, and fragment removal.
- Cron regression covers enabled and disabled reconciliation, renamed legacy token jobs, and name/tag-only user jobs.

## Upgrade

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.3.20.tgz
openclaw gateway restart
```

No cron migration or manual recreation is required. Review the configured LLM and
`dailyReport.delivery` recipient before sending memory-derived content externally.
