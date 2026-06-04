# Step 11 Render And Validate

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## Manifest / stdout schema

`validate_final_artifacts` 渲染 final manifest，并在 `sidecars` 中列出固定路径 sidecars；
agent 不直接写 manifest。

```json
{
  "schema_id": "synthesis.topic_analysis_manifest",
  "schema_version": "2.0.0",
  "operation": "create",
  "language": "zh-CN",
  "sidecars": {
    "topic_interest_metadata": {
      "path": "result/sidecars/topic-interest-metadata.json",
      "hash": "",
      "content_type": "json",
      "schema_id": "topic_interest_metadata.v1"
    },
    "concept_cards_proposal": {
      "path": "result/sidecars/concept-cards-proposal.json",
      "hash": "",
      "content_type": "json",
      "schema_id": "synthesis.concept_cards_proposal"
    },
    "topic_graph_relation_proposals": {
      "path": "result/sidecars/topic-graph-relation-proposals.json",
      "hash": "",
      "content_type": "json",
      "schema_id": "synthesis.topic_graph_relation_proposals"
    }
  },
  "sections": {}
}
```

Final stdout 只需要 `analysis_manifest_path` 指向上述 manifest；不要逐一列出 sidecar path。

## 最终动作

最终只运行 `validate_final_artifacts`。`result/sections/*.json` 应由 Stage 10 runtime
在 `persist_external_statistics_report` 校验通过后物化。脚本会读取这些已物化 section，
执行完整 artifact 或 patch manifest 的一致性校验，并生成：

```text
result/topic-analysis.json
result/topic-analysis.patch.json
result/sidecars/topic-interest-metadata.json
result/sidecars/concept-cards-proposal.json
result/sidecars/topic-graph-relation-proposals.json
result/result.json
```

## 最终内容验收

最终 artifact 必须能满足 `topic_synthesis_content_contract.md` 的最低验收标准：

- `topic` 清楚定义概念、学科领域、研究范围和边界。
- `summary` 是高密度入口摘要，不是目录复述。
- `positioning` 说明 topic 的研究定位和综述价值。
- `taxonomy.summary` 将所有路线串成综合分析，`taxonomy.nodes` 给出实质路线内容。
- `timeline_events.summary` 给出历史沿革分析，`timeline_events.events` 支撑前端 marker。
- `claims` 是有证据、有边界、有置信度的综合结论。
- `comparison_matrix` 使用有解释力的比较维度。
- `debates` 说明争议焦点、证据状态和当前判断。
- `gaps` 区分研究空白、库内覆盖缺口、证据缺口和评价缺口。
- `external_literature_analysis` 分析库外概念/文献、覆盖档位和下一步入库建议。
- `coverage` 与 `statistics` 说明当前 synthesis 的可靠性和限制。
- `review_outline` 能服务 Introduction / Related Work / Literature Review workflow。
- `synthesis_report` 是连续正文，并把研究路线章节绑定到 `taxonomy.summary`、历史章节绑定到 `timeline_events.summary`。
- `paper_evidence`、`evidence_map`、`source_artifacts`、`diagnostics` 能支撑证据追溯和质量诊断。

如果某个 section 因 evidence 缺失无法深入分析，应该在该 section 和 diagnostics 中明确降级原因；
不要用空泛文字填充。

## stdout 规则

stdout 只输出合法业务 JSON object。canonical persistence 与导出渲染由 host apply 处理。

## stdout 示例

```json
{
  "kind": "topic_synthesis",
  "operation": "create",
  "analysis_manifest_path": "result/topic-analysis.json",
  "resolver_manifest_path": "runtime/payloads/resolver.json",
  "topic_definition": { "id": "object-detection", "title": "Object Detection" },
  "artifact_metadata": {}
}
```
