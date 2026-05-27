# 06 — OpenClaw 上游文档 PR 草案

## 目标

在 OpenClaw 官方文档中增加一小节：**LanceDB 用户使用独立 dreaming 插件**，避免用户以为 core dreaming 在 lancedb 下可用。

## 建议修改位置（OpenClaw 执行时需自行定位）

搜索 openclaw/openclaw 文档中以下关键词，选最合适的一页追加小节：

- `dreaming`
- `memory-lancedb`
- `plugins`
- `memory slot`

可能路径（以实际 repo 为准）：

- `docs/concepts/dreaming.md`
- `docs/plugins/*.md`
- `docs/memory/*.md`

---

## PR Title

```
docs: note LanceDB dreaming via memory-lancedb-dreaming plugin
```

---

## PR Body

```markdown
## Summary

Documents that built-in dreaming may not work with LanceDB vector stores, and points LanceDB users to the community plugin `memory-lancedb-dreaming` (ClawHub + GitHub).

## Motivation

Several issues report dreaming failures after switching from memory-core to memory-lancedb (#82977, #85473, etc.). This is a small docs clarification — no code change.

## Test plan

- [ ] Docs render correctly
- [ ] Links valid
```

---

## 文档补丁正文（Markdown 小节 — 插入到合适位置）

```markdown
### LanceDB and dreaming

OpenClaw exposes **one active memory backend** at a time. Built-in **dreaming** (Light / REM / Deep, narrative, promotion) is implemented under **memory-core** and operates on core-backed memories—not on a **memory-lancedb** / **lancedb-pro** vector index.

If your memory slot is LanceDB, use the community plugin **[memory-lancedb-dreaming](https://clawhub.ai/packages/memory-lancedb-dreaming)** to run a LanceDB-native dreaming pipeline (Light / REM / Deep, LLM theme lines, promotion thresholds, bilingual `DREAMS.md`, managed cron) **without** switching back to memory-core.

**Install (OpenClaw 2026.5.20):** manual tarball + `scripts/install.sh` — see [release v0.2.3](https://github.com/airbing11/memory-lancedb-dreaming/releases/tag/v0.2.3).

**Required plugin entry settings:**

```json
"hooks": { "allowConversationAccess": true },
"subagent": { "allowModelOverride": true }
```

Restart the gateway after changing hook permissions (hot reload does not re-register hooks).
```

---

## OpenClaw 操作步骤

1. `gh repo fork openclaw/openclaw`
2. 创建分支 `docs/lancedb-dreaming-plugin-note`
3. 在定位到的 `.md` 文件插入上述小节
4. `gh pr create` 使用上面 Title + Body
5. 在 PR 中 @ 相关 issue（#85473）仅作 reference，不要 spam

## 预期

- 维护者可能接受小 docs PR，也可能建议放在 wiki / external link
- 若被拒：把同样内容留在本插件 README + Discussions 即可，无损失

---
