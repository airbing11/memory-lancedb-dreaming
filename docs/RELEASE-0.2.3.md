# 发布 memory-lancedb-dreaming v0.2.3

> **谁来做：** 需要你的 GitHub / npm / ClawHub 登录，**Cursor 不能直接代发**。  
> 推荐：本机或已登录的 OpenClaw 环境（如老王）按本清单执行。

## 发布前检查

- [ ] `npm run build && npm test` 全部通过
- [ ] `bash scripts/verify-smoke.sh memory-lancedb-dreaming-0.2.3.tgz`（可选，Ubuntu + OpenClaw）
- [ ] 生产验收 GO（`v0.2.3-test-report.md`）
- [ ] `package.json` / `openclaw.plugin.json` / `constants.ts` 均为 `0.2.3`

## 1. 打 tarball

```bash
cd memory-lancedb-dreaming
npm run build
npm test
npm pack
# 产出: memory-lancedb-dreaming-0.2.3.tgz
```

## 2. Git 标签 + GitHub Release

```bash
git add -A
git commit -m "release: v0.2.3 daily report + channel push"
git tag v0.2.3
git push origin main
git push origin v0.2.3
```

在 GitHub 创建 Release **v0.2.3**，附上 `memory-lancedb-dreaming-0.2.3.tgz` 作为附件。

**Release 正文（可复制）：**

```markdown
## memory-lancedb-dreaming v0.2.3

梦境日报（零 LLM 文件 + 可选飞书/企微等通道推送）+ 托管 Daily Report cron。

### Highlights
- `dailyReport` 默认开启；`dailyReport.delivery` 配置 `channel` + `to` 即可推送
- 推送经 `sendDurableMessageBatch`（OpenClaw 2026.5.20 验收通过）
- 两条 cron：`main` + `systemEvent`，无 `cron.delivery`

### Install
```bash
bash scripts/install.sh memory-lancedb-dreaming-0.2.3.tgz
# 完整重启 gateway
```

### Requirements
- OpenClaw >= 2026.5.18，`@openclaw/memory-lancedb`
- `hooks.allowConversationAccess: true`（cron 触发）
- 可选推送：`dailyReport.delivery`（如 feishu + open_id）

### Links
- [ClawHub](https://clawhub.ai/packages/memory-lancedb-dreaming)
```

## 3. npm（若你通过 npm 分发）

```bash
npm publish --access public
# 或仅发布 tarball 到私有 registry，按你现有流程
```

## 4. ClawHub

在**已登录 ClawHub** 的机器上（OpenClaw 主机或开发机）：

```bash
cd memory-lancedb-dreaming
npm run build
clawhub package publish <你的-owner>/memory-lancedb-dreaming --dry-run
clawhub package publish <你的-owner>/memory-lancedb-dreaming
```

- 包名 scope 须与 ClawHub owner 一致（见 [Publishing on ClawHub](https://docs.openclaw.ai/clawhub/publishing)）。
- 新 release 可能需 ClawHub 审核后才出现在安装列表。

## 5. 给 OpenClaw（老王）的一行任务

若 gateway 已配置 `clawhub` CLI 且你有发布权限，可对 agent 说：

> 在 `memory-lancedb-dreaming` 仓库目录执行：`npm run build && npm test && npm pack`，然后按 `docs/RELEASE-0.2.3.md` 完成 git tag `v0.2.3`、GitHub Release 附件上传、以及 `clawhub package publish`（先 `--dry-run`）。不要改版本号。

## 分工建议

| 步骤 | Cursor（我） | 你 / OpenClaw |
|------|----------------|---------------|
| 代码 + 测试 + tgz | ✅ 已完成 | 复核 |
| git push / tag | ❌ 无凭证 | ✅ |
| GitHub Release | ❌ | ✅ |
| npm publish | ❌ | ✅（若需要） |
| clawhub publish | ❌ | ✅ |
