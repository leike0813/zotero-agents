# Step 02 Resolver And Workset

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## Library Index

Create 模式必须分页读取完整 `synthesis.get_library_index`。每页 payload 必须包含
`papers[]`、`cursor`、`next_cursor`、`has_more` 与 `index_hash`。

```json
{
  "cursor": "0",
  "next_cursor": "100",
  "has_more": true,
  "index_hash": "sha256:...",
  "papers": [
    { "paper_ref": "1:ABC12345", "title": "Sparse DETR", "year": 2021 }
  ]
}
```

## Resolver

Resolver 应可复现，不能只写“相关论文若干”。合格 payload 示例：

```json
{
  "operation": "create",
  "topic_resolver": {
    "mode": "semantic_query",
    "query": "object detection transformer DETR",
    "include_tags": ["object-detection"]
  },
  "resolved_paper_set": {
    "papers": [
      { "paper_ref": "1:ABC12345", "title": "Sparse DETR", "year": 2021 }
    ]
  },
  "resolver_diagnostics": {
    "final_count": 1,
    "warnings": []
  }
}
```


