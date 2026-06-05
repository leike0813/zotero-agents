# Step 05 Paper Triage

本文件是可选扩展材料；硬约束以 `SKILL.md`、gate 输出和 JSON schema 为准。

## Payload

写入 `runtime/payloads/paper-triage-batch.json`：

```json
{
  "analyses": [
    {
      "paper_ref": "1:ABC12345",
      "topic_relevance": { "level": "core", "reason": "" },
      "paper_quality": { "level": "high", "reason": "" },
      "core_digest": "",
      "caveats": [],
      "diagnostics": []
    }
  ]
}
```

## Field Rules

- `paper_ref` must match a resolved paper ref from the current workset.
- `topic_relevance.level`: `core` / `related` / `peripheral` / `excluded`.
- `paper_quality.level`: `high` / `medium` / `low` / `unknown`.
- `core_digest`: one or two concise sentences explaining what this paper contributes to the topic window.
- `caveats` and `diagnostics` are optional arrays for evidence limits, missing context, or boundary uncertainty.

## Writing Standard

Keep each row paper-local. Judge relevance and quality from the filtered content available for that paper. Do not write cross-paper synthesis, route candidates, timeline candidates, claims, comparison facts, external-reference indexes, digest locators, or hashes.

## Example

```json
{
  "paper_ref": "1:DETR2020",
  "topic_relevance": {
    "level": "core",
    "reason": "The paper establishes object-query set prediction as the central formulation for the topic."
  },
  "paper_quality": {
    "level": "high",
    "reason": "It provides a clear model formulation and benchmark evidence for the route it introduces."
  },
  "core_digest": "Introduces transformer-based set prediction for object detection, making object queries and bipartite matching the conceptual baseline for later DETR-family work.",
  "caveats": [
    "Training efficiency limitations affect how later improvements should be interpreted."
  ],
  "diagnostics": []
}
```
