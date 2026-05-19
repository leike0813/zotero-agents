# Step 01 Topic Context

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## Create 任务

Create 模式需要先读取 `synthesis.list_topics`，用 topic 的 `title`、`description`、`aliases`
做语义重复检查。不要用全文相似度臆断重复。

`runtime/payloads/topic-context.json` 至少应包含：

```json
{
  "operation": "create",
  "language": "zh-CN",
  "topic_seed": "object detection",
  "duplicate_check": {
    "status": "none",
    "checked_topic_ids": []
  },
  "topic_definition": {
    "id": "object-detection",
    "title": "Object Detection",
    "definition": "Detect and localize objects in images or videos.",
    "scope_boundary": ["2D image detection", "transformer-based detection"]
  },
  "base_hashes": {
    "manifest": "",
    "artifact": "",
    "export": "",
    "metadata": "",
    "index": ""
  }
}
```

## Update 任务

Update 模式必须读取 `synthesis.get_topic_context`，保留 `current_hashes`、
`section_hashes`、`recommended_update` 与 current resolver/paper set。


