# Step 05 Paper Units

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## 分析目标

Paper unit 是单篇论文的结构化事实摘取，不做跨论文比较。每篇应回答：

- 这篇论文在 topic 中解决什么问题？
- 方法或系统贡献是什么？
- 实验/评价场景是什么？
- 主要发现、局限、适合进入哪条研究路线？
- 可以支持哪些 claim、timeline event、comparison dimension？
- 其引用的库外文献说明了什么背景或缺口？

## 示例

```json
{
  "analyses": [
    {
      "paper_ref": "1:ABC12345",
      "evidence_available": true,
      "bibliographic": {
        "title": "Sparse DETR",
        "year": 2021,
        "authors": ["Author A", "Author B"]
      },
      "topic_relevance": {
        "level": "core",
        "reason": "该文直接解决 DETR-style detector 的收敛和查询选择问题。"
      },
      "research_problem": {
        "text": "Reduce DETR convergence cost.",
        "scope": "DETR-style object detection training."
      },
      "method_contribution": {
        "route": "sparse-query-transformer-detectors",
        "mechanism": "Sparse query selection for transformer detection.",
        "claimed_advantage": "Faster convergence with fewer ineffective queries.",
        "target_bottleneck": "Slow matching/query learning."
      },
      "evaluation_context": {
        "datasets": ["COCO"],
        "metrics": ["AP", "epochs to convergence"],
        "baselines": ["DETR"],
        "setting": "object detection"
      },
      "graph_metrics_interpretation": {
        "role_hints": ["frontier"],
        "synthesis_use": "Use as a recent efficiency branch example.",
        "caveat": "Metrics are auxiliary and not claim evidence."
      },
      "findings": ["Improves convergence speed under DETR-style training."],
      "limitations": ["Evidence mostly from object detection benchmarks."],
      "taxonomy_hints": ["sparse-query-transformer-detectors"],
      "timeline_candidates": ["efficiency-focused DETR variants"],
      "claim_support_candidates": ["detr-efficiency-remains-central"],
      "comparison_facts": [
        { "dimension": "training cost", "value": "reduced" }
      ],
      "external_references": [],
      "citation_contexts": [],
      "missing_payloads": []
    }
  ]
}
```

## 字段语义与写作标准

- `bibliographic`：只放可核验的题名、年份、作者、venue 等基础信息；`bibliographic.authors` 必须是数组，不要写 `creators`。年份不确定时写缺失诊断，不要补猜。
- `topic_relevance`：必须是对象，`level` 只能是 `core` / `related` / `peripheral` / `excluded`，`reason` 说明“为什么这篇论文属于本 topic”。
  不要写 `high`、`medium`、`low` 或中文等级词；gate/runtime 只接受这四个英文枚举。
- `research_problem`：必须是 `{ "text": "...", "scope": "..." }`，写论文自己试图解决的具体问题，例如收敛慢、小目标弱、跨尺度特征交互昂贵、实时部署受限。
- `method_contribution`：必须包含 `route`、`mechanism`、`claimed_advantage`、`target_bottleneck`，说明它通过什么结构、训练信号、数据策略或评价设计解决问题。
- `evaluation_context`：必须包含 `datasets[]`、`metrics[]`、`baselines[]`、`setting`。后续 comparison/gaps 会依赖这里判断证据适用范围。
- `graph_metrics_interpretation`：解释 role hints 对 synthesis 的用途，例如 foundation/core/frontier/external-heavy；必须附 caveat，metrics 只是辅助排序和覆盖诊断。
- `findings`：写论文内证据支持的发现，保持 paper-local。不要在这里总结整个领域。
- `limitations`：写论文证据自己的限制，例如只在 COCO、只测离线精度、缺少部署硬件、缺少跨域实验。
- `taxonomy_hints`：提出可能所属路线，并说明依据。一个 paper 可属于多条路线，但要有机制或问题依据。
- `timeline_candidates`：只记录可能构成历史节点的事实，例如范式建立、瓶颈暴露、机制突破、benchmark 转移。
- `claim_support_candidates`：记录该 paper 可支持的 topic-level claim seed，但不要直接写最终 claim。
- `comparison_facts`：只能写本论文自己的事实，用于后续比较矩阵；不要把其他论文拉进来比较。
- `external_references`：来自 references artifact，说明外部文献被这篇论文如何使用：背景、方法来源、benchmark、理论基础或批评对象。
- `citation_contexts`：来自 citation analysis artifact，聚焦 report 中可解释 topic 外部依赖的段落。
- `missing_payloads`：由 host artifact 状态决定。缺 digest 时，不能写主 claim/timeline candidate；缺 references 时，不写 external references；缺 citation analysis 时，不写 citation contexts。
- `digest_locator` 和 `payload_hash` 由 runtime 管理，不要写入 analysis。digest 缺失时，`evidence_available` 必须是 `false`，且 `claim_support_candidates` 与 `timeline_candidates` 必须为空数组。

## 合格内容示例

```json
{
  "paper_ref": "1:DETR2020",
  "evidence_available": true,
  "bibliographic": {
    "title": "End-to-End Object Detection with Transformers",
    "year": 2020,
    "authors": ["Carion et al."]
  },
  "topic_relevance": {
    "level": "core",
    "reason": "该文把目标检测重写为 object queries 与 bipartite matching 的 set prediction 问题，是后续 DETR-style 路线的概念起点。"
  },
  "research_problem": {
    "text": "传统检测 pipeline 依赖 anchor/proposal/NMS 等手工组件，难以形成端到端集合预测框架。",
    "scope": "object detection pipeline design"
  },
  "method_contribution": {
    "route": "set-prediction-detectors",
    "mechanism": "使用 transformer encoder-decoder 和 learned object queries 直接预测对象集合，并用 Hungarian matching 训练。",
    "claimed_advantage": "减少手工检测组件并支持端到端集合预测。",
    "target_bottleneck": "anchor/proposal/NMS pipeline complexity"
  },
  "evaluation_context": {
    "datasets": ["COCO"],
    "metrics": ["AP", "convergence speed"],
    "baselines": ["Faster R-CNN"],
    "setting": "object detection"
  },
  "graph_metrics_interpretation": {
    "role_hints": ["foundation"],
    "synthesis_use": "作为 DETR-style set prediction 路线的概念起点。",
    "caveat": "图指标只辅助定位，不替代 digest 证据。"
  },
  "findings": [
    "set prediction 证明了端到端检测可行，但训练收敛慢成为后续路线的主要瓶颈。"
  ],
  "taxonomy_hints": [
    {
      "route_id": "route:set-prediction-detectors",
      "basis": "核心建模单元是 object query 与 bipartite matching。"
    }
  ],
  "timeline_candidates": [
    {
      "event_seed": "paradigm establishment",
      "why_milestone": "改变了检测问题定义，并直接触发收敛/注意力/实时化后续路线。"
    }
  ],
  "claim_support_candidates": [
    {
      "claim_seed": "DETR-family work shifts object detection from pipeline engineering toward query-based set prediction.",
      "support_scope": "由该文的模型定义和训练目标支持。"
    }
  ],
  "comparison_facts": [],
  "external_references": [],
  "citation_contexts": [],
  "missing_payloads": []
}
```

## 不合格反例

```json
{
  "paper_ref": "1:DETR2020",
  "topic_relevance": "high",
  "research_problem": "object detection",
  "method_contribution": "提出了一个效果很好的模型",
  "findings": ["DETR 是最重要的方法，因此整个领域已经转向 transformer。"],
  "taxonomy_hints": ["transformer"],
  "timeline_candidates": ["2020 paper"]
}
```

问题：没有说明 topic 边界、具体瓶颈、方法机制、评价场景和证据适用范围；`findings`
把单篇事实扩展成领域总评；taxonomy/timeline 候选只是标签，无法支持后续综合。
