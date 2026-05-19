# Step 00 Runtime Gate

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## 目的

本阶段只确认运行时纪律：SQLite 保存全局状态，JSON 工件保存语义内容，gate 决定唯一下一步。

## 执行建议

1. 每次先运行：

```bash
python scripts/gate_runtime.py --db "runtime/topic-synthesis.sqlite"
```

2. 只执行 gate 返回的 `next_action` 和 `command_example`。
3. 如果 gate 返回 `failed_retryable`，修正当前 payload 后重试当前 action，不要跳到后续 stage。
4. 如果需要取消，运行：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action cancel
```

## 合格输出示例

```json
{
  "next_action": "persist_topic_context",
  "stage": "stage_1_topic_context",
  "instruction_refs": ["references/step_01_topic_context.md"],
  "schema_refs": ["assets/schemas/topic_context_payload.schema.json"]
}
```


