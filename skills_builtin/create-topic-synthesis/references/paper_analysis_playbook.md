# Paper Analysis 扩展

> 本文件是可选扩展材料，不是执行硬约束。硬约束以 `SKILL.md` 为准。需要提升逐篇
> paper analysis 质量、处理 payload 缺失或提取外部文献语境时再读取本文件。

## 1. 单篇分析 row 模板

推荐每篇 paper 形成如下结构：

```json
{
  "paper_ref": "1:DETR2020",
  "bibliographic": {
    "title": "End-to-End Object Detection with Transformers",
    "year": 2020,
    "authors": ["Carion et al."]
  },
  "evidence_available": true,
  "topic_relevance": "该文把 object detection 表述为 set prediction，是检测 transformer 路线的关键起点。",
  "method_contribution": {
    "role": "method",
    "summary": "提出 DETR，用 transformer encoder-decoder 和 bipartite matching 取代传统手工 anchor/NMS 流程。"
  },
  "findings": [
    {
      "text": "端到端集合预测能减少检测后处理，但训练收敛较慢。",
      "support": "digest"
    }
  ],
  "timeline_candidates": [
    {
      "year": 2020,
      "label": "DETR introduces set-prediction detection",
      "basis": "paper publication year and digest method summary"
    }
  ],
  "claim_support_candidates": [
    {
      "claim_seed": "Transformer-based detectors shifted object detection toward set prediction.",
      "stance": "supports"
    }
  ],
  "citation_contexts": [
    {
      "external_ref": "Hungarian algorithm",
      "usage": "用于解释 bipartite matching 的优化基础"
    }
  ],
  "external_references": [
    {
      "title": "The Hungarian method for the assignment problem",
      "year": 1955,
      "source": "references-json"
    }
  ],
  "limitations": [
    "citation-analysis-json missing; external citation usage confidence is limited"
  ]
}
```

## 2. payload 使用原则

- `digest-markdown`：主证据来源，用来支撑 `findings`、`timeline_candidates`、
  `claim_support_candidates`。
- `references-json`：外部文献列表来源，用来识别代表性外部文献。
- `citation-analysis-json`：外部文献引用语境来源，用来判断“为什么引用它”。

不要把 `references-json` 中信息不足的库外文献直接变成主 claim 或主 timeline evidence。

## 3. payload 缺失处理

缺失 `citation-analysis-json` 示例：

```json
{
  "paper_ref": "1:DETR2020",
  "missing_payloads": ["citation-analysis-json"],
  "analysis_policy": "continue_with_digest_and_references",
  "coverage_effect": {
    "external_literature_analysis": "partial",
    "main_claims": "allowed_if_digest_supports"
  },
  "limitations": [
    "无法稳定判断该 paper 对库外文献的引用语境，只能使用 references-json 做代表性文献列表。"
  ]
}
```

缺失 `digest-markdown` 示例：

```json
{
  "paper_ref": "1:UNKNOWN",
  "evidence_available": false,
  "missing_payloads": ["digest-markdown"],
  "analysis_policy": "exclude_from_primary_evidence",
  "claim_support_candidates": [],
  "timeline_candidates": [],
  "coverage_effect": {
    "paper_evidence": "not_allowed",
    "external_literature_analysis": "allowed_if_references_exist"
  },
  "limitations": [
    "缺少 digest-markdown，不能作为 claims 或 timeline 的主证据。"
  ]
}
```

## 4. 质量检查

逐篇 row 完成后检查：

- 是否有 `paper_ref`。
- 是否记录 `evidence_available`，并在缺 digest 时清空主证据候选。
- findings 是否都能回到 digest。
- timeline candidates 是否有 year 或 phase。
- external references 是否只用于外部文献分析。
- limitations 是否覆盖缺失 payload 和弱证据。
