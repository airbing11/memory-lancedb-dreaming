# Release draft — v0.2.8 (DO NOT PUBLISH until test report is GO)

Tag: `v0.2.8`
Title: `v0.2.8 — REM anti-repeat, narrative freshness & dreaming_doctor`
Asset: `memory-lancedb-dreaming-0.2.8.tgz` (sha256 to be filled at publish time)

---

## English

### Why
After running for weeks, daily dream reports started recycling the same old material
(voice-history, version-upgrade saga, joint-venture talks, etc.) with different wording.
Root cause: REM only de-duplicated by `memoryId`, so different rows on the same topic kept
surfacing, and narrative kept reusing stale ranked candidates even on 0-promotion days.

### What's new
- **Narrative freshness:** on a `promoted=0` day the diary no longer reuses stale ranked
  candidates — it falls back to today's Light snapshot, or skips.
- **Text-level truth dedupe:** lasting truths are compared against the TEXT of recent
  truths (last `rem.truthDedupeWindowDays`, default 30) using a CJK-aware overlap-coefficient
  similarity; anything ≥ `rem.truthSimilarityThreshold` (default 0.42) is skipped. This
  catches "same topic, different wording".
- **Exclude promoted:** memories already in `MEMORY.md` are skipped for lasting truths
  (`rem.excludePromoted`, default true).
- **Idle novelty mode:** after `deep.idleNoveltyAfterDays` (default 7) consecutive
  zero-promotion days, REM tightens dedupe and narrative stops reusing old material.
- **`dreaming_doctor` tool + `scripts/doctor.sh`:** self-check hooks, model override, install
  path, LanceDB slot, cron collision, daily report delivery, and Deep idle streak.
- **REM theme placeholder fix:** when the LLM echoes the prompt's format example
  (`中文主题名（4-8字） / English Topic Name`) it is no longer accepted as a real theme;
  the cluster falls back to its `category` label.

### Compatibility
- Verified on OpenClaw 2026.5.20 / 2026.5.27 / 2026.6.5 with a LanceDB memory slot.
- Third-party slot dreaming sidecar: before 6.5/6.6 the managed cron could report `ok`
  with no artifacts (openclaw/openclaw#92536); fixed by #93678. On older versions add
  `memory-core` to `plugins.allow` with `enabled: false` as a fallback.

### Upgrade
Replace the tgz and fully restart the gateway. Old `rem-history.json` needs no migration.
To keep the previous behavior: `rem.truthSimilarityThreshold: 1`, `rem.excludePromoted: false`,
`deep.idleNoveltyAfterDays: 0`.

**Full changelog:** https://github.com/airbing11/memory-lancedb-dreaming/compare/v0.2.6...v0.2.8

---

## 中文

### 背景
长期运行后，梦境日报开始反复输出同一批陈年旧事（音色史、版本升级史、爱兔合资等），
只是换了措辞。根因：REM 只按 `memoryId` 去重，不同 ID 的同主题记忆仍会反复出现；
即使当天 Deep `promoted=0`，叙事仍在复用旧的 ranked 候选。

### 新增 / 修复
- **叙事新鲜度：** `promoted=0` 当天不再复用旧候选，改用当天 Light 快照或跳过。
- **truth 文本级去重：** 与最近 30 天 truth **文本** 做 CJK 友好的相似度比对（overlap-coefficient），
  ≥ 0.42 即跳过，命中“同主题不同措辞”。
- **排除已提炼：** 已进 `MEMORY.md` 的记忆默认不再进入 lasting truths。
- **空转 novelty 模式：** 连续 7 天 `promoted=0` 后 REM 自动收紧去重并停止复用旧素材。
- **`dreaming_doctor` + `scripts/doctor.sh`：** 安装/运行自检，并显示 Deep 连续空转天数。
- **REM 主题名占位符修复：** LLM 把格式示例（`中文主题名（4-8字） / English Topic Name`）原样回显时不再当作有效主题，回退到 `category` 标签。

### 升级
替换 tgz → 完整重启 gateway。保留旧行为：`rem.truthSimilarityThreshold: 1` +
`rem.excludePromoted: false` + `deep.idleNoveltyAfterDays: 0`。

---

## Publish checklist (after test report GO)
- [ ] `npm test` green (53/53)
- [ ] VPS test report attached (esp. 2–3 day repetition comparison)
- [ ] `npm pack` → attach `memory-lancedb-dreaming-0.2.8.tgz`
- [ ] GitHub Release created with this body
- [ ] ClawHub version bumped to 0.2.8 + description "current recommended 0.2.8"
- [ ] Execute promotion per `docs/PROMO/v0.2.8-LAUNCH-PLAN.md` (after 泡泡爸确认)
- [ ] Discussions FAQ (#1) updated to 0.2.8 install command (see docs/PROMO/v0.2.8-FAQ-AND-TRACKING.md in plugin tree: `memory-lancedb-dreaming/docs/PROMO/v0.2.8-FAQ-AND-TRACKING.md`)
