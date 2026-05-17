# Update Topic Synthesis 工作流扩展

> 本文件是可选扩展材料，不是执行硬约束。硬约束以 `SKILL.md` 为准。需要更高质量的
> `recommended_update` 解读、full/patch 选择或 section patch 示例时再读取本文件。

## 1. topic context

首先调用 MCP：

```json
{
  "tool": "synthesis.get_topic_context",
  "arguments": {
    "topicId": "object-detection",
    "mode": "update"
  }
}
```

期望 context 至少包含：

```json
{
  "topic_id": "object-detection",
  "language": "zh-CN",
  "base_hashes": {
    "manifest": "sha256:manifest",
    "artifact": "sha256:artifact",
    "export": "sha256:export",
    "metadata": "sha256:metadata",
    "index": "sha256:index"
  },
  "section_hashes": {
    "claims": "sha256:claims",
    "coverage": "sha256:coverage"
  },
  "recommended_update": {
    "operation": "update_patch",
    "changed_sections": ["coverage"],
    "reasons": ["missing citation-analysis-json for 2 papers"]
  }
}
```

如果 context 缺少 base hashes、section hashes 或 current sections，优先取消，不要猜测。

## 2. full / patch 决策表

使用 `update_full`：

| 条件 | 原因 |
| --- | --- |
| resolver changed | paper set 可能整体变化 |
| resolved paper set changed | claims/timeline/evidence 可能跨 section 变化 |
| topic definition changed materially | topic 边界变化 |
| language changed | 所有自然语言 section 应统一重写 |
| schema major version changed | patch 不能保证兼容 |
| `requires_full_update=true` | host 已判定 patch 不安全 |

使用 `update_patch`：

| 条件 | 要求 |
| --- | --- |
| 只更新 `coverage` | 必须读取 current `coverage` hash |
| 只更新 `external_literature_analysis` | 必须读取 current external section hash 和相关 payload |
| 少量 claims 受影响 | 必须读取 `claims`，必要时同时读取 `paper_evidence` |

## 3. section_patch 示例

patch manifest 形状：

```json
{
  "schema_id": "synthesis.topic_section_patch_manifest",
  "schema_version": "2.0.0",
  "operation": "update_patch",
  "language": "zh-CN",
  "base": {
    "current_manifest_hash": "sha256:manifest",
    "current_artifact_hash": "sha256:artifact",
    "read_section_hashes": {
      "coverage": "sha256:old-coverage"
    },
    "replace_section_hashes": {
      "coverage": "sha256:new-coverage"
    }
  },
  "patch": {
    "mode": "section_replace",
    "changed_sections": ["coverage"],
    "unchanged_section_policy": "inherit_current",
    "sections": {
      "coverage": {
        "path": "result/sections/coverage.json",
        "hash": "sha256:new-coverage",
        "content_type": "json"
      }
    }
  },
  "diagnostics": {
    "requires_full_update": false,
    "warnings": []
  }
}
```

非法 patch：

```json
{
  "operation": "update_patch",
  "patch": [
    {"op": "replace", "path": "/claims/0/text", "value": "new text"}
  ]
}
```

原因：这是 JSON Patch，不是 section-level replacement。

## 4. update cancel 示例

MCP context 不可用：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_canceled",
  "status": "canceled",
  "reason": "mcp_unavailable",
  "message": "Cannot load topic context because Zotero Synthesis MCP service is unavailable.",
  "topic_id": "object-detection"
}
```

context 不完整：

```json
{
  "__SKILL_DONE__": true,
  "kind": "topic_synthesis_canceled",
  "status": "canceled",
  "reason": "topic_context_unavailable",
  "message": "Topic context is missing section_hashes, so update_patch cannot be safely produced.",
  "topic_id": "object-detection"
}
```
