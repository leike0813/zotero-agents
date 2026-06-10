# Step 09 KG Enrichment

本文件是可选扩展材料；硬约束以 `SKILL.md`、gate 输出和 JSON schema 为准。

## Payload

写入 `runtime/payloads/kg-enrichment.json`：

```json
{
  "schema_id": "synthesis.topic_synthesis_kg_enrichment",
  "schema_version": "1.0.0",
  "concept_details": [],
  "topic_relation_candidates": [],
  "topic_matching_terms": {
    "include_terms": [],
    "must_have_terms": [],
    "methods": [],
    "exclude_terms": [],
    "diagnostics": []
  },
  "diagnostics": []
}
```

## Concept Details

Use `concept_details[]` for concepts that help explain the topic boundary, routes, mechanisms, tasks, benchmarks, datasets, evaluation axes, training signals, or theoretical constructs.

Suggested fields: `label`, `aliases`, `concept_type`, `domain`, `definition`, `disambiguation`, `topic_relevance`, `caveat`.

## Topic Relation Candidates

Use `topic_relation_candidates[]` for topic graph relation candidates. `relation_type` must be one of:

- `broader_topic_candidate`
- `related_topic_candidate`
- `overlap_topic_candidate`
- `contrast_topic_candidate`

Suggested fields: `relation_type`, `target_topic_title`, `rationale`, `evidence`, `caveat`.

## Topic Matching Terms

Use `topic_matching_terms` for topic discovery and matching:

- `include_terms`: recall expansion terms.
- `must_have_terms`: boundary terms.
- `methods`: method/model/dataset/protocol/mechanism terms.
- `exclude_terms`: adjacent meanings outside the topic.
- `diagnostics`: uncertainty or conservative-empty reasons.

Runtime materializes the required sidecars after validating this enrichment payload.
