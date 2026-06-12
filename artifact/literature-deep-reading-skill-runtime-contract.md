# Literature Deep Reading Skill Runtime Contract

本文记录 `literature-deep-reading` 初版单体 skill 的运行流程、SQLite 状态表、内部 view 分层、Host Bridge 收集点、agent-facing payload schema 和最终单体 HTML 渲染合同。

本文是实现前合同草案，不是最终 OpenSpec spec。后续进入实现阶段时，应以本文为输入创建 OpenSpec change，并把 schema 固化到 skill package 的 `assets/schemas/`。

## 设计原则

- 初版保持单体 skill，不拆成多个 skill。
- 除 `stage_00_bootstrap` 外，不设置 runtime-only stage。runtime 负责的确定性步骤作为 agent payload submit 后的级联动作执行。
- agent 先读原文，再决定需要从 Host 收集哪些 topic、concept、citation graph 和 reference digest 上下文。
- runtime 维护结构真源：source blocks、anchors、references、assets、graph snapshot 和最终 renderer 输入。
- agent 只写语义 payload：上下文请求、阅读辅助、译文和最终质量检查。
- 最终产物是完全自包含的单体 HTML，不依赖 CDN、本地 sidecar JSON、远程图片或运行时 Host Bridge。

## Stage Flow

### `stage_00_bootstrap`

唯一 runtime-only stage。它可以在 skill 启动后自动执行，因为此时还没有 agent 决策。

输入：

- `runtime/input.json`
- `source_bundle_path`

runtime 执行：

1. 解包 `source_bundle.zip`。
2. 读取 `source-manifest.json` 和 `artifacts/artifact-manifest.json`。
3. 解析 `source.md`；缺失 Markdown 时执行 PDF fallback。
4. 生成稳定 section anchors。
5. 生成稳定 `reading_blocks`，保留原文 block 顺序。
6. 建立图片 manifest，并把 bundle 图片复制或登记到 run workspace。
7. 解码目标论文自己的 `digest`、`references`、`citation_analysis` sidecar artifacts。
8. 初始化 SQLite。
9. 生成供 agent 首次阅读的 bounded views。

主要产物：

- `runtime/literature-deep-reading.sqlite`
- `runtime/views/source-structure.json`
- `runtime/views/reading-blocks.json`
- `runtime/views/image-manifest.json`
- `runtime/views/source-reading-view.json`
- `runtime/views/target-artifacts-view.json`
- `runtime/views/references-seed-view.json`
- `runtime/views/diagnostics-bootstrap.json`

### `stage_10_source_reading_context_request`

第一个 agent stage。agent 先读原文和目标论文已有 artifacts，再决定需要 Host 收集什么。

agent required reads：

- `runtime/views/source-reading-view.json`
- `runtime/views/source-structure.json`
- `runtime/views/references-seed-view.json`
- `runtime/views/target-artifacts-view.json`
- `runtime/views/diagnostics-bootstrap.json`

agent payload：

- `runtime/payloads/context-request.json`

payload 目标：

- 指定 citation graph slice 参数。
- 指定 topic/context/concept 请求意图。
- 指定 references 中需要收集库内 digest 的范围。
- 标记重点 reference 和重点章节。
- 声明哪些 Host context 缺失时可以降级。

submit 后 runtime 级联执行：

1. 从 references artifact 中读取结构化 references。
2. 通过 reference index / sidecar binding 信息识别库内 references。
3. 调 `paper_artifacts.get_manifest` 查询库内 reference digest 可用性。
4. 调 `paper_artifacts.export_filtered` 导出库内 reference digest artifacts。
5. 调 citation graph slice/layout 能力，优先使用插件默认 force layout；Host Bridge 不可用时回退本地 persisted synthesis state。
6. best-effort 收集 topic context、concept context 和 graph context。
7. 生成 Host context views。

主要产物：

- `runtime/views/host-context-view.json`
- `runtime/views/reference-bindings-view.json`
- `runtime/views/reference-digests-view.json`
- `runtime/views/citation-graph-snapshot.json`
- `runtime/views/citation-graph-layout.json`
- `runtime/views/topic-context.json`
- `runtime/views/graph-context.json`
- `runtime/views/concept-candidates-view.json`
- `runtime/views/diagnostics-host-context.json`

### `stage_20_reading_enrichment`

agent 同时拥有原文结构和 Host context 后，产出核心阅读辅助。

agent required reads：

- `runtime/views/source-structure.json`
- `runtime/views/reading-blocks.json`
- `runtime/views/host-context-view.json`
- `runtime/views/reference-bindings-view.json`
- `runtime/views/reference-digests-view.json`
- `runtime/views/citation-graph-snapshot.json`
- `runtime/views/topic-context.json`
- `runtime/views/graph-context.json`
- `runtime/views/concept-candidates-view.json`
- `runtime/views/target-artifacts-view.json`

agent payload：

- `runtime/payloads/reading-enrichment.json`

payload 目标：

- 生成阅读前导读。
- 生成章节级阅读目标、误读提醒、Q&A 和引用线索。
- 生成 concept definitions / aliases。
- 生成 references digest 的简短阅读提示。
- 生成 Summary fallback。
- 生成读后拓展。

submit 后 runtime 级联执行：

1. 校验所有 `section_anchor`。
2. 校验 Q&A 证据引用。
3. 合并 concept candidates 和 agent concept definitions。
4. 将右侧栏相关概念绑定到 concept overlay。
5. 合并 references、reference bindings 和 reference digests。
6. 生成 renderer 可消费的 structured views。

主要产物：

- `runtime/views/preface-view.json`
- `runtime/views/section-insights-view.json`
- `runtime/views/concept-overlay-view.json`
- `runtime/views/references-view.json`
- `runtime/views/summary-view.json`
- `runtime/views/extensions-view.json`
- `runtime/views/diagnostics-enrichment.json`

### `stage_30_block_translation`

agent 基于稳定 block id 和 concept glossary 做同结构译文。

agent required reads：

- `runtime/views/reading-blocks.json`
- `runtime/views/source-structure.json`
- `runtime/views/concept-overlay-view.json`
- `runtime/views/section-insights-view.json`

agent payload：

- `runtime/payloads/block-translations.json`

payload 目标：

- 逐 block 翻译正文。
- 保留公式。
- 翻译表格单元格文本。
- 不翻译 References 及之后内容。
- 不新增、删除或重排 block。

submit 后 runtime 级联执行：

1. 校验 block 覆盖率。
2. 校验 block 顺序和 kind 未被改变。
3. 校验 References 及之后没有译文。
4. 合并译文 view。

主要产物：

- `runtime/views/translation-view.json`
- `runtime/views/diagnostics-translation.json`

### `stage_40_final_review_and_render`

v1 可以保留为轻量 agent stage；如果实现成本需要压缩，也可以先由 runtime 直接 finalize。

agent required reads：

- `runtime/views/preface-view.json`
- `runtime/views/section-insights-view.json`
- `runtime/views/concept-overlay-view.json`
- `runtime/views/references-view.json`
- `runtime/views/translation-view.json`
- `runtime/views/extensions-view.json`
- `runtime/views/diagnostics-*.json`

agent payload：

- `runtime/payloads/final-review.json`

payload 目标：

- 标记是否存在内部术语泄漏。
- 标记是否存在明显不通顺译文。
- 标记是否存在 dangling concept。
- 标记是否存在 references digest modal 缺失但 UI 可点击的问题。

submit 后 runtime 级联执行：

1. 生成 `sections/sections.json`。
2. 生成 `sections/source-images.json`。
3. 生成 `sections/diagnostics.json`。
4. 内联 CSS、JS、JSON data、图片、vendor assets。
5. 输出完全自包含 HTML。
6. 输出 final candidate。

主要产物：

- `result/deep-reading.html`
- `result/final-output.candidate.json`
- `result/deep-reading-manifest.json`

## SQLite State Contract

SQLite 是 runtime 状态真源。agent 不直接写数据库，只写 payload；runtime 在 submit 后校验并入库。

### `runs`

| Column | Type | 说明 |
| --- | --- | --- |
| `run_id` | TEXT PRIMARY KEY | skill run id |
| `schema_version` | TEXT | runtime schema version |
| `target_language` | TEXT | 用户目标语言 |
| `source_kind` | TEXT | `mineru_markdown` / `markdown_unknown` / `pdf_fallback` |
| `status` | TEXT | `running` / `failed` / `completed` |
| `created_at` | TEXT | ISO timestamp |
| `updated_at` | TEXT | ISO timestamp |
| `diagnostics_json` | TEXT | run-level diagnostics summary |

### `artifacts`

记录 bundle 与 sidecar artifacts。

| Column | Type | 说明 |
| --- | --- | --- |
| `artifact_id` | TEXT PRIMARY KEY | stable id |
| `artifact_type` | TEXT | `source_md` / `original_pdf` / `image` / `digest` / `references` / `citation_analysis` / `vendor` |
| `payload_type` | TEXT | payload mime 或逻辑类型 |
| `bundle_path` | TEXT | bundle 内路径 |
| `runtime_path` | TEXT | run workspace 路径 |
| `source` | TEXT | Host locator、本地路径或 fallback 来源 |
| `status` | TEXT | `available` / `missing` / `unreadable` / `decode_failed` |
| `sha256` | TEXT | 内容 hash |
| `bytes` | INTEGER | 文件大小 |
| `diagnostics_json` | TEXT | artifact diagnostics |

### `source_sections`

| Column | Type | 说明 |
| --- | --- | --- |
| `section_id` | TEXT PRIMARY KEY | stable id |
| `anchor` | TEXT UNIQUE | DOM anchor |
| `title` | TEXT | heading text |
| `level` | INTEGER | heading level |
| `order_index` | INTEGER | 文档顺序 |
| `parent_anchor` | TEXT | 父 section |
| `source_start_block` | TEXT | 起始 block id |
| `source_end_block` | TEXT | 结束 block id |

### `reading_blocks`

| Column | Type | 说明 |
| --- | --- | --- |
| `block_id` | TEXT PRIMARY KEY | stable block id |
| `section_anchor` | TEXT | 所属 section |
| `kind` | TEXT | `heading` / `paragraph` / `image` / `table` / `formula` / `list` / `blockquote` |
| `order_index` | INTEGER | 全文顺序 |
| `source_markdown` | TEXT | 原文 markdown |
| `source_html` | TEXT | runtime 预渲染 HTML |
| `image_refs_json` | TEXT | 图片引用 |
| `table_json` | TEXT | 表格结构 |
| `formula_text` | TEXT | 公式源码 |
| `translate` | INTEGER | 是否进入翻译层 |

### `block_translations`

| Column | Type | 说明 |
| --- | --- | --- |
| `block_id` | TEXT PRIMARY KEY | 对应 reading block |
| `target_language` | TEXT | 目标语言 |
| `translated_markdown` | TEXT | 译文 markdown |
| `translated_html` | TEXT | runtime 预渲染 HTML |
| `status` | TEXT | `available` / `omitted` / `failed` |
| `quality_flags_json` | TEXT | 译文诊断 |

### `host_context_requests`

记录 Stage 10 agent 决策。

| Column | Type | 说明 |
| --- | --- | --- |
| `request_id` | TEXT PRIMARY KEY | stable id |
| `payload_path` | TEXT | `context-request.json` |
| `citation_graph_json` | TEXT | graph 请求参数 |
| `topic_context_json` | TEXT | topic/context 请求 |
| `reference_digest_policy_json` | TEXT | references digest 收集策略 |
| `concept_policy_json` | TEXT | concept 收集策略 |
| `created_at` | TEXT | timestamp |

### `host_context_exports`

记录 runtime 级联 Host Bridge 收集结果。

| Column | Type | 说明 |
| --- | --- | --- |
| `export_id` | TEXT PRIMARY KEY | stable id |
| `capability` | TEXT | Host Bridge capability |
| `request_id` | TEXT | 对应 context request |
| `status` | TEXT | `available` / `missing` / `failed` / `fallback` |
| `output_path` | TEXT | runtime view 或导出目录 |
| `diagnostics_json` | TEXT | Host 诊断 |

### `reference_bindings`

记录结构化 references 与库内文献绑定。

| Column | Type | 说明 |
| --- | --- | --- |
| `reference_id` | TEXT PRIMARY KEY | stable reference id |
| `reference_index` | INTEGER | 参考文献序号 |
| `title` | TEXT | reference title |
| `authors_json` | TEXT | authors |
| `year` | TEXT | year |
| `raw_json` | TEXT | 原始 reference payload |
| `binding_status` | TEXT | `library` / `external` / `unresolved` |
| `bound_paper_ref` | TEXT | Synthesis paper ref |
| `zotero_item_key` | TEXT | Zotero item key |
| `match_confidence` | REAL | optional |

### `reference_digest_artifacts`

记录库内 reference 的 digest payload。

| Column | Type | 说明 |
| --- | --- | --- |
| `reference_id` | TEXT PRIMARY KEY | 对应 reference |
| `bound_paper_ref` | TEXT | Synthesis paper ref |
| `status` | TEXT | `available` / `missing` / `truncated` / `failed` |
| `payload_type` | TEXT | `digest-markdown` |
| `payload_path` | TEXT | exported digest path |
| `digest_markdown` | TEXT | bounded markdown，可选入库 |
| `sha256` | TEXT | digest hash |
| `bytes` | INTEGER | payload size |
| `diagnostics_json` | TEXT | diagnostics |

### `concepts`

| Column | Type | 说明 |
| --- | --- | --- |
| `concept_id` | TEXT PRIMARY KEY | stable id |
| `label` | TEXT | display label |
| `aliases_json` | TEXT | aliases |
| `kind` | TEXT | method / metric / dataset / task / component |
| `definition` | TEXT | user-facing definition |
| `source` | TEXT | source view / agent / fallback |
| `status` | TEXT | `available` / `low_confidence` / `keyword_only` |

### `section_insights`

| Column | Type | 说明 |
| --- | --- | --- |
| `section_anchor` | TEXT PRIMARY KEY | section anchor |
| `reading_goal` | TEXT | 当前节阅读目标 |
| `concept_refs_json` | TEXT | related concepts |
| `misread_warnings_json` | TEXT | warnings |
| `questions_json` | TEXT | Q&A |
| `citation_note_json` | TEXT | citation analysis note |

### `citation_graph_nodes` / `citation_graph_edges` / `citation_graph_layout`

保存固化 graph snapshot 和坐标。

节点表最少字段：

- `node_id`
- `kind`: `library` / `external` / `target`
- `title`
- `paper_ref`
- `year`
- `metrics_json`
- `source_json`

边表最少字段：

- `edge_id`
- `source`
- `target`
- `kind`
- `evidence_json`

layout 表最少字段：

- `node_id`
- `layout_key`
- `x`
- `y`
- `source`: `host_force_layout` / `local_persisted_force_layout` / `fallback`

### `payload_submissions`

| Column | Type | 说明 |
| --- | --- | --- |
| `stage_id` | TEXT PRIMARY KEY | stage id |
| `payload_path` | TEXT | agent-authored payload |
| `schema_id` | TEXT | schema asset id |
| `status` | TEXT | `submitted` / `valid` / `invalid` |
| `validation_errors_json` | TEXT | schema/runtime validation errors |
| `submitted_at` | TEXT | timestamp |

### `self_contained_assets`

最终单体 HTML 内联资产登记。

| Column | Type | 说明 |
| --- | --- | --- |
| `asset_id` | TEXT PRIMARY KEY | stable id |
| `asset_type` | TEXT | `image` / `css` / `js` / `json` / `vendor` |
| `mime` | TEXT | MIME |
| `source_path` | TEXT | runtime source |
| `embed_strategy` | TEXT | `inline_text` / `data_uri` / `json_script` |
| `sha256` | TEXT | hash |
| `bytes` | INTEGER | size |

## Runtime View 分层

### Source Layer

原文真源层，由 runtime 确定性生成。

- `source-structure.json`
- `reading-blocks.json`
- `image-manifest.json`
- `source-reading-view.json`
- `target-artifacts-view.json`

### Host Context Layer

由 Stage 10 submit 后 runtime 级联生成。

- `host-context-view.json`
- `reference-bindings-view.json`
- `reference-digests-view.json`
- `citation-graph-snapshot.json`
- `citation-graph-layout.json`
- `topic-context.json`
- `graph-context.json`
- `concept-candidates-view.json`

### Analysis Layer

由 agent payload + runtime 校验归一化生成。

- `preface-view.json`
- `section-insights-view.json`
- `concept-overlay-view.json`
- `references-view.json`
- `summary-view.json`
- `translation-view.json`
- `extensions-view.json`

### Render Layer

最终 HTML 消费层。

- `sections/sections.json`
- `sections/source-images.json`
- `sections/diagnostics.json`
- `deep-reading-manifest.json`
- `final-output.candidate.json`

## Agent-Facing Payload Schemas

下面是 schema 形态草案。正式实现时应转为 JSON Schema。

agent-facing payload 的基本规则：

- agent 不写 `schema_version`、`stage_id`、`created_at`、`status` 这类确定性审计字段；这些信息由 runtime、schema asset 和 `payload_submissions` 记录。
- payload 字段应尽量扁平。除数组 item 需要表达一组对象外，不引入 `host_context_requests`、`fallback_policy`、`reading_aid`、`checks` 这类只起分组作用的嵌套对象。
- 字段名应语义自明，优先使用 `request_topic_context`、`section_notes`、`translated_markdown`、`evidence_ref` 这类直接表达业务含义的名称。
- runtime 负责把扁平 agent payload 归一化成 runtime view；agent 不需要模拟最终 view shape。

### `context-request.json`

```json
{
  "main_task": "object detection",
  "method_family": "transformer-based direct set prediction",
  "external_context_section_anchors": [
    "sec-1-introduction",
    "sec-2-related-work"
  ],
  "request_topic_context": true,
  "topic_context_reason": "Explain where this paper sits in object detection before the reader enters the body.",
  "request_concept_context": true,
  "concept_labels": ["DETR", "object queries", "bipartite matching", "Hungarian loss"],
  "request_citation_graph": true,
  "citation_graph_depth": 2,
  "citation_graph_direction": "both",
  "citation_graph_max_nodes": 80,
  "citation_graph_max_edges": 160,
  "citation_graph_include_low_signal": false,
  "reference_digest_policy": "all_library_references",
  "priority_reference_indices": [14, 21, 22, 36, 46]
}
```

约束：

- agent 不写 Host Bridge 原始命令，只写请求意图和参数。
- agent 不写目标 `paper_ref`，runtime 从 source manifest 或 Zotero selection 解析。
- `reference_digest_policy` v1 支持 `all_library_references`、`priority_only`、`none`。
- Host context 缺失时的降级策略由 runtime 固定处理，不要求 agent 写 fallback policy。
- runtime 可以收窄过大的请求，并在 diagnostics 中记录。

### `reading-enrichment.json`

```json
{
  "preface_title": "阅读前导读",
  "preface_cards": [
    {
      "title": "研究领域",
      "body": "..."
    }
  ],
  "preface_reading_path": ["...", "..."],
  "preface_goal": "...",
  "preface_concepts": ["DETR", "object queries"],
  "preface_warnings": ["..."],
  "preface_questions": [
    {
      "question": "...",
      "answer": "...",
      "evidence_kind": "topic_context",
      "evidence_ref": "topic-context.json"
    }
  ],
  "section_notes": [
    {
      "section_anchor": "sec-1-introduction",
      "reading_goal": "...",
      "concepts": ["direct set prediction", "NMS"],
      "misread_warnings": ["..."],
      "questions": [
        {
          "question": "...",
          "answer": "...",
          "evidence_kind": "source_section",
          "evidence_ref": "sec-1-introduction"
        }
      ],
      "citation_note_body": "...",
      "citation_reference_roles": [
        {
          "reference_id": "ref-36",
          "role": "baseline comparison"
        }
      ]
    }
  ],
  "concepts": [
    {
      "label": "object queries",
      "aliases": ["learned object queries"],
      "kind": "model_component",
      "definition": "..."
    }
  ],
  "reference_digest_notes": [
    {
      "reference_id": "ref-36",
      "role_in_current_paper": "...",
      "why_open": "..."
    }
  ],
  "summary_fallback_enabled": false,
  "summary_fallback_sections": [],
  "extensions": [
    {
      "anchor": "extension-topic",
      "title": "后续阅读：...",
      "body": "..."
    }
  ]
}
```

约束：

- 所有 `section_anchor` 必须存在于 `source_sections`。
- Q&A 必须绑定 `evidence_kind` 和 `evidence_ref`。
- 用户可见文字不能出现内部 role hint 或 workflow 设计词。
- `reference_digest_notes.reference_id` 必须存在于 `reference_bindings`。
- runtime 将 `preface_*` 字段归一化为 `preface-view.json`，将 `section_notes` 归一化为 `section-insights-view.json`。

### `block-translations.json`

```json
{
  "translations": [
    {
      "block_id": "block-0001",
      "translated_markdown": "..."
    },
    {
      "block_id": "block-0042",
      "translated_markdown": "$$ ... $$"
    }
  ]
}
```

约束：

- agent 不写 `target_language`；目标语言来自 workflow 参数和 `runtime/input.json`。
- `block_id` 必须来自 `reading_blocks`。
- 不允许出现 References 及之后的 block。
- 对 `formula` block，允许原样保留。
- 对 `table` block，应翻译表格文本，保持表格结构。

### `final-review.json`

```json
{
  "overall_assessment": "ready",
  "quality_observations": [
    {
      "severity": "warning",
      "kind": "translation_style",
      "block_id": "block-0010",
      "message": "..."
    }
  ]
}
```

约束：

- final review 不改结构。
- final review 只写 agent 观察到的质量问题，不写 `internal_terms_absent`、`qa_before_citation_notes` 这类 deterministic checks。
- runtime 可以在 warning 下继续渲染。
- error 级问题应进入 diagnostics；是否阻断由 runtime policy 决定。
- `overall_assessment` 支持 `ready`、`ready_with_notes`、`needs_revision`。

## Host Bridge Collection Contract

Stage 10 submit 后 runtime 根据 `context-request.json` 调用 Host Bridge。能力不可用时必须降级，不阻塞核心正文阅读。

### Reference Digests

目标：为 References 中绑定到库内条目的文献收集 digest artifact。

优先能力：

- `paper_artifacts.get_manifest`
- `paper_artifacts.export_filtered`

输入：

- `paper_refs`: 从 reference binding 解析出的库内 paper refs。
- `artifact_types`: `["digest"]`。
- `run_root`: 当前 ACP skill run workspace。

输出：

- `runtime/views/reference-bindings-view.json`
- `runtime/views/reference-digests-view.json`

降级：

- binding 不可用：References 仍结构化显示，但无 digest 按钮。
- digest 缺失：对应条目不显示 digest 按钮。
- digest 过大：使用 bounded markdown，并在 modal 中显示用户可理解的截断提示。

### Citation Graph

优先能力：

- `citation_graph.get_slice`
- 插件默认 force layout 坐标

降级顺序：

1. Host Bridge graph slice + Host/插件布局。
2. 本地 persisted synthesis state snapshot + persisted force layout。
3. 空状态。

HTML 不运行 force layout，不运行时请求 Host。

### Topic / Concept Context

目标：

- 支撑阅读前导读。
- 支撑 concept overlay。
- 支撑读后拓展。

降级：

- topic context 缺失时，preface 使用论文元信息和原文 Introduction fallback。
- concept context 缺失时，agent 可基于原文生成低置信度 concept；UI 不把普通关键词伪装为 concept。

## References Digest Modal Contract

最终 HTML 的 References 区域优先使用 `references-view.json` 结构化渲染。若某条 reference 绑定到库内文献且 digest 可用，则展示 digest 入口。

交互：

- 点击 reference digest 按钮打开内置 modal。
- modal 内容来自 HTML 内联 JSON，不请求 Host。
- modal 样式参考 Workbench `paper-digest-modal`：标题、关闭按钮、可滚动 digest 内容、可选 outline。
- digest markdown 应在构建阶段预渲染为 HTML，或在单体 HTML 中使用内联本地 renderer。

`reference-digests-view.json` 最小结构：

```json
{
  "schema_version": "literature-deep-reading.reference-digests-view.v0",
  "source": "host_paper_artifacts",
  "items": [
    {
      "reference_id": "ref-36",
      "reference_index": 36,
      "bound_paper_ref": "1:XXXX",
      "zotero_item_key": "XXXX",
      "title": "...",
      "digest": {
        "status": "available",
        "payload_type": "digest-markdown",
        "markdown": "...",
        "html": "...",
        "sha256": "...",
        "bytes": 12345,
        "truncated": false
      },
      "analysis": {
        "role_in_current_paper": "...",
        "why_open": "...",
        "related_sections": ["sec-2-3-object-detection"]
      }
    }
  ],
  "diagnostics": []
}
```

不得：

- 为库外文献伪造 digest。
- 为 digest 缺失的库内文献显示可点击 digest 入口。
- 在用户 UI 中暴露 artifact path、Host Bridge command 或 manifest 细节。

## Self-Contained HTML Contract

最终 `result/deep-reading.html` 必须单文件可打开：

- CSS 内联到 `<style>`。
- JS 内联到 `<script>`。
- 业务数据内联到 `<script type="application/json" id="deep-reading-data">`。
- 图片以内联 data URI 或内联 asset map 表达。
- reference digest modal payload 内联。
- graph snapshot/layout 内联。
- 不依赖 CDN。
- 不依赖 `result/sections/*.json`、`assets/*.js`、`assets/*.css` 或 `assets/images/*`。

实现建议：

- Markdown、公式和表格尽量在构建阶段预渲染为 HTML。
- KaTeX CSS / fonts 如必须使用，应作为内联 vendor asset；v1 可以先用 server-side rendered HTML + minimal CSS，避免字体依赖。
- 大图使用 data URI 会增加 HTML 体积；runtime 应记录 HTML bytes，并在 diagnostics 中提示过大，但 v1 不拆文件。

## Final Output Contract

`result/final-output.candidate.json`：

```json
{
  "kind": "literature_deep_reading",
  "schema_version": "literature-deep-reading.result.v0",
  "html_path": "result/deep-reading.html",
  "manifest_path": "result/deep-reading-manifest.json",
  "source": {
    "source_kind": "mineru_markdown",
    "target_language": "zh-CN"
  },
  "quality": {
    "status": "completed",
    "diagnostics_path": "result/sections/diagnostics.json",
    "self_contained_html": true
  }
}
```

## Validation Checklist

runtime finalize 前至少检查：

- `context-request.json` schema valid。
- Host collection 失败不会阻断正文阅读。
- 所有 reading block 有稳定 `block_id`。
- 翻译 block 不新增、不删除、不重排。
- References 及之后没有译文 block。
- `reference-digests-view.json` 中每个 digest item 都能解析到 reference。
- 有 digest 按钮的 reference 必须有可用 modal payload。
- 所有右侧栏 related concepts 能解析为 concept，或明确降级为普通关键词。
- 所有 Q&A 位于 citation notes 之前。
- citation graph 节点/边不伪造；edge source/target 都存在。
- 最终 HTML 不包含远程 URL 依赖、外部 CSS/JS 引用或本地相对 asset 依赖。
- 最终 HTML 不包含 workflow 设计说明、Host Bridge command、artifact manifest 细节或内部 role hint 原文。
