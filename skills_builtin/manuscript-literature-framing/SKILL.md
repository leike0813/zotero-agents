---
name: manuscript-literature-framing
description: 基于论文题目、用户确认的 manuscript context 和已确认的 Zotero Topic Synthesis 证据，交互式生成科研论文 Introduction 与 Related Work 的写作计划和 LaTeX 草稿。
---

# Manuscript Literature Framing

本交互式 skill 用于起草科研论文的 Introduction 与 Related Work。它从 `paperTitle` 启动，先收集用户提供的 manuscript context，再推荐并确认相关 Topic Synthesis，随后生成可审查的写作计划，最后渲染 LaTeX 产物。

目标不是泛泛补背景，而是完成结构化定位：说明问题为什么重要、为什么现在值得研究、现有工作有哪些稳定路线、关键 gap 在哪里、本文贡献如何与 gap 对齐，以及 Related Work 应如何按 taxonomy / method lines / benchmark dimensions / debates 组织。

## 输入契约

参数：

- `paperTitle`（必填）：论文工作标题。
- `language`（可选）：`auto`、`zh-CN`、`en-US` 或用户指定的写作语言。
- `targetVenue`（可选）：目标期刊、会议或风格族。
- `articleType`（可选）：v1 优先服务原始研究论文。
- `stylePreference`（可选）：concise、IEEE-like、Nature-like、中文初稿等。

## 必需 MCP tools

Host 已经完成 MCP availability check 和 callable smoke。不要搜索 MCP 配置，不要测试工具注入状态。如果正式执行中必需 tool 返回 unavailable 或 no such tool，直接输出合法 canceled branch。

按业务需要使用：

- `synthesis.list_topics`：列出已有 Topic Synthesis 候选。
- `synthesis.get_review_input`：读取已确认 Topic Synthesis 的写作上下文。
- `synthesis.get_paper_registry`：检查论文 readiness 与 citekey 相关元数据。
- `synthesis.get_citation_graph_metrics`：识别 core / foundation / frontier papers。
- `synthesis.get_citation_graph_slice`：检查局部引用邻域。
- `synthesis.resolve_topic_paper_digest`：核验特定 topic evidence digest。
- `list_library_items`、`search_items`、`get_item_detail`：直接查询 Zotero 文献库。
- `get_item_notes`、`list_note_payloads`、`get_note_payload`：检查选定论文 notes 与 workflow payload。
- `get_item_attachments`、`prepare_paper_reading_context`：检查原文可用性，少量核验关键论文。

## Runtime scripts

每一步先运行 gate：

```powershell
python scripts/gate_runtime.py --state "runtime/manuscript-literature-framing.json"
```

只能通过 stage runtime 写状态：

```powershell
python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action persist_manuscript_context --payload-file "runtime/payloads/manuscript-context.json"
python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action persist_topic_recommendations --payload-file "runtime/payloads/topic-recommendations.json"
python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action confirm_topics --payload-file "runtime/payloads/confirmed-topics.json"
python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action persist_review_inputs --payload-file "runtime/payloads/review-inputs.json"
python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action persist_writing_plan --payload-file "runtime/payloads/writing-plan.json"
python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action confirm_writing_plan --payload-file "runtime/payloads/confirmed-writing-plan.json"
python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action render_latex --payload-file "runtime/payloads/final-latex.json"
python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action cancel --payload-file "runtime/payloads/cancel.json"
```

`scripts/runtime_state.py` 没有独立 CLI，只能由 gate 和 stage scripts 导入。

每次 stage action 后必须重新运行 gate，并且只执行 gate 返回的 `next_action` 与 `command_example`。

## 必需交互门禁

1. `collect_manuscript_context`
   - 若缺少 manuscript context，必须向用户询问，不得猜测。
   - 至少收集：研究问题、目标对象/场景、方法或系统、main contributions、target venue/style、是否单列 Related Work、希望采用的组织模式。
   - 用户未提供时返回 pending branch。

2. `recommend_topics`
   - 调用 `synthesis.list_topics`。
   - 推荐 1-5 个 topic candidates。必要时用 `list_library_items` 或 `search_items` 辅助判断库内覆盖。
   - 若没有足够相关 Topic Synthesis，返回 pending/canceled，建议用户先创建 topic synthesis。

3. `confirm_topics`
   - 读取 review input 前必须让用户确认 topic ids。
   - 不得基于未确认推荐继续执行。

4. `ingest_review_inputs`
   - 对 confirmed topics 调用 `synthesis.get_review_input`。
   - registry / graph / digest / Zotero item tools 仅用于补 citekeys、核验少量关键论文、解决证据歧义。

5. `draft_writing_plan`
   - 写作计划前必须阅读 `references/scientific_introduction_related_work_writing_guide_zh.md`。
   - 在最终 prose 前生成结构化 writing plan。
   - 每个段落必须包含：段落功能、核心论点、证据来源、候选引用、topic provenance、与用户 manuscript contribution 的对应关系。
   - 写作计划必须判断是否需要 survey-of-surveys 段，以及 Related Work 的分类轴。

6. `confirm_writing_plan`
   - 要求用户确认或修改 writing plan。
   - 不得从未确认计划渲染最终 LaTeX。
   - 该步骤创建 `render_latex` 所需的 confirmed writing plan state。

7. `render_latex`
   - Introduction 与 Related Work 必须遵循 confirmed writing plan，不允许临时改写结构；所有偏离都必须写入 diagnostics。
   - 渲染 `result/introduction.tex`、`result/related-work.tex`、`result/writing-plan.json`、`result/citation-map.json`、`result/diagnostics.json` 和 `result/result.json`。

## Introduction / Related Work 写作硬规则

- Topic Synthesis 只能作为文献定位与领域证据，不能作为本文方法、实验或贡献主张的来源。
- 用户提供的 manuscript context 是本文研究问题、方法、实验、贡献与目标 venue 的真源。
- Introduction 默认采用“背景动机 → 具体问题 → 现有路线 → gap → 本文定位/贡献 → 结构引导”的功能链。
- gap 必须绑定数据、方法、场景、评价、理论或集成边界中的至少一类具体差距，不能只写 “still challenging”。
- Related Work 默认按 taxonomy / method lines / benchmark dimensions / debates 组织，不按年份流水账组织。
- 若近 3-5 年已有相关综述，writing plan 必须考虑 survey-of-surveys 段，说明已有综述边界和本文新增视角。
- LaTeX citations 必须使用 `\cite{zotero_citekey}`。
- 不得伪造 citekeys。缺 citekey 时使用 `% TODO citation: paper_ref`，并写入 diagnostics。
- 引用必须支撑具体判断；分类判断每类给代表作即可，不追求堆砌。
- 写作计划与最终 LaTeX 必须参考 `references/scientific_introduction_related_work_writing_guide_zh.md`。

## Final output

Final stdout 必须且只能是 `result/result.json` 中的 JSON object。

Completed final branch 使用：

```json
{
  "__SKILL_DONE__": true,
  "kind": "writing.manuscript_literature_framing",
  "status": "completed",
  "title": "Paper title",
  "language": "en-US",
  "assets": {
    "introduction_tex": "result/introduction.tex",
    "related_work_tex": "result/related-work.tex",
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
