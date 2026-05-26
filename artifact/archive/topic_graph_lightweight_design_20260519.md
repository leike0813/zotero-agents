# Synthesis Knowledge Graph v1 Design

Date: 2026-05-19  
Updated: 2026-05-22

## Background

Topic Synthesis 当前把每个 topic 作为相对独立的 artifact 管理。这个模型适合保存单个 topic 的综合结果，但不足以表达 topic 之间的粒度、包含、交叉和相邻关系。

典型例子：

```text
Machine Learning
  -> Deep Learning
       -> DETR

Object Detection
  -> DETR
```

`DETR` 同时属于 `Deep Learning` 和 `Object Detection` 的下位概念，因此 topic 组织结构不能建成单父节点 tree，而应建成允许多父节点的 graph。

进一步讨论后，`concept` 节点自然扩展为一份轻量知识库。阅读论文和 synthesis artifact 时，用户经常会遇到不懂的术语、方法、缩写、任务、指标、数据集或理论背景。Synthesis layer 可以维护一份全局 Concept KB，每个 concept/sense 对应一段简短说明，并在 UI 渲染时把正文中的概念 mention 动态变成可点击链接。

因此，本设计定义为：

```text
Synthesis Knowledge Graph v1
  ├─ Topic Graph
  │    topic 之间的上位、下位、相关、交叉关系
  ├─ Concept Knowledge Base
  │    global concept / sense / alias / relation records
  ├─ Citation Graph
  │    paper / reference / citation context graph
  └─ Tag Vocabulary
       built-in controlled tag vocabulary protocol
```

这三者共享一套底层原则：

```text
File canonical store
+ Local SQLite projection cache
+ Plugin internal services
+ Git sync adapter as primary long-term sync backend
```

## Design Goals

第一版应保持轻量，但必须为长期扩展留出稳定边界。

- 在 Synthesis layer 中保存 topic 之间的组织关系。
- 在 Synthesis layer 中维护跨库全局 Concept KB。
- Concept 支持多义性，不能让每个 library 各自维护一套重复 concept。
- UI 能展示 topic graph，帮助用户理解 topic 在文献库中的位置。
- UI 能展示 citation graph，帮助用户理解库内 paper、外部引用和 citation context 的结构。
- UI 能在阅读 synthesis / digest / report 时动态渲染 concept link，并弹出 concept bubble。
- Git 作为主同步后端；note shards 不再纳入 v1 同步设计。
- SQLite 只作为本机 BM25、查询、UI 加速和未来 embedding cache；SQLite 不是同步真源。
- 第一期不实现 embedding，只保留可选 embedding cache 的扩展位置。
- 第一期不实现复杂 sidecar mention locator，避免为锦上添花的 bubble 功能引入过重维护成本。

## Non-Goals

第一版不做：

- 完整 ontology 系统。
- 大型知识库编辑器。
- 复杂图编辑器。
- 自动复杂冲突合并。
- embedding-based concept dedup / merge。
- hosted sync service。
- 自动改写 digest artifact。
- 自动改写 source note payload。
- 把 `[[wiki link]]` 写入 synthesis 正文。
- 强制每个 topic 必须挂到父节点。
- 强制每个 concept 必须有完整 topic synthesis artifact。
- rebuild citation graph 时阻塞前端交互或让 UI 同步等待重建完成。

## Architecture

### Canonical Store

所有需要同步、审计、恢复的数据都落成 JSON/Markdown 文件。

建议目录：

```text
synthesis/
  topics/
    <topic_id>/current/
      artifact.json
      sections/*.json
      concepts.json
      manifest.json

  concepts/
    manifest.json
    concepts/<concept_id>.json
    senses/<sense_id>.json
    aliases/<alias_id>.json
    relations/<relation_id>.json
    tombstones/*.json

  topic-graph/
    topics/<topic_id>.json
    edges/<edge_id>.json
    manifest.json

  citation-graph/
    papers/<paper_ref>.json
    reference-instances/<source_paper_ref>.json
    reference-resolutions/<shard>.json
    contexts/<context_id>.json
    works/<work_id>.json
    work-redirects/<redirect_id>.json
    cleanup-proposals/<proposal_id>.json
    manifest.json

  tags/
    vocabulary.json
    aliases.json
    abbrev.json
    protocol.json
    manifest.json

  sync/
    sync-manifest.json
    conflict-state.json
    remote-state.json

  state/
    concept-kb-index.sqlite
    topic-graph-index.sqlite
    citation-graph-index.sqlite
    tag-index.sqlite
```

`state/*.sqlite` 是本地投影，可以删除重建。它不参与 canonical sync。

### Internal Services

本设计中的 registry、topic graph、concept KB、citation graph、tag vocabulary 和 sync 管理能力均属于插件内部服务。它们服务于 synthesis workbench UI、后台 job、投影重建和同步适配器，不作为新的外部 bridge 能力暴露。

外部 agent / workflow 的文献分析、写作和综合能力继续使用既有读取路径。本设计不新增面向外部的查询或管理 surface，也不把 registry、sync、cleanup、concept edit、topic relation edit 等管理操作暴露给 agent。

## Topic Graph

Topic graph 是 polyhierarchical graph，不是 tree。

Topic graph 的 UI 目标不是展示炫技式全库大图，而是帮助用户持续整理和浏览自己的研究地图。默认组织方式应是分层、可聚焦、可维护的 graph view，而不是全库 force-directed graph。

```text
┌──────────────────┐       broader_than       ┌───────────────┐
│ Machine Learning │ ───────────────────────▶ │ Deep Learning │
└──────────────────┘                          └───────┬───────┘
                                                        │
                                                        │ broader_than
                                                        ▼
                                                  ┌──────────┐
                                                  │   DETR   │
                                                  └──────────┘
                                                        ▲
                                                        │ broader_than
┌──────────────────┐                                  │
│ Object Detection │ ─────────────────────────────────┘
└──────────────────┘
```

### Topic Node

```json
{
  "schema_id": "synthesis.topic_graph_node",
  "schema_version": "1.0.0",
  "topic_id": "detr",
  "title": "DETR",
  "aliases": ["DEtection TRansformer"],
  "node_type": "materialized",
  "definition_status": "has_synthesis",
  "current_artifact_path": "synthesis/topics/detr/current/artifact.json",
  "created_at": "...",
  "updated_at": "..."
}
```

`node_type`：

```text
materialized  - 已有完整 Topic Synthesis artifact
placeholder   - 只有轻量 topic node，尚无完整 synthesis artifact
```

### Topic Edge

第一版只保留少数稳定关系。

```json
{
  "schema_id": "synthesis.topic_graph_edge",
  "schema_version": "1.0.0",
  "edge_id": "edge:detr-object-detection",
  "source_topic_id": "object-detection",
  "target_topic_id": "detr",
  "relation": "broader_than",
  "confidence": "high",
  "status": "suggested",
  "provenance": {
    "source": "topic_synthesis_stage_5_5",
    "topic_id": "detr",
    "run_id": "..."
  },
  "created_at": "...",
  "updated_at": "..."
}
```

Relation enum：

```text
broader_than
related_to
overlaps_with
contrasts_with
```

`status`：

```text
suggested
confirmed
rejected
stale
```

`edge_id` 必须由 canonical edge tuple 确定性生成，不能由 agent 提供：

```text
edge_id = edge:<relation>:<safe-source-topic-id>:<safe-target-topic-id>
```

示例：

```text
edge:broader_than:object-detection:detr
```

对于无向语义近似的关系，仍按 canonical tuple 保存，不做随机 ID：

```text
related_to / overlaps_with / contrasts_with
  source_topic_id and target_topic_id are sorted lexicographically
  before edge_id generation, unless a future relation is explicitly directional
```

User-confirmed edge 的优先级高于 agent-suggested edge。Agent 或 runtime 不应自动删除 user-confirmed edge。

### Relation Proposal Generation

Topic graph 的语义关系主要由 agent 在 topic synthesis / update synthesis 过程中提出。插件侧不尝试用规则自动判断 topic 语义层级，因为这需要跨论文综合、研究范围判断和概念粒度判断。

职责边界：

```text
Agent
  - 判断当前 topic 的上位、相邻、重叠、对照关系。
  - 给出 relation proposal。
  - 说明语义依据和证据来源。

Plugin internal service
  - 校验 proposal schema。
  - 检查 topic_id 是否存在。
  - 去重、检测 cycle、检测冲突。
  - 写入 suggested edge 或 review proposal。
  - 管理 confirmed / rejected / stale 状态。
  - 提供 UI 给用户确认或整理。
```

Agent 不能直接写 `confirmed` edge。Agent 输出只能进入 `suggested` 状态，或在低置信、冲突、target 不明确时进入 review queue。

建议在 topic synthesis 后段生成：

```text
stage_5_cross_paper_synthesis
stage_5_5_concept_cards
stage_5_6_topic_graph_relation_proposals
stage_6_validate_final_artifacts
```

原因是到这个阶段 agent 已经拥有 topic intent、resolver、paper units、cross-paper synthesis、concept hints 和 final sections，语义上下文最完整。太早做会缺证据；太晚做会变成 UI 后处理，失去 synthesis 过程中的语义上下文。

Agent 输出的是 relation proposal，不是最终 edge：

```json
{
  "schema_id": "synthesis.topic_graph_relation_proposals",
  "schema_version": "1.0.0",
  "source_topic_id": "detr",
  "proposals": [
    {
      "local_id": "r1",
      "proposal_type": "broader_topic_candidate",
      "target": {
        "topic_id": "object-detection",
        "title": "Object Detection"
      },
      "confidence": "high",
      "rationale": "DETR is discussed as a transformer-based method for object detection.",
      "evidence_refs": [
        {
          "section": "positioning",
          "quote_or_summary": "DETR is positioned as a detection framework based on transformers."
        }
      ]
    }
  ],
  "diagnostics": []
}
```

`target.topic_id` 可选。如果已有 topic，agent 应引用已有 ID；如果没有，只能给 `target.title`，由插件创建 placeholder suggestion 或进入 review queue。Agent 不创建完整 topic synthesis artifact。

v1 relation proposal type 只允许：

```text
broader_topic_candidate
related_topic_candidate
overlap_topic_candidate
contrast_topic_candidate
```

Proposal type 与 canonical edge 的转换规则：

```text
broader_topic_candidate:
  target_topic_id broader_than source_topic_id

related_topic_candidate:
  source_topic_id related_to target_topic_id

overlap_topic_candidate:
  source_topic_id overlaps_with target_topic_id

contrast_topic_candidate:
  source_topic_id contrasts_with target_topic_id
```

也就是说，agent 从“当前 topic 的视角”提出候选关系；插件内部服务再转换成 canonical topic edge。这样避免 `broader_than` 的方向在 agent prompt 中被误解。Canonical `broader_than` 永远表示：

```text
source_topic_id is broader than target_topic_id
```

不允许 agent 提出 `depends_on`、`uses`、`narrower_than`。这些关系容易与 concept relation、citation relation 或反向边混淆；需要时由插件通过 `broader_than` 反向展示 children。

插件侧确定性校验：

```text
source_topic_id must equal current topic
proposal_type must be enum
self-edge rejected
broader_than cycle rejected or sent to review
confirmed / rejected user edge is not overwritten
same pair + same relation merges evidence/provenance
missing target topic creates placeholder suggestion or review proposal
low-confidence relation enters review queue
```

语义判断是否正确不由插件决定。插件只保证结构安全、状态可追踪、用户确认优先。

Topic graph relation proposal ingestion failure should not fail topic synthesis apply unless the proposal file violates required output schema in a way that breaks final artifact validation. Topic graph is an enhancement path; failed ingestion should normally produce diagnostics and leave the main topic artifact usable.

### Display and Organization

Topic graph 默认采用 layered DAG layout：

```text
[Top-level / broad topics]
        |
[Mid-level topics]
        |
[Focused / active area]
        |
[Specific topics]
```

布局原则：

- `broader_than` 决定上下层，是主视觉结构。
- `related_to` / `overlaps_with` 是横向弱边。
- 多父 topic 允许有多条上位边，但节点本体只渲染一次。
- 没有父节点的非 root topic 进入 `Unplaced` mode。
- root / top-level topic 可以没有 parent；它们通过 explicit `is_root` / `level=top` 标记或用户确认的 top-level placement 排除出 `Unplaced`。
- 没有完整 synthesis artifact 的 placeholder topic 使用弱样式。
- 不默认显示所有 edge type，避免图面过载。

默认只显示：

```text
broader_than
+ selected/focused topic 的 related_to / overlaps_with
```

`contrasts_with` 默认不进入层级布局，只在 selected topic 的 neighborhood 或 filter 中显示。`depends_on`、`uses` 不进入 v1 topic graph relation enum；相关语义优先放在 Concept KB 或 Citation Graph。

### Graph Modes

Topics 页的 Graph view 内部包含三种 mode：

```text
Hierarchy | Neighborhood | Unplaced
```

`Hierarchy`：

- 默认 mode。
- 展示全局组织骨架。
- 优先显示 top-level topics、recently active topics、pinned topics 和它们的主要下位关系。
- 适合用户快速理解知识库结构。

`Neighborhood`：

- 选中或搜索某个 topic 后进入 ego graph。
- 显示 parents、siblings、children、related、overlapping topics。
- 支持一跳 / 两跳展开。
- 支持 breadcrumb 返回上层。

`Unplaced`：

- 列出没有 parent、没有 confirmed placement、且没有 root/top-level 标记的 topics。
- 列出 relation 状态待处理、placement 冲突、或 parent suggestion 尚未确认的 topics。
- root / top-level topic 不因缺少 parent 进入 Unplaced。
- 新 topic 创建后如果没有父节点且没有 root/top-level 标记，默认进入该整理区。
- Agent-suggested relation 可在这里集中 accept / reject。

### Node Visual Encoding

节点不应只是圆点，而应是紧凑 topic chip/card：

```text
[DETR]
24 papers · 12 concepts
updated 2d ago
```

建议视觉状态：

- `materialized`: 正常实体节点。
- `placeholder`: 虚线边框 / 淡色。
- `stale`: warning dot 或状态角标。
- `suggested`: 弱色节点或 suggestion badge。
- `selected`: 高亮边框。
- `pinned`: pin indicator。
- `has_children`: expand/collapse indicator。

### Edge Visual Encoding

- `broader_than`: 主实线，承担层级结构。
- `related_to`: 横向弱线。
- `overlaps_with`: 虚线弱线。
- `suggested`: 虚线或低 opacity。
- `confirmed`: 实线或正常 opacity。
- `rejected`: 默认不显示，只在 review/debug filter 中出现。
- `stale`: warning marker。

### Topic Inspector

选中 topic 后，右侧 Inspector 显示：

- title / aliases / status。
- parents。
- children。
- related topics。
- paper count。
- concept count。
- last synthesis time。
- coverage / gaps 摘要。
- source / provenance。

主要操作：

- Open Detail。
- Update Synthesis。
- Add Parent。
- Add Related。
- Pin / Unpin。
- Accept / Reject suggested relation。

第一版不建议在画布上通过拖线完成复杂编辑。关系编辑优先通过 Inspector 表单完成，避免图编辑交互过重。

### Topic Organization Flow

轻量整理流程：

1. 新 topic 创建后，如果没有 parent，则进入 `Unplaced`。
2. Agent 在 topic synthesis / update synthesis 后段提出 relation proposals。
3. 用户在 Inspector 或 Unplaced mode 中 accept / reject。
4. 用户可以手动添加 parent / related。
5. User-confirmed edge 优先级最高。
6. Agent 不自动删除 user-confirmed edge。

### Not Recommended for v1

第一版不做：

- 自动全局 ontology 推理。
- 3D graph。
- 全库 force-directed graph 作为默认视图。
- 拖拽式复杂图编辑。
- 把 concept 和 topic 混在同一主图里。
- 默认显示所有 edge type。
- 自动把 citation graph 关系转成 topic graph 关系。

## Citation Graph

Citation graph 是 synthesis layer 已有能力的一部分，也应纳入同一套文件真源、SQLite 投影和 Git 同步体系。

它表达的不是 topic 之间的语义层级，而是 paper / reference / citation context 之间的证据结构：

```text
Library Paper
  -> cites -> External Reference
  -> citation_context -> why / how it is cited

Library Paper
  -> cites -> Library Paper
```

Citation graph 的来源更偏机械与半结构化：

- digest artifact 中的 references JSON。
- citation_analysis report。
- Zotero item metadata。
- library item key / DOI / title / year / authors matching。
- synthesis stage 中的 external references 和 citation contexts。

Agent 可以解释 citation context 的语义，但不应手写 citation graph 的稳定 node/edge id。插件内部 citation registry service 负责归一化、去重、ID 分配和索引更新。

### Paper-First Registry Model

用户管理层的一级对象是 `paper`，不是 `work`。

```text
Paper Registry      用户可见的主对象，通常对应 Zotero item
Work Registry       内部 identity resolution 层
Reference Instance  某篇 source paper 的局部 reference occurrence
Resolution Layer    reference instance 当前匹配到的 paper/work 状态
```

设计原则：

- `paper_ref = <libraryID>:<itemKey>` 是库内正式 paper 节点。
- `work_id` 是内部稳定身份层，用于去重、引用归并和跨设备同步，不作为用户日常管理入口。
- `citeKey` 是外部接口 / 写作导出 alias，不是 canonical ID。
- 一个 work 对应多个 paper 是不健康但可存在的短期状态，应通过 cleanup proposal 暴露，而不是作为用户长期维护的核心关系。
- 不要求每条 reference 都进入 work registry。低质量 reference 可以只作为 reference instance 存在。

### Work Identity Layer

Work registry 仍有价值，但它是系统逐步收敛出来的稳定层。

`work_id` 应由插件铸造，为 opaque immutable ID：

```text
work:zsk1:<long-random-or-ulid-like-id>
```

它不依赖：

- DOI。
- title。
- Zotero itemKey。
- BBT citeKey。
- reference ordinal。
- 文件路径。

Metadata identifiers 作为 identity claims 保存，用于匹配与合并，但不是 ID 本身。

```json
{
  "schema_id": "synthesis.work",
  "schema_version": "1.0.0",
  "work_id": "work:zsk1:...",
  "status": "canonical",
  "identity_claims": {
    "doi": "10....",
    "arxiv": "",
    "title_fingerprint": "...",
    "author_year_key": "li-2022",
    "citekeys": ["liDNDTRAccelerateDETR2022"]
  },
  "linked_papers": ["1:ABC"],
  "created_at": "...",
  "updated_at": "..."
}
```

Work status 第一版保持简单：

```text
canonical     高置信稳定 work
provisional   系统认为可能是一个 work，但证据不足
redirected    已合并到另一个 work
tombstoned    明确废弃
```

创建 / 提升规则：

- 强 identifier，例如 DOI / arXiv / PMID / ISBN exact：可自动创建 canonical。
- Zotero item 入库：创建 canonical 或挂到已有 work。
- 多个 references 聚合到同一高置信 signature：可创建 provisional。
- 用户确认 cleanup proposal：提升为 canonical 或合并到已有 work。
- 低证据 reference 不创建 work，只保留 reference instance 与 resolution 状态。

重复 work 合并时不重写历史引用，写 redirect：

```json
{
  "schema_id": "synthesis.work_redirect",
  "schema_version": "1.0.0",
  "from_work_id": "work:zsk1:OLD...",
  "to_work_id": "work:zsk1:CANONICAL...",
  "reason": "doi_exact_match",
  "created_at": "..."
}
```

### Citation Paper Node

```json
{
  "schema_id": "synthesis.citation_graph_paper",
  "schema_version": "1.0.0",
  "paper_ref": "1:ABC",
  "item_key": "ABC",
  "item_ref": "zotero:1:ABC",
  "work_id": "work:zsk1:...",
  "title": "...",
  "year": "2024",
  "authors": ["..."],
  "doi": "...",
  "cite_key": "liDNDTRAccelerateDETR2022",
  "is_library_item": true,
  "topic_ids": ["detr"],
  "created_at": "...",
  "updated_at": "..."
}
```

### Reference Instance

Reference instance 是某篇 source paper 的局部引用条目，来自 literature-digest 的 references JSON。它是 citation graph 的基础 evidence，不要求立即解析成全局 work。

```json
{
  "schema_id": "synthesis.reference_instances",
  "schema_version": "1.0.0",
  "source_paper_ref": "1:ABC",
  "source_artifact_hash": "sha256:...",
  "references": [
    {
      "ref_instance_id": "refinst:1_ABC:0007",
      "raw_index": 7,
      "title": "...",
      "year": "2022",
      "authors": ["Li"],
      "doi": "...",
      "normalized_keys": {
        "doi": "...",
        "title_signature": "...",
        "author_year_key": "li-2022"
      }
    }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

### Reference Resolution

Reference resolution 是可更新的 matching layer。它表达某个 reference instance 当前是否匹配到库内 paper 或内部 work。

```json
{
  "schema_id": "synthesis.reference_resolution",
  "schema_version": "1.0.0",
  "ref_instance_id": "refinst:1_ABC:0007",
  "source_paper_ref": "1:ABC",
  "status": "matched",
  "target_paper_ref": "1:XYZ",
  "target_work_id": "work:zsk1:...",
  "confidence": "high",
  "match_method": "doi_exact",
  "matcher_version": "refmatch/1",
  "override": null,
  "updated_at": "..."
}
```

Resolution status：

```text
matched
unmatched
ambiguous
stale
pending_rematch
forced_match
rejected_match
```

Matching 是 best-effort 派生结果，不是不可变事实。错误匹配通过 optional user override 修正。

```json
{
  "ref_instance_id": "refinst:1_ABC:0007",
  "override": {
    "status": "forced_match",
    "target_paper_ref": "1:XYZ",
    "updated_by": "user",
    "updated_at": "..."
  }
}
```

### Incremental Rematch

Citation graph 非常依赖 literature-digest 输出以及 reference-matching。新文献入库后，理论上可能使全库旧 references 出现新的匹配对象。v1 不做 N×N 全库重算，而是通过倒排索引更新受影响 bucket。

SQLite 投影维护：

```text
zotero_item_index
  doi -> paper_ref
  title_signature -> paper_ref candidates
  author_year_key -> paper_ref candidates

reference_instance_index
  doi -> ref_instance_ids
  title_signature -> ref_instance_ids
  author_year_key -> ref_instance_ids
  unresolved / ambiguous queues
```

更新触发：

- 新 digest 完成：写该 paper 的 reference instances，并匹配这些新 references。
- 新 Zotero item 入库：更新 `zotero_item_index`，反查可能指向它的旧 references，只 rematch 候选 refs。
- Zotero metadata 修改：更新该 item 的 index，rematch 旧 bucket、新 bucket，以及当前 matched 到该 item 的 refs。
- digest 重新生成：替换该 source paper 的 reference instances，重算该 source paper 的 resolution。
- matcher 版本升级：进入 background rebuild queue，不阻塞当前 apply。

复杂度从全库 N×N 降为受影响倒排 bucket 的大小。

### Dynamic Update and Background Rebuild

Citation graph 需要动态更新，但不能把 rebuild 变成前端交互的同步阻塞点。v1 采用“canonical files + SQLite projection + snapshot manifest + background job queue”的模式：

```text
canonical source
  paper registry
  reference instances
  reference resolutions
  citation contexts

projection / cache
  global citation snapshot
  topic-scoped citation snapshot
  paper slice snapshot
  graph freshness manifest
  graph job queue
```

Canonical 与 projection/cache 边界：

```text
canonical files, synced by Git:
  citation-graph/papers
  citation-graph/reference-instances
  citation-graph/reference-resolutions
  citation-graph/contexts
  citation-graph/works
  citation-graph/work-redirects
  citation-graph/cleanup-proposals

local projection/cache, not synced:
  global citation snapshot
  topic-scoped citation snapshot
  paper slice snapshot
  graph freshness manifest
  graph job queue
```

Graph snapshots are UI acceleration artifacts. They can be rebuilt from canonical files and SQLite projection, so they must not be treated as canonical store assets or Git-synced content.

更新模式分三类：

```text
incremental update
  更新受影响 paper / reference bucket / topic view。

background rebuild
  由 matcher 版本升级、projection schema 变化、用户显式维护动作触发。

query-time refresh
  用户打开 Graph 或 Topic Detail Graph tab 时发现 snapshot stale，立即返回旧 snapshot 或 pending 状态，同时入队刷新。
```

前端读取 graph 时遵循固定语义：

```text
fresh snapshot exists
  return snapshot + status: up_to_date

stale snapshot exists
  return snapshot + status: stale_updating
  enqueue refresh job

no snapshot exists
  return empty/pending view + status: building
  enqueue build job

previous build failed
  return latest usable snapshot if available + status: update_failed
  expose diagnostics and retry action
```

因此 UI 永远不直接等待 graph rebuild。Graph 页面和 Topic Detail Graph tab 只订阅 graph update event；后台 job 完成后刷新 snapshot，再由 UI 轻量重绘。

后台 job 类型：

```text
rematch_reference_bucket
rebuild_paper_citation_slice
rebuild_topic_citation_view
rebuild_global_citation_snapshot
rebuild_citation_indexes
generate_cleanup_proposals
```

每个 job 至少记录：

```json
{
  "job_id": "graphjob:...",
  "job_type": "rebuild_topic_citation_view",
  "scope": {
    "topic_id": "detr"
  },
  "state": "queued | running | completed | failed | cancelled",
  "progress": {
    "current": 0,
    "total": 0
  },
  "retryable": true,
  "created_at": "...",
  "started_at": "...",
  "finished_at": "...",
  "diagnostics": []
}
```

Snapshot 写入必须是原子操作：

```text
build temp snapshot
validate snapshot schema
write temp manifest
atomic replace snapshot + manifest
emit graphUpdated event
```

如果 build 失败，旧 snapshot 保持可用，manifest 标记 `update_failed`，UI 显示非阻塞错误状态和 retry 入口。

### Citation Edge

Citation edge 不是独立真源，而是 graph view 中从 `reference_instance + reference_resolution` 动态 join 出来的边。必要时可以缓存到 SQLite view cache，但不应作为唯一 canonical source。

```json
{
  "schema_id": "synthesis.citation_graph_edge",
  "schema_version": "1.0.0",
  "edge_id": "cite:refinst:1_ABC:0007",
  "source_paper_ref": "1:ABC",
  "ref_instance_id": "refinst:1_ABC:0007",
  "target_paper_ref": "1:XYZ",
  "target_work_id": "work:zsk1:...",
  "resolution_status": "matched",
  "relation": "cites",
  "citation_context_ids": ["ctx:sha256:..."],
  "provenance": {
    "source": "reference_resolution"
  }
}
```

### Citation Context

```json
{
  "schema_id": "synthesis.citation_context",
  "schema_version": "1.0.0",
  "context_id": "ctx:sha256:...",
  "source_paper_ref": "1:ABC",
  "ref_instance_id": "refinst:1_ABC:0007",
  "section_hint": "Related Work",
  "context_summary": "The cited work is used as a baseline for transformer-based detection.",
  "citation_role": "baseline",
  "evidence_quote": "...",
  "confidence": "medium",
  "source_artifact_hash": "sha256:..."
}
```

`citation_role` 第一版保持轻量：

```text
background
baseline
method_source
dataset_source
metric_source
contrast
supporting_evidence
other
```

### Citation Graph Query

插件内部 citation graph service 的建议输入：

```json
{
  "topicIds": ["detr"],
  "paperRefs": ["1:ABC"],
  "radius": 1,
  "includeExternalReferences": true,
  "includeContexts": true,
  "dimUnrelated": true,
  "limit": 200
}
```

建议输出：

```json
{
  "schema_id": "synthesis.citation_graph_view",
  "schema_version": "1.0.0",
  "topic_ids": ["detr"],
  "papers": [],
  "references": [],
  "edges": [],
  "contexts": [],
  "snapshot": {
    "status": "up_to_date | stale_updating | building | update_failed",
    "snapshot_id": "cgraph-snap:...",
    "generated_at": "...",
    "stale_reason": null,
    "background_job_id": null
  },
  "highlight": {
    "paper_refs": [],
    "reference_ids": [],
    "edge_ids": []
  },
  "diagnostics": []
}
```

完整 citation graph 不应塞进 `list_topics` 或默认 topic context，避免响应过重。Topic context 只应返回轻量摘要，例如 citation node count、external reference count、high-degree references。

不要引入 domain-level `current topic`。Topic-scoped citation graph 必须通过显式 `topicIds` 或 `paperRefs` 查询。UI 可以有 focused topic / detail topic 这样的前端状态，但内部 service 不接受隐式 current topic。

Topic-scoped citation graph 是动态 view，不是 topic artifact 正文的一部分。计算方式是：

```text
topic resolved paper set
  JOIN global citation graph papers/references/edges/contexts
  -> topic-scoped citation graph view
```

Topic artifact 最多保存 citation graph summary 或 view cache key，不保存完整 graph。

### Operational Pipeline

Citation registry / matching / alias 维护应作为后台管线运行，而不是要求用户手动反复执行 reference-matching workflow。正常用户路径应保持：

```text
Import paper
Run literature-digest
Done
```

后台自动维护：

```text
paper registry
BBT alias index
reference instances
reference resolutions
citation contexts
citation graph projections
cleanup proposals
```

#### Paper Import / Metadata Change

触发源：

- Zotero item created。
- Zotero item imported。
- Zotero item metadata changed。

后台动作：

1. 创建或更新 Paper Registry 记录。
2. 使用 `paper_ref = <libraryID>:<itemKey>` 作为库内正式 paper ID。
3. 抽取 Zotero metadata：
   - title
   - year
   - authors
   - DOI / arXiv / PMID / ISBN
   - itemKey
4. 尝试读取 Better BibTeX citeKey。
   - BBT 可用：写入 citation alias layer，标记 active。
   - BBT 不可用：写 diagnostic，不阻塞 synthesis layer。
5. 更新本地投影：
   - `zotero_item_index`
   - `citation_alias_index`
6. 触发反向 rematch：
   - 用该 paper 的 DOI / title_signature / author_year_key / citeKey 查旧 reference instances。
   - 只把命中 bucket 的 reference instances 加入 `rematch_queue`。

生成 / 更新：

- `citation-graph/papers/<paper_ref>.json`
- `citation aliases` projection / canonical alias records if materialized
- `zotero_item_index`
- `rematch_queue`

用户可见状态：

- paper indexed。
- digest missing / available。
- references unavailable / extracted。
- citation graph rematch pending / clean。

#### Literature-Digest Apply

触发源：

- literature-digest workflow apply 成功。

后台动作：

1. 登记 digest artifact。
2. 读取 `references.json`。
3. 为该 source paper 生成 `reference_instances`。
4. 标准化 references 字段：
   - normalized DOI
   - title_signature
   - author_year_key
   - source citeKey alias hint
5. 写入 reference instance canonical file。
6. 更新 `reference_instance_index`。
7. 对该 paper 的新 references 立即执行 matching：
   - DOI exact
   - arXiv / PMID / ISBN exact
   - paper_ref / itemKey exact
   - active BBT citeKey exact
   - stale citeKey exact
   - title + year + first author
   - fuzzy title only as ambiguous
8. 写入 `reference_resolutions`。
9. 如果 citation_analysis 可用：
   - 读取 citation contexts。
   - 绑定到 `ref_instance_id`。
   - 写入 `citation_contexts`。
10. 生成 cleanup proposals：
    - ambiguous reference match
    - possible duplicate papers
    - stale citeKey alias
11. 更新该 source paper 的 citation slice。
12. 标记相关 global / topic-scoped citation graph snapshots stale。
13. 入队必要的后台刷新 job：
    - `rebuild_paper_citation_slice`
    - `rebuild_topic_citation_view`
    - `generate_cleanup_proposals`

生成 / 更新：

- `reference-instances/<source_paper_ref>.json`
- `reference-resolutions/<shard>.json`
- `contexts/<context_id>.json`
- `cleanup-proposals/<proposal_id>.json`
- `citation-graph-index.sqlite`
- stale graph snapshot manifest
- background graph jobs

用户可见状态：

- digest available。
- references extracted。
- reference matching matched / unmatched / ambiguous / pending rematch。
- cleanup proposal count。

#### Later Paper Import

触发源：

- 新 Zotero item 入库，但该 item 可能正是旧 references 指向的文献。

后台动作：

1. 创建 / 更新 Paper Registry 记录。
2. 更新 paper metadata index。
3. 读取 BBT citeKey alias。
4. 通过倒排索引查找旧 references 的候选 bucket：
   - DOI bucket
   - title_signature bucket
   - author_year_key bucket
   - citeKey alias bucket
5. 只 rematch 这些候选 reference instances。
6. 如果旧 reference 现在能匹配到新 paper：
   - 更新 reference resolution。
   - 标记相关 citation graph snapshots stale。
   - 入队受影响 topic/global snapshot refresh job。
7. 如果产生冲突：
   - 保持 ambiguous。
   - 生成 cleanup proposal。

不会发生：

- 不重新跑全库 digest。
- 不重写旧 source paper 的 reference instances。
- 不执行 N×N 全库 matching。

这一步解决：

```text
旧 references 是否指向新入库 paper
```

#### Later Literature-Digest for the New Paper

触发源：

- 新 paper 自己的 literature-digest apply 成功。

后台动作同 `Literature-Digest Apply`：

- 生成新 paper 的 reference instances。
- 匹配它引用的 references。
- 更新 citation contexts。
- 更新 paper citation slice，并标记 / 刷新受影响 graph snapshots。

这一步解决：

```text
新 paper 引用了谁
```

它与 Later Paper Import 的反向 rematch 是两条不同路径，两者都需要。

#### BBT citeKey Refresh

触发源：

- 插件启动 / registry refresh。
- Zotero item changed。
- Better BibTeX 插件可用性变化。
- 用户点击 `Refresh citation aliases`。
- 写作 / export workflow 前刷新相关 paper refs。

后台动作：

1. 读取当前 BBT citeKey。
2. 比较当前 active alias。
3. 若不变：更新 `last_seen_at`。
4. 若变化：
   - 旧 active alias 标记 stale。
   - 新 citeKey 写为 active。
   - 生成 `changed_citekey_alias` proposal 或 event。
5. 若 BBT 不可用或 citeKey 为空：
   - 不删除旧 alias。
   - 写 diagnostic。
   - synthesis layer 继续运行。
6. 使用旧 alias bucket、新 alias bucket、当前 matched 到该 paper 的 refs 触发 rematch。
7. 对 resolution 发生变化的 refs，标记对应 graph snapshots stale，并入队后台刷新 job。

references artifact 中的 `citeKey` 列不删除，但语义改为：

```text
source artifact 提供的 citation alias hint
```

导入 reference instance 时保留为 `source_aliases`，用于 matching evidence。它不是 canonical ID。

#### Topic Detail Graph Tab Query

触发源：

- 用户打开 Topic Detail 的 Graph tab。

后台动作：

1. 使用页面上下文中的显式 `topic_id`。
2. 查询 topic resolved paper set。
3. 查询 citation graph projection：
   - source papers in topic
   - their reference instances
   - current resolutions
   - citation contexts
   - shared external references
4. 返回 topic-scoped citation graph view。
5. 按 snapshot 状态返回：
   - fresh snapshot：直接渲染，状态为 `up_to_date`。
   - stale snapshot：先渲染 cached view + stale/updating badge，并入队 `rebuild_topic_citation_view`。
   - no snapshot：返回 pending empty graph + building badge，并入队 `rebuild_topic_citation_view`。
   - failed snapshot：保留上一个 usable snapshot，展示失败诊断和 retry action。
6. 后台刷新完成后发送 graph update event，UI 重新拉取 topic-scoped view。

这个过程不引入 `current topic` 全局语义。Topic Detail Graph tab 的 scope 总是来自当前详情页显式 `topic_id` 和该 topic 的 resolved paper set。

#### Index / Registry Query

触发源：

- 用户打开 Index 页面。

展示全局健康状态：

```text
Papers
  indexed / digest missing / stale metadata / possible duplicates

References
  matched / unmatched / ambiguous / pending rematch

Citation Graph
  nodes / edges / stale views / high-degree refs

Cleanup Queue
  pending proposals
```

#### Cleanup Queue

触发源：

- 用户主动进入 Index -> Cleanup Queue。

用户面对 proposal，不面对底层表：

```text
Paper A 和 Paper B 疑似重复，是否确认？
Reference #12 from Paper C may refer to Paper D, approve?
citeKey changed from oldKey to newKey, keep alias history?
```

用户操作：

```text
Approve
Reject
Skip
```

内部 cleanup service apply proposal：

- Approve duplicate：merge/redirect work identity，标记 duplicate paper relation。
- Approve reference match：写 forced_match override。
- Reject match：写 rejected_match override。
- Skip：保留 pending 或 snooze。
- Rejected proposal 保留，避免重复生成。

用户日常不需要进入 Cleanup Queue。它是可选质量提升入口。

#### Explicit Maintenance Actions

Index 页面可提供显式维护动作：

```text
Rebuild citation indexes
Re-run reference matching
Refresh citation aliases
Rebuild topic-scoped graph caches
Generate cleanup proposals
```

这些动作是诊断 / 修复 / 维护工具，不是日常主路径。点击后只创建后台 job，不在前端线程内同步执行。Index 页面显示 job 状态、进度、失败诊断和 retry/cancel 入口。

维护动作的执行边界：

- `Rebuild citation indexes`：重建 SQLite projection 和全局 snapshot manifest。
- `Re-run reference matching`：按 bucket 入队，不做一次性 N×N 全库匹配。
- `Refresh citation aliases`：刷新 BBT citeKey alias index；BBT 不可用时保留旧 alias history 并标记 stale。
- `Rebuild topic-scoped graph caches`：按 topic 入队 `rebuild_topic_citation_view`。
- `Generate cleanup proposals`：只生成 proposal，不自动 merge 或 override。

### Registry and Cleanup Proposals

Index 页面复用为 Registry 主页。Registry 主页以统一 `Literature` 视图作为用户管理入口，而不是把 `papers` 和 `references` 拆成两个主页面。`paper` 仍是数据模型里的正式库内对象；`reference` 是 citation graph 的来源对象；但 UI 上二者都以“文献条目”进入同一个列表。

```text
Index / Registry
  Literature
  Citation Graph
  Concepts
  Topics
  Tags
  Sync
  Cleanup Queue
```

每个区显示轻量统计和入口：

- Literature：library items / reference-only / matched / unmatched / ambiguous / stale / possible duplicates。
- Citation Graph：paper nodes / reference instances / resolved edges / high-degree references。
- Concepts：active / provisional / conflicts。
- Topics：materialized / unplaced / stale。
- Tags：vocabulary health / validation warnings / deprecated tags / usage stats。
- Sync：last sync / pending changes / conflicts。

Work registry 是内部 identity layer，不作为 Registry 主页核心管理对象。一个 work linked 到多个 papers 时，应显示为 paper-level cleanup proposal，例如：

```text
Paper A 和 Paper B 疑似是同一篇论文，是否合并 Zotero 条目或标记为不同？
```

而不是让用户直接维护：

```text
Work X has papers [A, B]
```

Cleanup Queue 是 Index 的子页面，用户可选进入。主流程不要求用户处理 cleanup proposals。

Proposal 类型第一版聚焦 paper/reference 语言：

```text
duplicate_papers
reference_matches_paper
ambiguous_reference_match
stale_paper_metadata
changed_citekey_alias
```

Work-level 操作可以作为 proposal 的内部 action，但不作为主文案。

Proposal 示例：

```json
{
  "schema_id": "synthesis.cleanup_proposal",
  "schema_version": "1.0.0",
  "proposal_id": "cleanup:duplicate_papers:...",
  "proposal_type": "duplicate_papers",
  "title": "Possible duplicate papers",
  "summary": "Two Zotero items appear to describe the same paper.",
  "confidence": "high",
  "evidence": [
    "Same DOI",
    "Highly similar title",
    "Same first author and year"
  ],
  "user_facing_actions": [
    {
      "action": "approve",
      "label": "Merge or link as duplicate"
    },
    {
      "action": "reject",
      "label": "Keep separate"
    },
    {
      "action": "skip",
      "label": "Decide later"
    }
  ],
  "internal_actions": [
    {
      "action": "merge_works",
      "work_ids": ["work:zsk1:...", "work:zsk1:..."]
    }
  ],
  "affected_records": {
    "paper_refs": ["1:ABC", "1:XYZ"],
    "ref_instance_ids": [],
    "work_ids": ["work:zsk1:...", "work:zsk1:..."]
  },
  "status": "pending",
  "created_at": "..."
}
```

Proposal status：

```text
pending
approved
rejected
skipped
expired
superseded
applied
failed
```

Rejected proposal 必须保留，用于防止系统反复提出同一个错误建议。

用户日常不需要进入 Cleanup Queue。插件自动算法应在多数情况下给出足够好的 best-effort graph；Cleanup Queue 是可选质量提升入口。

## Concept Knowledge Base

Concept KB 是跨库全局知识库，而不是每个 library 各维护一份自己的 concept。

为支持多义性，模型拆成：

```text
Concept
  - 表示词形聚类，例如 "Transformer"
  - 管理 canonical label、aliases、全局身份

Sense
  - 表示具体含义，例如 NLP Transformer、Vision Transformer、electrical transformer
  - 每个 sense 有定义、领域、证据、适用 topic

Alias
  - 某个 concept/sense 的别名、缩写、大小写变体

Relation
  - sense 与 sense / topic / tag 之间的关系
```

### Concept

```json
{
  "schema_id": "synthesis.concept",
  "schema_version": "1.0.0",
  "concept_id": "concept:transformer",
  "canonical_label": "Transformer",
  "aliases": ["transformers"],
  "sense_ids": ["sense:transformer-nlp", "sense:transformer-vision"],
  "created_at": "...",
  "updated_at": "..."
}
```

`Concept.aliases` 是 denormalized read snapshot，用于快速展示和搜索摘要。Canonical alias records 存放在 `synthesis/concepts/aliases/<alias_id>.json`。

### Sense

```json
{
  "schema_id": "synthesis.concept_sense",
  "schema_version": "1.0.0",
  "sense_id": "sense:hungarian-matching-detr",
  "concept_id": "concept:hungarian-matching",
  "label": "Hungarian Matching",
  "domain": "object detection",
  "concept_type": "method",
  "short_definition": "A one-to-one assignment method used to match predicted boxes with ground-truth objects.",
  "definition": "In DETR-style object detection, Hungarian matching computes an optimal assignment between predicted boxes and ground-truth boxes, enabling set prediction without duplicate detections.",
  "disambiguation": "In DETR-related work, this refers to bipartite matching for set prediction training.",
  "aliases": ["Hungarian algorithm", "bipartite matching"],
  "source": {
    "kind": "topic_synthesis",
    "topic_id": "detr",
    "run_id": "..."
  },
  "confidence": "high",
  "status": "active",
  "created_at": "...",
  "updated_at": "..."
}
```

`Sense.aliases` 同样是 denormalized read snapshot，不是 alias 真源。Alias 的新增、废弃、重定向和置信状态由 canonical alias records 管理。

### Alias Records

Alias 是独立 canonical record，用于控制动态链接、BM25 搜索和多义消歧。Concept / Sense 中的 aliases 只是由 alias records 投影出来的快照。

```json
{
  "schema_id": "synthesis.concept_alias",
  "schema_version": "1.0.0",
  "alias_id": "alias:hungarian-algorithm",
  "label": "Hungarian algorithm",
  "concept_id": "concept:hungarian-matching",
  "sense_id": "sense:hungarian-matching-detr",
  "status": "active",
  "confidence": "high",
  "source": {
    "kind": "topic_synthesis",
    "topic_id": "detr"
  },
  "created_at": "...",
  "updated_at": "..."
}
```

UI 不直接编辑 Concept / Sense alias snapshot。Alias 变化必须通过 alias proposal 或内部 ingestion flow 更新 canonical alias records，再刷新 snapshots 和 SQLite projection。

### Concept Type Enum

保持 enum 小而稳定，降低 LLM 输出失败率：

```text
method
model
task
metric
dataset
theory
architecture
domain_term
other
```

### Confidence Enum

```text
high
medium
low
```

## Topic Concept Links

Topic-to-concept link 不应只存在数据库中。当前 Topic Synthesis 是文件真源，因此当前 topic 与 concept 的关联也应落在 topic current 目录。

路径：

```text
synthesis/topics/<topic_id>/current/concepts.json
```

Schema：

```json
{
  "schema_id": "synthesis.topic_concept_links",
  "schema_version": "1.0.0",
  "topic_id": "detr",
  "concept_kb_revision": "sha256:...",
  "links": [
    {
      "sense_id": "sense:hungarian-matching-detr",
      "label": "Hungarian Matching",
      "aliases": ["Hungarian algorithm"],
      "short_definition_snapshot": "A one-to-one assignment method used to match predicted boxes with ground-truth objects.",
      "relevance": "core",
      "confidence": "high",
      "source": "topic_synthesis_stage_5_5",
      "evidence_summary": "Explains DETR's training assignment mechanism."
    }
  ],
  "diagnostics": []
}
```

`short_definition_snapshot` 使 topic artifact 在 KB 更新后仍有稳定显示能力。UI 可选择用 snapshot，也可按 `sense_id` 查询最新 KB definition。

## LLM Concept Proposal

Agent 不直接写全局 KB 内部记录。Agent 只写 proposal，由插件内部 concept ingestion service 负责校验、去重、合并、分配稳定 ID、更新文件和索引。

### Stage Placement

Concept card 生成不应做成默认独立 workflow。更高效、更省 token、用户体验更好的路径是在 Topic Synthesis 中插入一个轻量阶段：

```text
stage_5_cross_paper_synthesis
stage_5_5_concept_cards
stage_6_validate_final_artifacts
```

Stage 5.5 输入：

```text
runtime/views/cross-paper-context.md
runtime/payloads/cross-paper-evidence-map.json
result/sections/*.json
```

Stage 5.5 输出：

```text
runtime/payloads/concept-cards-proposal.json
```

Stage 5.5 不重新读取 raw digest，不重新做逐篇 paper extraction。它只消费已经验证过的 cross-paper context、evidence map 和 final sections。

### Proposal Schema

```json
{
  "schema_id": "synthesis.concept_cards_proposal",
  "schema_version": "1.0.0",
  "topic_id": "detr",
  "source_scope": {
    "artifact_types": ["cross_paper_context", "evidence_map", "final_sections"],
    "language": "auto"
  },
  "concept_cards": [
    {
      "local_id": "c1",
      "label": "Hungarian Matching",
      "aliases": ["Hungarian algorithm", "bipartite matching"],
      "concept_type": "method",
      "domain": "object detection",
      "short_definition": "A one-to-one assignment method used to match predicted objects with ground-truth objects.",
      "definition": "In DETR-style object detection, Hungarian matching computes an optimal assignment between predicted boxes and ground-truth boxes, enabling set prediction without duplicate detections.",
      "disambiguation": {
        "meaning": "Hungarian matching as used in object detection training.",
        "not_this_when": [
          "The text discusses the general Hungarian algorithm without object detection or assignment loss."
        ],
        "keywords": ["DETR", "assignment", "predicted boxes", "ground-truth boxes"]
      },
      "topic_relevance": "core",
      "evidence": [
        {
          "paper_ref": "1:ABC",
          "quote_or_summary": "DETR uses Hungarian matching to assign predictions to ground-truth boxes.",
          "section": "method_contribution"
        }
      ],
      "relations": [
        {
          "relation": "used_by",
          "target_label": "DETR",
          "rationale": "The evidence describes Hungarian matching as part of DETR training."
        }
      ],
      "merge_hints": ["Hungarian algorithm"],
      "confidence": "high"
    }
  ],
  "diagnostics": []
}
```

Agent-owned fields：

```text
local_id
label
aliases
concept_type
domain
short_definition
definition
disambiguation
topic_relevance
evidence
relations
merge_hints
confidence
```

Concept proposal relation enum:

```text
used_by
uses
broader_than
narrower_than
related_to
contrasts_with
part_of
has_part
```

Relation proposals in concept cards are semantic hints only. The concept ingestion service may accept, normalize, downgrade to review, or drop them if target resolution is weak. Agent-proposed concept relations do not directly create canonical relation records without validation.

Runtime-owned fields：

```text
concept_id
sense_id
alias_id
relation_id
normalized labels / aliases
content hashes
BM25 / FTS index rows
embedding cache rows
SQLite primary keys
sync metadata
```

Agent 禁止写：

```text
concept_id
sense_id
payload_hash
digest_locator
mention locator
SQLite fields
Git sync metadata
[[wiki links]]
```

### Prompt Rules

Prompt 应把任务压成五项任务：

```text
1. Identify concepts that a reader may need explained.
2. Group aliases and near-duplicates.
3. Split different meanings when the same label is ambiguous.
4. Write a short definition for each meaning.
5. Link every definition to evidence snippets from the provided artifacts.
```

禁止：

```text
- create stable global ids
- write database fields
- write BM25 or embedding data
- modify artifact text
- invent concepts not supported by evidence
- write long encyclopedia entries
```

Definition rules：

- `short_definition`: exactly one sentence, max 35 words.
- `definition`: 1-3 sentences, max 90 words.
- Use only evidence from provided artifacts.
- If evidence is too weak, omit the concept or place it in `diagnostics`.
- Do not write field-wide claims.
- Do not say "commonly used", "standard", or "widely adopted" unless at least two evidence snippets support the statement.

Extraction criteria：

- Extract methods, models, tasks, metrics, datasets, theories, architectures, benchmarks, evaluation protocols, or domain-specific terms.
- Extract only if the term is likely reusable across papers/topics or necessary for understanding this topic synthesis.
- Do not extract ordinary nouns, one-off paper wording, full sentence claims, author names, or generic words like "performance" unless they name a domain-specific concept.

### Multi-Sense Labels

多义性通过“同 label 多 card”表达，而不是让 agent 管理 `sense_id`。

```json
{
  "concept_cards": [
    {
      "local_id": "c1",
      "label": "Transformer",
      "concept_type": "architecture",
      "domain": "Deep Learning",
      "short_definition": "A neural architecture based on self-attention for modeling relationships among input elements.",
      "definition": "In deep learning, a Transformer uses self-attention and feed-forward layers to model dependencies without recurrent computation.",
      "disambiguation": {
        "meaning": "Transformer as a neural network architecture.",
        "not_this_when": ["The text refers to electrical devices or power conversion."],
        "keywords": ["self-attention", "BERT", "vision transformer", "sequence modeling"]
      },
      "evidence": []
    },
    {
      "local_id": "c2",
      "label": "Transformer",
      "concept_type": "domain_term",
      "domain": "Electrical Engineering",
      "short_definition": "A device that transfers electrical energy between circuits through electromagnetic induction.",
      "definition": "In electrical engineering, a transformer changes voltage or current levels between circuits using coupled coils.",
      "disambiguation": {
        "meaning": "Transformer as an electrical device.",
        "not_this_when": ["The text discusses attention-based neural architectures."],
        "keywords": ["voltage", "coil", "AC power", "electromagnetic induction"]
      },
      "evidence": []
    }
  ]
}
```

插件内部后处理再决定：

- 是否把两张 card 挂到同一个 canonical concept 下的不同 senses。
- 是否拆成两个 concept。
- 是否需要用户确认。

## Concept Ingestion Flow

插件内部 concept ingestion service 在 topic apply 阶段处理 concept proposal：

1. 读取 `runtime/payloads/concept-cards-proposal.json`。
2. 校验 proposal schema。
3. 标准化 label、alias、domain。
4. 用 BM25 / token overlap / exact alias 查找候选 concept/sense。
5. 生成 merge decision：
   - 高置信 exact match：合并到已有 sense。
   - label 相同但 domain/definition 差异大：创建新 sense。
   - 无候选：创建新 concept + sense。
   - 低置信冲突：写入 review queue，不阻塞 topic apply。
6. 写入全局 `synthesis/concepts/*` 文件。
7. 写入当前 topic 的 `topics/<topic_id>/current/concepts.json`。
8. 重建或增量更新 SQLite BM25 索引。
9. 更新 `sync/sync-manifest.json`。

Concept import 错误不应阻塞 topic synthesis apply，除非错误破坏主 artifact 合同。KB 是增强能力，不应让 topic synthesis 主流程因概念合并失败而整体失败。

## Dynamic Concept Link Rendering

v1 不写入 `[[wiki link]]` 到正文，不维护 sidecar locator。

改为 UI 渲染时动态插入链接：

- 只使用当前 topic 的 `current/concepts.json`。
- 长 alias 优先于短 alias。
- 同一段落同一个 sense 只链接一次。
- 每段最多链接固定数量，例如 3 个。
- 跳过 `code`、`pre`、JSON、math、已有链接、citation key。
- 短词小于 4 字符默认不链接，除非是大写缩写且 `relevance=core`、`confidence=high`。
- 多义词如果当前 topic 中有多个候选 sense，则不自动链接。
- 用户可以关闭 Concept overlay。

点击 link 后显示 concept bubble：

```text
Concept label
Short definition
Domain / type
Aliases
Related topic
Source
Confidence
Open concept detail
```

该方案的目标是：source artifact 和 synthesis text 保持干净，链接质量可控，最坏情况是链接不显示，而不是错误改写正文。

## Tag Vocabulary

Tag 管理系统内建到 synthesis layer，不再作为独立 tag manager workflow 承担主路径功能。原 tag manager workflow 的创建、搜索、更新、删除、校验、统计等能力应迁入 synthesis layer UI 和内部 tag service。

设计参考 `reference/Zotero_TagVocab` 的协议，但 v1 收敛为单一源：

```text
synthesis/tags/vocabulary.json
```

不做：

- 多源订阅。
- package registry。
- vendored packages。
- pointer packages。
- overlay/fork 机制。
- 外部 tag 包市场。

### Protocol Compatibility

保留 Zotero_TagVocab 的核心协议约束：

```text
tag_pattern: ^[a-z_]+:[a-zA-Z0-9/_.-]+$
max_tag_length: 120
```

Facet enum：

```text
field
topic
method
model
ai_task
data
tool
status
```

Tag entry 最小结构：

```json
{
  "tag": "topic:object-detection",
  "facet": "topic",
  "source": "manual",
  "note": "目标检测",
  "deprecated": false
}
```

`abbrev` 注册机制保留，用于保证 `DL`、`CNN`、`FEM`、`LiDAR` 这类大小写稳定。

`aliases` 保留为 synonym / legacy tag -> canonical tag mapping。

`load_vocabulary(source)` 语义保留为只读读取完整 vocabulary：

```text
load_vocabulary(source) -> read tags/vocabulary.json or imported tags.json
```

旧 TagVocab 协议中的 subscribe naming 只作为兼容概念理解，不代表 v1 实现多源订阅系统。v1 不做多源合并。导入外部 vocabulary 时，流程是：

```text
import tags.json
  -> validate against built-in TagVocab protocol
  -> replace or merge local vocabulary by explicit user action
  -> update tag-index.sqlite
  -> enqueue Git sync
```

### Canonical Files

```text
synthesis/tags/
  vocabulary.json
  aliases.json
  abbrev.json
  protocol.json
  manifest.json
```

`vocabulary.json` 是消费与同步真源，等价于 Zotero_TagVocab 的 `tags/tags.json`。

`aliases.json` 对应原 `tags/aliases.yaml`。

`abbrev.json` 对应原 `tags/abbrev.yaml`。

`protocol.json` 是内建协议摘要，记录 facets、tag pattern、长度限制和 schema version。

不把 per-facet YAML 作为 runtime canonical store。per-facet YAML 可以作为导入/导出格式，后置实现。

### UI Ownership

Tag 管理应在 synthesis layer UI 中完成，而不是继续以 workflow 形式存在。

建议入口：

```text
Tags
```

Tags 页面是新的 Tag Vocabulary 主界面，不再受 Zotero 原生窗体限制。它应作为 synthesis workbench 的独立页面，而不是藏在 workflow 或 Index 子页中。

推荐布局：

```text
Facet sidebar
  -> tag table / grouped list
  -> tag inspector
```

顶部工具区：

```text
Search
Validate
Import / Export
Sync status
```

第一版 UI 能力：

- 搜索 tags。
- 按 facet 分组和过滤。
- 创建 tag。
- 修改 note / deprecated / replacement。
- soft delete / restore。
- 管理 aliases。
- 管理 abbrev。
- validate vocabulary。
- import / export `tags.json`。
- 查看 tag stats。
- 查看 tag usage count / recently used。
- 查看 validation warnings。
- 批量处理 deprecated / replacement。

Tag inspector 显示：

```text
canonical tag
facet
note
aliases
abbrev
deprecated / replacement
usage count
source
last synced
validation warnings
```

原 tag manager workflow 可保留为短期兼容入口，但不再是主路径；后续可以废弃。

### Runtime Consumers

`tag-regulator`、literature ingest、digest、synthesis 等能力应消费同一份 tag index：

```text
synthesis/tags/vocabulary.json
  -> validate / normalize
  -> tag-index.sqlite
  -> tag-regulator / UI / workflows
```

Tag index 是可重建投影，不是同步真源。

## Git Sync

主同步采用 Git adapter。v1 默认启用后台自动同步，但必须非阻塞，并通过事务、队列和冲突 gate 保证本地 canonical store 不被 Git 操作污染。

```text
Zotero UI
  -> internal sync service
    -> Git sync adapter
      -> remote repo
```

用户配置：

```json
{
  "sync_backend": "git",
  "repo_url": "...",
  "branch": "main",
  "access_token_ref": "zotero-skills-sync-token",
  "auto_sync": true
}
```

用户可见配置只包含：

- Repository URL。
- Branch，默认 `main`。
- Access token。
- Sync enabled。

高级配置隐藏：

- sync interval。
- local worktree path。
- retry policy。

Access token 不进入 Git repo。优先使用系统 credential store；如果不可用，应由插件敏感配置存储管理，并在 UI 中提示风险。

### Sensitive Data and Redaction

Git sync 只能同步 synthesis canonical store，不同步任何运行时、密钥、缓存或用户临时工作区。

禁止进入 Git repo：

```text
access token
Authorization header
Zotero profile secrets
ACP/agent runtime logs
skill run workspaces
SQLite projection files
diagnostics with unredacted credentials
temporary export/import directories
lock files
```

Sync diagnostics 必须做 redaction：

```text
https://token@github.com/user/repo.git
  -> https://***@github.com/user/repo.git

Authorization: Bearer <token>
  -> Authorization: Bearer ***
```

UI 只显示 credential 的引用名或状态：

```text
credential: configured
credential_ref: zotero-skills-sync-token
```

不得显示 token 原文、完整 remote URL credential、完整 Authorization header。

### Sync Queue

所有触发只 enqueue sync，不阻塞当前操作。

触发点：

- 插件启动后延迟同步。
- topic artifact apply 后。
- concept/citation/topic graph 更新后。
- tag vocabulary 修改后。
- cleanup proposal apply 后。
- 用户点击 `Sync now`。

内部 mutation 不直接逐条触发 Git 操作。Topic relation ingestion、concept ingestion、citation graph jobs、cleanup proposal apply 等应在事务提交后只发出一次 `canonical-store-changed` event。Sync queue 消费 debounced store-change events，而不是消费每个 graph job 或每个文件写入事件。

状态机：

```text
idle
queued
syncing
blocked_conflict
failed_retryable
failed_permanent
disabled
```

队列规则：

- single worker。
- debounce burst changes。
- sync run 之间串行。
- `blocked_conflict` 时暂停后续 remote sync。
- 冲突期间本地仍可继续使用，新变更继续排队但不 push。
- 每次 sync run 必须持有 sync lock。
- lock stale 后只能由内部 sync service 通过带诊断的恢复流程清理，不能由 UI 直接删除。

### Transaction Boundary

本地 canonical store 和 Git working copy 分离：

```text
local canonical store
  synthesis/

git working copy
  sync-worktree/
```

同步使用 export/import：

```text
acquire sync lock
  -> export local canonical snapshot to temp export
  -> validate temp export
  -> copy export into sync worktree
  -> git fetch / pull / merge
  -> validate merged worktree
  -> if conflict: write conflict report and stop before import
  -> commit / push when needed
  -> import validated worktree into temp local store
  -> validate temp local store
  -> atomic promote into local canonical store
  -> rebuild SQLite projections
release sync lock
```

失败时不得破坏 local canonical store。

事务原则：

- Git worktree 不是本地真源，只是同步交换区。
- local canonical store 的更新必须通过 temp local store + atomic promote 完成。
- import 失败时保留原 local canonical store。
- export 失败时不得触碰 sync worktree。
- conflict 发生时不得 import remote 变更。
- rebuild SQLite projection 发生在 atomic promote 之后；projection rebuild 失败不回滚 canonical store，但会标记 index stale。

### Validation and Import Gate

所有从 sync worktree 进入 local canonical store 的内容必须先通过 gate：

```text
schema validation
manifest hash validation
path traversal validation
asset allowlist validation
tombstone validation
version compatibility validation
size / count limit validation
```

Path 规则：

- 只允许导入 `synthesis/` 下的 canonical asset。
- 拒绝绝对路径、`..`、symlink escape、reserved device name。
- 拒绝写入 `state/*.sqlite`、runtime、logs、temporary、diagnostics。

Version 规则：

- 支持的 schema version 正常导入。
- 未来 schema version 默认阻塞导入并提示升级插件。
- 已废弃 schema version 默认阻塞导入；本设计不包含运行时 schema 转换。

Size 规则：

- 单个 asset 和总 snapshot 都应有上限。
- 超限进入 `failed_permanent` 或 `blocked_conflict`，由 UI 展示可诊断错误。
- 不允许 silent truncate。

### Conflict Handling

无冲突时后台自动完成：

- pull。
- merge。
- validate。
- commit。
- push。
- update sync state。

有冲突时：

- 停止 sync queue 的 remote push/pull。
- UI toast：`同步暂停：需要解决冲突`。
- Index / Registry 显示 conflict panel。
- 用户解决冲突后才能继续同步。

UI 不应直接暴露 Git merge conflict 术语，而应转成业务语言，例如：

```text
Local and remote both changed tag vocabulary.
Choose:
- Keep local
- Keep remote
- Open comparison
```

内部 sync service 负责：

- clone / fetch / pull
- manifest diff
- local file merge
- commit
- push
- conflict report

插件侧只显示：

- sync backend
- current branch
- last sync time
- local revision
- remote revision
- conflict count
- actionable diagnostics

用户可见操作保持少而明确：

```text
Sync now
Pause sync
Resume sync
Resolve conflict
Retry
Open diagnostics
```

这些操作都调用内部 sync service，不由 UI 直接执行 Git 命令。

### Sync Manifest

```json
{
  "schema_id": "synthesis.sync_manifest",
  "schema_version": "1.0.0",
  "workspace_id": "sws_...",
  "library_id": 1,
  "generation": 42,
  "assets": [
    {
      "asset_id": "topics/detr/current/artifact.json",
      "content_hash": "sha256:...",
      "size": 12345,
      "updated_at": "...",
      "tier": "canonical"
    }
  ],
  "packs": [
    {
      "pack_id": "concepts-pack-0001",
      "content_hash": "sha256:...",
      "asset_count": 100,
      "size": 65536
    }
  ],
  "tombstones": []
}
```

### Conflict Strategy

v1 保守处理冲突：

- 不同文件可自动合并。
- 同一文件只有一端修改则自动采用修改端。
- 同一文件双端修改则标记 conflict。
- UI 提供 local / remote / manual resolve。
- Concept duplicate / semantic merge 交给后续 maintenance flow，不在 sync adapter 中做语义合并。

Git adapter 只负责文件级同步，不负责解释 concept 是否相同。

### Failure Handling

失败分级：

```text
failed_retryable
  network timeout
  remote temporarily unavailable
  auth provider temporary failure
  lock held by active sync worker

failed_permanent
  invalid repo URL
  credential rejected
  unsupported schema version
  invalid canonical asset
  path traversal / security violation

blocked_conflict
  same canonical file changed on both sides
  tombstone conflict
  manifest generation conflict
```

Retryable failure 使用指数退避，不弹出持续打扰用户的 toast；只在状态区显示。Permanent failure 和 conflict 才需要 toast / panel。

所有失败都必须生成 redacted diagnostics file，包含：

- sync run id。
- state transition。
- failed step。
- redacted remote URL。
- changed asset ids。
- error code。
- remediation hint。

## Retired Note Shards

Note shards 直接从 v1 同步设计中废弃，不作为 fallback、备份、转换入口或兼容层。

原因：

- 大库下 note count 和 write amplification 压力高。
- note payload 冲突难以维护。
- 删除、重命名、tombstone、pack compaction 都很难可靠表达。
- KB、citation graph 和 tag vocabulary 本质上更适合文件版本化与 manifest diff。
- 同时保留 Git sync 与 note shards 会迫使实现维护两套同步语义，增加长期复杂度。
- 早期 note-based 实验数据不进入正式产品同步设计；必要时可用一次性本地脚本处理测试数据。

## SQLite Projection

SQLite 负责本地查询和加速：

```text
concept-kb-index.sqlite
  - concept / sense / alias FTS
  - BM25 search
  - relation lookup
  - optional future embedding cache metadata

topic-graph-index.sqlite
  - adjacency list
  - graph neighborhood cache
  - topic path lookup

citation-graph-index.sqlite
  - paper/reference adjacency
  - citation role lookup
  - external reference matching cache
  - topic-scoped citation graph view cache
  - reference instance inverted index
  - cleanup proposal lookup
  - graph snapshot manifest / freshness status
  - background graph job queue state

tag-index.sqlite
  - tag vocabulary lookup
  - tag alias / abbrev lookup
  - vocabulary manifest / validation status
  - normalized tag search
```

SQLite 可以从 canonical files 重建：

```text
internal projection rebuild: target = concepts
```

因此 sync 不需要同步 SQLite 文件。

## UI Surface

### Workbench Navigation

第一版信息架构：

```text
Home
Topics    default: Topic Graph organization view
Graph     global Citation Graph
Concepts  Concept KB search / browse / lightweight edit
Tags      Tag Vocabulary manager
Index     Registry overview / cleanup queue
```

分工原则：

- `Topics` 管 topic 的组织结构，默认显示 topic graph。
- `Graph` 专注 citation graph，不再承载 topic graph。
- `Concepts` 是独立页面，定位为搜索、浏览和轻量编辑 Concept KB。
- `Tags` 是独立 Tag Vocabulary manager，承接原 tag manager workflow 的主功能。
- `Index` 是 Registry 主页，围绕 Literature / Citation Graph / Concepts / Topics / Tags / Sync 展示全局状态，并提供 Cleanup Queue 入口。
- `Topic Detail` 消费 topic graph / citation graph / concept KB 的摘要和入口，但不复制这些数据。

### Index / Registry Page

Index 是 registry 与系统健康中心，不应把底层 `papers` 和 `references` 拆成两个用户主入口。虽然数据模型区分 Paper Registry、Reference Instance 和 Resolution Layer，但用户视角里它们都属于“文献条目”。

推荐结构：

```text
Overview
Literature
Citation Graph
Cleanup
Sync
```

`Literature` 是核心表格，统一显示：

- Zotero library paper。
- digest reference。
- matched external reference。
- unmatched reference。
- ambiguous reference。
- possible duplicate paper。

用过滤器表达来源和状态，而不是拆页面：

```text
All
Library items
Reference-only
Matched
Unmatched
Ambiguous
Needs cleanup
Stale
```

表格建议列：

```text
Title
Year
Authors
Source
Resolution
Cited by / Cites
Topics
Tags
Status
Updated
```

视觉区分：

```text
Source
  Library item
  Reference only
  Matched reference
  External unresolved

Resolution
  Matched
  Unmatched
  Ambiguous
  Stale
  Forced
  Rejected

Health
  Digest missing
  Citation context available
  Needs cleanup
  Duplicate candidate
```

点击行打开右侧 inspector：

```text
Bibliographic summary
Zotero item binding
Reference occurrences
Matched target / candidates
Citation contexts
Related topics
Cleanup proposals
Actions
```

Index 的职责是“看全局状态并处理治理问题”，不是承载高频编辑工作。Tags 和 Concepts 作为独立页面；Cleanup Queue 从 Index 进入。

### Topics Page

Topics 页面应把 topic graph 作为默认组织方式。在现有 List / Grid 基础上增加 Graph view：

```text
Graph | List | Grid
```

默认：`Graph`。

Graph view 内部模式：

```text
Hierarchy | Neighborhood | Unplaced
```

Graph view 不应一上来画全库力导向图，而应优先服务“找 topic / 理解 topic 结构 / 整理 topic 关系”：

- 默认显示 top-level / recently active / pinned topic neighborhood。
- 支持搜索 topic 后聚焦 ego graph。
- 支持选中 topic 后显示 parents / children / related / overlaps。
- 支持 materialized / placeholder / stale / suggested 状态视觉区分。
- 支持 create/update synthesis 入口。
- 支持右侧 Inspector 进行关系查看和轻量编辑。
- 支持 Unplaced mode 集中处理未归类 topic。

列表项显示：

- parent chips
- child count
- related count
- concept count
- suggested relation indicator

### Graph Page

Graph 页面保持 citation graph 的单一功能页面。它用于浏览全局 paper/reference/citation-context 结构，不承担 topic graph，也不承担复杂 topic-scoped 主路径。

第一版默认不渲染全量 citation graph。建议默认显示：

- high-degree library papers。
- high-degree external references。
- recent / selected library neighborhood。
- active search result neighborhood。

全局 Graph 页面可以保留基础筛选：

- paper / reference search。
- year range。
- citation role。
- library-to-library / library-to-external edge type。
- selected node inspector。

Graph 页面同样读取 snapshot，不同步 rebuild：

- 顶部状态显示 `Up to date` / `Updating` / `Stale, updating` / `Update failed`。
- 用户筛选或搜索优先使用当前 snapshot 和 SQLite projection。
- 如果筛选结果需要缺失的 projection，后台入队 rebuild，UI 先展示 pending 或最近可用结果。
- 用户点击 `Rebuild` 只创建后台维护 job；页面继续可交互。

Topic-specific citation graph 的主入口不在全局 Graph 页面，而在 Topic Detail 的 Graph tab。

### Topic Detail Page

顶部或侧栏显示 detail topic 的 topic graph neighborhood：

```text
Parents:
Machine Learning > Deep Learning
Object Detection

Children:
...

Related:
...
```

不要把 topic graph 作为主内容区，避免干扰 synthesis artifact 阅读。

新增 `Graph` tab，复用 citation graph renderer，动态计算 detail topic 的 topic-scoped citation graph view。

Topic Detail Graph tab 输入来自页面上下文中的显式 `topic_id` / resolved paper refs：

```json
{
  "topicIds": ["detr"],
  "paperRefs": [],
  "includeExternalReferences": true,
  "includeContexts": true,
  "dimUnrelated": true
}
```

该 tab 不引入全局 `current topic` 语义。`detail topic` 只是当前页面上下文。

该 tab 的数据返回与全局 Graph 页面一致，包含 `snapshot.status`。UI 对 stale/building/failed 的处理只能是 badge、toast、retry action 和后台刷新，不允许阻塞 tab 切换、详情页滚动或 evidence explorer 操作。

视觉策略：

- detail topic 的 resolved papers：高亮或正常权重。
- 这些 papers 直接引用的 external references：正常权重。
- 多篇 topic papers 共同引用的 references：强调。
- 与 detail topic 无关但在当前 graph view 中出现的节点和边：降低 opacity，而不是默认删除。
- hover / selection 时恢复必要上下文。

该 tab 回答的问题：

- topic 内 papers 是否互相引用。
- topic 内 papers 共同引用了哪些外部文献。
- 哪些外部 references 是该 topic 的背景核心。
- 哪些 papers 是 citation bridge。
- 哪些 citation contexts 可供 Related Work / Introduction 使用。

### Digest Modal / Report View

Digest modal、synthesis report、review input preview 可以启用 concept link overlay。

行为：

- 当前 topic linked concept 命中：渲染为可点击 concept link。
- ambiguous / low confidence：不自动链接。
- 点击 link：显示 concept bubble，不离开当前阅读位置。

### Concepts Page

Concepts 是独立页面，定位为 Concept KB 的搜索、浏览和轻量编辑，不是大型知识库编辑器。

Concepts 页的原则是“可读、可查、可修正文案”，而不是让用户直接改动 concept 的身份关系。任何会影响引用关系、链接命中、sense 拆分、topic 绑定或 source provenance 的操作，都应走 proposal / cleanup flow 或后台生成流程。

推荐布局：

```text
Search + filters
  -> concept result list
  -> concept detail / readonly relation inspector
```

第一版支持：

- 搜索 concept label / alias / definition。
- 按 topic / recently used / concept type 过滤。
- 左侧结果列表，右侧详情。
- 查看同名 concept 的不同 senses。
- 查看 definition、source refs、related topics。
- 查看 confidence / status / provenance。

Concept list 每项显示：

```text
label
short definition first line
type badge
sense count
linked topic count
status / review badge
```

Concept detail 分区：

```text
Header
  label
  aliases
  concept type
  status

Definition
  short definition
  longer note
  usage note

Senses
  sense cards
  domain / topic scope
  disambiguation cue

Relations
  broader / narrower / related concepts
  related topics

Usage
  linked topics
  papers where mentioned
  synthesis sections where mentioned

Review
  duplicate candidates
  low confidence aliases
  stale concept cards
```

允许直接编辑的字段只限展示性文本：

- `short_definition`
- `definition`
- `usage_note`
- `editorial_note`

不允许在 Concepts 页面直接编辑：

- `concept_id`
- `sense_id`
- `aliases`
- `relations`
- `related_topics`
- `source_refs`
- `mention_refs`
- `status`
- provenance / confidence / hash 字段

这些字段会改变 concept 的身份、链接命中或数据引用关系，必须由系统生成 proposal，再由用户 approve / reject。例如：

```text
Alias proposal: "DETR" may refer to concept X.
Relation proposal: concept A may be broader than concept B.
Merge proposal: concept X and concept Y may be duplicates.
Sense split proposal: "Transformer" has model architecture and electrical device senses.
```

`status` 在 Concepts 页面只读。Status 变化只能来自 proposal action 或内部 lifecycle transition，例如 concept ingestion、stale detection、duplicate review、tombstone / restore flow。UI 不提供 status dropdown，避免用户绕过引用关系和索引维护逻辑。

编辑写入 canonical concept/sense files，并触发 SQLite projection 增量更新或 rebuild。UI 不直接改 SQLite。

第一版不做复杂 merge UI。低置信 merge conflict 可以进入 review queue，真正的合并操作后置。

## Review Workflow Value

Topic graph 能为后续文献综述 workflow 提供更好的定位信息：

- 当前 topic 属于哪个上位研究方向。
- 当前 topic 与哪些相邻 topic 交叉。
- 当前 topic 是否过窄或过宽。
- Related Work 是否需要从父 topic、兄弟 topic、邻近 topic 补充背景。

Concept KB 能为 review workflow 提供：

- 术语表。
- 可复用的概念解释。
- Related Work 中需要简短定义的术语候选。
- 读者背景缺口提示。
- 当前 topic 涉及的关键方法、任务、指标、数据集、评估概念集合。

Citation graph 能为 review workflow 提供：

- 当前 topic 的核心引用来源。
- 哪些外部文献被多篇库内 paper 共同引用。
- 某些方法、数据集、指标或 baseline 的引用链。
- Related Work 中需要补充的关键外部文献候选。
- 库内 paper 之间的引用和证据依赖结构。

Tag vocabulary 能为 review workflow 提供：

- 可复用的领域标签体系。
- 跨设备同步的 tag vocabulary。
- ingest / digest / synthesis 阶段一致的 tag normalization 基础。

## Suggested V1 Scope

第一版建议实现：

- Global Concept KB file model。
- Topic Graph file model。
- Citation Graph file model。
- Paper-first Registry model with internal Work identity layer。
- Reference instance / resolution layer for citation matching。
- Citation graph dynamic update model with snapshot manifest and background rebuild jobs。
- Cleanup Queue proposal model。
- Topic `current/concepts.json`。
- Topic Synthesis `stage_5_5_concept_cards`。
- Topic Synthesis `stage_5_6_topic_graph_relation_proposals`。
- Internal proposal ingestion / merge services。
- SQLite BM25 local index。
- UI concept bubble dynamic overlay。
- Git sync adapter 初版，后台自动同步、非阻塞、队列化、冲突 gate。
- TagVocab-compatible single-source tag vocabulary 纳入 Git 同步目录。
- Tag manager workflow 主路径退役，功能迁入 synthesis layer UI / internal tag service。
- Topics 页面默认 Topic Graph organization view。
- Graph 页面作为全局 Citation Graph 页面。
- Topic Detail 新增 Graph tab，复用 citation graph renderer 动态显示 topic-scoped citation graph view。
- Concepts 独立页面，支持搜索、浏览和展示性文本轻量编辑；身份、alias、relation、source links 通过 proposal 处理。
- Tags 独立页面，作为新的 Tag Vocabulary manager 主入口。
- Index 页面作为 Registry 主页，统一展示 Literature 条目并支持 Cleanup Queue 入口。
- Topic Graph view modes：Hierarchy / Neighborhood / Unplaced。
- Topic Inspector 支持 parent/related relation 的轻量整理操作。

第一版不实现：

- embedding。
- mention sidecar locator。
- 自动复杂冲突合并。
- hosted sync service。
- 自动改写 source artifact 正文。
- 独立全库 concept extraction workflow 作为默认入口。
- 独立 tag manager workflow 作为 tag 管理主入口。
- 多源 tag subscription / package registry / tag package marketplace。
- 全库 force-directed graph 作为默认 topic graph。
- 拖拽式复杂 topic graph 编辑器。
- 要求用户频繁审查 reference matching / work registry。
- 把 Work 作为 Registry 主页的用户管理一级对象。
- Citation graph rebuild 阻塞 UI 或阻塞 digest / synthesis apply。
- Concepts 页面直接编辑 concept identity / alias / relation / source reference。

## Suggested Change Name

```text
add-synthesis-knowledge-graph-and-git-sync
```

Delta specs 可能涉及：

```text
synthesis-knowledge-graph
synthesis-topic-graph
synthesis-citation-graph
synthesis-concept-kb
synthesis-tag-vocabulary
synthesis-sync
synthesize-topic-workflow
synthesis-workbench-ui
```

## Decisions

### Topic Graph Suggestions

High-confidence `broader_topic_candidate` can enter the default hierarchy view before user confirmation if all deterministic checks pass:

- no cycle
- no conflict with confirmed / rejected edge
- no rejected history for the same pair
- confidence is `high`

It must remain visually marked as `suggested` until the user confirms it. Suggested edges use weaker styling than confirmed edges.

### Concept Review Queue

Low-confidence concept merge conflicts require a dedicated review queue. They should not be handled as ordinary inline editing in the Concepts page, because merge / split decisions can change identity, aliases, relations, and dynamic link behavior.

### Git Sync Scope

Git sync v1 supports only one remote and one branch. Multi-remote, multi-branch, fork/overlay, and package-registry sync are out of scope.

### Tag Vocabulary Import

Tag vocabulary import must use a merge wizard, not silent replace.

The wizard should support:

```text
keep local
use imported
merge non-conflicting
review conflicts
```

### Concept Overlay

Concept overlay is enabled by default. Ambiguous and low-confidence matches are not linked automatically. Users can disable overlay globally or per view if the UI becomes noisy.

### External Interfaces

No new external interface is required by this design.

- Citation graph query already exists.
- Topic query already exists and does not need graph payload by default.
- Concept KB remains plugin-internal UI / runtime enhancement for v1.

### Topic Detail Graph Default

Topic Detail Graph tab defaults to topic neighborhood only:

- current topic resolved papers
- citation edges among those papers
- directly cited external references
- references shared by multiple topic papers
- citation bridge papers

It does not default to a wider graph with dimmed unrelated nodes. A later `Show wider context` option may expose broader context if needed.

### Cleanup Queue Actions

Cleanup Queue v1 only supports:

```text
approve
reject
skip
```

Advanced manual override is out of scope for v1.

### Work Canonical Promotion

`provisional` work records should be promoted to `canonical` conservatively.

Automatic promotion is allowed only when:

- DOI / arXiv / PMID / ISBN exact match has no conflicting evidence.
- A formal Zotero library item is linked and title fingerprint + year + first author match with no contrary identifier.
- User approves a cleanup proposal.

Keep `provisional` when evidence is weak or ambiguous:

- only fuzzy title match
- only BBT citeKey match
- only reference string similarity
- incomplete title/year/author
- multiple candidate library items
- conflicting identifiers

The guiding rule is: false non-merge is acceptable; false merge is harmful.

### Tag Manager Workflow

The tag manager workflow is retired as a main path. Tag management moves directly into the Tags UI and internal tag service. No compatibility period is required as a design goal.

### Citation Graph Background Jobs

Citation graph background jobs use single-writer execution in v1. There are no parallel writers for citation canonical files, SQLite projection, graph snapshots, or cleanup proposals.

Rationale:

- reference instances, resolutions, contexts, snapshots, and cleanup proposals are tightly coupled.
- parallel writers can create stale/fresh races, duplicate proposals, inconsistent snapshots, and rematch conflicts.
- UI responsiveness should be solved by scheduling and chunking, not by concurrent writes.

Scheduler rules:

```text
writer_concurrency = 1
```

The queue supports:

- priority classes
- job coalescing
- chunked bulk jobs
- latest-usable snapshot retention
- redacted diagnostics

Priority classes:

```text
P0 user_visible
  current UI needs a snapshot refresh
  e.g. Topic Detail Graph tab opened and topic snapshot is stale

P1 apply_followup
  literature-digest apply / topic synthesis apply follow-up updates

P2 maintenance
  explicit user maintenance action such as rebuild indexes or refresh aliases

P3 bulk_rebuild
  matcher version upgrade, projection schema rebuild, Git import rebuild
```

Execution rules:

- P0 jobs can jump ahead of P1/P2/P3 queued work.
- Running jobs are not force-killed.
- P3 jobs must be chunked so P0/P1 can run between chunks.
- Jobs with the same scope are coalesced instead of duplicated.

Coalescing examples:

```text
rebuild_topic_citation_view(topic=detr)
+ rebuild_topic_citation_view(topic=detr)
=> one job with merged reasons

rematch_reference_bucket(doi=10.x)
+ rematch_reference_bucket(doi=10.x)
=> one job with updated requested_at
```

Bulk rebuilds must be chunked:

```text
rebuild_indexes_scan
rematch_bucket_batch
rebuild_paper_slice_batch
rebuild_topic_view_batch
generate_cleanup_proposal_batch
```

Suggested v1 limits:

```text
max_items_per_batch = 100
max_run_ms_per_batch = 1000-3000ms
```

Snapshot retention:

```text
per graph scope:
  latest usable snapshot
  latest failed diagnostics
  current building temp snapshot
```

Rules:

- successful build replaces latest usable snapshot.
- failed build keeps latest usable snapshot and writes failed diagnostics.
- if no usable snapshot exists, UI shows building / failed empty state.
- temp snapshot is removed after success or failure.

Snapshot manifest should include stale reasons:

```json
{
  "scope_id": "topic:detr",
  "status": "stale_updating",
  "stale_reasons": [
    "reference_resolution_changed",
    "citation_context_changed"
  ],
  "latest_usable_snapshot": "...",
  "active_job_id": "graphjob:...",
  "updated_at": "..."
}
```

Sync integration:

- citation jobs may write many files internally.
- Git sync receives only one debounced `canonical-store-changed` event after the citation job transaction commits.
- graph snapshot / job queue files are local projection/cache and are not Git-synced.

## Open Questions

None for the current design pass.

## Implementation Roadmap and Design Shards

This document remains the full design source. Implementation should be split by functional coupling into the following design shards.

### 1. Foundation

Reference: `artifact/synthesis_kg_foundation_design_20260524.md`

Purpose:

- establish canonical store layout
- schema validation
- internal service write boundary
- projection rebuild framework
- `canonical-store-changed` event

This phase is required before all other domains.

### 2. Tag Vocabulary Manager

Reference: `artifact/synthesis_kg_tag_vocabulary_design_20260524.md`

Purpose:

- move tag manager main path into synthesis UI
- implement single-source TagVocab-compatible vocabulary
- validate canonical store + projection + UI pattern with a low-coupling domain

Recommended early phase after Foundation.

### 3. Topic Graph and Topic Synthesis Integration

Reference: `artifact/synthesis_kg_topic_graph_design_20260524.md`

Purpose:

- implement topic graph canonical model
- add topic synthesis relation proposals
- add Topics graph modes and Topic Inspector
- support root/top-level and Unplaced rules

This phase depends on Foundation and existing Topic Synthesis lifecycle.

### 4. Concept Knowledge Base and Overlay

Reference: `artifact/synthesis_kg_concept_kb_design_20260524.md`

Purpose:

- implement Concept / Sense / Alias / Relation model
- add concept card proposal stage
- add concept ingestion
- add topic concept links
- add Concepts page and dynamic overlay

This phase depends on Foundation and structured Topic Synthesis outputs.

### 5. Literature Registry and Citation Graph

Reference: `artifact/synthesis_kg_literature_registry_citation_graph_design_20260524.md`

Purpose:

- implement paper-first registry
- implement reference instances / resolutions
- implement BBT alias layer
- implement citation graph snapshots and background jobs
- implement cleanup proposals and unified Literature registry UI

This phase is the largest data domain and should not be bundled with Concept KB or Git Sync implementation.

### 6. Git Sync

Reference: `artifact/synthesis_kg_git_sync_design_20260524.md`

Purpose:

- sync canonical store with Git
- enforce transaction boundary
- protect credentials and runtime state
- implement conflict gate and sync queue

This phase should start only after the canonical schemas for at least one or two domains are stable.

### Recommended Order

```text
Foundation
  -> Tag Vocabulary Manager
  -> Topic Graph and Topic Synthesis Integration
  -> Concept Knowledge Base and Overlay
  -> Literature Registry and Citation Graph
  -> Git Sync
```

Alternative priority:

- If review workflow readiness is the priority, implement Topic Graph and Concept KB before Citation Graph.
- If citation graph correctness is the priority, implement Literature Registry before Concept KB.
- Git Sync should remain late because it amplifies schema churn if introduced too early.
