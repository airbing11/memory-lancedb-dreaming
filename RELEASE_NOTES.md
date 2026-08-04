# memory-lancedb-dreaming v0.3.14 — 发布说明

> **日期：** 2026-08-04
> **安装包：** `memory-lancedb-dreaming-0.3.14.tgz`

## 本次修复

- 恢复 ClawHub / manifest 展示名为 **Memory LanceDB Dreaming**
- 0.3.13 发布时误用了 `Dreaming (LanceDB)`

## 升级

```bash
openclaw plugins install clawhub:memory-lancedb-dreaming@0.3.14
openclaw gateway restart
```

确认 `dreaming_status.version=0.3.14`。功能与 0.3.13 相同（`channel-outbound` + 无顶层 `uiHints`）。
