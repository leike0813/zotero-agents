# Section Authoring 扩展

> 本文件是可选扩展材料，不是执行硬约束。硬约束以 `SKILL.md` 为准。需要提升
> claims、timeline、paper evidence、external literature analysis 写作质量时再读取本文件。

## 1. 完整 create sections

create 输出应覆盖：

- `topic`
- `summary`
- `claims`
- `timeline_events`
- `paper_evidence`
- `external_literature_analysis`
- `coverage`
- `gaps`
- `source_artifacts`
- `diagnostics`

manifest section entry 示例：

```json
{
  "claims": {
    "path": "result/sections/claims.json",
    "hash": "sha256:claims",
    "content_type": "json"
  }
}
```

## 2. paper_evidence 示例

```json
{
  "id": "pe:detr2020",
  "paper_ref": "1:DETR2020",
  "title": "End-to-End Object Detection with Transformers",
  "year": 2020,
  "evidence_summary": "DETR frames detection as direct set prediction with transformer encoder-decoder and bipartite matching.",
  "evidence_note": "digest_ref 由 runtime 根据 bundle receipt 注入，不要手写"
}
```

`paper_evidence` 只能包含 resolved paper set 内的库内 paper。

## 3. claims 示例

```json
[
  {
    "id": "claim:set-prediction-shift",
    "text": "Transformer-based detectors pushed object detection toward end-to-end set prediction.",
    "stance": "finding",
    "evidence_refs": ["pe:detr2020"],
    "confidence": 0.82,
    "limitations": ["当前证据主要来自已入库 detection transformer paper。"]
  }
]
```

`evidence_refs` 只能引用 `paper_evidence[*].id`，不能引用库外 reference。

## 4. timeline_events 示例

```json
[
  {
    "id": "event:detr-2020",
    "year": 2020,
    "label": "DETR introduces end-to-end set prediction",
    "description": "DETR connects transformer sequence modeling with object detection and reduces hand-designed post-processing.",
    "evidence_refs": ["pe:detr2020"],
    "phase": "transformer_detection"
  }
]
```

timeline marker 只代表库内 paper 或主题 phase/event，不直接代表库外 references。

## 5. external_literature_analysis 示例

```json
{
  "summary": "库外文献主要提供 assignment optimization、transformer architecture 和检测评估传统三个背景脉络。",
  "themes": [
    {
      "id": "theme:assignment",
      "title": "集合匹配与 assignment optimization",
      "analysis": "DETR 等库内 paper 引用这些工作来解释 bipartite matching 的优化基础。"
    }
  ],
  "representative_references": [
    {
      "title": "The Hungarian method for the assignment problem",
      "year": 1955,
      "cited_by_papers": ["1:DETR2020"],
      "information_completeness": "partial"
    }
  ],
  "citation_contexts": [
    {
      "citing_paper_ref": "1:DETR2020",
      "reference_title": "The Hungarian method for the assignment problem",
      "usage": "作为 matching loss 的算法背景。"
    }
  ],
  "contribution_to_topic": "这些外部文献解释了库内 object detection 方法为何采用 matching、transformer 或 benchmark tradition。",
  "limitations": "references-json 信息不足时，不应把库外文献当成主证据。"
}
```

## 6. coverage 与 diagnostics

coverage 示例：

```json
{
  "paper_count": 10,
  "paper_evidence_count": 8,
  "external_literature_count": 42,
  "missing_payloads": [
    {"paper_ref": "1:XYZ", "payload_type": "citation-analysis-json"}
  ],
  "coverage_summary": "主结论由 8 篇有 digest 的库内 paper 支撑，外部文献分析覆盖不完整。"
}
```

diagnostics 示例：

```json
{
  "warnings": [
    "2 papers lack citation-analysis-json; external literature context may be incomplete."
  ],
  "quality_flags": ["external_literature_partial"]
}
```
