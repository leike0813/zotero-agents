# Step 03 Metrics And Artifacts

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## Citation Graph Metrics

调用 `synthesis.get_citation_graph_metrics` 时只把 metrics 当作辅助结构信号：

- `core` / `foundation`：适合影响背景脉络和关键路线排序。
- `frontier`：适合影响近期趋势与未来方向。
- `isolated`：适合作为 coverage caveat。
- `external-heavy`：适合进入外部文献分析和 coverage diagnostics。

metrics 不得作为 claim/timeline 的证据。

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


