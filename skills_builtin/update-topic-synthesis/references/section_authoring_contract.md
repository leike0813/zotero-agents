# Section Authoring 扩展

> 本文件是可选扩展材料，不是执行硬约束。硬约束以 `SKILL.md` 为准。需要提升
> update_full 或 update_patch 的 section 写作质量时再读取本文件。

## 1. update_full sections

`update_full` 与 create 一样输出完整 sections：

- `topic`
- `summary`
- `positioning`
- `taxonomy`
- `comparison_matrix`
- `claims`
- `timeline_events`
- `paper_evidence`
- `external_literature_analysis`
- `debates`
- `coverage`
- `gaps`
- `review_outline`
- `evidence_map`
- `source_artifacts`
- `diagnostics`

manifest 示例：

```json
{
  "schema_id": "synthesis.topic_analysis_manifest",
  "schema_version": "2.0.0",
  "operation": "update_full",
  "language": "zh-CN",
  "sections": {
    "claims": {
      "path": "result/sections/claims.json",
      "hash": "sha256:new-claims",
      "content_type": "json"
    }
  }
}
```

## 2. update_patch replacement section

patch 只写替换 section，不写未变 section。

replacement section 示例：

```json
{
  "coverage": {
    "paper_count": 12,
    "paper_evidence_count": 10,
    "external_literature_count": 48,
    "missing_payloads": [
      {"paper_ref": "1:NEW", "payload_type": "citation-analysis-json"}
    ],
    "coverage_summary": "新增 2 篇 paper 后，主证据覆盖增加，但外部文献语境仍有缺口。"
  }
}
```

patch manifest 示例：

```json
{
  "schema_id": "synthesis.topic_section_patch_manifest",
  "schema_version": "2.0.0",
  "operation": "update_patch",
  "language": "zh-CN",
  "base": {
    "current_manifest_hash": "sha256:old-manifest",
    "current_artifact_hash": "sha256:old-artifact",
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
  }
}
```

## 3. claims / timeline 引用规则

新增或替换 claims 时仍必须引用库内 evidence：

```json
[
  {
    "id": "claim:training-difficulty",
    "text": "Early detection transformers simplified post-processing but exposed training convergence challenges.",
    "evidence_refs": ["pe:detr2020"],
    "evidence_map_refs": ["claim:training-difficulty"],
    "confidence": 0.78
  }
]
```

新增或替换 `claims`、`taxonomy`、`comparison_matrix`、`debates`、`gaps`、
`review_outline` 时，必须引用 validated evidence map candidate ids。
`gaps` 必须包含 `gap_type`，不能把 `library_coverage_gap` 写成 field-wide gap。
`evidence_map` section 记录 evidence map 的 path/hash/candidate_counts/candidate_ids，不展开长正文。

新增 timeline event 示例：

```json
[
  {
    "id": "event:deformable-detr",
    "year": 2021,
    "label": "Deformable DETR improves convergence and multi-scale detection",
    "evidence_refs": ["pe:deformable-detr2021"],
    "phase": "efficient_transformer_detection"
  }
]
```

`evidence_refs` 不得指向 external references。

## 4. patch 质量检查

输出 patch 前检查：

- `changed_sections` 是否只包含 replacement sections。
- `read_section_hashes` 是否覆盖所有 replacement sections。
- 是否误加了 `markdown_path`。
- 是否把未读取 section 也写入 patch。
- replacement section 是否仍满足跨 section 引用关系。
- 如果引用新增 `paper_evidence`，是否同时替换了 `paper_evidence` section。
