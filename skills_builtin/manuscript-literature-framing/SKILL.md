---
name: manuscript-literature-framing
description: 基于论文题目、用户确认的 manuscript intent 和已确认的 Zotero Topic Synthesis 证据，按轻量状态机生成 Introduction 与 Related Work 的写作计划和 LaTeX 草稿。
---

# Manuscript Literature Framing

本交互式 skill 用于为科研论文起草 Introduction 与 Related Work。它从 `paperTitle` 启动，但不会直接写正文；必须先澄清本文意图，再收集和确认文献材料，随后完成多角度 framing analysis，最后才生成写作计划与 LaTeX 草稿。

目标不是泛泛补背景，而是完成结构化定位：说明问题为什么重要、为什么现在值得研究、现有工作有哪些稳定路线、关键 gap 在哪里、本文贡献如何与 gap 对齐，以及 Related Work 应如何按 taxonomy / method lines / benchmark dimensions / debates 组织。

## 输入契约

参数：

- `paperTitle`（必填）：论文工作标题。
- `language`（可选）：`auto`、`zh-CN`、`en-US` 或用户指定的写作语言。
- `targetVenue`（可选）：目标期刊、会议或风格族。
- `articleType`（可选）：v1 优先服务原始研究论文。
- `stylePreference`（可选）：concise、IEEE-like、Nature-like、中文初稿等。

## Runtime model

本 skill 使用轻量 **JSON state SSOT & gate-driven** 范式。

- 唯一运行态真源是 `runtime/manuscript-literature-framing.json`。
- 所有状态写入必须通过 `scripts/stage_runtime.py` 完成。
- 每次 stage action 后必须重新运行 `scripts/gate_runtime.py`。
- 只能执行 gate 返回的 `next_action` 与 `command_example`。
- 只读运行态视图会写入 `runtime/views/`，用于恢复执行和审阅；不要把这些 Markdown 视图当作真源直接编辑。
- 最终正文由 LLM 基于已确认的 intent、evidence、analysis 与 writing plan 撰写；脚本只负责接收、校验、落盘和生成 `result/result.json`。

正式入口：

```powershell
python scripts/gate_runtime.py --state "runtime/manuscript-literature-framing.json"
python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action <ACTION> --payload-file "runtime/payloads/<payload>.json"
```

## LLM / script responsibilities

LLM 负责所有语义任务：

- 与用户澄清 manuscript intent。
- 判断哪些 Topic Synthesis 和 Zotero 资料值得使用。
- 阅读 review input、paper digest、citation graph 与必要原文上下文。
- 形成领域/路线、时间演化、gap 对齐和 framing synthesis。
- 设计 writing plan。
- 在最终阶段撰写 Introduction 与 Related Work 的 LaTeX 正文。

Scripts 只负责机械任务：

- gate 判断下一步动作。
- 校验 payload 基本结构。
- 把 LLM 产出的状态写入 JSON SSOT。
- 生成只读 runtime views。
- 把 LLM 撰写的 final draft 写入 `result/introduction.tex` 与 `result/related-work.tex`。
- 生成 `result/result.json` 和审计资产。

不要让脚本承担分类、gap 判断、贡献对齐、段落设计或最终正文撰写；这些都是 LLM 在理解证据后的核心工作。

## Stage overview

### Stage 1: Intent clarification

Purpose：明确本文自己的写作真源，不让 Topic Synthesis 替代 manuscript context。

Actions：

- `persist_intent_brief`
- `confirm_intent`

必须收集并确认：

- 研究问题
- 目标对象/场景
- 方法或系统
- main contributions
- target venue / style
- 是否单列 Related Work
- 希望采用的组织模式

Done when：`intent_brief` 已写入且 `intent_confirmed=true`。

### Stage 2: Material collection scope

Purpose：先确定要用哪些 Topic Synthesis 和辅助 Zotero 资料，再读取 review input。

Actions：

- `persist_material_plan`
- `confirm_material_scope`
- `persist_evidence_inventory`

按业务需要使用：

- `synthesis.list_topics`：列出已有 Topic Synthesis 候选。
- `synthesis.get_review_input`：读取已确认 Topic Synthesis 的写作上下文。
- `synthesis.get_reference_sidecar_index`：检查论文 artifact/reference cache readiness 与 citekey 相关元数据。
- `synthesis.get_citation_graph_metrics`：识别 core / foundation / frontier papers。
- `synthesis.get_citation_graph_slice`：检查局部引用邻域。
- `synthesis.resolve_topic_paper_digest`：核验特定 topic evidence digest。
- `list_library_items`、`search_items`、`get_item_detail`：直接查询 Zotero 文献库。
- `get_item_notes`、`list_note_payloads`、`get_note_payload`：检查选定论文 notes 与 workflow payload。
- `get_item_attachments`、`prepare_paper_reading_context`：检查原文可用性，少量核验关键论文。

如果正式执行中必需的 Zotero 或 Synthesis host 调用不可用，直接输出合法 canceled branch。

Done when：用户确认 topic ids 和资料边界，且 `evidence_inventory` 已写入。

### Stage 3: Multi-angle framing analysis

Purpose：在 writing plan 之前形成可审查的分析真源。

Actions：

- `persist_domain_route_analysis`
- `persist_timeline_analysis`
- `persist_gap_alignment_analysis`
- `persist_framing_synthesis`

分析要求：

- 领域/路线角度：建立稳定 taxonomy、method lines、benchmark dimensions、debates 与代表性引用。
- 时间角度：只在时间演化能解释领域现状时使用，识别 foundation、turning point、frontier 与 timely rationale。
- gap 对齐角度：每个 gap 必须绑定数据、方法、场景、评价、理论或集成边界中的至少一类具体差距。
- framing synthesis：总结 Introduction 功能链、Related Work 组织轴、survey-of-surveys 决策、引用平衡风险与本文贡献对应关系。

Done when：四个 analysis payload 都已写入。

### Stage 4: Writing plan

Purpose：先形成可确认的段落级计划，不直接落稿。

Actions：

- `persist_writing_plan`
- `confirm_writing_plan`

写作计划前必须阅读 `references/scientific_introduction_related_work_writing_guide_zh.md`。

每个段落必须包含：

- 段落功能
- 核心论点
- 证据来源
- 候选引用
- topic provenance
- 与用户 manuscript contribution 的对应关系

写作计划必须判断是否需要 survey-of-surveys 段，以及 Related Work 的分类轴。

Done when：用户确认或修订 writing plan，且 `writing_plan_confirmed=true`。

### Stage 5: Final drafting

Purpose：LLM 根据 confirmed writing plan、evidence inventory 与 framing analysis 撰写最终 Introduction 与 Related Work LaTeX。该步骤不是模板渲染、材料拼接或简单重组。

Action：

- `persist_final_draft`

LLM 必须：

- 先回读 `intent_brief`、`evidence_inventory`、`framing_analysis` 和 `writing_plan`。
- 按 confirmed writing plan 的结构写出连续、可投稿方向的 LaTeX 段落。
- 在必要时将 plan 中的要点转化为自然论证，而不是逐条复述。
- 用 Topic Synthesis 支撑领域判断，用 intent brief 支撑本文贡献主张。
- 对 plan 的任何偏离写入 diagnostics。

脚本只负责把 LLM 提交的 final draft payload 写入以下产物：

- `result/introduction.tex`
- `result/related-work.tex`
- `result/intent-brief.json`
- `result/evidence-inventory.json`
- `result/framing-analysis.json`
- `result/writing-plan.json`
- `result/citation-map.json`
- `result/diagnostics.json`
- `result/result.json`

Introduction 与 Related Work 必须遵循 confirmed writing plan；若 LLM 在最终撰写时因连贯性或证据约束需要调整结构，必须在 diagnostics 中说明。

## Writing rules

- Topic Synthesis 只能作为文献定位与领域证据，不能作为本文方法、实验或贡献主张的来源。
- 用户提供并确认的 intent brief 是本文研究问题、方法、实验、贡献与目标 venue 的真源。
- Introduction 默认采用“背景动机 → 具体问题 → 现有路线 → gap → 本文定位/贡献 → 结构引导”的功能链。
- gap 必须绑定数据、方法、场景、评价、理论或集成边界中的至少一类具体差距，不能只写 “still challenging”。
- Related Work 默认按 taxonomy / method lines / benchmark dimensions / debates 组织，不按年份流水账组织。
- 若近 3-5 年已有相关综述，writing plan 必须考虑 survey-of-surveys 段，说明已有综述边界和本文新增视角。
- LaTeX citations 必须使用 `\cite{zotero_citekey}`。
- 不得伪造 citekeys。缺 citekey 时使用 `% TODO citation: paper_ref`，并写入 diagnostics。
- 引用必须支撑具体判断；分类判断每类给代表作即可，不追求堆砌。
- 写作计划与最终 LaTeX 必须参考 `references/scientific_introduction_related_work_writing_guide_zh.md`。

## Final output

Final stdout 必须且只能是合法业务 JSON object，不得追加解释或 Markdown fence。

Completed final branch 使用：

```json
{
  "kind": "writing.manuscript_literature_framing",
  "status": "completed",
  "title": "Paper title",
  "language": "en-US",
  "assets": {
    "introduction_tex": "result/introduction.tex",
    "related_work_tex": "result/related-work.tex",
    "intent_brief": "result/intent-brief.json",
    "evidence_inventory": "result/evidence-inventory.json",
    "framing_analysis": "result/framing-analysis.json",
    "writing_plan": "result/writing-plan.json",
    "citation_map": "result/citation-map.json",
    "diagnostics": "result/diagnostics.json"
  },
  "topic_ids": ["topic-id"],
  "diagnostics_summary": {
    "missing_citekeys": 0,
    "warnings": []
  }
}
```

Canceled final branch 使用 `kind: "manuscript_literature_framing_canceled"`。
