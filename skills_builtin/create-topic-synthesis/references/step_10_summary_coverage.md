# Step 10 Summary Coverage

本文件是可选扩展材料；硬约束以 `SKILL.md`、gate 输出和 JSON schema 为准。

## Payload

写入 `runtime/payloads/external-statistics-report.json`：

```json
{
  "summary": { "text": "" },
  "coverage": { "coverage_verdict": "partial", "reason": "" },
  "reliability_caveats": [],
  "external_context_summary": { "summary": "" },
  "collection_suggestions": [],
  "diagnostics": []
}
```

## Writing Standard

- `summary` is concise prose that states the current synthesis result.
- `coverage.coverage_verdict` is `sufficient` / `partial` / `insufficient` / `severely_missing` / `unknown`.
- `coverage.reason` explains the verdict using the validated core synthesis and available context.
- `reliability_caveats[]` records limits caused by evidence coverage, missing artifacts, graph uncertainty, or topic boundary uncertainty.
- `external_context_summary` summarizes nearby literature or collection context that affects coverage.
- `collection_suggestions[]` lists concrete additions that would improve the topic collection.
- `diagnostics[]` records conservative-empty or uncertainty reasons.

Runtime merges validated core synthesis, derives evidence/provenance, materializes statistics, source artifacts, external literature structure, and renders the final report.
