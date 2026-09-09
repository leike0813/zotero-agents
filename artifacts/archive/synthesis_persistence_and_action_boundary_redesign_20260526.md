# Synthesis Layer 持久化与动作边界重设计

日期：2026-05-26

状态：讨论工件

## 子工件索引

本文是完整设计底稿。后续进入 OpenSpec 实施时，优先阅读并引用以下子工件：

- `artifact/synthesis_persistence_redesign_implementation_principles_20260526.md`：实施总则，锁定 SQLite-first、read-path purity、review transaction、Citation Graph、Topic discovery、生命周期和 profiler 的共同原则。
- `artifact/synthesis_persistence_redesign_phase_plan_20260526.md`：分期计划，将本大型重设计拆成 repository foundation、Index DB-first、Citation Graph、Topic discovery、Topic / Concept / Tag runtime、JSON checkpoint、debug profiler 等可验收阶段。

## 目的

本文记录 Synthesis Layer 在持久化、业务动作语义和后台更新边界上的重设计方案。它刻意不只讨论持久化，因为当前可用性问题并不是单纯由存储方式造成的。存储模型、领域动作语义、后台 worker、Workbench UI，以及 MCP / Host Bridge 的读取合同，是紧密耦合在一起的。

目标是在进入实现前先敲定设计，使后续工作能够以更少、更连贯的 change 落地，而不是继续围绕 JSON projection、review card 和后台 job 做零散补丁。

## 当前诊断

当前 Synthesis Layer 的功能面已经很宽，但还不能称为产品级可用。很多部分已经接线，但系统仍然暴露了太多实现细节，并且在用户期望快速响应的路径上执行了过重的工作。

### 存储问题

当前模型把 `data/synthesis/` 下的 JSON canonical assets 作为主要运行时真源。这个模型具备可审计性，也便于未来同步，但它不适合作为 Zotero 插件的高频热路径：

- 大量小 JSON 文件会造成昂贵的文件系统 IO；
- 大型 projection JSON 会被反复读取、解析、计算 hash 和重写；
- Workbench snapshot 需要跨多个领域做 join，用文件实现既别扭又慢；
- 复检动作可以更新 canonical state，但 UI 仍然读取过期 projection state；
- 后台 worker 仍然花时间物化 JSON / DTO projection，而不是更新带索引的本地状态。

### 业务语义问题

一些动作的实际含义还没有达到 UI 暗示的效果。最典型的例子是 Index Cleanup：

- UI 把 `approve / reject / skip` 呈现为用户正在决定一条 unresolved reference 应该如何处理；
- 当前后端只是改变 cleanup proposal 的状态；
- 它不会把该 reference 对应的 literature item 正式纳入 Index；
- 它不会把该 reference 匹配到已有 paper；
- 它不会以用户可见的方式更新 reference resolution 语义。

这会让 UI 看起来像是坏掉了，即使底层事务在技术上已经成功。

### 后台任务问题

当前“后台 job queue”虽然是异步的，但还不够轻量。job 仍然运行在插件运行时中，并且可能执行昂贵的 JSON IO、hash 计算、图组装、metrics 和 layout 工作。用户感受到的是按钮很慢、UI 响应延迟、页面闪烁，以及不可预测的忙碌状态。

### UI 合同问题

Workbench 仍然过于直接地反映内部状态：

- `proposal_id`、`itemKey`、edge id、projection stale state 和 job name 出现在本应展示用户概念的位置；
- 多个页面的刷新方式会重置滚动位置或重建重型组件；
- review card 有时在底层动作没有明确业务效果之前，就已经要求用户做决策。

## 设计立场

Synthesis Layer 应转向 DB-first 的本地工作模型：

```text
SQLite 本地工作态             = 运行时真源
JSON canonical / checkpoint 资产 = 冷路径的导入、导出、审计、同步边界
Runtime files                 = 大型工件、缓存、日志、工作区
Prefs                         = 配置和小型开关
```

关键变化是：Workbench、MCP、Host Bridge 和后台 worker 不应再把 JSON canonical files 作为常规读写面。

### Hash 使用边界

本重设计不应从 file-first 退化成 hash-first。Hash 只能用于完整性校验、变更检测、短文件名、事务 / 缓存键和 exact duplicate detection。

适合 hash 的对象包括：

- artifact payload 内容，例如 digest、references、citation-analysis；
- facet / snapshot 的变更检测值；
- source artifact version；
- raw reference 的完全重复检测；
- 文件名、transaction id、缓存键等需要短稳定标识的场景。

不应只保存 hash 的对象包括：

- `normalized_title`；
- agent-authored matching metadata；
- topic interest metadata；
- concept labels / aliases；
- author、venue、parsed reference title 等需要检索、聚类、排序、解释或人工复审的文本。

任何需要检索、聚类、排序、解释或容忍小扰动的文本字段，都必须保留 normalized text 原文。Hash 可以作为可选 exact-match acceleration 或变更检测字段，但不得替代文本主字段，也不得成为语义匹配主路径。

## 持久化模型

### SQLite-first 本地状态

`state/zotero-agents.db` 应包含 Synthesis 专用的 typed tables，用于承载热状态。这个 DB 应成为以下数据的默认来源：

- Paper Registry rows 和 facets；
- works 与 work aliases；
- reference instances；
- reference resolutions；
- citation contexts；
- cleanup / review decisions；
- citation graph nodes 和 edges；
- citation graph ownership 与 incoming groups；
- lightweight metrics 与 complex metrics；
- layout metadata 和坐标；
- topic graph nodes、edges 和 review items；
- concept records、senses、aliases、relations 和 review items；
- tag vocabulary rows、aliases、abbrevs 和 validation state；
- dirty events、job state、worker run history 和 freshness state。

现有的 `plugin_task_rows.payload_json` 表适合承载通用插件任务，但不应继续作为高频 Synthesis 领域状态的主存储机制。Synthesis 需要 typed tables、索引、事务和 bounded queries。

### JSON canonical assets 作为冷路径

`data/synthesis/` 应继续作为 durable data 保留，但职责需要改变：

- 显式 checkpoint / export 目标；
- 显式 import 来源；
- 未来 Git Sync envelope 来源；
- 审计和调试材料；
- migration / test fixture 输入。

普通 UI 动作、复检动作、registry 更新、concept 编辑和 topic graph 更新，不应再为每条变更逐个写 JSON 文件。它们应先更新 SQLite；之后只有显式 checkpoint / export 才把 DB 状态序列化成 JSON。

### Runtime files

Runtime files 仍适合用于：

- ACP / skill run workspaces；
- 大型生成工件；
- 日志；
- 缓存；
- 临时文件；
- workflow product assets。

Runtime cleanup 绝不能删除 Synthesis durable data 或 SQLite state。

## 业务领域与动作语义

### Index 与 Literature Item 统一模型

Index 的基本实体不应区分为“库内 item”和“reference item”两套模型。更稳定的主模型是统一的 `literature_item`：它表示一个可被识别、引用、匹配、展示并参与 citation graph 的文献实体。

Zotero 库内条目只是 `literature_item` 的一种绑定状态，而不是另一种实体类型。也就是说：

- 所有 Index 条目都是 `literature_item`；
- 由 references 抽取出来的文献也是 `literature_item`；
- 带有 Zotero `library_id / item_key` 绑定的 `literature_item` 才是库内条目；
- 库内条目可以拥有 digest / references / citation-analysis artifacts，并可作为 topic synthesis 的 source paper；
- 未绑定 Zotero item 的 `literature_item` 可作为外部文献上下文、citation graph 节点和 Index 中的 referenced literature，但不新增 topic synthesis source 接口。

`literature_item` 应统一包含：

- 稳定 `literature_item_id`；
- title、authors、year、venue；
- DOI、arXiv、URL、ISBN、citeKey 等 identifiers；
- raw reference 与来源证据；
- source_count 与 referenced_by_count；
- confidence 与 resolution status；
- Zotero binding：`library_id`、`item_key`、item type、date added、deleted / trash state；
- artifact facet：digest / references / citation-analysis artifact 可用性和 hash；
- reference facet：reference instances 和 resolution summaries；
- readiness facet：coverage、缺失工件、diagnostics；
- topic usage facet：paper-to-topic usage links 和 freshness signals。

Index 默认顶层只展示带 Zotero binding 的 `literature_item`。这些条目可以展开 / 收起，展开后展示该条目引用到的其他 `literature_item`。UI 还需要提供 `Only referenced literature` 开关，v1 采用全局视图，展示所有未绑定或由 references 引出的 literature items。

Index 读取应是带索引的 DB 查询，绝不能是 Zotero 全库扫描或 JSON projection 读取。

### Index 主键与身份信号

`literature_item_id` 必须是无语义、不可变的 surrogate key，例如 `lit:<ulid>`。它创建后不随 DOI、URL、title、Zotero itemKey、agent metadata 或 normalized title 变化而改变。

以下信息都不能作为 `literature_item_id`：

- DOI；
- URL；
- arXiv；
- citeKey；
- title；
- normalized title；
- raw reference；
- agent / LLM / embedding 生成的 semantic key。

这些信息都是 identity signals，用于匹配、候选召回和复审排序，而不是实体身份本身。所有下游表，包括 Citation Graph、Topic usage、review queue、Concept evidence 和 artifact linkage，都必须引用 `literature_item_id`。

#### Strong identifiers

强 identifiers 包括：

- DOI；
- arXiv；
- ISBN；
- normalized URL；
- citeKey。

强 identifiers 可用于确定性匹配或高置信匹配，但仍然需要处理冲突：当同一个强 identifier 指向多个 `literature_item`，或一个新输入同时命中多个现有实体时，必须进入 review / merge 流程，而不是重写主键。

#### Normalized title

`normalized_title` 是 Index identity 层唯一的语义相关弱 identifier。它不依赖 LLM、agent、Concept KB、Tag Vocabulary 或 embedding，只由插件通过 deterministic、multi-language-safe、versioned normalizer 从标题生成。

`normalized_title` 的职责是抵抗标题表面的轻微漂移，例如大小写、Unicode 形式、符号和空白差异。它不是语义理解结果，也不是全局唯一 ID。

v1 normalizer 规则必须完全机械化：

1. 执行 Unicode NFKC；
2. 使用固定 locale 做 lower-case；
3. 保留 diacritics，不做去重音；
4. punctuation / symbol 转为空格；
5. 数字一律保留；
6. 连续空白合并并 trim；
7. 不删除 stopwords；
8. 不做 stemming；
9. 不做翻译；
10. 不做 token 排序；
11. 不做 CJK 分词；
12. 不做任何“是否有语义意义”的判断。

示例：

```text
"Deformable DETR: Deformable Transformers for End-to-End Object Detection"
-> "deformable detr deformable transformers for end to end object detection"

"基于Transformer的端到端目标检测：DETR综述"
-> "基于transformer的端到端目标检测 detr综述"
```

建议存储字段：

```text
display_title
normalized_title
title_normalizer_version
```

可以额外保存 `normalized_title_hash` 作为 exact-match acceleration 或变更检测字段，但 v1 不要求。即使保存，也不能设置全局唯一约束，不能替代 `normalized_title` 原文。标题完全相同或规范化后相同的不同文献必须允许共存，并通过年份、来源、identifier、BM25 / agent metadata 或人工复审区分。

#### 不使用 semantic key

v1 不引入 `semantic_key`。LLM / agent / embedding 生成的任何语义表达都不得进入 Index identity 层。Agent-authored metadata 只用于 topic discovery、BM25 ranking、候选解释和 UI diagnostics，不作为主键、强 identifier 或自动合并依据。

#### 匹配优先级

Identity resolution 建议按以下优先级处理：

```text
P0 same Zotero binding
P1 DOI / arXiv / ISBN
P2 normalized URL / citeKey
P3 exact normalized_title + same year + supporting author/venue evidence
P4 normalized_title text match only
P5 raw_reference_hash
P6 BM25 / agent matching metadata candidate
```

P0 / P1 可以确定性匹配。P2 需要视来源质量决定。P3 可作为高置信候选，但最好仍要求辅助证据。P4 只能作为候选，不能单独自动合并。P6 只用于 discovery / ranking，不参与强 identity resolution。

## Index 页面信息架构

本期不重做整个 Synthesis Workbench 的顶层信息架构，但必须先把 Index 页面理顺。Index 是 Synthesis layer 的最底层，用户在这里需要理解三类对象之间的关系：

- Zotero 库内文献；
- references 引出的外部或库内目标文献；
- 需要人工处理的 reference resolution、Zotero 删除和去重复审。

这些对象在数据模型上都属于 `literature_item` / `reference_instance` / `reference_resolution` 体系，但 UI 上不能平铺成同一层。Index 页面应明确表达以下层级：

```text
Zotero-bound literature item
  └─ reference instances extracted from this item
       └─ resolved target literature item / unresolved candidate
```

### 默认视图：库内文献为主

Index 默认顶层只展示带 active Zotero binding 的 `literature_item`。这保证用户第一眼看到的是“我的库”，而不是被 references 引出的所有外部文献。

顶层 row 建议字段：

- title；
- authors / year；
- Zotero binding status；
- digest status；
- references count；
- unresolved references count；
- citation incoming / outgoing count；
- topic usage count；
- freshness / issue badge。

外部 literature item 默认不和库内文献平铺。它们只在以下场景出现：

- 展开某个库内文献的 references；
- 搜索命中；
- 打开 Only referenced literature 模式；
- 作为 review card 中的候选目标。

### 展开层：reference instances

展开某个库内文献时，显示的不是“子文献列表”，而是该 source paper 抽取出的 `reference_instance` 列表。每条 reference row 应显示：

- parsed reference title，缺失时使用 raw reference fallback；
- authors / year，如果解析得到；
- resolution status：`matched`、`unresolved`、`ambiguous`、`ignored`；
- target literature item title；
- target 是否 Zotero-bound，或只是 external Index item；
- confidence；
- action needed badge。

这样用户可以理解复检对象到底是一条 reference instance 的 resolution，而不是一个孤立 cleanup proposal。

### Only referenced literature 模式

Index 应提供一个开关，例如 `Only referenced literature`。开启后，顶层改为展示由 references 引出的 literature items，特别是：

- external-only literature items；
- unresolved / ambiguous candidates；
- frequently cited external works；
- 后来又被 Zotero 入库的 referenced literature。

该模式用于排查和扩展，不是默认视图。建议字段：

- title；
- cited by count；
- source papers count；
- Zotero binding status；
- resolution confidence / issue status；
- topic usage 或 candidate topic hints。

### Index 域内复检

Index 页中的复检不应继续叫 Cleanup Queue。这里的用户决策本质上是：

- review reference match；
- review Zotero item deletion；
- review duplicate merge。

Index 域内 review queue 必须表达依赖层级，而不是简单按创建时间展示。Zotero binding deletion / dedupe review 的逻辑层级高于 reference resolution review，因为 deletion / dedupe 会改变 `literature_item` 可用性、redirect、target 解析、citation edge source / target 和 topic usage。v1 建议优先级：

```text
P0 identity / binding review
  - Zotero deletion review
  - Zotero dedupe / merge review
  - literature item merge / keep separate review

P1 reference resolution review
  - match existing literature item
  - create external literature item
  - ignore reference instance

P2 metadata / freshness / diagnostics review
  - low confidence metadata
  - topic discovery hint
  - non-blocking cleanup diagnostics
```

排序规则：

- 未解决的 P0 reviews 永远优先于 P1 reviews。
- 如果某个 source paper 有 pending deletion / dedupe review，其 outgoing reference resolution reviews 暂停展示为可操作项。
- 如果某个 target candidate 有 pending dedupe / merge review，依赖该 target 的 match-existing review 暂停展示。
- blocked P1 reviews 不应作为当前可决策 card 展示；可以显示轻量提示，例如“3 reference match reviews are waiting for deletion / merge review”。
- P0 review card 应提示它可能影响多少 reference match reviews。

Reference match card 必须回答：

- 这条 reference 来自哪篇 source paper；
- reference 自己写的是什么；
- 系统建议它成为新的 Index 文献，还是匹配到已有文献；
- 用户确认后会改变哪些事实。

示例：

```text
Review reference match

Source paper:
DETR: End-to-End Object Detection with Transformers

Reference:
"Attention Is All You Need", Vaswani et al., 2017

Suggested decision:
Match this reference to existing literature item:
Attention Is All You Need

Result:
This will connect the source paper to the matched literature item in Index and Citation Graph.
```

建议动作命名：

- `Match existing`：匹配已有 `literature_item`；
- `Create index item`：创建新的 external `literature_item`；
- `Ignore reference`：忽略该 reference instance；
- `Defer`：暂不处理。

Zotero deletion review 应单独表达：

```text
This Zotero item was removed from the library.
How should Index handle it?
```

建议动作：

- `Confirm removed from library`：移除 Zotero binding；如果仍被 references 引用，则保留为 external literature item；
- `Merge into another item`：选择 surviving item，建立 redirect，并迁移 citation / topic usage；
- `Keep for now`：暂不处理。

### 状态与详情

Index row 的 badge 应克制，只显示最重要的 1-2 个状态，更多信息进入 expandable details 或 inspector。可用 badge 包括：

- `Digest missing`；
- `References unresolved`；
- `External only`；
- `Zotero deleted`；
- `Merged`；
- `Ignored`；
- `Topic usage changed`。

Index detail / inspector 应包含：

- identity：title、normalized title、identifiers、Zotero binding；
- artifacts：digest、references、citation analysis availability；
- references：outgoing references summary、unresolved count；
- citation：incoming / outgoing count；
- topics：linked topics、freshness、discovery hints；
- reviews：影响该 literature item 的 open review items。

Index 页不触发 Citation Graph layout。Reference resolution action 成功后，应在同一事务中更新 Citation Graph structure 和 lightweight metrics；Graph layout 只标记 stale，并由 Graph UI 或显式命令按需刷新。

### SQLite 表边界

v1 DB-first Index 至少需要以下表组。表名可在实现阶段按项目命名规范调整，但边界和主键原则应保持稳定。

#### `synt_literature_item`

统一文献实体表：

```text
literature_item_id TEXT PRIMARY KEY
display_title TEXT
normalized_title TEXT
title_normalizer_version TEXT
year TEXT
venue TEXT
authors_json TEXT
status TEXT
created_from TEXT
confidence TEXT
created_at TEXT
updated_at TEXT
```

`status`：

```text
active | pending_delete_review | merged | tombstoned
```

`created_from`：

```text
zotero_item | extracted_reference | import | manual | migration
```

#### `synt_literature_identifier`

强 / 弱身份信号表：

```text
identifier_id TEXT PRIMARY KEY
literature_item_id TEXT NOT NULL
identifier_type TEXT NOT NULL
identifier_value TEXT
normalized_value TEXT NOT NULL
confidence TEXT
source TEXT
status TEXT
created_at TEXT
updated_at TEXT
```

`identifier_type`：

```text
doi | arxiv | isbn | url | citekey | normalized_title | raw_reference_hash
```

强 identifier 可按 `(identifier_type, normalized_value)` 建唯一约束或冲突检测约束；`normalized_title` 不应全局唯一，并且应保留文本原文以支持检索、排序、复审和后续相似度计算。

#### `synt_zotero_binding`

Zotero item 绑定表：

```text
binding_id TEXT PRIMARY KEY
literature_item_id TEXT NOT NULL
library_id INTEGER NOT NULL
item_key TEXT NOT NULL
item_type TEXT
citekey TEXT
date_added TEXT
date_modified TEXT
deleted_state TEXT
binding_status TEXT
metadata_hash TEXT
created_at TEXT
updated_at TEXT
UNIQUE(library_id, item_key)
```

`binding_status`：

```text
active | pending_delete_review | deleted_confirmed | merged | ignored
```

#### `synt_literature_redirect`

去重、合并和迁移的 redirect 表：

```text
redirect_id TEXT PRIMARY KEY
from_literature_item_id TEXT NOT NULL
to_literature_item_id TEXT NOT NULL
reason TEXT NOT NULL
created_at TEXT
created_by TEXT
diagnostics_json TEXT
UNIQUE(from_literature_item_id)
```

`reason`：

```text
zotero_dedupe | manual_merge | identifier_collision | migration
```

读取层必须解析 redirect，避免 merged item 作为主结果重复出现。

#### `synt_literature_artifact`

文献工件状态表：

```text
artifact_id TEXT PRIMARY KEY
literature_item_id TEXT NOT NULL
artifact_type TEXT NOT NULL
payload_type TEXT
status TEXT
hash TEXT
note_key TEXT
asset_path TEXT
updated_at TEXT
diagnostics_json TEXT
UNIQUE(literature_item_id, artifact_type)
```

`artifact_type`：

```text
digest | references | citation_analysis | matching_metadata
```

#### `synt_reference_instance`

某个 source literature item 引用的一条参考文献实例：

```text
reference_instance_id TEXT PRIMARY KEY
source_literature_item_id TEXT NOT NULL
reference_index INTEGER
raw_reference TEXT
parsed_title TEXT
parsed_authors_json TEXT
parsed_year TEXT
identifiers_json TEXT
provisional_key TEXT
roles_json TEXT
source_artifact_hash TEXT
created_at TEXT
updated_at TEXT
UNIQUE(source_literature_item_id, reference_index, source_artifact_hash)
```

`reference_instance_id` 可以使用 `refinst:<hash(source_literature_item_id + source_artifact_hash + reference_index)>`。如果 references artifact 重新生成并导致 index 变化，v1 可以创建新 instance；后续可用 provisional key 做迁移优化。

#### `synt_reference_resolution`

Reference instance 到 target literature item 的解析表：

```text
resolution_id TEXT PRIMARY KEY
reference_instance_id TEXT NOT NULL UNIQUE
target_literature_item_id TEXT
resolution_status TEXT NOT NULL
confidence TEXT
method TEXT
diagnostics_json TEXT
updated_at TEXT
```

`resolution_status`：

```text
matched | unmatched | ambiguous | ignored | pending_review
```

`method`：

```text
doi | arxiv | url | citekey | normalized_title | bm25 | embedding | agent | manual
```

如果 reference 足以创建一个独立 `literature_item`，则 resolution 应指向该 item；只有 raw reference 太弱、无法建实体时才是 `unmatched`。

#### `synt_review_item`

统一复审队列表：

```text
review_id TEXT PRIMARY KEY
review_domain TEXT NOT NULL
review_type TEXT NOT NULL
subject_id TEXT NOT NULL
status TEXT NOT NULL
priority TEXT
payload_json TEXT NOT NULL
candidate_json TEXT
diagnostics_json TEXT
created_at TEXT
updated_at TEXT
resolved_at TEXT
```

Index review types：

```text
reference_ambiguous_match
zotero_item_delete
zotero_dedupe_candidate
identifier_collision
low_confidence_literature_match
```

#### Citation Graph 结构表

`synt_citation_node`：

```text
literature_item_id TEXT PRIMARY KEY
node_status TEXT
has_zotero_binding INTEGER
title TEXT
year TEXT
summary_json TEXT
updated_at TEXT
```

`synt_citation_edge`：

```text
edge_id TEXT PRIMARY KEY
source_literature_item_id TEXT NOT NULL
target_literature_item_id TEXT
reference_instance_id TEXT
resolution_id TEXT
edge_status TEXT
roles_json TEXT
weight REAL
created_at TEXT
updated_at TEXT
UNIQUE(source_literature_item_id, reference_instance_id)
```

`edge_status`：

```text
matched | ambiguous | unresolved | ignored | blocked_by_review
```

`edge_id` 可使用 `edge:<hash(source_literature_item_id + reference_instance_id)>`。

#### `synt_citation_metrics_light`

随 structure 同步更新的轻量 metrics：

```text
literature_item_id TEXT PRIMARY KEY
outgoing_count INTEGER
incoming_count INTEGER
matched_outgoing_count INTEGER
unresolved_outgoing_count INTEGER
ambiguous_outgoing_count INTEGER
local_degree INTEGER
updated_at TEXT
source_structure_version INTEGER
```

#### Topic usage / freshness

`synt_topic_literature_usage`：

```text
topic_id TEXT NOT NULL
literature_item_id TEXT NOT NULL
usage_role TEXT
source_section TEXT
evidence_json TEXT
baseline_artifact_hash TEXT
created_at TEXT
updated_at TEXT
PRIMARY KEY(topic_id, literature_item_id, usage_role)
```

`usage_role`：

```text
source_paper | supporting_evidence | external_context | cited_reference | discovery_candidate
```

`synt_topic_freshness`：

```text
topic_id TEXT PRIMARY KEY
known_dependency_status TEXT
discovery_status TEXT
coverage_status TEXT
candidate_count INTEGER
last_checked_at TEXT
reasons_json TEXT
recommended_update_json TEXT
```

`synt_topic_discovery_hint`：

```text
hint_id TEXT PRIMARY KEY
topic_id TEXT NOT NULL
literature_item_id TEXT NOT NULL
score REAL
method TEXT
matching_fields_json TEXT
status TEXT
created_at TEXT
updated_at TEXT
UNIQUE(topic_id, literature_item_id, method)
```

#### Matching metadata

`synt_literature_matching_metadata`：

```text
literature_item_id TEXT PRIMARY KEY
schema_version TEXT
search_document_text TEXT
metadata_json TEXT
metadata_hash TEXT
source_artifact_hash TEXT
updated_at TEXT
```

`synt_topic_interest_metadata`：

```text
topic_id TEXT PRIMARY KEY
schema_version TEXT
search_query_text TEXT
metadata_json TEXT
metadata_hash TEXT
updated_at TEXT
```

#### Dirty queue / job state

`synt_dirty_event`：

```text
event_id TEXT PRIMARY KEY
event_type TEXT NOT NULL
scope_kind TEXT NOT NULL
scope_ref TEXT NOT NULL
source_hash TEXT
status TEXT
coalesced_count INTEGER
attempt_count INTEGER
next_retry_at TEXT
diagnostics_json TEXT
created_at TEXT
updated_at TEXT
UNIQUE(event_type, scope_kind, scope_ref)
```

`synt_job_state`：

```text
job_name TEXT PRIMARY KEY
status TEXT
last_started_at TEXT
last_finished_at TEXT
last_duration_ms INTEGER
last_processed_count INTEGER
retry_attempt INTEGER
next_retry_at TEXT
diagnostics_json TEXT
```

Complex metrics、layout、BM25 / FTS backend 细表可以第二批实现，但版本字段和扩展边界应提前预留。

### 数据生命周期与删除策略

Synthesis layer 的删除策略必须把业务实体状态、Zotero 管理的原始资产、插件自身的 checkpoint / export 文件、以及可重建缓存分开处理。不能把用户看到的“删除”、数据库里的“不可用”、文件系统里的“物理删除”和知识图谱里的“事实撤销”混成同一个动作。

`literature_item` 建议采用有限生命周期，而不是永久 tombstone：

```text
active
→ inactive / unavailable
→ tombstoned
→ purge_eligible
→ purged
```

- `active`：正常参与 Index、Citation Graph、Topic freshness、搜索和 UI 展示。
- `inactive / unavailable`：业务实体仍存在，但当前不可用，例如 Zotero binding 被删除待审、source 不可读或 artifact metadata 指向的 Zotero 资产缺失。
- `tombstoned`：业务上确认不再参与普通运行态，但仍处于审计和恢复窗口内。
- `purge_eligible`：超过保留期，且没有 active redirect、reference、topic usage 或 unresolved review 依赖，可以被显式维护任务清理。
- `purged`：可删除的 DB 记录或插件自有文件已经被清理；如仍需审计，只保留最小 purge marker。

默认保留建议：

- 普通 tombstone 保留 90 天后进入 `purge_eligible`。
- merge / redirect tombstone 至少保留 180 天，因为去重迁移、引用迁移和 topic usage 排错更依赖历史。
- 仍有 unresolved review、diagnostics、active reference resolution、topic usage 或 redirect 依赖的 tombstone 不进入 purge。
- purge 必须是显式维护动作，不能由普通 UI 读取、Index rebuild 或后台 reconcile 静默触发。

Zotero 管理的 digest artifacts 不属于插件文件生命周期。当前 digest artifacts 本体伪装为 Zotero note 条目下的 embedded-image 子附件，由 Zotero 管理。插件不应直接删除、移动或恢复这些 note / attachment / embedded-image 文件；插件只维护自己的 DB metadata，例如 artifact availability、source binding、payload summary、hash、stale / unavailable 状态。如果 Zotero 删除导致 artifact 不可读，插件只标记 `artifact_status=unavailable`，并通过 Index / Topic freshness 诊断暴露，不尝试物理清理 Zotero 资产。

ignored reference 的生命周期也要和删除区分：

- `ignore_reference_instance` 只表示该 reference instance 不应进入有效 Index / Citation Graph。
- 它不创建新的 `literature_item`，也不删除 source paper 或 target 候选。
- 普通 Index、Graph 和 metrics 默认不展示 ignored reference。
- detail、audit、cleanup history 中仍应可见，便于撤销或排查。

`data/synthesis/` 下的 JSON checkpoint、export、migration report 和 staging report 是插件自有 cold-path 文件，可以进入专门的 checkpoint cleanup 策略，但不能被普通 runtime cleanup 混删。推荐规则：

- 普通 runtime cleanup 只处理 `runtime/tmp`、`runtime/cache`、logs、orphan workflow assets 等可重建运行态文件。
- checkpoint cleanup 是单独入口，必须 dry-run 优先，并显示文件类型、生成时间、大小、是否当前 active checkpoint、是否可重建。
- 当前 active checkpoint、最近 N 份 checkpoint、仍被 migration report 或 sync/export receipt 引用的文件不得删除。
- failed staging / abandoned export 可在 7 天后 eligible；普通 checkpoint / export 可按 30 或 90 天 TTL，或按“保留最近 N 份”策略裁剪。

### Zotero 绑定、删除与去重

Zotero item 的入库、删除和去重都应作用在 `literature_item` 的 Zotero binding 上，而不是在两套实体模型之间迁移。

- 新 Zotero item 入库时，如果可与已有 `literature_item` 确定性匹配，则为该 item 增加 Zotero binding；否则创建新的 `literature_item`。
- references 中已存在的外部文献被入库时，应升级为带 Zotero binding 的 `literature_item`，保留原有来源证据和引用关系。
- 多个 Zotero items 匹配同一个 `literature_item` 时，不自动合并，进入人工复审；用户选择 canonical library binding。
- Zotero item 删除在 v1 中一律走人工复审，不自动删除 digest artifacts、不自动降级为外部文献，也不自动迁移引用关系。
- Zotero 去重是删除场景中最需要谨慎处理的情况；如果用户确认这是去重，应建立 redirect / merge history，并把 reference resolutions、topic usage、citation edges 和必要 artifact linkage 迁移到保留的 Zotero binding。

Zotero item 删除复审建议动作：

- `confirm_delete_item`：确认是真删除。将对应 Zotero binding 标记为删除确认，并把插件 DB 中的 artifact metadata 标记为 unavailable / cleanup eligible；插件不物理删除 Zotero 管理的 digest note / attachment。如果该 literature item 仍被 references 引用，则保留为未绑定 Zotero item 的外部文献实体。
- `mark_as_dedupe_merge`：用户选择 surviving Zotero item，建立 deleted binding 到 surviving binding 的 redirect，并迁移关联状态。
- `keep_for_now`：用户认为是误删、临时状态或暂不处理；保留业务数据并维持待复查状态。

### Reference resolution 与 cleanup

Cleanup 应重设计为明确的 reference resolution decision。当前 `approve / reject / skip` 词汇太模糊，也不应暗示用户只是处理一个临时 proposal。

建议 v1 动作：

- `confirm_literature_item`：确认一条 unresolved reference 对应一个独立的 `literature_item`。它会作为未绑定 Zotero item 的外部文献实体出现在 Index 和 Citation Graph 中。
- `match_existing_literature_item`：把 reference instance 绑定到已有 `literature_item`，该目标可以是库内条目，也可以是已存在的外部文献实体。
- `ignore_reference_instance`：关闭该 review item，但不创建新实体，也不绑定已有实体。它仍可审计，但不再阻塞 cleanup。

普通 references 不应逐条要求用户审批。只有低置信、多个候选冲突、关键 identifiers 缺失或强键冲突时才进入 review queue。每个动作都必须在一个 DB transaction 中更新 review state、reference resolution、受影响的 literature item summary 和 dirty events。

### Review action 的事务后果

人工复检动作不能只改变 `review_item.status`。用户点击一个复检决策时，系统必须把“用户到底批准了什么业务事实”落实到对应领域表，并在同一个 SQLite transaction 中更新 review 状态、Index 可见摘要、Citation Graph structure / lightweight metrics，以及必要的下游 dirty signal。否则 UI 会显示“处理成功”，但 Index、Graph、Topic freshness 仍然停留在旧事实上，用户无法理解动作的真实含义。

统一原则：

1. review action 的成功返回意味着领域事实已经改变，而不只是复检消息被关闭。
2. Index 与 Citation Graph structure 必须在同一事务内保持一致；complex metrics、layout 和 topic freshness 只发 dirty signal，不在 review transaction 中做重计算。
3. Topic artifact 绝不由后台自动重写；topic freshness 只更新为 dirty、blocked 或需要用户执行 update workflow 的提示状态。
4. artifact 文件不在 review transaction 中物理删除；事务只更新 DB 状态和 cleanup eligibility，文件清理交给持久化治理层。
5. 所有实体合并必须通过 redirect / merge history 表达，不允许直接覆盖旧 `literature_item_id`。
6. 事务失败必须整体回滚；UI 不应把失败动作乐观地永久移出复检队列。
7. P0 identity / binding review 成功后，必须对受影响 item 执行 bounded review dependency maintenance，更新或关闭依赖它的 P1 reference reviews。

Review dependency maintenance 只处理受影响 source / target item 的 review，不全库扫描。每次 `confirm_delete_item`、`mark_as_dedupe_merge`、`merge_literature_items` 或 `keep_separate` 成功后，应在同一事务或紧随其后的同一写锁内执行：

```text
resolve redirects
recompute affected reference review dependencies
supersede invalid reviews
retarget reviews whose target moved
unblock reviews whose dependency resolved
dedupe duplicated reviews
refresh review queue summary
```

Reference review 状态至少需要支持或派生：

- `open`：可操作；
- `blocked_by_upstream_review`：等待 deletion / merge / identity review；
- `retargeted`：候选 target 因 redirect 被更新；
- `superseded`：source / target 删除、merge 或 review 已不再适用；
- `resolved`：用户已决策或系统因上游事务安全解决；
- `deferred`：用户暂不处理。

如果 target candidate 已 merged，依赖它的 review 应自动 retarget 到 surviving item；如果 retarget 后产生候选冲突，review 保持 open，但候选和 diagnostics 必须刷新。如果 source paper 已 confirmed deleted 且不再保留为 external item，其 outgoing reference reviews 应标记 superseded，而不是继续要求用户逐条处理。

建议 v1 review action 事务合同如下。

`confirm_literature_item`：

- 含义：确认一条 unresolved reference 对应一个独立的 `literature_item`。
- 如果目标实体尚不存在，创建新的 `synt_literature_item`，写入 title、year、authors、raw reference、`created_from=extracted_reference`、`item_status=active`。
- 写入可用 identifiers，包括 DOI、arXiv、URL、citeKey、`normalized_title` 和 raw reference exact duplicate signal；这些 identifiers 只作为匹配证据，不作为主键。
- 更新 `synt_reference_resolution`：`target_literature_item_id` 指向新实体，`resolution_status=matched`，`method=manual`，`confidence=confirmed`。
- 更新 review item：状态变为 resolved，记录 action、actor、resolved_at 和必要 action payload。
- 更新 Citation Graph：创建或更新 target node，把 source paper 的对应 edge 从 unresolved 改为 matched。
- 同步刷新 lightweight metrics：source outgoing / matched count、target incoming count、resolution summary。
- 写入 dirty signals：complex metrics stale、layout stale metadata；仅对使用 source item 的 topics 标记 freshness dirty。

`match_existing_literature_item`：

- 含义：把 reference instance 绑定到已有 `literature_item`，该目标可以是库内文献，也可以是已存在的外部文献实体。
- 事务必须验证 target 存在、未 tombstone、未 merged；如果 target 已 redirect，应解析到 surviving item。
- 更新 reference resolution 的 target、status、method 与 confidence。
- 可追加非冲突 identifiers；如果新 identifier 与已有实体强冲突，不强写，另建 identity conflict review。
- 更新 review status、citation edge target/status、source/target lightweight metrics。
- 写入 complex metrics、layout 和相关 topic freshness dirty signal。

`ignore_reference_instance`：

- 含义：用户确认这条 reference 不应进入 Index / Citation Graph 的有效文献集合。
- 更新 resolution：`resolution_status=ignored`，`target_literature_item_id=null`，`method=manual`。
- Citation edge 不应作为有效引用边参与 graph structure；v1 建议保留一条 `edge_status=ignored` 的审计记录，而不是物理删除。
- 更新 review status 与 lightweight metrics。
- 如果 source paper 被 topic 使用，标记相关 topic freshness dirty；不自动改写 topic artifact。

`confirm_delete_item`：

- 含义：用户确认某个 Zotero item 的删除不是去重迁移，而是该库内绑定确实应被移除。
- 更新 Zotero binding：`binding_status=deleted_confirmed`，记录 deleted_at、review action 和来源事件。
- 如果 `literature_item` 不再有 active Zotero binding，但仍被 references、topics 或 citation graph 使用，则保留为外部文献实体。
- 如果该 item 不再有 references、topic usage 或其他业务引用，可标记为 tombstoned 或 cleanup eligible；不在事务中删除文件。
- digest / references / citation-analysis artifacts 标记为 deleted 或 unavailable；真实文件删除交给 cleanup。
- Topic usage 标记为 source removed / blocked pending；受影响 topic freshness 标记为 blocked_by_source_delete 或 dirty。
- Citation Graph node 仍可保留，`has_zotero_binding=0`；已有引用边按 reference resolution 事实保留。
- 更新 review status，写入 citation complex/layout/topic dirty signals。

`mark_as_dedupe_merge`：

- 含义：用户确认 Zotero 删除来自去重，选择 surviving Zotero item / `literature_item`。
- 验证 surviving target 存在且 active。
- 创建 `synt_literature_redirect`：old item -> surviving item，`reason=zotero_dedupe`。
- deleted binding 标记为 `binding_status=merged`，并记录 surviving binding。
- 迁移或重定向 reference resolutions：所有指向 old item 的 target 改为 surviving item，或通过 redirect 解析。
- 迁移 citation edges：source/target 为 old item 的边重写到 surviving item，并处理重复边合并。
- 迁移 topic usage：old item 的 usage 合并到 surviving item；冲突 usage 进入 topic freshness diagnostics，而不是覆盖。
- 迁移 artifact linkage：如果 surviving item 没有 digest，可迁移 old digest linkage；如果二者都有 digest，保留 surviving，old artifact 标记为 merged / archived。
- old item 标记为 merged，review resolved，刷新 lightweight metrics，并写入 complex metrics、layout 和 topic freshness dirty signals。

`keep_for_now`：

- 含义：用户认为当前 review 暂不处理，或者需要保留观察。
- review item 状态变为 deferred / snoozed，记录 `next_review_at` 或 `snooze_until`。
- Zotero binding、reference resolution、citation edges 和 topic usage 不改变。
- UI 可以从当前复检队列中临时移出该 item，但业务事实不应变化。

`merge_literature_items`：

- 含义：用户处理 identity collision，确认多个 `literature_item` 是同一文献。
- 选择一个 surviving item，其余 items 创建 redirect / merge history。
- 合并 identifiers：非冲突 identifier 迁移到 surviving item；冲突 identifier 生成 diagnostics 或后续 review，不强行覆盖。
- 合并 Zotero bindings：如果出现多个 active binding，v1 可以保留 multi-binding 并生成 canonical binding review。
- 合并 reference resolutions、topic usage、artifact linkage 与 citation edges，并按确定性规则去重。
- 更新 affected graph structure / lightweight metrics，标记 complex metrics、layout 与 topic freshness dirty。

`keep_separate`：

- 含义：用户确认两个候选文献不是同一实体。
- 记录 negative match pair，后续自动匹配必须抑制同一 pair 再次进入合并候选。
- v1 可新增 `synt_literature_negative_match(left_literature_item_id, right_literature_item_id, reason, created_at)`；如果暂不建表，也必须把 negative match 持久化到 review action payload 或等价结构中，不能只关闭消息。

所有 review action facade 的返回值应使用结构化结果，便于 UI 解释“动作已经改变了什么”：

```ts
{
  ok: true,
  action: "match_existing_literature_item",
  review_id: "review:...",
  changed_entities: ["lit:..."],
  changed_bindings: ["zotero:..."],
  changed_reference_instances: ["refinst:..."],
  changed_resolutions: ["resolution:..."],
  changed_edges: ["edge:..."],
  affected_topics: ["topic:..."],
  changed_reviews: ["review:..."],
  superseded_reviews: ["review:..."],
  retargeted_reviews: ["review:..."],
  unblocked_reviews: ["review:..."],
  dirty_events: ["citation_graph_complex_metrics_dirty", "topic_freshness_dirty"],
  diagnostics: []
}
```

UI 文案也应围绕这些事务后果组织，而不是展示 `proposal_id`。例如 cleanup review card 应告诉用户：“这条参考文献是否应作为新的 Index 文献加入？”、“是否应绑定到已有文献 X？”、“是否应忽略该 reference？”；Zotero 删除 review card 应告诉用户：“这是去重迁移，还是确实删除了库内绑定？”。

### Citation Graph

Citation Graph 应采用 DB-first，并拆成多层：

- structure：nodes、edges、按 source paper 记录 outgoing ownership、按 target / work 记录 incoming groups；
- lightweight metrics：随 structure 同步更新的 counts 和局部 degree-like metrics；
- complex metrics：由低优先级 worker 更新的 PageRank / component / frontier 类 metrics；
- layout：按 preset 存储坐标和 metadata，仅由 Graph UI 或显式 recompute 触发。

Citation Graph structure 是 Index 的 DB-native 异构投影，必须与 Index 保持事实一致。任何影响 `literature_item`、Zotero binding、reference instance 或 reference resolution 的 Index 写事务，都必须同步更新受影响的 graph structure，而不是等待用户打开 Graph 或手动 rebuild。

Index 写入与 graph structure 的推荐事务合同：

```text
BEGIN TRANSACTION
  update literature_item / zotero_binding / artifact / reference_resolution
  replace affected source-owned outgoing graph edges
  update affected target incoming groups
  update graph nodes and binding/review status
  update lightweight metrics for affected nodes
  bump citation_structure_version
  mark complex metrics stale
  mark affected layout presets stale
  enqueue low-priority complex metrics worker
COMMIT
```

这里的 structure 更新必须保持局部、低成本：

- literature-digest apply：替换该 source item 拥有的 outgoing edges，并刷新受影响 target 的 incoming groups；
- Zotero 入库：更新或新增 Zotero binding，并刷新被解决的 unresolved / ambiguous references；
- Zotero 删除 pending review：标记 node / binding 为 review-blocked，不删除 edges；
- cleanup / match action：resolution decision 后立即更新 edge target / status；
- full rebuild：重建 Index 与全部 graph structure。

Lightweight metrics 应随 structure 同步更新，因为它们是局部计数或局部 degree-like 指标，例如 outgoing count、incoming count、matched / unresolved / ambiguous count、cited_by count、references count 和 resolution summary。

Complex metrics 可以滞后，因为它们依赖全图或大范围遍历，例如 PageRank、weak components、foundation / frontier scores、bridge score、global centrality 或 community-like roles。Index transaction 只需要把 `complex_metrics_status` 标记为 `stale`，并记录对应 `source_structure_version`，由低优先级 worker 后续刷新。

Layout 永远是 UI 驱动的按需缓存。Graph tab 打开、layout preset 切换或显式 manual recompute 时，若 `layout.source_structure_version` 落后于当前 structure，才触发布局 worker。MCP、CLI 和普通 Workbench snapshot 读取绝不能触发 layout。

MCP 和 CLI 读取也绝不能触发 graph rebuild 或 complex metrics。它们应返回 latest usable rows、当前 structure / metrics 状态和 diagnostics。

### Topic Graph

Topic Graph 的语义关系只应由 topic synthesis apply 或用户复检产生。Paper Registry 后台 worker 不应自动重写这些关系。

Topic freshness 可以受 Paper Registry 变化影响，但 freshness 只改变 UI 提示和 update 可用性。它绝不能自动重写 topic artifact 或语义关系。

### Topic freshness 与 Discovery

Topic freshness 需要区分两类问题：

- known dependency freshness：topic 已经关联的 `literature_item` 发生变化；
- discovery freshness：新增或更新的 `literature_item` 可能与某个 topic 相关，但尚未被该 topic 纳入。

前者可以通过 `topic_literature_usage` 反向索引精确处理。已关联 literature item 的 artifact hash、metadata、Zotero binding 或删除复审状态变化时，只标记受影响 topic 的 freshness dirty / blocked。

后者不能通过“每新增一个 literature item 就对所有 topic 重新运行 resolver”解决。随着 topic 数量增长，这会变成不可接受的 `n × m` 成本。Discovery 也不应被误判为 topic 已经过期；它只是提示“可能有新文献值得 update workflow 检查”。

因此 v1 采用简化的 agent-authored matching metadata + 插件维护 BM25 索引的方案。metadata 合同必须足够小，避免把 `literature-digest`、topic synthesis skill、DB schema 和 worker 都拖成复杂语义系统。v1 只解决一个问题：便宜地发现“这篇文献可能和这个 topic 有关”。

#### Literature matching metadata

`literature-digest` workflow 应生成用于 literature-item 到 topic 匹配的结构化元数据。它不是正文阅读真源，而是 Index / Discovery 的检索材料。建议形状：

```json
{
  "schema": "literature_matching_metadata.v1",
  "key_terms": ["..."],
  "methods": ["..."],
  "problems": ["..."],
  "datasets": ["..."],
  "exclude_terms": ["..."]
}
```

字段含义：

- `key_terms`：最能代表论文主题的短语，最多 12 个。
- `methods`：模型、算法、机制、技术路线，最多 8 个。
- `problems`：研究任务、问题、挑战或目标，最多 8 个。
- `datasets`：数据集、benchmark、语料或资源，最多 8 个。
- `exclude_terms`：容易误召回但不应匹配的方向，最多 6 个。

不再拆分 `domain_terms`、`object_terms`、`metric_terms`、`claim_terms`、`application_terms` 等字段。必要信息应放入 `key_terms`、`methods` 或 `problems`。插件可以把这些字段和 title、normalized title、Zotero tags 组合成 BM25 search document，但不要求 agent 直接生成一段 `bm25_text`。

#### Topic interest metadata

`create-topic-synthesis` 与 `update-topic-synthesis` workflow 应生成 topic interest metadata。它不进入 structured topic artifact 正文，而是作为 topic artifact metadata / sidecar 存储，用于后续 discovery。

建议形状：

```json
{
  "schema": "topic_interest_metadata.v1",
  "topic_id": "...",
  "include_terms": ["..."],
  "must_have_terms": ["..."],
  "methods": ["..."],
  "exclude_terms": ["..."],
  "seed_literature_item_ids": ["lit:..."]
}
```

字段含义：

- `include_terms`：topic 关注的核心召回短语，最多 16 个。
- `must_have_terms`：没有这些语义时通常不应匹配，最多 6 个。
- `methods`：topic 关注的方法、模型或技术路线，最多 8 个。
- `exclude_terms`：明确排除方向，最多 8 个。
- `seed_literature_item_ids`：已确认属于该 topic 的文献，最多 50 个。

不做 `time_scope`、`inclusion_rules`、`exclusion_rules` 等复杂字段。Topic create / update apply 后应刷新该 metadata，并更新 topic BM25 profile。

#### BM25 search document

每个 `literature_item` 生成一个简化 search document：

```json
{
  "document_id": "lit:...",
  "title": "...",
  "normalized_title": "...",
  "key_terms": "...",
  "methods": "...",
  "problems": "...",
  "datasets": "...",
  "zotero_tags": "..."
}
```

建议权重：

```text
title: 4
key_terms: 3
methods: 2
problems: 2
datasets: 1.5
zotero_tags: 1
```

Topic query 也保持简化：

```json
{
  "topic_id": "...",
  "query": "include_terms + must_have_terms + methods",
  "must_have_terms": ["..."],
  "exclude_terms": ["..."],
  "seed_literature_item_ids": ["lit:..."]
}
```

#### BM25 discovery worker

插件侧负责：

- 校验 agent 生成的 matching metadata；
- 将 literature matching metadata 写入 DB；
- 将 topic interest metadata 写入 DB；
- 维护 BM25 索引或等价的 DB-backed 检索结构；
- 在 literature item 新增或 digest apply 后，用 search document 查询 topic profiles；
- 在 topic 更新后，用 topic query 低优先级反查 literature index；
- 写入 `topic_discovery_hint`，而不是直接改写 topic artifact。

Discovery hint v1 应保持小而可解释：

```json
{
  "hint_id": "...",
  "topic_id": "...",
  "literature_item_id": "lit:...",
  "score": 0.0,
  "matched_terms": ["..."],
  "missing_must_have_terms": ["..."],
  "exclude_hits": ["..."],
  "status": "open"
}
```

如果 `missing_must_have_terms` 非空或 `exclude_hits` 非空，应降权或不生成 open hint。UI 可以提示某 topic 有新候选文献；update workflow 可以读取这些 hints 作为候选输入。Hint 不等于 topic usage，也不自动触发 synthesis update。

metadata 质量约束：

- term 必须是短语，不是长句或段落。
- 字段可空，但结构必须存在。
- 入库时去重、截断超长 term，并按上限裁剪。
- 只保留文本，不优先 hash；hash 仅可用于 dirty detection。
- agent 不输出解释段落，只输出数组。
- 插件侧可以做格式校验和长度限制，但不做语义判断。

#### Embedding 预留

v1 不强依赖 embedding。BM25 over agent-authored metadata 是基础机制，因为它可解释、离线、成本可控。v2 可以增加 embedding column / vector sidecar，用于 rerank 或补充召回；BM25 仍保留为基础召回和解释来源。

#### 触发边界

- 新增或更新已关联 literature item：标记 known dependency freshness dirty。
- 新增未关联 literature item：运行 BM25 discovery，生成 hints，不把所有 topic 标记为 stale。
- digest apply：更新 literature matching metadata，刷新 literature BM25 document，触发 related topic discovery。
- topic synthesis apply：更新 topic interest metadata，刷新 topic BM25 profile，清理或重算已消费 discovery hints。
- `getTopicContext()` 和 UI / MCP 读路径只能读取已有 freshness 与 discovery hints，不能调用 freshness scan、resolver 或 BM25 discovery。

### Concept KB

Concept records、aliases、senses、relations 和 review queue 应作为热状态存入 SQLite。Concept proposal ingestion 和 review decisions 应以事务方式更新 DB 状态。JSON concept assets 只应由显式 checkpoint / export 生成。

### Tag Vocabulary

Tag Vocabulary 应保持与 TagVocab 协议兼容，但 UI 和 tag-regulator 使用的 active vocabulary 应来自 SQLite rows。Import preview 和 apply 应先更新 DB 状态；JSON checkpoint export 可以写出 TagVocab 形状的文件。

## 后台工作模型

### 事件来源

自动工作只能由 mutation events 触发，不能由读取触发：

- Zotero item add / update / delete / restore observer；
- literature digest apply；
- reference matching apply；
- topic synthesis apply；
- concept / topic / tag review action；
- 显式 rebuild / retry / recompute command。

读路径可以返回 diagnostics 和 recommended commands，但不得 enqueue worker 或 rebuild projection。

### Dirty queue

Dirty events 应存储在 SQLite 中，并具备可索引字段：

- event type；
- source；
- scope kind 和 scope ref；
- source hash；
- status；
- attempt count；
- next retry time；
- diagnostics；
- created / updated timestamps。

事件应按有意义的 scope 合并，例如一个 paper、一个 work、一个 topic，或一个 graph preset。

### Worker budget

Worker 必须按有界批次执行：

- batch size limit；
- time budget；
- pause / resume；
- retry / backoff；
- latest failure diagnostics；
- run history 和 measured duration。

遇到 unsafe scope 时，应标记更宽范围状态为 stale，并建议显式 repair；不能静默执行 full rebuild。

## UI 与读取 API 合同

### Workbench

Workbench snapshot 应读取轻量 DB view model：

- 当前 active tab summary；
- bounded table rows；
- 每个领域一张当前 review card；
- 当前 graph view 对应的 graph slice；
- job state summary；
- diagnostics 和 recommended commands。

Workbench 不能为了渲染页面去扫描 JSON canonical files、rebuild projection，或组装完整 graph DTO。

### MCP 与 Host Bridge

Read-only tools 应只读 DB，并且返回有界结果：

- `get_paper_registry`；
- citation graph slice；
- citation graph metrics；
- topic / concept / tag read views。

如果数据缺失或过期，应返回 diagnostics 和 recommended commands。它们不能 enqueue rebuild work。

### 用户可见动作标签

动作标签必须描述真实效果。例如：

- 如果动作只是标记 proposal 状态，就不要叫 `Approve`；
- 当实际效果是确认 reference work、匹配 paper 或忽略 reference 时，应使用 `Confirm as reference work`、`Match to paper` 或 `Ignore reference`。

这条规则应适用于 cleanup、concept review、topic graph review、tag import 和 Git conflict resolution。

## 导入、导出与测试数据

由于 Synthesis 尚未正式上线，不需要生产自动迁移。但已有测试数据和 agent 产物很有价值。

需要的工具：

- 从当前 `data/synthesis/` JSON canonical / projection files dry-run 导入 SQLite；
- apply 模式填充 DB，但不删除 JSON 源文件；
- verify 模式比较数量、hash 和 unresolved records；
- 从 SQLite checkpoint export 回 JSON canonical assets；
- 为 1k 和 10k paper 性能测试生成 synthetic data。

导入脚本是开发 / 测试操作，不是插件启动行为。

## 性能验收目标

具体预算应在实现阶段调优，但系统需要硬性性能门槛。基于本地 synthetic data 的初始建议目标：

- 非 Graph tab 的 Workbench snapshot 应有界，且不随 citation graph 总规模增长；
- Index filter / search 应使用 SQL indexes，并在 10k papers 下保持交互式响应；
- Cleanup decision 应是一个 DB transaction，并且无需 projection rebuild 即可在下一次 snapshot 中可见；
- Citation graph slice 应按请求 slice 大小扩展，而不是按全图大小扩展；
- Worker batch 应报告 processed count、elapsed time 和 budget exhaustion。

性能测试失败时，应输出耗时分解，而不是只有泛化的 timeout 信息。

## Synthesis 后台 Job Profiler（debug mode only）

性能预算只能告诉我们“慢了”，不能解释“慢在哪里”。因此需要一个面向 Synthesis 后台 job 的 profiler，用于开发和测试阶段定位增量 worker、graph worker、BM25 discovery、startup reconcile 等后台任务的性能根因。

该 profiler 的边界必须非常窄：

- 只在项目已有 debug mode 开启时启用，不新增额外 debug 开关、不新增 prefs、不提供用户 UI。
- 关闭时必须是近似零开销 no-op：不创建 DB、不生成 run id、不构造 counters JSON、不记录 phase、不额外 await。
- 使用独立 DB，例如 `state/debug/synthesis-job-profiler.db`，不写入 `state/zotero-agents.db` 主业务库。
- Profiler DB 不参与 canonical export、checkpoint、Git Sync、生产迁移或用户备份语义。
- 不设计 TTL / cleanup。因为它不是用户可打开功能；需要清理时，开发者可以直接删除该 debug DB。
- Profiler 失败不得影响业务 job。DB 打不开、schema 初始化失败或写入失败时，只能静默降级或写 debug log。

v1 只覆盖后台 job，不覆盖 UI render、snapshot、DOM、dashboard / Workbench 切换，也不覆盖 Git Sync：

- Paper Registry incremental worker；
- Citation Graph structure worker；
- Citation Graph complex metrics worker；
- Citation Graph layout worker；
- BM25 / topic discovery worker；
- Topic freshness worker；
- Startup reconcile。

记录模型保持简单，使用 job run + phase：

```text
job_profile_run
  run_id TEXT PRIMARY KEY
  job_name TEXT
  trigger TEXT
  status TEXT
  started_at TEXT
  finished_at TEXT
  duration_ms INTEGER
  queue_wait_ms INTEGER
  time_budget_ms INTEGER
  batch_limit INTEGER
  processed_count INTEGER
  skipped_count INTEGER
  failed_count INTEGER
  counters_json TEXT
  diagnostics_json TEXT

job_profile_phase
  phase_id TEXT PRIMARY KEY
  run_id TEXT
  phase_name TEXT
  started_at TEXT
  duration_ms INTEGER
  counters_json TEXT
  diagnostics_json TEXT
```

Phase 名称应尽量复用，便于横向比较：

```text
load_dirty_events
load_input_rows
compute_delta
write_transaction
update_lightweight_metrics
mark_downstream_dirty
cleanup_queue
```

Counters 只能由 job 执行过程中顺手递增，不能为了 profiler 再额外扫描、查询或统计。建议基础 counters：

```json
{
  "dirty_events_loaded": 0,
  "items_scanned": 0,
  "items_processed": 0,
  "rows_read": 0,
  "rows_written": 0,
  "files_read": 0,
  "files_written": 0,
  "zotero_items_read": 0,
  "full_scan_attempted": false,
  "fallback_full_rebuild_attempted": false,
  "downstream_dirty_events": 0
}
```

Profiler 应重点记录这些诊断信号：

```text
job_full_scan_attempted
job_budget_exceeded
job_processed_zero_with_pending_events
job_db_transaction_slow
job_zotero_bulk_read_detected
job_downstream_dirty_fanout_high
job_latest_usable_state_missing_after_failure
```

实现形态建议：

- `maybeStartSynthesisJobProfileRun()` 读取项目已有 debug mode，返回真实 run 或共享 no-op run。
- no-op run 不分配 phase payload，不 JSON stringify，不写 DB。
- phase timing 只在 debug mode 下执行。
- profiler flush 应批量写入，避免每个 phase 同步写 DB。
- 普通性能 smoke test 不依赖 profiler；debug diagnostic test 可以通过测试注入打开项目 debug mode，验证慢 job 能写入独立 profiler DB。

## 建议实现顺序

1. 创建 OpenSpec change 并锁定 requirements。
2. 建立 Synthesis SQLite repository foundation 和 migrations。
3. 将 Index / Literature Item 与 cleanup decisions 迁移到 DB-first。
4. 将 Citation Graph structure 与 lightweight metrics 迁移为 Index 写事务的同步 DB-native 投影。
5. 将 Citation Graph complex metrics 和 layout metadata 迁移到 DB-first，其中 complex metrics 由低优先级 worker 更新，layout 只由 Graph UI 或显式命令按需更新。
6. 增加 literature matching metadata 与 topic interest metadata 合同，并更新对应 skill。
7. 建立 BM25 discovery 索引、topic discovery hints 和 freshness worker 边界。
8. 将 Topic Graph、Concept KB 和 Tag Vocabulary 的热状态迁移到 DB-first。
9. 增加 JSON import / export / checkpoint 工具。
10. 增加大规模 synthetic performance tests 和手工验收脚本。
11. 只有在 DB-first 热路径稳定后，再重新审视 Git Sync export / import。

## 待讨论问题

- Topic Graph 和 Concept KB 应共享一张 generic review table，还是保留领域专用表并提供 shared view？
- 在目标 Zotero runtime 中，1k 和 10k paper 数据集的初始性能预算应定为多少？
- Checkpoint export 应面向 Workbench 用户、仅开发者可用，还是两者都支持？
- 导入冲突时，旧 JSON canonical assets 是否应视为权威来源，还是一旦 DB 初始化完成就始终以 DB state 为准？
- BM25 索引 v1 应使用 SQLite FTS、插件已有检索设施，还是先实现轻量倒排表？

## 工作假设

- 性能和产品可用性优先于保留当前 JSON-hot-path 实现。
- 不需要生产自动迁移。
- 现有 JSON 数据应可导入，以保证开发 / 测试连续性。
- 未来 Git Sync 将从 SQLite 导出 canonical JSON envelopes，而不是同步热路径文件。
- 本次重设计不应引入新的 npm 依赖。
- Topic discovery v1 依赖 agent-authored matching metadata + BM25，不依赖每次新增 literature item 后全量运行 topic resolver。
- Index identity 层不使用 LLM / agent / embedding 生成 semantic key；`normalized_title` 是唯一语义相关弱 identifier，并且只能由 host 侧 deterministic normalizer 生成。
- Embedding 是 v2 增强方向，v1 只预留字段和边界，不强制引入模型依赖。
- Citation Graph structure 是 Index 的同步投影；只有 complex metrics 和 layout 允许滞后，其中 layout 必须保持 UI 驱动按需更新。
- SQLite / DB-first 工作应分阶段、可测试地实现，但目标架构必须在代码迁移开始前先达成一致。
