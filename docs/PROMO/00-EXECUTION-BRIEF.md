# memory-lancedb-dreaming 推广执行方案（OpenClaw 用）

> **版本：** v0.1.12 发布后推广  
> **执行前提：** 已配置 GitHub + ClawHub 权限  
> **原则：** 不 spam；同一 issue 不重复回复；每周 OpenClaw issue 回复 ≤2 条

---

## 总览（组合方案 1 + 2 + 3）

| 批次 | 任务 | 文案文件 | 预计耗时 |
|------|------|----------|----------|
| A | GitHub Topics + Pin 置顶帖 | `01-github-topics-and-pinned-discussion.md` | 15 min |
| B | ClawHub 描述/关键词更新 | `02-clawhub-listing.md` | 10 min |
| C | LanceDB #3441 跟进回复 | `03-lancedb-discussion-reply-v0.1.12.md` | 5 min |
| D | FAQ Discussion 帖 | `04-faq-discussion-post.md` | 10 min |
| E | Case Study Discussion 帖 | `05-case-study-discussion-post.md` | 10 min |
| F | OpenClaw 上游文档 PR | `06-openclaw-upstream-pr-draft.md` | 30 min |
| G | 持续：新 issue 短回复 | `07-weekly-issue-reply-template.md` | 按需 |

**建议执行顺序：** A → B → C → D → E → F → G（每周）

---

## 链接常量（全文统一使用）

| 名称 | URL |
|------|-----|
| ClawHub | https://clawhub.ai/packages/memory-lancedb-dreaming |
| GitHub Repo | https://github.com/airbing11/memory-lancedb-dreaming |
| GitHub Release v0.1.12 | https://github.com/airbing11/memory-lancedb-dreaming/releases/tag/v0.1.12 |
| LanceDB Discussion | https://github.com/lancedb/lancedb/discussions/3441 |

---

## 批次 A — GitHub 仓库配置

### 操作步骤

1. 打开 https://github.com/airbing11/memory-lancedb-dreaming
2. 点击 ⚙️ **About** → 添加 **Topics**（见 `01` 文件列表）
3. 启用 **Discussions**（若未开：Settings → General → Features → Discussions）
4. 新建 Category **Announcements** 或 **General** 置顶帖（正文见 `01`）
5. **Pin** 该 Discussion
6. （可选）提交 README badges PR，或直接在 GitHub Web 编辑 README 顶部

### 验收

- [ ] Topics 至少 6 个可见
- [ ] 置顶帖标题含「5 分钟安装」
- [ ] 置顶帖含两个必配 entry 字段

---

## 批次 B — ClawHub

### 操作步骤

1. 登录 ClawHub（@airbing11）
2. 编辑 `memory-lancedb-dreaming` 包描述
3. 粘贴 `02-clawhub-listing.md` 中的 **Short / Long description**
4. 确认版本显示 **0.1.12**
5. 保存

### 验收

- [ ] 描述阐明「单 memory 插槽 + dreaming 在 memory-core」与 LanceDB 兼得方案
- [ ] 含 install.sh 与两个 hooks 说明

---

## 批次 C — LanceDB 社区

### 操作步骤

1. 打开 https://github.com/lancedb/lancedb/discussions/3441
2. 以 **airbing11** 或项目身份回复
3. 粘贴 `03-lancedb-discussion-reply-v0.1.12.md` 正文
4. 不要删原帖，仅追加回复

### 验收

- [ ] 回复含 v0.1.12、install.sh、ClawHub + Release 链接

---

## 批次 D & E — GitHub Discussions（本仓库）

### 操作步骤

1. 在 `airbing11/memory-lancedb-dreaming` → **Discussions** → New
2. 发 FAQ 帖（`04`），Category 建议 **Q&A**
3. 发 Case Study 帖（`05`），Category 建议 **Show and tell**
4. FAQ 可 Pin（若只能 Pin 一篇，优先 Pin「5 分钟安装」那篇）

### 验收

- [ ] FAQ 含 4 个踩坑表
- [ ] Case Study **不含**公司名/云厂商/业务敏感主题原文

---

## 批次 F — OpenClaw 上游 PR

### 操作步骤

1. Fork `openclaw/openclaw`（若未有）
2. 找到文档中 **plugins / memory / dreaming** 相关页面（见 `06` 建议路径）
3. 添加「LanceDB 用户推荐 memory-lancedb-dreaming」小节 + 链接
4. 开 PR，标题/正文用 `06` 模板
5. **不要** 在 PR 中夸大功能；注明需手动 install.sh

### 验收

- [ ] PR 仅改文档，不改代码
- [ ] 含 hooks.allowConversationAccess 说明

---

## 批次 G — 持续 issue 回复

- 每周搜索 openclaw/openclaw：`dreaming lancedb` / `memory-lancedb dreaming`
- 仅回复 **未提及本插件** 且 **问题匹配** 的 issue
- 使用 `07` 模板，替换 1–2 句具体共鸣

---

## 不要做的事

- ❌ 同一 issue 重复发链接
- ❌ 未读 issue 上下文就贴广告
- ❌ 承诺 `openclaw plugin install`（2026.5.20 不可用）
- ❌ 声称已合并进 OpenClaw 官方 core

---

*整理：Cursor | 确认后由 OpenClaw 执行*
