# Step 03 Metrics And Artifacts

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## Citation Graph Metrics

调用 `synthesis.get_citation_graph_metrics` 时只把 metrics 当作辅助结构信号：

- `core` / `foundation`：适合影响背景脉络和关键路线排序。
- `frontier`：适合影响近期趋势与未来方向。
- `isolated`：适合作为 coverage caveat。
- `external-heavy`：适合进入外部文献分析和 coverage diagnostics。

metrics 不得作为 claim/timeline 的证据。

`persist_citation_graph_metrics` 的 payload 顶层必须带上请求批次的 `paper_refs[]`，
这样 runtime 才能把 action receipt 绑定到 workset：

```json
{
  "paper_refs": ["1:ABC12345", "1:DEF67890"],
  "result": {
    "ok": true,
    "items": []
  }
}
```

## Filtered Artifact Export

主路径使用 `synthesis.export_filtered_paper_artifacts`。它由 host 写文件，agent 不手写
artifact manifest，也不复制 hash。

```json
{
  "run_root": "D:/.../runtime/acp/skill-runs/acp-skill-xxx",
  "paper_refs": ["1:ABC12345", "1:DEF67890"]
}
```

缺 artifact 不是 blocker，但必须进入 diagnostics。

host 写出的 `runtime/payloads/paper-artifacts-manifest.json` 中，每个 artifact row
都必须有 `payload_types_seen[]`：

```json
{
  "paper_ref": "1:ABC12345",
  "artifact_type": "digest",
  "payload_type": "digest-markdown",
  "status": "missing",
  "missing_reason": "not_found",
  "payload_types_seen": []
}
```

如果 row 的 `status` 是 `available`，`payload_types_seen` 必须包含该 row 的
`payload_type`。如果 row 的 `status` 是 `missing`，`payload_types_seen` 不能包含该
row 的 `payload_type`。


