# Step 09 KG Proposal Sidecars

> 可选扩展材料：硬约束以 `SKILL.md` 为准。本文件只补充 KG proposal 的判断口径和示例。

本步骤在 `persist_core_sections` 之后执行，目标是把既有 topic 本次更新中已经形成的语义上下文转成插件可摄取的 KG proposal sidecars，并同步生成 topic discovery 使用的 `topic_interest_metadata`。你只写 proposal 和 discovery metadata，不写 canonical KG assets，也不把这些内容写进最终正文 section。

## Payload schema

写入 `runtime/payloads/kg-proposals.json`。完整约束以
`assets/schemas/kg_proposals.schema.json` 为准；语义解释见下文。

```json
{
  "schema_id": "synthesis.topic_synthesis_kg_proposals",
  "schema_version": "1.0.0",
  "concept_cards_proposal": { "cards": [], "diagnostics": [] },
  "topic_graph_relation_proposals": { "proposals": [], "diagnostics": [] },
  "topic_interest_metadata": {
    "schema": "topic_interest_metadata.v1",
    "topic_id": "",
    "include_terms": [],
    "must_have_terms": [],
    "methods": [],
    "exclude_terms": [],
    "seed_literature_item_ids": [],
    "diagnostics": []
  }
}
```

## 上下文使用原则

优先使用前序步骤自然积累在当前会话中的上下文：既有 topic boundary、本次更新理由、route/timeline、core sections、cross-paper evidence map、cross-paper context，以及你刚刚形成的 claim/debate/gap 判断。不要为了本步骤机械重读所有前序文件；这会浪费 token，也容易把本阶段变成重复摘要。

若实在有必要，再重新读取最小必要片段，例如：

- 忘记某个 `paper_ref`、`evidence_refs` 或 evidence map id，需要核对引用。
- 当前记忆中的 route/timeline 与 core section 有冲突，需要确认哪一个是已校验版本。
- 需要确认当前 topic 的 `topic_definition.id`、title 或已有边界，避免 sidecar 里写错 source topic。

最小回读的原则是“只核对缺口，不重新做前序分析”。Step 09 的任务是抽取 KG proposal，不是再写一版 route、claim 或 report。

## 输出结构

写入 `runtime/payloads/kg-proposals.json`，runtime 会校验并物化三类必交 sidecar：

```json
{
  "schema_id": "synthesis.topic_synthesis_kg_proposals",
  "schema_version": "1.0.0",
  "concept_cards_proposal": {
    "schema_id": "synthesis.concept_cards_proposal",
    "schema_version": "1.0.0",
    "topic_id": "object-detection-transformers",
    "cards": [],
    "diagnostics": []
  },
  "topic_graph_relation_proposals": {
    "schema_id": "synthesis.topic_graph_relation_proposals",
    "schema_version": "1.0.0",
    "source_topic_id": "object-detection-transformers",
    "proposals": [],
    "diagnostics": []
  },
  "topic_interest_metadata": {
    "schema": "topic_interest_metadata.v1",
    "topic_id": "object-detection-transformers",
    "include_terms": [],
    "must_have_terms": [],
    "methods": [],
    "exclude_terms": [],
    "seed_literature_item_ids": [],
    "diagnostics": []
  }
}
```

三类输出都必交可空。没有可靠 proposal 或 metadata seed 时也必须写空数组，并在对应 `diagnostics[]` 中说明原因；不能跳过本步骤，也不能省略文件。

## Concept Card Proposal 判断口径

`concept_cards_proposal.cards[]` 面向 Concept KB 的候选概念卡。值得建卡的对象通常满足至少两条：

- 跨多篇论文复用，能帮助读者理解既有 topic 的研究路线或问题边界。
- 支撑了 taxonomy、timeline、claim、debate、gap 中的关键判断。
- 是机制、任务、评价口径、数据资源、训练信号、瓶颈或方法范式，而不是单篇论文事实。
- 有明确证据来源，可以用 paper evidence、evidence map 或 core section 中的判断解释其 topic relevance。

不应建卡的对象：

- 普通论文标题、模型昵称或一次性模块名，除非它已经成为跨论文复用概念。
- “有效”“先进”“复杂”这类形容词。
- 没有库内证据支持、只来自通用世界知识的领域常识。
- 过细到只服务单个 implementation detail 的术语。

建议字段语义：

- `local_id`：本 sidecar 内稳定可读的临时 id，如 `concept:set-prediction`；不是 canonical concept id。
- `label`：概念主显示名，避免把缩写当唯一名称。
- `aliases`：同义词、缩写、常见变体。
- `concept_type`：使用建议控制词表 `method_family` / `mechanism` / `task` / `benchmark` / `dataset` / `evaluation_axis` / `training_signal` / `theoretical_construct`。
- `domain`：概念所在领域或 topic 子域。
- `short_definition`：一句话定义，适合 bubble/inspector。
- `definition`：解释边界、用途、与当前 topic 的关系。
- `disambiguation`：容易混淆的相邻概念和边界。
- `topic_relevance`：为什么这个概念对当前 topic synthesis 有用。
- `evidence`：支撑该概念的 paper refs、evidence refs、route/claim/gap refs。
- `relations`：与同一 proposal 中其他概念的轻量关系，如 `uses`、`contrasts_with`、`part_of`。
- `merge_hints`：可能与已有概念合并的名称线索；不要写 canonical concept id。
- `confidence`：0 到 1 的置信度；低置信但有价值的概念可进入 proposal，同时解释 diagnostics。

## Topic Graph Relation Proposal 判断口径

`topic_graph_relation_proposals.proposals[]` 面向 Topic Graph 的候选关系。关系必须基于既有 topic 的边界、本次更新后的 route/timeline、core claims/debates/gaps 与已知 topic context 的语义关系，而不是仅凭名称相似或 LLM 常识。

允许的 proposal type：

- `broader_topic_candidate`：候选 target 是当前 topic 的上位主题。判断标准是 target 能合理包含当前 topic 的主要研究问题、方法族或任务范围。
- `related_topic_candidate`：两个 topic 共享关键机制、数据、任务背景或研究路线，但不存在明确包含关系。
- `overlap_topic_candidate`：两个 topic 的 paper set、概念边界或核心问题存在实质交叉，可能需要后续人工确认边界。
- `contrast_topic_candidate`：两个 topic 在问题设定、方法范式、评价口径或研究立场上形成有用对照。

每条 proposal 应说明：

- `proposal_type`：只能使用 `broader_topic_candidate` / `related_topic_candidate` / `overlap_topic_candidate` / `contrast_topic_candidate`。
- `target_topic_id` 或 `target_topic_title`：如果 id 不确定，可写 title 并降低 confidence。
- `rationale`：为什么这条关系成立，必须指向 topic boundary、route、claim、debate 或 gap 的具体判断。
- `evidence`：相关 paper refs、evidence map refs、section refs 或简短证据摘要。
- `confidence`：0 到 1。低置信关系不要硬凑为高置信。
- `diagnostics`：候选 topic 不明确、证据不足、可能形成 broader cycle、边界重叠过大等问题。

不要写 canonical edge id；插件负责转换、去重、cycle/review 规则和 canonical 摄取。若候选关系主要来自名称相似、而当前 synthesis 没有语义支撑，应写 diagnostics，不应写成有效 proposal。

## Topic Interest Metadata 判断口径

`topic_interest_metadata` 面向后续 topic discovery、匹配和候选召回，不进入最终正文 section。它应该从既有 topic boundary、本次更新理由、scope、route/timeline、core sections、cross-paper evidence map 和库内论文集合中抽取检索语义，不是再写摘要，也不是生成 citation ranking。

字段规则：

- `include_terms`：用于召回的扩展术语。优先来自 topic title、aliases、scope include、跨论文反复出现的核心概念、任务名、机制名和稳定问题表述。最多 16 个；不要为了凑数填入 `method`、`model`、`performance` 这类泛词。
- `must_have_terms`：最能界定 topic 的强边界词。通常是 title 的关键短语、必要任务/对象/场景组合或不可缺少的方法族。最多 6 个；应比 `include_terms` 更少、更强。
- `methods`：只有当方法、模型族、算法、评测协议、数据集或机制确实构成 topic 边界时才填写。最多 8 个；不要把 citation graph metrics 或排序指标当作方法来源。
- `exclude_terms`：用于排除歧义和相邻但不属于本 topic 的方向。优先来自 scope exclude、相邻 topic 边界、常见 false positive 或本 synthesis 明确排除的任务/方法。最多 8 个。
- `seed_literature_item_ids`：只能填写当前库内已经解析出的 literature item id，例如 resolved paper set、paper workset、paper evidence 中可追溯的 item id。最多 50 个；不发明 id，不使用外部文献、未入库参考文献或纯 citation context 作为 seed。
- `diagnostics`：记录保守为空、边界不清、seed 不可追溯、术语证据不足等原因。不要用 diagnostics 替代必填数组。

边界要求：

- 不为凑数填泛词，不把章节标题或普通形容词当 discovery term。
- 不用外部文献作为 `seed_literature_item_ids`；外部文献只能帮助解释 coverage 或背景，不能成为库内 seed。
- 不把 citation metrics、PageRank、centrality 或引用数量当语义来源；它们只能辅助诊断和排序，不能单独证明 interest metadata。
- 不发明 literature item id；无法确认时保持空数组并写 diagnostics。

## 合格示例

```json
{
  "schema_id": "synthesis.topic_synthesis_kg_proposals",
  "schema_version": "1.0.0",
  "concept_cards_proposal": {
    "schema_id": "synthesis.concept_cards_proposal",
    "schema_version": "1.0.0",
    "topic_id": "detr-object-detection",
    "cards": [
      {
        "local_id": "concept:set-prediction",
        "label": "Set prediction",
        "aliases": [
          "bipartite matching prediction",
          "Hungarian matching formulation"
        ],
        "concept_type": "method_family",
        "domain": "object detection",
        "short_definition": "A detection formulation that predicts a set of objects and matches predictions to targets globally.",
        "definition": "In this topic, set prediction marks the shift away from dense anchor heuristics toward global object-query matching.",
        "disambiguation": "Do not merge with generic sequence set prediction unless the object detection matching context is explicit.",
        "topic_relevance": "It anchors the route that reframes object detection as end-to-end matching and explains later convergence-focused variants.",
        "evidence": {
          "paper_refs": ["1:DETR2020", "1:DABDETR2022"],
          "evidence_map_refs": ["claim:set-prediction-reframes-detection"]
        },
        "relations": [
          {
            "type": "contrasts_with",
            "target_local_id": "concept:dense-anchors"
          }
        ],
        "merge_hints": ["set prediction", "object query matching"],
        "confidence": 0.88
      }
    ],
    "diagnostics": []
  },
  "topic_graph_relation_proposals": {
    "schema_id": "synthesis.topic_graph_relation_proposals",
    "schema_version": "1.0.0",
    "source_topic_id": "detr-object-detection",
    "proposals": [
      {
        "proposal_type": "broader_topic_candidate",
        "target_topic_title": "Object Detection",
        "rationale": "The current topic is bounded to DETR-style object detection, while the target covers the broader detection task and non-transformer baselines referenced in coverage gaps.",
        "evidence": {
          "section_refs": ["positioning", "gaps:traditional-detector-baseline"],
          "paper_refs": ["1:DETR2020"]
        },
        "confidence": 0.82
      }
    ],
    "diagnostics": []
  },
  "topic_interest_metadata": {
    "schema": "topic_interest_metadata.v1",
    "topic_id": "detr-object-detection",
    "include_terms": [
      "DETR object detection",
      "set prediction",
      "object query matching",
      "Hungarian matching",
      "end-to-end object detection"
    ],
    "must_have_terms": ["object detection", "DETR", "set prediction"],
    "methods": ["DETR", "Hungarian matching", "object queries"],
    "exclude_terms": ["semantic segmentation", "generic transformer NLP"],
    "seed_literature_item_ids": ["lit:detr2020", "lit:dab-detr2022"],
    "diagnostics": []
  }
}
```

空 proposal 也是合格输出，只要说明原因：

```json
{
  "schema_id": "synthesis.topic_synthesis_kg_proposals",
  "schema_version": "1.0.0",
  "concept_cards_proposal": {
    "schema_id": "synthesis.concept_cards_proposal",
    "schema_version": "1.0.0",
    "cards": [],
    "diagnostics": [
      {
        "code": "no_stable_concept_candidates",
        "message": "The current paper set uses inconsistent terminology and no concept recurs across enough evidence-backed sections."
      }
    ]
  },
  "topic_graph_relation_proposals": {
    "schema_id": "synthesis.topic_graph_relation_proposals",
    "schema_version": "1.0.0",
    "proposals": [],
    "diagnostics": [
      {
        "code": "insufficient_topic_context",
        "message": "No candidate neighboring topic was available with enough boundary evidence for a relation proposal."
      }
    ]
  },
  "topic_interest_metadata": {
    "schema": "topic_interest_metadata.v1",
    "topic_id": "object-detection-transformers",
    "include_terms": [],
    "must_have_terms": [],
    "methods": [],
    "exclude_terms": [],
    "seed_literature_item_ids": [],
    "diagnostics": [
      {
        "code": "insufficient_interest_metadata_evidence",
        "message": "The topic boundary was too broad and no resolved library item id was safe to use as a discovery seed."
      }
    ]
  }
}
```

## 不合格反例

```json
{
  "concept_cards_proposal": {
    "cards": [{ "label": "DETR", "canonical_concept_id": "concept:detr" }],
    "diagnostics": []
  },
  "topic_graph_relation_proposals": {
    "proposals": [
      {
        "proposal_type": "related_topic_candidate",
        "target_topic_title": "Transformer",
        "canonical_edge_id": "edge:related_to:detr:transformer",
        "rationale": "The names sound related."
      }
    ],
    "diagnostics": []
  },
  "topic_interest_metadata": {
    "schema": "topic_interest_metadata.v1",
    "topic_id": "detr-object-detection",
    "include_terms": ["AI", "model", "performance", "paper"],
    "must_have_terms": ["AI"],
    "methods": ["high PageRank papers"],
    "exclude_terms": [],
    "seed_literature_item_ids": [
      "made-up-item-id",
      "external:arxiv-only-paper"
    ],
    "diagnostics": []
  }
}
```

问题：把单个模型名当作概念，没有定义和证据；写入了 canonical id；topic relation 只靠名称相似，没有 topic boundary、route、claim 或 gap 支撑；metadata 用泛词凑数，把 citation metrics 当语义来源，并发明了不可追溯的 literature item id。

```json
{
  "schema_id": "synthesis.topic_synthesis_kg_proposals",
  "schema_version": "1.0.0"
}
```

问题：用“没有 proposal”逃避必交 sidecar。即使没有可靠候选，也必须写 `cards: []`、`proposals: []`、`topic_interest_metadata` 的必填数组和 diagnostics。
