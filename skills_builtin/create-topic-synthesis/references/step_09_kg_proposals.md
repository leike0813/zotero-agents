# Step 09 KG Proposal Sidecars

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

本步骤在 `persist_core_sections` 之后执行。目标是把当前 topic synthesis 已经形成的语义上下文转成插件可摄取的 KG proposal sidecars，并同步生成 topic discovery 使用的 interest metadata。你只写 proposal 和 discovery metadata，不写 canonical KG assets，也不把这些内容写进最终正文 section。

## Payload schema

写入 `runtime/payloads/kg-proposals.json`。主路径使用扁平 payload：

```json
{
  "schema_id": "synthesis.topic_synthesis_kg_proposals",
  "schema_version": "1.0.0",
  "concept_cards": [],
  "topic_relations": [],
  "topic_interest": {
    "schema": "topic_interest_metadata.v1",
    "topic_id": "",
    "include_terms": [],
    "must_have_terms": [],
    "methods": [],
    "exclude_terms": [],
    "seed_literature_item_ids": [],
    "diagnostics": []
  },
  "diagnostics": []
}
```

runtime 会把它归一化并物化为：

```text
result/sidecars/concept-cards-proposal.json
result/sidecars/topic-graph-relation-proposals.json
result/sidecars/topic-interest-metadata.json
```

`concept_cards[]`、`topic_relations[]`、`topic_interest` 都必交可空。没有可靠候选时写空数组，并在 `diagnostics[]` 或 `topic_interest.diagnostics[]` 说明原因。
不能跳过本步骤。

## 上下文使用原则

优先使用前序步骤自然积累在当前会话中的上下文：topic boundary、route/timeline、core sections、
cross-paper context，以及你刚刚形成的 claim/debate/gap 判断。不要为了本步骤机械重读所有前序文件。
如果需要核对某个 paper ref、section ref、topic id 或术语边界，只核对缺口，不重新做前序分析。

## Concept Cards

`concept_cards[]` 面向 Concept KB 的候选概念卡。值得建卡的对象通常满足至少两条：

- 跨多篇论文复用，能帮助读者理解 topic 的研究路线或问题边界。
- 支撑 taxonomy、timeline、claim、debate、gap 中的关键判断。
- 是机制、任务、评价口径、数据资源、训练信号、瓶颈或方法范式，而不是单篇论文事实。
- 有明确证据来源，可以用 `source_paper_refs`、section refs 或简短证据摘要解释其 topic relevance。

建议字段：

- `local_id`：sidecar 内稳定临时 id，不是 canonical concept id。
- `label`、`aliases`、`concept_type`、`domain`。
- `short_definition`、`definition`、`disambiguation`、`topic_relevance`。
- `evidence`：可包含 `source_paper_refs`、section refs 或简短证据摘要。
- `relations`、`merge_hints`、`confidence`、`diagnostics`。

`concept_type` 建议控制词表：`method_family` / `mechanism` / `task` / `benchmark` /
`dataset` / `evaluation_axis` / `training_signal` / `theoretical_construct`。

## Topic Relations

`topic_relations[]` 面向 Topic Graph 的候选关系。关系必须基于 topic boundary、route、claim、debate 或 gap 的语义证据，而不是仅凭名称相似。

`proposal_type` 只允许：

- `broader_topic_candidate`
- `related_topic_candidate`
- `overlap_topic_candidate`
- `contrast_topic_candidate`

每条 relation 应写：

- `proposal_type`
- `target_topic_id` 或 `target_topic_title`
- `rationale`
- `evidence`
- `confidence`
- `diagnostics`

不要写 canonical edge id；插件负责转换、去重、cycle/review 规则和 canonical 摄取。

## Topic Interest

`topic_interest` 面向后续 topic discovery、匹配和候选召回，不进入最终正文 section。

- `include_terms`：召回扩展术语，最多 16 个。
- `must_have_terms`：强边界词，最多 6 个。
- `methods`：确实构成 topic 边界的方法、模型族、算法、评测协议、数据集或机制，最多 8 个。
- `exclude_terms`：排除歧义或相邻但不属于本 topic 的方向，最多 8 个。
- `seed_literature_item_ids`：只能写当前库内已解析出的 literature item id，最多 50 个。
- `diagnostics`：记录保守为空、边界不清、seed 不可追溯、术语证据不足等原因。

不发明 literature item id；不使用外部文献、未入库参考文献或纯 citation context 作为 seed。
不把 citation metrics、PageRank、centrality 或引用数量当语义来源；它们只能辅助诊断和排序。

## 合格示例

```json
{
  "schema_id": "synthesis.topic_synthesis_kg_proposals",
  "schema_version": "1.0.0",
  "concept_cards": [
    {
      "local_id": "concept:set-prediction",
      "label": "Set prediction",
      "aliases": ["bipartite matching prediction", "Hungarian matching formulation"],
      "concept_type": "method_family",
      "domain": "object detection",
      "short_definition": "A detection formulation that predicts a set of objects and matches predictions to targets globally.",
      "definition": "In this topic, set prediction marks the shift away from dense anchor heuristics toward global object-query matching.",
      "topic_relevance": "It anchors the route that reframes object detection as end-to-end matching.",
      "evidence": { "source_paper_refs": ["1:DETR2020", "1:DABDETR2022"] },
      "confidence": 0.88
    }
  ],
  "topic_relations": [
    {
      "proposal_type": "broader_topic_candidate",
      "target_topic_title": "Object Detection",
      "rationale": "The current topic is bounded to DETR-style object detection, while the target covers the broader detection task.",
      "evidence": { "section_refs": ["positioning", "gaps:traditional-detector-baseline"] },
      "confidence": 0.82
    }
  ],
  "topic_interest": {
    "schema": "topic_interest_metadata.v1",
    "topic_id": "detr-object-detection",
    "include_terms": ["DETR object detection", "set prediction", "object query matching"],
    "must_have_terms": ["object detection", "DETR"],
    "methods": ["DETR", "Hungarian matching", "object queries"],
    "exclude_terms": ["semantic segmentation", "generic transformer NLP"],
    "seed_literature_item_ids": ["lit:detr2020"],
    "diagnostics": []
  },
  "diagnostics": []
}
```

## 不合格反例

```json
{
  "concept_cards": [{ "label": "DETR", "canonical_concept_id": "concept:detr" }],
  "topic_relations": [
    {
      "proposal_type": "related_topic_candidate",
      "target_topic_title": "Transformer",
      "canonical_edge_id": "edge:related_to:detr:transformer",
      "rationale": "The names sound related."
    }
  ],
  "topic_interest": {
    "schema": "topic_interest_metadata.v1",
    "topic_id": "detr-object-detection",
    "include_terms": ["AI", "model", "performance"],
    "must_have_terms": ["AI"],
    "methods": ["high PageRank papers"],
    "exclude_terms": [],
    "seed_literature_item_ids": ["made-up-item-id"],
    "diagnostics": []
  },
  "diagnostics": []
}
```

问题：写入 canonical id；relation 只靠名称相似；metadata 用泛词凑数、把 citation metrics 当语义来源，并发明不可追溯的 literature item id。
