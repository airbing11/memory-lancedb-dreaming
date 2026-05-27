# 05 — Case Study Discussion 帖（已脱敏 — 不含公司/客户信息）

**Repo：** airbing11/memory-lancedb-dreaming  
**Category：** Show and tell  
**Title：** `[Case Study] ~950 vectors 生产环境 nightly dreaming（匿名）`  
**Pin：** No

**Body（直接粘贴）：**

---

## 背景

- **环境：** OpenClaw 2026.5.20 · Ubuntu 22.04+（云 VPS / 自建服务器均可）
- **记忆：** LanceDB `lancedb-pro`，约 **950+ vectors**，1024d，BAAI/bge-m3
- **插件：** memory-lancedb-dreaming **v0.1.12**
- **场景：** 从 memory-core 迁移到 LanceDB 后，需要可读的 nightly memory consolidation

> 本文为**匿名**生产验证摘要，不含客户/公司标识；数字为真实冒烟区间，已四舍五入。

---

## 为什么不用原生 dreaming？

OpenClaw **只有一个 memory 插槽**；内置 dreaming 实现挂在 **memory-core** 上，处理的是 core 记忆而非 LanceDB 向量表。插槽换成 LanceDB 后，原生管线**无法**对向量库做完整的 Light / REM / Deep；偶发输出也多是 `fact` / `other` 类标签，缺少主题反思与叙事。

本插件在**不换回 memory-core** 的前提下，把 dreaming **重新接到 LanceDB 数据上**。

---

## 配置要点（生产验证过的）

```json
"hooks": { "allowConversationAccess": true },
"subagent": { "allowModelOverride": true },
"rem": { "model": "your-provider/your-model" },
"narrative": { "languages": ["zh", "en"] }
```

Cron：`0 3 * * *` @ `Asia/Shanghai`（插件 `autoManageCron: true`）

---

## 一次完整 `dreaming_trigger phase=all` 的结果

```
Dreaming cycle (all) completed: light=100, rem=200, promoted=5, narrative=true.
```

| 阶段 | 产出 |
|------|------|
| Light | `memory/dreaming/light/YYYY-MM-DD.md` |
| REM | LLM **中英双语**主题行（非纯 fact/other 标签） |
| Deep | 5 条记忆 promoted（`maxPromotions=5`） |
| Narrative | `DREAMS.md` 新增 zh + en 段落 |

Gateway 注册日志示例：

```
cronHook=ready, modelOverride=ready
memoryCount: 950+
```

`dreaming_status` 片段：

```json
{
  "version": "0.1.12",
  "hooks": { "cronTriggerReady": true, "llmModelOverrideReady": true },
  "memoryCount": 950
}
```

---

## 运维体验

- **`install.sh`** 安装约 2s（~420 npm packages，视环境而定）
- 自动清理遗留 **`dreaming-plugin-healthcheck`** cron（v0.1.12+）
- **pipeline 互斥锁**：连续 trigger 第二次返回 busy
- **`lastRun.lastRunAt`** 记录上次 pipeline 时间（v0.1.12+）

---

## 结论

**两个 entry 必配项**（`allowConversationAccess` + `allowModelOverride`）+ **完整 gateway 重启** 之后，日常 cron 基本全自动。主要摩擦仍在首次手动安装（OpenClaw 2026.5.20 尚无 `openclaw plugin install`）。

---

## 链接

- Release v0.1.12: https://github.com/airbing11/memory-lancedb-dreaming/releases/tag/v0.1.12
- ClawHub: https://clawhub.ai/packages/memory-lancedb-dreaming
- FAQ: 见本 repo Discussions

欢迎在评论区分享你的 LanceDB 规模与 dreaming 输出样例（请注意脱敏）。

---

**脱敏说明（勿粘贴到公开帖）：** 不含公司名称、主机商标识、具体业务主题原文、workspace 路径。
