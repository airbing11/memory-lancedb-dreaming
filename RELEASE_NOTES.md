# memory-lancedb-dreaming v0.3.17 — 待测说明

> **日期：** 2026-08-11
> **安装包：** `memory-lancedb-dreaming-0.3.17.tgz`

## 目标

解决梦境日报每天围绕同一批主题和记忆换一种说法的问题。

## 本次优化

- REM 主题增加跨日语义冷却（默认 7 天）
- Deep=0 的叙事在调用 LLM 前过滤近期已用素材
- 新素材少于 2 条时不生成长叙事
- 生成文本与近 14 天日记相似时不写入
- `pushOn: changed` 忽略候选数、置信度、证据摘要及散文措辞变化
- 修正 REM 零新主题时概要错误显示 1 个主题的问题
- 清理模型偶尔附加的 `聚类 N：`、`聚类N:`、`聚类 N、` 主题前缀

## 预期表现

- 「技术运维排障」「用户需求与指令」等近期主题不会每天重复出现
- 「甜心小玲、配置回滚、合资公司」等相同素材使用一次后进入 7 天冷却
- 没有足够新料时，日报保留阶段概要，但「梦境叙事」显示暂无叙事，不再硬凑长文
- 纯换说法不会再次触发 IM 推送

## 本地安装

```bash
bash scripts/install.sh memory-lancedb-dreaming-0.3.17.tgz
openclaw gateway restart
```

确认 `dreaming_status.version=0.3.17`，运行一次 `phase=all`。若模型返回
`聚类 1：东泓业务资料 / Donghong Business Data`，最终报告必须显示为
`东泓业务资料 / Donghong Business Data`。
