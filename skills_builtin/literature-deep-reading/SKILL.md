---
name: literature-deep-reading
description: Dynamic HTML generator for literature deep-reading. Use when the user wants to read a paper in depth. Ensure you can access to the Zotero library through zotero-bridge CLI.
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
- 可选 `translator/alignment.json`
- 可选 `original.pdf`
- 可选 `artifacts/artifact-manifest.json`
- 可选 `artifacts/references.json`
- 可选 `artifacts/digest.md`
- 可选 `artifacts/citation-analysis.md`

参数：

- `target_language`：目标语言，默认 `zh-CN`。

可选输入：

- `translator_alignment_path`：已有 `literature-translator` alignment JSON 的本地路径。
- `translator_output_path`：已有 `literature-translator` 译文 Markdown 的本地路径。
- `translator_status`：当 translator 因源目标语言相同而 `cancelled` 时，runtime 会在 bootstrap 生成 source-only alignment。

Host 提供的输入以 `runtime/input.json` 和 `.audit/*/input_manifest.json` 为准。agent 不要手工猜测、替换或省略 translator 相关路径；如果 `runtime/input.json` 缺少 host 已提供的字段，`bootstrap` 会从审计输入中自动补齐。

## 任务目标

本 skill 的目标是生成帮助用户深度阅读当前论文的 self-contained HTML。原文是主角；译文、topic/context、citation graph、reference digests 和 concept explanations 都是辅助阅读层。

不要把本 skill 当作通用综述生成器、纯翻译任务或普通报告生成器。所有语义内容都应服务于“读懂当前论文”：先帮助读者理解问题、方法、贡献、证据和局限，再用外部 context 解释它在研究脉络中的位置。

## 职责分工

LLM 必须负责：

- 理解论文内容、研究问题、方法脉络、贡献和局限。
- 决定 Stage 10 context request 的语义意图和证据需求。
- 写作 Stage 20 的导读、章节阅读目标、概念解释、引用角色和扩展阅读。
- 验收 Stage 30 的译文质量，判断是否遗漏、误译、复制原文或破坏 Markdown/公式/表格结构。
- 写作 Stage 40 final review 的质量观察。

runtime 必须负责：

- 解包 source bundle、解析结构、建立 SQLite 状态和维护 stage gate。
- 调用 Host Bridge、记录 diagnostics，并生成 packet、view 和 translation batch 文件。
- 校验 payload schema、枚举、字段类型和当前阶段状态。
- 归一化 agent payload，生成 runtime-owned views，并渲染最终 HTML 与结果 JSON。

禁止事项：

- 不要手工编辑 `runtime/views/*`、`runtime/literature-deep-reading.sqlite`、`result/deep-reading.html` 或 `literature-deep-reading.result.json`。
- 不要用临时脚本替代 LLM 完成论文摘要、导读、概念解释、引用角色判断或翻译质量判断。
- 不要让 subagent 推进 gate、写 SQLite、写 runtime-owned views 或生成最终机器消费产物。
- 不要在 payload 中伪造 runtime-owned IDs、状态、diagnostics、packet 字段或最终 HTML 字段。

## 通用注意事项

- 默认 packet-first：每阶段只读当前 packet 和其中列出的 batch 文件；`trace_paths` 仅在需要核对证据、修复 payload 或解释 diagnostics 时读取。
- Host Bridge diagnostics 是降级信号，不是自动终止信号。Host context 缺失时，根据已有原文和可用 artifacts 继续完成当前阶段，并在 payload 语义上避免声称不可用证据已经存在。
- 恢复运行时先执行 `status`，再读取当前阶段 packet。packet 缺失时，不要跳过阶段；运行对应 `validate-*` 定位缺失项，并回到当前或上一阶段 submit/validate 修复。
- 每次只写当前阶段 agent-authored payload。runtime-owned views、packets、SQLite、translation batches、最终 HTML 和 result JSON 都由 runtime 生成。

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

阶段 gate 纪律：

- 每次 `submit-*` 成功后，必须立即运行对应的 `validate-*` 命令。
- `validate-*` 返回非 0、`ok: false` 或列出 errors 时，只修复当前阶段 payload，并重跑当前阶段 submit/validate；不得进入下一阶段。
- 只有对应 `validate-*` 返回 `ok: true` 后，才可以读取下一阶段 packet 并继续。
- 启动或恢复时先运行 `status`，再读取当前阶段 packet。大 view 只作为 packet 中 `trace_paths` 指向的按需追溯材料。

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
- `runtime/views/translator-alignment-view.json`
- `runtime/views/diagnostics-bootstrap.json`
- `runtime/views/stage-10-agent-packet.json`
- `literature-deep-reading.result.json`

## Stage 10 Context Request

`bootstrap` 成功后，先阅读：

- `runtime/views/stage-10-agent-packet.json`

默认只依据 packet 中的 `summary`、`work_items`、`diagnostics_summary` 和 `trace_paths` 决定 Stage 10 payload。只有需要核对证据或修复 payload 时，才读取 packet 指向的 source reading、structure、references、target artifacts、Host preflight、topic candidates、concept needs 或 diagnostics view。

Stage 10 payload 必须表达明确的外部 context 意图。`main_task` 和 `method_family` 不能为空；请求 topic context 时必须说明 `topic_context_reason`，且有 topic candidates 时 `selected_topic_id` 应来自候选项；请求 concept context 时 `concept_labels` 必须非空；`reference_digest_policy` 为 `priority_only` 时必须列出 `priority_reference_indices`。不要为了“多拿资料”泛化请求所有 context，只请求能帮助当前论文精读的证据。

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
- `runtime/views/topic-candidate-digests-view.json`
- `runtime/views/graph-context.json`
- `runtime/views/concept-candidates-view.json`
- `runtime/views/concept-needs-view.json`
- `runtime/views/diagnostics-host-context.json`
- `runtime/views/stage-20-agent-packet.json`

Host Bridge 不可用或单项能力失败时，runtime 会写入 diagnostics 和空/部分 view，后续阶段仍可继续读取已有内容。

## Stage 20 Reading Enrichment

Stage 10 完成后，继续阅读：

- `runtime/views/stage-20-agent-packet.json`

默认只依据 packet 中的 Host context 可用性、topic/context 摘要、reference digest 摘要、concept needs、diagnostics 和 trace paths 写 Stage 20 payload。只有需要核对证据或补足语义判断时，才读取 packet 指向的 source reading、host context、reference、topic、citation graph 或 concept views。

`preface_cards` 必须围绕四个稳定槽位写作：

- `研究领域`：优先根据选中 topic 的 semantic context 中的 topic definition / summary 分析；如果没有 topic context，才回退到当前论文自身。
- `研究方向`：优先结合选中 topic 的 `taxonomy` 分析当前论文所在的 route / axis；多个 topic candidate 时，可参考未选中 candidate 的 digest 来说明边界。
- `本文位置`：从时间、重要性、分类三个角度说明当前论文在上述研究领域中的地位。
- `核心创新`：总结当前论文解决的问题、核心贡献，以及它为哪些后续研究奠定基础。

阅读路线与阅读问题不要写成第四张卡片；它们分别写入 `preface_reading_path` 和 `preface_questions`，runtime 会在 topic timeline 下方渲染为“阅读指引”。

Stage 20 payload 必须满足最低内容标准：四张导读卡必须完整且按上述标题出现；`section_notes` 至少覆盖一个关键正文 section，每条 note 必须让读者知道为什么读这一节、容易误读什么、带着什么问题读，以及本节引用主要承担什么作用。agent 自己补充的 `concepts` 必须写 `definition`，不要只写术语名。`reference_digest_notes` 必须说明参考文献在当前论文中的作用和为什么值得打开。

`citation_reference_roles[].role` 是 agent 的自然语言语义标签，不是 renderer-owned category。推荐使用这些简短 role 词以提高一致性：`background`、`baseline`、`contrast`、`component`、`dataset`、`tooling`、`historical`、`uncategorized`。这些词参考 `literature-analysis` 的 renderer categories；也可以使用更具体的非空自定义 role，但不要提交单独的 `category` 字段。

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
      "title": "研究领域",
      "body": "把本文放入选中 topic 所代表的研究领域中理解。"
    },
    {
      "title": "研究方向",
      "body": "结合 topic taxonomy 说明本文所在的研究路线。"
    },
    {
      "title": "本文位置",
      "body": "从时间、重要性和分类角度说明本文在领域中的位置。"
    },
    {
      "title": "核心创新",
      "body": "概括本文解决的问题、核心贡献和奠基作用。"
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
- `runtime/views/stage-30-translation-worklist.json`

## Stage 30 Block Translation

Stage 20 完成后，继续阅读：

- `runtime/views/stage-30-translation-worklist.json`
- worklist 中列出的 `runtime/payloads/translation-batches/batch-*.json`

不要自行切分翻译任务。runtime 已生成 worklist 和 batch 文件；主 agent 只按 `stage-30-translation-worklist.json` 中列出的 batch 路径委派。运行环境支持 subagent 时，将每个 batch 文件原样交给 subagent；不支持时，由主 agent 逐 batch 自译，但仍必须按 batch 文件中的 prompt 和 block 列表执行。默认不读取 reading blocks、source structure、concept overlay 或 section insights 全量 view；只有 worklist 的 `trace_paths` 指向具体证据且确需核对时才读取。最终只能提交主 agent 验收后的译文。

subagent 只处理单个 runtime batch，并按 batch 文件中的 prompt 返回 JSON object，包含 `batch_id`、`translations[]` 和 `quality_notes[]`；如果当前环境不能写文件，也可以用 stdout 返回同等结构。主 agent 合并 batch 结果后写 `runtime/payloads/block-translations.json`，立即运行 submit/validate；runtime 会检查缺块、重复、未知 block、非可译 block、疑似复制原文、目标语言脚本、表格结构和图片引用。validate 失败时，按错误中的 `block_id` 或字段名定点修复对应 batch 结果，不要重新人工通读所有 batch。

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
- `runtime/views/stage-40-review-packet.json`

如果 `stage-30-translation-worklist.json` 的 `required_next_action` 为 `skip_translation_submit`，说明 translation view 已由 runtime 生成，不要再写 `block-translations.json`，直接进入 Stage 40。

## Stage 40 Final Review and Render

Stage 30 完成后，继续阅读：

- `runtime/views/stage-40-review-packet.json`

默认只依据 review packet 中的 translation counts、diagnostics summary、quality observation candidates 和 trace paths 写 final review。只有需要核对具体译文或诊断证据时，才读取 packet 指向的 translation、analysis 或 diagnostics view。

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
- `result/deep-reading-artifacts.json`
- `result/final-output.candidate.json`
- `result/sections/sections.json`
- `result/sections/source-images.json`
- `result/sections/diagnostics.json`

## Final output

当前阶段完成后，读取 `literature-deep-reading.result.json`，并输出一个 JSON object。该 JSON 必须包含：

- `"__SKILL_DONE__": true`
- `literature-deep-reading.result.json` 中的全部业务字段

不要输出 Markdown fence 或解释性文字。
