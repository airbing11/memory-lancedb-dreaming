# Dreaming 日报推送功能 — 产品需求 & 实现规格

> 版本：v0.2.0 规划 | 日期：2026-05-27  
> 用途：发给 Cursor 做 memory-lancedb-dreaming 插件的下一版优化

---

## 一、现状问题

memory-lancedb-dreaming 0.1.12 版已完成 Light/REM/Deep 三阶段 dreaming pipeline，但存在两个产品缺口：

### 1.1 日报汇总缺失
旧版插件（0.1.10 及早期）会在每天凌晨将 Light/REM/Deep 各阶段结果合并成一份结构化摘要，写入 daily memory 文件。0.1.12 重构后，各阶段输出分散到三个独立文件：

| 阶段 | 输出位置 | 内容 |
|------|----------|------|
| Light | `memory/dreaming/light/YYYY-MM-DD.md` | 原始观测候选（最多 100 条） |
| REM | `memory/dreaming/rem/YYYY-MM-DD.md` | 主题模式分析 |
| Deep | `memory/dreaming/deep/YYYY-MM-DD.md` | 提升记录 |
| 叙事 | `DREAMS.md` | 梦境散文 |

用户无法从单一入口了解当天 dreaming 的全貌。

### 1.2 无推送机制
所有输出均写入本地文件，没有任何内容主动推送到用户聊天界面。用户需要手动打开文件查看，不符合"开箱即用"体验。

---

## 二、解决方案

在内核 dreaming pipeline 完成后，新增一个可选（默认启用）的「日报推送」后处理阶段，完成以下工作：

1. 收集 Light/REM/Deep 三阶段关键指标
2. 提取 DREAMS.md 最新一条叙事散文
3. 合并为标准日报格式
4. （可选）通过 delivery 机制推送到用户配置的聊天渠道

---

## 三、配置字段

### 3.1 新增 `delivery` 配置块

在 `openclaw.json` 的插件 entry 配置中新增 `delivery` 字段：

```jsonc
{
  "plugins": {
    "entries": {
      "memory-lancedb-dreaming": {
        "enabled": true,
        "hooks": {
          "allowConversationAccess": true
        },
        "subagent": {
          "allowModelOverride": true
        },
        "config": {
          // ... 现有配置不变 ...

          // 新增：日报推送
          "dailyReport": {
            "enabled": true,               // 是否启用日报推送
            "cron": "0 4 * * *",           // 推送时间（默认为 dreaming 后 1 小时）
            "timezone": "Asia/Shanghai",    // 时区
            "languages": ["zh"],            // 日报语言
            "delivery": {
              "channel": "<channel>",       // 推送渠道，如 feishu / openclaw-weixin / qqbot 等
              "to": "<target>",             // 推送目标，如用户 open_id / 微信号等
              "mode": "announce"            // 推送模式（announce / direct）
            }
          }
        }
      }
    }
  }
}
```

### 3.2 自动管理 Cron

插件在 `autoManageCron = true` 时，应自动创建/更新日报推送的 cron 任务。策略：

1. dreaming pipeline cron 为 `0 3 * * *`（凌晨 3 点跑 dreaming）
2. dailyReport cron 为用户配置的时间（推荐 `0 4 * * *`，即 dreaming 后 1 小时）
3. 两个 cron 独立管理，互不依赖
4. 推送 cron 仅读取文件，不调用 LLM，不应有超时风险

### 3.3 缺少 delivery 配置时的行为

如果用户配置了 `dailyReport.enabled = true` 但未配置 `delivery` 字段，插件应：
1. 将日报写入 daily memory 文件（恢复旧版行为）
2. 不尝试推送

如果用户同时配了 delivery，则：
1. 写入 daily memory 文件
2. 通过 delivery 推送到指定渠道

---

## 四、日报格式

### 4.1 标准模板（中文）

```
🌙 梦境日报 2026-05-27

【三阶段概要】
- 🌘 Light 阶段：N 条观测候选
- 🌓 REM 阶段：M 个主题模式
- 🌒 Deep 阶段：K 条提升至永久记忆

【关键发现】
- 主题一（置信度）—— 摘要说明
- 主题二（置信度）—— 摘要说明

【梦境叙事】
（从 DREAMS.md 提取的最新一段叙事散文，保留原始格式）
```

### 4.2 模板说明

| 区块 | 数据来源 | 说明 |
|------|----------|------|
| 日期 | 当天日期 | 使用配置的 timezone |
| Light 阶段摘要 | `memory/dreaming/light/YYYY-MM-DD.md` | 统计候选数量（非 LLM 调用） |
| REM 阶段摘要 | `memory/dreaming/rem/YYYY-MM-DD.md` | 提取主题名称 + 置信度（非 LLM 调用） |
| Deep 阶段摘要 | `memory/dreaming/deep/YYYY-MM-DD.md` | 提取提升数量（非 LLM 调用） |
| 梦境叙事 | `DREAMS.md` | 取最后一条 diary entry 的正文（非 LLM 调用） |

**关键约束：日报推送本身不得调用 LLM**，所有内容来自已有文件的结构化提取。

---

## 五、实现建议

### 5.1 新增文件

| 文件 | 职责 |
|------|------|
| `dist/daily-report.js` | 日报聚合逻辑：读取各阶段文件、组装日报、写入+推送 |
| `dist/daily-report-config.js` | dailyReport 配置解析和校验 |

### 5.2 推送机制

有两套方案，推荐方案 A：

#### 方案 A：通过 OpenClaw cron runner 自动投递（推荐）

1. 插件创建 isolated cron job，设置 `delivery.mode = "announce"` 和对应的 `channel/to`
2. cron 的 payload 只设置 `timeoutSeconds`，不设 `toolsAllow`
3. 推送 prompt 的 message 只做一件事：读取文件、组装日报、直接输出
4. cron runner 自动将输出投递到指定渠道

**优势**：零额外 SDK 依赖，OpenClaw 原生支持，cron runner 处理重试和投递确认。

#### 方案 B：插件内部调用 API 直接发送

1. 插件通过 `runtime.message` 或其他 API 直接推送
2. 需要插件获取到用户的 channel/to 信息

**劣势**：需要额外 API 权限，增加插件复杂度和失败处理责任。不推荐。

---

### 5.3 delivery 配置的 cron 映射

当插件检测到 `dailyReport.delivery` 已配置时，应创建如下结构的 cron job：

```json
{
  "name": "Dreaming Daily Report",
  "description": "[managed-by=memory-lancedb-dreaming] Dreaming daily report delivery",
  "schedule": {
    "kind": "cron",
    "expr": "0 4 * * *",
    "tz": "Asia/Shanghai"
  },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "读取 dreaming 各阶段文件并生成日报。直接输出日报内容，不要尝试发消息。",
    "timeoutSeconds": 60
  },
  "delivery": {
    "mode": "announce",
    "channel": "<delivery.channel>",
    "to": "<delivery.to>"
  }
}
```

计时提醒：60 秒足够（不需要 LLM 调用，只是读取本地文件组合文本）。

---

## 六、兼容性说明

- 配置为**可选**：旧用户升级后无 `dailyReport` 配置 → 行为不变（只写文件，不推送）
- 默认**启用** `dailyReport.enabled = true` 但 `delivery` 可选 → 新用户默认写文件
- 不影响现有 Light/REM/Deep/Narrative 流程
- 不影响 `autoManageCron` 逻辑

---

## 七、验收标准

- [ ] 用户在 `openclaw.json` 配置 `dailyReport.delivery` 后，每天指定时间收到推送
- [ ] 日报包含三阶段概要 + 关键发现 + 梦境叙事三部分
- [ ] 日报推送不调用 LLM，成本为零（仅文件读取 + 文本拼接）
- [ ] 未配置 `delivery` 时，日报写入 `memory/YYYY-MM-DD.md` 文件
- [ ] 插件自动管理日报 cron 的创建/更新/删除
- [ ] cron 60 秒超时内完成

---

*需求整理：AI小泡 | 2026-05-27*
