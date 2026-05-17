# Paper Analysis 扩展

> 本文件是可选扩展材料，不是执行硬约束。硬约束以 `SKILL.md` 为准。需要提升逐篇
> paper analysis 质量、处理 payload 缺失或提取外部文献语境时再读取本文件。

## 1. 更新场景中的分析 row

update 不一定重读全部 paper。每个受影响 paper 建议形成如下结构：

```json
{
  "paper_ref": "1:DETR2020",
  "change_reason": "digest_changed",
  "affected_sections": ["claims", "coverage"],
  "evidence_available": true,
  "topic_relevance_delta": "主题归属未变，但 digest 新增了训练收敛局限。",
  "method_contribution_delta": {
    "new_or_changed": true,
    "summary": "新增对训练收敛慢和多尺度特征需求的描述。"
  },
  "findings_delta": [
    {
      "text": "DETR 的端到端形式减少后处理，但收敛速度是持续改进对象。",
      "support": "digest"
    }
  ],
  "timeline_candidates_delta": [],
  "claim_support_candidates_delta": [
    {
      "claim_seed": "Early detection transformers traded pipeline simplicity for training difficulty.",
      "stance": "supports"
    }
  ],
  "external_references_delta": [],
  "limitations": []
}
```

## 2. patch 场景 payload 使用原则

- 只读取受影响 sections 所需 payload。
- 更新 `coverage` 时，可只读取 payload availability 与 diagnostics。
- 更新 `external_literature_analysis` 时，重点读取 `references-json` 与
  `citation-analysis-json`。
- 更新 `claims` 或 `timeline_events` 时，必须有 `digest-markdown` 支撑。

## 3. payload 缺失处理

patch 中发现缺失 `digest-markdown`：

```json
{
  "paper_ref": "1:NEW",
  "evidence_available": false,
  "missing_payloads": ["digest-markdown"],
  "patch_policy": "do_not_add_primary_evidence",
  "claim_support_candidates": [],
  "timeline_candidates": [],
  "affected_sections": ["coverage", "diagnostics"],
  "limitations": [
    "新增 paper 缺少 digest，不能加入 paper_evidence，只能更新 coverage。"
  ]
}
```

patch 中发现外部文献 payload 缺失：

```json
{
  "paper_ref": "1:DETR2020",
  "missing_payloads": ["references-json", "citation-analysis-json"],
  "patch_policy": "keep_existing_external_literature_analysis",
  "affected_sections": ["coverage"],
  "limitations": [
    "本次不替换 external_literature_analysis，因为缺少外部文献输入。"
  ]
}
```

## 4. 质量检查

逐篇 delta row 完成后检查：

- 是否说明 `change_reason`。
- 是否列出 `affected_sections`。
- 是否避免替换未读取 section。
- 新增 claim/timeline 是否仍引用库内 paper evidence。
- payload 缺失是否进入 coverage/diagnostics，而不是被忽略。
