# 02 — ClawHub  listing 文案

## Short description（一行，若有字段限制 ~120 字）

```
One memory slot; dreaming binds to memory-core. On LanceDB, native dreaming won't touch your vectors — this plugin runs full Light/REM/Deep + DREAMS.md on LanceDB.
```

## Short description（中文备选）

```
OpenClaw 仅一个 memory 插槽，dreaming 在 memory-core 下。用 LanceDB 时原生 dreaming 对不上向量库；本插件让你 LanceDB + 完整 dreaming 兼得。
```

---

## Long description（ClawHub 主描述 — 直接粘贴）

### The Problem

OpenClaw activates **one memory backend** at a time. Built-in **dreaming** (Light / REM / Deep, narrative, promotion) is implemented under **memory-core**—it consolidates core-backed memories, **not** your LanceDB vector index.

When your slot is **memory-lancedb** / **lancedb-pro**, reads and writes use LanceDB, but native dreaming **cannot** run the full pipeline on those vectors. Partial runs often degrade to `fact` / `other` tags instead of themed reflections and `DREAMS.md`.

### This Plugin Fixes That

**memory-lancedb-dreaming** lets you **keep LanceDB for vectors** and **restore a complete dreaming stack** for that store:

| Phase | What it does |
|-------|----------------|
| **Light** | Recent memory observations |
| **REM** | Pattern analysis + optional **LLM bilingual theme names** |
| **Deep** | Configurable promotion to `MEMORY.md` |
| **Narrative** | Dream diary in `DREAMS.md` (zh / en) |

**Validated:** OpenClaw 2026.5.20, 950+ LanceDB vectors, production smoke test passed (v0.2.3).

### Install

> `openclaw plugin install` is **not available** on OpenClaw 2026.5.20 — use manual install:

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.1.12.tgz
```

Add to `openclaw.json` (**entry-level**, required):

```json
"hooks": { "allowConversationAccess": true },
"subagent": { "allowModelOverride": true }
```

Then **restart gateway** (not hot reload).

### Links

- GitHub: https://github.com/airbing11/memory-lancedb-dreaming
- Release: https://github.com/airbing11/memory-lancedb-dreaming/releases/tag/v0.2.3
- LanceDB community: https://github.com/lancedb/lancedb/discussions/3441

### Author

airbing11 · MIT License

---

## Keywords / Tags（若 ClawHub 支持）

```
openclaw, lancedb, dreaming, memory, vector, consolidation, narrative, zh, en, plugin
```

---

## 操作备注（OpenClaw）

- 确认 ClawHub 显示版本 **0.1.12**
- 若可上传 screenshot：terminal 里 `cronHook=ready` + `dreaming_trigger` 成功那一行
