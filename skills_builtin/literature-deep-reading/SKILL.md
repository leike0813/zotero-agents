---
name: literature-deep-reading
description: Generate a literature deep-reading artifact from a source bundle. Current package bootstraps source structure, collects requested Host context, and builds reading analysis views for later stages.
---

<!-- 本文件由 skills_src/literature-deep-reading 生成，请勿手工修改。 -->

# Literature Deep Reading

本 skill 用于从 `source_bundle.zip` 启动文献精读运行。当前内置包实现：

- `stage_00_bootstrap`：解包 source bundle、解析 Markdown 结构、best-effort 执行 Host preflight、建立 SQLite 和生成 bootstrap runtime views。
- `stage_10_source_reading_context_request`：agent 读取原文结构和 Host preflight 后写入 `context-request.json`，runtime 通过 Host Bridge best-effort 收集后续精读需要的上下文。
- `stage_20_reading_enrichment`：agent 读取原文、Host context 和 artifact views 后写入 `reading-enrichment.json`，runtime 归一化为 Preface、章节说明、概念、参考文献、总结和扩展阅读 views。
- `stage_30_block_translation`：agent 按稳定 block id 写入 `block-translations.json`，runtime 归一化为翻译 view。
- `stage_40_final_review_and_render`：agent 写入轻量 `final-review.json`，runtime 使用内置模板渲染最终单体 HTML。

最终产物为 `result/deep-reading.html`。

## 输入

`input.source_bundle_path` 必须指向一个本地 `source_bundle.zip`。bundle 预期包含：

- `source.md`
- `source-manifest.json`
- `images/`
- 可选 `original.pdf`
- 可选 `artifacts/artifact-manifest.json`
- 可选 `artifacts/references.json`
- 可选 `artifacts/digest.md`
- 可选 `artifacts/citation-analysis.md`

参数：

- `target_language`：目标语言，默认 `zh-CN`。

## Runtime model

唯一面向 agent 的 CLI 是：

```powershell
python scripts/deep_reading_runtime.py bootstrap --input runtime/input.json
python scripts/deep_reading_runtime.py status
python scripts/deep_reading_runtime.py validate-bootstrap
python scripts/deep_reading_runtime.py submit-context-request --payload runtime/payloads/context-request.json
python scripts/deep_reading_runtime.py validate-context-request
python scripts/deep_reading_runtime.py submit-reading-enrichment --payload runtime/payloads/reading-enrichment.json
python scripts/deep_reading_runtime.py validate-reading-enrichment
python scripts/deep_reading_runtime.py submit-block-translations --payload runtime/payloads/block-translations.json
python scripts/deep_reading_runtime.py validate-block-translations
python scripts/deep_reading_runtime.py submit-final-review --payload runtime/payloads/final-review.json
python scripts/deep_reading_runtime.py validate-final-output
```

不要调用其他脚本入口。

## Bootstrap 输出

`bootstrap` 成功后会生成：

- `runtime/literature-deep-reading.sqlite`
- `runtime/views/source-structure.json`
- `runtime/views/reading-blocks.json`
- `runtime/views/image-manifest.json`
- `runtime/views/source-reading-view.json`
- `runtime/views/target-artifacts-view.json`
- `runtime/views/references-seed-view.json`
- `runtime/views/host-preflight-view.json`
- `runtime/views/topic-candidates-view.json`
- `runtime/views/concept-needs-view.json`
- `runtime/views/diagnostics-bootstrap.json`
- `literature-deep-reading.result.json`

## Stage 10 Context Request

`bootstrap` 成功后，先阅读：

- `runtime/views/source-reading-view.json`
- `runtime/views/source-structure.json`
- `runtime/views/references-seed-view.json`
- `runtime/views/target-artifacts-view.json`
- `runtime/views/host-preflight-view.json`
- `runtime/views/topic-candidates-view.json`
- `runtime/views/concept-needs-view.json`
- `runtime/views/diagnostics-bootstrap.json`

然后手写且只手写：

```text
runtime/payloads/context-request.json
```

按下面的字段组织 `context-request.json`：

```json
{
  "main_task": "object detection",
  "method_family": "transformer-based direct set prediction",
  "external_context_section_anchors": ["sec-1-introduction"],
  "request_topic_context": false,
  "topic_context_reason": "",
  "selected_topic_id": "",
  "request_concept_context": true,
  "concept_labels": ["DETR", "object queries", "bipartite matching"],
  "request_citation_graph": true,
  "citation_graph_depth": 2,
  "citation_graph_direction": "both",
  "citation_graph_max_nodes": 80,
  "citation_graph_max_edges": 160,
  "citation_graph_include_low_signal": false,
  "reference_digest_policy": "all_library_references",
  "priority_reference_indices": []
}
```

提交后 runtime 会生成：

- `runtime/views/host-context-view.json`
- `runtime/views/reference-bindings-view.json`
- `runtime/views/reference-digests-view.json`
- `runtime/views/citation-graph-snapshot.json`
- `runtime/views/citation-graph-layout.json`
- `runtime/views/topic-context.json`
- `runtime/views/graph-context.json`
- `runtime/views/concept-candidates-view.json`
- `runtime/views/concept-needs-view.json`
- `runtime/views/diagnostics-host-context.json`

Host Bridge 不可用或单项能力失败时，runtime 会写入 diagnostics 和空/部分 view，后续阶段仍可继续读取已有内容。

## Stage 20 Reading Enrichment

Stage 10 完成后，继续阅读：

- `runtime/views/source-reading-view.json`
- `runtime/views/source-structure.json`
- `runtime/views/references-seed-view.json`
- `runtime/views/target-artifacts-view.json`
- `runtime/views/host-context-view.json`
- `runtime/views/reference-bindings-view.json`
- `runtime/views/reference-digests-view.json`
- `runtime/views/topic-context.json`
- `runtime/views/graph-context.json`
- `runtime/views/concept-candidates-view.json`

然后手写：

```text
runtime/payloads/reading-enrichment.json
```

按下面的字段组织 `reading-enrichment.json`：

```json
{
  "preface_title": "阅读前导读",
  "preface_cards": [
    {
      "title": "研究问题",
      "body": "这篇论文要解决什么问题，以及它为什么重要。"
    }
  ],
  "preface_reading_path": ["先看问题设定", "再看方法结构", "最后看实验和局限"],
  "preface_goal": "帮助读者带着问题进入正文。",
  "preface_concepts": ["DETR", "object queries"],
  "preface_warnings": ["不要把 object queries 直接理解为传统 anchor。"],
  "preface_questions": [
    {
      "question": "这篇论文的关键突破是什么？",
      "answer": "它把目标检测建模为直接集合预测，减少了手工后处理。"
    }
  ],
  "section_notes": [
    {
      "section_anchor": "sec-1-introduction",
      "reading_goal": "理解论文为什么要重新表述目标检测问题。",
      "concepts": ["set prediction"],
      "misread_warnings": ["这里的 end-to-end 不等于没有训练损失设计。"],
      "questions": [
        {
          "question": "作者为什么强调 NMS？",
          "answer": "因为传统检测流程依赖重复候选框的后处理。"
        }
      ],
      "citation_note_body": "本节引用主要用于说明传统检测流程的背景。",
      "citation_reference_roles": [
        {
          "reference_id": "ref-1",
          "role": "background"
        }
      ]
    }
  ],
  "concepts": [
    {
      "label": "object queries",
      "aliases": ["object query"],
      "kind": "method component",
      "definition": "DETR decoder 中用于预测一组目标的可学习查询。"
    }
  ],
  "reference_digest_notes": [
    {
      "reference_id": "ref-1",
      "role_in_current_paper": "背景方法",
      "why_open": "用于理解本文反对的传统检测流程。"
    }
  ],
  "summary_fallback_enabled": true,
  "summary_fallback_sections": [
    {
      "title": "TL;DR",
      "body": "如果没有 digest artifact，使用这里的简短总结。"
    }
  ],
  "extensions": [
    {
      "title": "读后延伸",
      "body": "围绕后续改进方向继续阅读。"
    }
  ]
}
```

提交后 runtime 会生成：

- `runtime/views/preface-view.json`
- `runtime/views/section-insights-view.json`
- `runtime/views/concept-overlay-view.json`
- `runtime/views/references-view.json`
- `runtime/views/summary-view.json`
- `runtime/views/extensions-view.json`
- `runtime/views/translation-batches-view.json`
- `runtime/views/diagnostics-enrichment.json`

## Stage 30 Block Translation

Stage 20 完成后，继续阅读：

- `runtime/views/reading-blocks.json`
- `runtime/views/source-structure.json`
- `runtime/views/concept-overlay-view.json`
- `runtime/views/section-insights-view.json`
- `runtime/views/translation-batches-view.json`
- `runtime/payloads/translation-batches/batch-*.json`

不要自行切分翻译任务。runtime 已根据 `reading-blocks.json` 和大致字数生成 batch 文件；主 agent 只按 `translation-batches-view.json` 中列出的 batch 路径委派。运行环境支持 subagent 时，将每个 batch 文件原样交给 subagent；不支持时，由主 agent 逐 batch 自译，但仍必须按 batch 文件中的 prompt 和 block 列表执行。最终只能提交主 agent 验收后的译文。

subagent 必须完整忠实翻译 batch 内所有 `translate_required: true` 的 block，不得摘要、删减、复制原文充数或插入解释性说明。主 agent 验收每个 block 时必须逐项检查：没有遗漏、没有复制原文冒充译文、目标语言正确、术语与 concept/section insights 一致、Markdown 结构保留、公式不被破坏、表格仍是表格且可翻译单元已翻译。`formula` block 通常不提交译文，由 runtime 原样保留；`image` block 保留图片引用并翻译图题文字；`table` block 必须提交仍然是表格的译文，表题和可翻译单元都要翻译，不要把表格说明写成表格外的普通段落。只跳过 `translate: false` 的 bibliography/reference-list block；Appendix/Supplementary Material 如果被标为 `translate: true`，仍然需要翻译。

然后手写：

```text
runtime/payloads/block-translations.json
```

按下面的字段组织 `block-translations.json`：

```json
{
  "translations": [
    {
      "block_id": "block-0001",
      "translated_markdown": "# 论文标题",
      "quality_notes": []
    },
    {
      "block_id": "block-0002",
      "translated_markdown": "这一段的中文译文。",
      "quality_notes": ["术语按 concept glossary 统一。"]
    }
  ]
}
```

提交后 runtime 会生成：

- `runtime/views/translation-view.json`
- `runtime/views/diagnostics-translation.json`

## Stage 40 Final Review and Render

Stage 30 完成后，继续阅读：

- `runtime/views/translation-view.json`
- `runtime/views/preface-view.json`
- `runtime/views/section-insights-view.json`
- `runtime/views/concept-overlay-view.json`
- `runtime/views/references-view.json`
- `runtime/views/summary-view.json`
- `runtime/views/extensions-view.json`
- `runtime/views/diagnostics-bootstrap.json`
- `runtime/views/diagnostics-host-context.json`
- `runtime/views/diagnostics-enrichment.json`
- `runtime/views/diagnostics-translation.json`

然后手写：

```text
runtime/payloads/final-review.json
```

按下面的字段组织 `final-review.json`：

```json
{
  "overall_assessment": "ready",
  "quality_observations": [
    {
      "severity": "warning",
      "kind": "translation_style",
      "block_id": "block-0002",
      "message": "译文术语已按概念表统一。"
    }
  ]
}
```

提交后 runtime 会生成：

- `result/deep-reading.html`
- `result/deep-reading-manifest.json`
- `result/final-output.candidate.json`
- `result/sections/sections.json`
- `result/sections/source-images.json`
- `result/sections/diagnostics.json`

## Final output

当前阶段完成后，读取 `literature-deep-reading.result.json`，并输出一个 JSON object。该 JSON 必须包含：

- `"__SKILL_DONE__": true`
- `literature-deep-reading.result.json` 中的全部业务字段

不要输出 Markdown fence 或解释性文字。
