# memory-lancedb-dreaming v0.3.11 — 发布说明

> **日期：** 2026-07-22
> **安装包：** `memory-lancedb-dreaming-0.3.11.tgz`

---

## 核心功能

Dreaming 插件：Light → REM → Deep 三阶段梦境循环 + 叙事日记 + 日报推送。

- **Light：** 扫描短期记忆，标记热度变化
- **REM：** 主题聚类，发现跨日模式，提炼 lasting truth
- **Deep：** 从 LanceDB 选出高分记忆 promoted 到 `MEMORY.md`
- **Narrative：** 每日梦境的自然语言叙事
- **Daily Report：** 零 LLM 的日报摘要 + 可选 IM 推送（飞书/企微等）

---

## v0.3.x 以来的重大变更

### 🔄 Cron Session 隔离（v0.3.1）— 解决 DeepSeek 缓存命中率暴跌

**问题：** Dreaming 的两个 cron 都跑在 `sessionTarget: "main"`。每次运行时会改写 main session 的上下文前缀，导致 DeepSeek V4 Flash 等 prefix-cache 模型的缓存命中率从 ~88% 暴跌至 ~6%。

**修改：** 将 `sessionTarget` 从 `main` 改为 `isolated`，`payload.kind` 从 `systemEvent` 改为 `agentTurn`。

**效果：** 缓存命中率恢复至 88%+，每日节省约 10-15 元 cache miss token 费。

**兼容性：** 升级后首次 reconcile 自动迁移旧 cron，无需手动干预。

### 🎯 反重复机制（v0.3.1~0.3.3）

- **REM lasting truth 去重：** `truthDedupeWindowDays`（默认30天）+ `truthSimilarityThreshold`（默认0.42），避免同一主题反复被提炼
- **cluster spotlight 冷却：** `clusterSpotlightCooldownDays`（默认5天），同一聚类主题在冷却期内不重复 spotlight
- **Narrative 跳过无变化：** 当天无新内容时跳过叙事/日报，不重复旧内容

### 🔍 Deep Idle Novelty（v0.3.1）

`idleNoveltyAfterDays`（默认7天）：连续零 promotion 天后，REM 进入 novelty 模式——更紧的去重阈值，不重复旧 narrative。

### 🩺 Dreaming Doctor（v0.3.1）

`dreaming_doctor` 工具：一键检查 7 项健康指标——hook 权限、LanceDB 配置、cron 冲突、日报投递、Deep idle streak 等。

### 📋 日报交付增强（v0.3.2~0.3.4）

- 新增 `dailyReport.delivery.pushOn`（`always`/`changed`），仅内容变化时推送到 IM，减少噪音
- 飞书推送默认配置

### v0.3.11 稳定性与发布修复

- Dreaming 与 Daily Report 使用同一个运行锁，避免并发改写报告/状态
- Gateway 停止时不再提前清空在途任务锁
- 每次 Dreaming 前刷新 LanceDB slot/path 配置
- Markdown 报告、`MEMORY.md`、`DREAMS.md` 改为原子替换
- 自动清理携带旧 trigger 的重命名 cron
- 修复跨平台测试运行器和 cron migration 测试
- package、manifest、运行时 version、lockfile、README、安装脚本统一为 0.3.11
- `openclaw.extensions` 与 `runtimeExtensions` 均指向已打包的 `dist/index.js`
- OpenClaw 最低安全基线提升到 2026.6.9

---

## ClawHub 0.3.10 调查结论

0.3.10 实际已成功上传，在线 release 可以被精确查询，其 npm integrity
与本地 `npm pack` 完全一致。它没有成为 `latest` 的原因是：

- Static scan：`clean`
- VirusTotal：`clean`
- LLM review：`suspicious`
- 审查摘要指出：插件拥有自动 cron / memory 权限，但兼容元数据允许存在已知漏洞的旧 OpenClaw
- 因此 `latest` 保持在 0.3.9

此前“legacy-zip 与 code-plugin 无法合并”的判断不是 0.3.10 的真实阻塞点；
无需改包名或清理旧 package。

### 0.3.11 发布保证

1. 已使用本地 `.tgz` 完成 OpenClaw 2026.7.1 实机验收
2. 从真实 Git checkout 生成 npm ClawPack
3. GitHub Release 与 ClawHub 绑定同一 `v0.3.11` commit
4. ClawPack 仅含 46 个生产文件
5. 发布前 63/63 单测、生产依赖审计和 Plugin Inspector 全部通过

---

## OpenClaw 实机验收结果

- `dreaming_status.version=0.3.11`
- `dreaming_doctor` 7/7 通过，LanceDB provider 为 `memory-lancedb-pro`
- Dreaming 与 Daily Report 两条 cron 均为 `isolated` + `agentTurn`
- 手动 `phase=all`：Light=100、REM=200、Narrative=true，三阶段完成
- Daily Report `pushOn=changed` 去重正常，飞书私聊实测送达
- Gateway 无插件错误，`consecutiveErrors=0`
