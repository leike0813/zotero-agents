# Step 08 Core Synthesis

本文件是可选扩展材料；硬约束以 `SKILL.md`、gate 输出和 JSON schema 为准。

## Payload

写入 `runtime/payloads/core-analytical-sections.json`：

```json
{
  "taxonomy": { "summary": {}, "nodes": [] },
  "timeline_events": { "summary": {}, "events": [] },
  "positioning": {},
  "claims": [],
  "improvement_dimension_summary": {},
  "improvement_dimensions": [],
  "concept_candidate_labels": [],
  "debates": [],
  "gaps": [],
  "review_outline": {}
}
```

## Writing Standard

- `taxonomy` explains the substantive research routes, their mechanisms, boundaries, maturity, strengths, limitations, and relations.
- `timeline_events` explains historical progression with analytical milestones, not a bibliography sorted by year.
- `positioning` defines field importance, review angle, and scope boundary.
- `claims` are topic-level findings supported by `source_paper_refs`.
- `improvement_dimension_summary` and `improvement_dimensions[]` explain method progress, design tradeoffs, and evaluation axes.
- `debates` describe competing positions and the axis used to judge them.
- `gaps` distinguish research gaps, evidence gaps, evaluation gaps, and library coverage gaps.
- `review_outline` turns the synthesis into a review-writing structure.
- `concept_candidate_labels[]` lists terms worth enriching in the KG stage.

Use `source_paper_refs` wherever paper evidence is needed. Runtime derives evidence ids and evidence-map refs.
