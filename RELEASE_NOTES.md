# memory-lancedb-dreaming v0.3.13 — 发布说明

> **日期：** 2026-08-04
> **安装包：** `memory-lancedb-dreaming-0.3.13.tgz`

---

## 核心功能

Dreaming 插件：Light → REM → Deep 三阶段梦境循环 + 叙事日记 + 日报推送。

- **Light：** 扫描短期记忆，标记热度变化
- **REM：** 主题聚类，发现跨日模式，提炼 lasting truth
- **Deep：** 从 LanceDB 选出高分记忆 promoted 到 `MEMORY.md`
- **Narrative：** 每日梦境的自然语言叙事
- **Daily Report：** 零 LLM 的日报摘要 + 可选 IM 推送（飞书/企微等）

## v0.3.13 本次修复

- 日报推送 API：`openclaw/plugin-sdk/channel-message-runtime` → `openclaw/plugin-sdk/channel-outbound`
- 移除 `openclaw.plugin.json` 顶层 `uiHints`（ClawHub Plugin Inspector 对 2026.7.2-beta.7 会误报 `manifest-unknown-fields`）
- 关键 help 并入 `configSchema` descriptions
- 本地 `clawhub package validate . --openclaw-version 2026.7.2-beta.7`：**0 error / 0 warning**

## 升级

```bash
openclaw plugins install clawhub:memory-lancedb-dreaming@0.3.13
# 或离线
bash scripts/install.sh memory-lancedb-dreaming-0.3.13.tgz
openclaw gateway restart
```

确认 `dreaming_status.version=0.3.13`，再跑 `dreaming_doctor`。

---

## v0.3.12 回顾（仍有效）

- 托管 cron：`isolated + agentTurn + delivery:none`
- 多通道下不再因 cron 完成 announce 报 `Channel is required...`
- 不影响插件自己的 `dailyReport.delivery` 飞书/企微推送
