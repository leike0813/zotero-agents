# Create Topic Synthesis 工作流扩展

> 本文件是可选扩展材料，不是执行硬约束。硬约束以 `SKILL.md` 为准。需要更高质量的
> duplicate check、topic definition、resolver、paper workset 示例时再读取本文件。

## 1. duplicate check

调用 MCP `synthesis.list_topics` 后，只比较这些字段：

- `title`
- `description`
- `aliases`

不要用旧 artifact 正文或 Markdown 内容做重复判定。

判定示例：

```json
{
  "topicSeed": "DETR and transformer object detection",
  "candidate": {
    "topic_id": "object-detection",
    "title": "Object Detection",
    "description": "Detection architectures, datasets, and evaluation trends",
    "aliases": ["目标检测", "detection transformers"]
  },
  "decision": "possible_duplicate",
  "reason": "seed is a narrower transformer-object-detection variant of an existing object detection topic"
}
```

处理规则：

- `no_duplicate`：继续创建。
- `possible_duplicate`：走 ACP confirmation。
- `confirmed_duplicate_cancel`：输出 `topic_synthesis_canceled`。
- `confirmed_duplicate_update`：停止 create，建议调用 `update-topic-synthesis`。

## 2. topic definition

推荐结构：

```json
{
  "id": "topic:object-detection",
  "title": "Object Detection",
  "description": "Object detection methods, benchmarks, training strategies, and evidence trends in the local Zotero library.",
  "aliases": ["目标检测", "object detector", "detection transformer"],
  "language": "zh-CN",
  "inclusion_rules": [
    "包含以定位和分类目标实例为核心任务的库内 paper",
    "包含 detection transformer、one-stage/two-stage detector、open-vocabulary detection 等直接相关工作"
  ],
  "exclusion_rules": [
    "仅做语义分割且没有 detection 证据的 paper",
    "只在背景中提到 object detection 但没有方法或实验贡献的 paper"
  ]
}
```

`id` 应稳定、短、可路径化。不要把整句 query 塞进 id。

## 3. resolver 设计

在 resolver 设计前，应先按 `SKILL.md` 主流程读取完整 library index receipt。
`synthesis.get_library_index` 是分页工具，`limit` 只是单页大小。不要只读第一页就
生成 resolver；应按 `next_cursor` 继续，直到 `has_more=false`，并确认 gate 已经
接受全部 `library_index_pages`。

优先级：

1. tag/collection/citekey 等可复现条件。
2. 由 library index 中稳定 metadata 组成的组合条件。
3. 最后才使用较宽的关键词条件，并在 diagnostics 中记录风险。

resolver 示例：

```json
{
  "mode": "tag_query",
  "query": {
    "and": ["topic:object-detection"],
    "or": ["method:detr", "task:detection"]
  }
}
```

调用 MCP `synthesis.resolve_resolver` 后，保留：

```json
{
  "resolved_paper_set": {
    "papers": [
      {"paper_ref": "1:DETR2020", "match_reasons": ["tag:topic:object-detection"]}
    ]
  },
  "resolver_diagnostics": {
    "initial_count": 12,
    "final_count": 10,
    "warnings": ["2 papers skipped because digest payload is missing"]
  }
}
```

## 4. paper workset

每篇库内 paper 建议整理为：

```json
{
  "paper_ref": "1:DETR2020",
  "title": "End-to-End Object Detection with Transformers",
  "year": 2020,
  "artifact_availability": {
    "digest-markdown": "available",
    "references-json": "available",
    "citation-analysis-json": "missing"
  }
}
```

缺失 payload 不等于整篇 paper 无效。至少有 `digest-markdown` 时可以进入主证据；只有
references/citation 缺失时，应降低 external literature coverage。

## 5. create cancel 示例

疑似重复且 host 选择取消：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_canceled",
  "status": "canceled",
  "reason": "user_cancelled_duplicate_topic",
  "message": "A possible duplicate topic exists and the create run was canceled.",
  "duplicate_topic_id": "object-detection",
  "topic_seed": "DETR"
}
```

应改用 update：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_canceled",
  "status": "canceled",
  "reason": "duplicate_topic_should_update",
  "message": "Existing topic object-detection should be updated with update-topic-synthesis instead of creating a new topic.",
  "duplicate_topic_id": "object-detection",
  "topic_seed": "DETR"
}
```
