# 发布 memory-lancedb-dreaming v0.2.4

> **状态：** VPS 验收 GO（2026-06-09）。待 push main + tag + GitHub Release + ClawHub publish。

## 本版修复

- Dreaming 从 `plugins.slots.memory` 动态读取 LanceDB 配置（`memory-lancedb-pro` / `memory-lancedb` / `lancedb-pro`）
- 修复迁移到 `memory-lancedb-pro` 后 pipeline 失败、仅日报仍在发的问题

## 小泡验收步骤

### 1. 安装

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.2.4.tgz
openclaw gateway stop 2>/dev/null || true
openclaw gateway run
```

### 2. 启动日志（必看）

应出现类似：

```
memory-lancedb-dreaming: cached LanceDB config (plugin=memory-lancedb-pro, dbPath=..., dimensions=...)
memory-lancedb-dreaming: registered (... lancedbPlugin=memory-lancedb-pro, lancedbPath=...)
```

**不应再出现：**

```
LanceDB config not cached and disk fallback failed — ensure memory-lancedb is installed
```

### 3. dreaming_status

```bash
# 或 agent 调用 dreaming_status 工具
```

确认 JSON 含：

- `lancedbPluginId`: `"memory-lancedb-pro"`（或你的 slot 名）
- `lancedb`: `{ dbPath, dimensions, pluginId }`
- `lancedbError`: 应为空
- `memoryCount`: > 0（若有记忆）

### 4. 手动 trigger

```bash
dreaming_trigger phase=all
```

期望：

- `light/`、`rem/`、`deep/` 当日文件 **非 107 字节空壳**
- 日志：`dreaming phases completed (light=..., rem=..., promoted=...)`

### 5. 配置要求（无需复制两份 config）

只需：

```json
{
  "plugins": {
    "slots": { "memory": "memory-lancedb-pro" },
    "entries": {
      "memory-lancedb-pro": {
        "config": {
          "dbPath": "...",
          "embedding": { "model": "...", "dimensions": 1536 }
        }
      }
    }
  }
}
```

**不要** 再为 dreaming 单独保留 `memory-lancedb` entry（0.2.4 已不需要 workaround）。

## 发布前检查

- [x] `npm run build && npm test` 通过
- [x] VPS 验收 GO（`docs/v0.2.4-ACCEPTANCE-REPORT.md`）
- [ ] `git push` main（GitHub 当前仍为 0.2.3）
- [ ] `git tag v0.2.4 && git push origin v0.2.4`
- [ ] GitHub Release + 附 `memory-lancedb-dreaming-0.2.4.tgz`
- [ ] `npx clawhub login` 后 `npx clawhub package publish airbing11/memory-lancedb-dreaming`

## GitHub Release 正文（可复制）

```markdown
## memory-lancedb-dreaming v0.2.4

Fix LanceDB config resolution for **memory-lancedb-pro** (and other memory slot owners).

### Highlights
- Read `dbPath` / `embedding` from `plugins.slots.memory` (not hardcoded `memory-lancedb`)
- `dreaming_status.lancedbPluginId` for diagnostics
- Production verified on VPS (2026-06-09): pipeline + Feishu daily report + 3:00 cron

### Upgrade from 0.2.3
```bash
bash scripts/install.sh memory-lancedb-dreaming-0.2.4.tgz
openclaw gateway stop && openclaw gateway run
```
No duplicate `memory-lancedb` entry needed when slot is `memory-lancedb-pro`.

### Links
- [ClawHub](https://clawhub.ai/packages/memory-lancedb-dreaming)
- [Acceptance report](./docs/v0.2.4-ACCEPTANCE-REPORT.md)
```
