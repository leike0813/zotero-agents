# Topic Synthesis Section Examples

本文件只提供当前合同的短示例；执行硬约束以 schema、gate 输出和 `SKILL.md` 为准。

## Core Synthesis Excerpt

```json
{
  "taxonomy": {
    "summary": {
      "text": "The topic separates into set-prediction formulation, convergence acceleration, and deployment-oriented efficiency routes."
    },
    "nodes": [
      {
        "id": "route:set-prediction",
        "definition": "Object detection formulated as global set prediction with object queries.",
        "core_problem": "Reduce hand-authored detection pipeline components.",
        "mechanism": "Transformer decoder queries with bipartite matching.",
        "representative_papers": ["1:DETR2020"],
        "strengths": ["Clear end-to-end formulation"],
        "limitations": ["Training efficiency remains a bottleneck"],
        "maturity": "foundation",
        "relation_to_other_routes": "Provides the baseline formulation for convergence and efficiency routes.",
        "source_paper_refs": ["1:DETR2020"]
      }
    ]
  },
  "timeline_events": {
    "summary": {
      "text": "The historical progression starts from formulation, then moves toward convergence and efficiency."
    },
    "events": [
      {
        "id": "event:detr-formulation",
        "year": 2020,
        "description": "Set prediction becomes a viable object detection formulation.",
        "phase": "foundation",
        "historical_role": "Establishes the route baseline.",
        "follow_on_effect": "Motivates later convergence and query-design work.",
        "source_paper_refs": ["1:DETR2020"]
      }
    ]
  },
  "positioning": {
    "importance": "Defines a route for end-to-end object detection.",
    "field_position": "Object detection and transformer-based vision models.",
    "review_position": "Use as a route-centered synthesis topic.",
    "scope_boundary": {
      "include": ["DETR-style object detection"],
      "exclude": ["generic transformer NLP"]
    },
    "source_paper_refs": ["1:DETR2020"]
  },
  "claims": [
    {
      "id": "claim:set-prediction-shift",
      "text": "The topic shifts detection from component pipelines toward query-based set prediction.",
      "analysis": "The route baseline changes the problem formulation and makes matching/query design central.",
      "confidence": "high",
      "scope": "DETR-style object detection",
      "source_paper_refs": ["1:DETR2020"]
    }
  ],
  "improvement_dimension_summary": {
    "text": "Progress is best explained through formulation clarity, convergence behavior, and deployment efficiency."
  },
  "improvement_dimensions": [
    {
      "id": "dim:convergence",
      "label": "Convergence behavior",
      "analysis": "Later work improves training efficiency while preserving the set-prediction framing.",
      "source_paper_refs": ["1:DETR2020"]
    }
  ],
  "concept_candidate_labels": ["Set prediction", "Object queries"],
  "debates": [
    {
      "id": "debate:pipeline-vs-set-prediction",
      "title": "Pipeline components versus set prediction",
      "positions": ["component pipeline", "query-based set prediction"],
      "evaluation_axis": "simplicity and empirical robustness",
      "current_judgment": "Set prediction clarifies formulation but creates optimization pressure.",
      "source_paper_refs": ["1:DETR2020"]
    }
  ],
  "gaps": [
    {
      "id": "gap:deployment-evidence",
      "title": "Deployment evidence remains uneven",
      "gap_type": "evidence_gap",
      "severity": "medium",
      "recommended_action": "Add deployment-focused evaluations.",
      "source_paper_refs": ["1:DETR2020"]
    }
  ],
  "review_outline": {
    "introduction_logic": [
      "Define the set-prediction route and its bottlenecks."
    ],
    "body_sections": ["Formulation", "Convergence", "Efficiency"]
  }
}
```
