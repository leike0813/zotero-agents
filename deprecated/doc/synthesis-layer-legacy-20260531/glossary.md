# Synthesis Layer Glossary

本文档定义 Synthesis Layer 的统一术语。后续设计、OpenSpec、代码注释、UI 文案和 debug 输出应优先使用这里的 canonical term；历史实现名可以保留在函数、文件或 migration 说明中，但不应继续扩散为新设计术语。

## 术语使用规则

- **Canonical term 优先**：新文档标题、状态名、事件名和 UI 说明使用 canonical term。
- **历史名只作兼容说明**：如果现有代码、文件或测试仍使用旧名，应写成 “历史实现名 / implementation alias”，不要把它写成新的概念。
- **避免一词多义**：`stale`、`index`、`registry`、`paper` 这类词必须带上下文。
- **ID 不互换**：`libraryId:itemKey`、`paper_ref`、`literature_item_id` 分别服务不同边界，不得在 schema 或 DTO 中随意替换。

## Freshness / Source Check / Stale

| Canonical term | 中文建议 | 定义 | 不表示 |
| --- | --- | --- | --- |
| Topic source check | Topic source check / topic source 检查 | 用户、维护命令或 debug 显式触发的诊断流程。它比较 topic artifact 保存的 source manifest / dependency baseline 与当前 Host Library / Artifact Facade 输出，报告 missing、changed、redirected 等差异。 | 不是后台持续同步状态；不是 discovery；不是 registry rebuild 的自动下游任务。 |
| Source check diagnostic | Source check 诊断 | Source check 的持久化/读模型结果，例如 `not_checked`、`checked`、`changed`、`failed`。 | 不自动改写 topic artifact、resolver、topic graph 或 concept links。 |
| Topic freshness | Topic freshness / 新鲜度 | 用户可见的汇总语义，来自最近一次显式 source check 或 topic apply/update 后的 baseline 状态。目标语义是“上次显式检查是否发现 source 差异”。 | 不是实时 invariant；不由 registry cache dirty event、startup reconcile、graph layout、job progress 或 discovery hint 自动驱动。 |
| Fresh | Fresh / source clean | UI 语义：最近一次有效 source check 未发现影响 topic artifact source manifest 的差异，或 topic 刚由 workflow apply/update 建立了新 baseline。 | 不保证库中没有新相关文献；不保证 graph metrics/layout 最新。 |
| Changed | Source changed / source check changed | UI/diagnostic 语义：显式 source check 发现 saved sources 与当前 sources 有差异。 | 不等于 topic artifact 已自动过期或必须后台重写。 |
| Stale | Stale / 失效 | 仅用于有明确 version/hash/epoch invalidation 的技术状态，例如 stale graph layout、stale worker basis、stale review evidence。Topic 领域应优先使用 `source check changed`，避免泛称 `topic stale`。 | 不应用作 discovery candidate、new paper added、registry rebuild 后的默认 topic 状态。 |

推荐写法：

- `request topic source check`
- `source check changed`
- `topic source is fresh as of the last explicit check`
- `graph layout is stale`
- `worker basis is stale`

避免写法：

- `registry rebuild makes topics stale`
- `discovery candidate marks topic stale`
- `freshness worker keeps topics up to date`

## Paper Registry Cache / Literature Registry / Index

| Canonical term | 中文建议 | 定义 | 备注 |
| --- | --- | --- | --- |
| Paper Registry Cache | Paper Registry Cache / 文献运行态缓存 | DB-first 的 Synthesis 运行态域。它 materialize Zotero item、artifact note payload、literature item、binding、artifact readiness、reference instances/resolutions 等 facts，服务 Registry UI、Cleanup、Reference Resolution、Citation Graph 和 debug/maintenance。 | 新设计文档优先使用该词。 |
| Registry Cache | Registry Cache / 缓存注册表 | `Paper Registry Cache` 的短称。 | 可在上下文明确时使用。 |
| Literature Registry | Literature Registry / 文献注册表 | 历史实现名和部分代码模块名，尤其是 `literatureRegistry.ts`、旧 JSON derived files、旧 registry job state。 | 不作为新治理文档的 canonical domain 名。若引用代码，可写 “Literature Registry implementation alias”。 |
| Index | Index / 索引 | 历史 UI/命令/用户习惯名，通常指 registry/cache rebuild 或 old `index.json`。 | 新设计应避免裸用 `index`；改写为 `registry cache`、`registry/cache rebuild` 或具体文件名。 |
| Paper Registry incremental worker | Paper Registry incremental worker | 处理 Zotero/artifact source event 的增量 worker，写 DB registry cache facts，并触发 graph dirty event。 | 不触发 topic source check/freshness；只有 digest apply metadata 分支触发单篇 discovery matching。 |
| Registry/cache rebuild | Registry/cache rebuild | 受保护的 full rebuild，重建 Paper Registry Cache 和 Citation Graph 派生状态，清理/失效旧 registry/graph/discovery repair jobs。 | 不推进 topic artifact version/hash；不做 discovery full backscan；不自动 source check topics。 |

边界规则：

- Paper Registry Cache 是 **cache / runtime facts**，不是全域 Synthesis SSOT。
- Topics、Tags、Concepts 可以读取 bounded DTO 或 optional context，但不得把 Paper Registry Cache 当作自己的事实源。
- Citation Graph 依赖 Paper Registry Cache；Topics 对 Citation Graph metrics/layout 只做可选增强。
- 新文档应把 “rebuild index” 改成 “rebuild registry/cache + citation graph”，除非正在描述历史 UI 文案。

## ID 与引用

### `libraryId:itemKey`

Zotero item 的外部绑定键。

- 来源：Zotero Library。
- 形状：`<libraryId>:<itemKey>`，例如 `1:ABCD1234`。
- Owner：Host Library / Zotero adapter。
- 用途：定位某个 Zotero item binding；startup reconcile、artifact lookup、Host Bridge 读 Zotero item 时使用。
- 稳定性：只要 Zotero item 仍存在且未被 merge/delete，通常稳定；duplicate merge、删除、导入或外部 DB 修复会改变可定位性。
- 不应用途：不要把它当成 graph canonical node id；不要用它代表 external literature。

### `paper_ref`

Paper-level DTO / artifact-level reference。

- 来源：Synthesis adapter/snapshot DTO，通常从 Zotero binding 或 workflow source manifest 派生。
- Canonical v1 形状：`<libraryId>:<itemKey>`，例如 `1:EIMSDEU3`。
- 生成规则：对 Zotero-bound paper 使用 normalized positive integer `libraryId` 和 non-empty Zotero `itemKey` 拼接为 `${libraryId}:${itemKey}`。
- 解析规则：按第一个 `:` 分割；左侧必须是 positive integer library id，右侧必须是 non-empty Zotero item key。解析失败时不得把该值当作 Zotero-bound paper。
- 用途：topic artifact 的 historical paper evidence、workflow input/output、UI snapshot、debug 输出中的可读 paper 引用。
- 语义：locator / reference handle，而不是唯一 canonical identity。
- 稳定性：应尽量稳定和可读，但在 merge/delete/redirect 后可能需要 source check diagnostic 解释历史引用如何映射到当前 survivor。
- 不应用途：不要直接作为 DB foreign key 的长期 canonical target；不要用 `paper_ref` 代替 `literature_item_id` 生成 citation edge；不要把 topic artifact 内部的 `pe:*` evidence id 当作 `paper_ref`。

### `literature_item_id`

Synthesis DB 内部 canonical literature identity。

- 来源：Paper Registry Cache / repository。
- 形状：opaque deterministic surrogate id。当前实现为 `lit:<24 hex chars>`。
- 生成规则：不是 title/digest/reference content hash。Zotero-bound literature 由 `hashCanonicalJson({ kind: "zotero-paper", ref: paper_ref })` 的 SHA-256 hex 前 24 位派生；同一 `paper_ref` 在 rebuild 后得到同一 `literature_item_id`。External literature 使用 kind-specific stable ref，例如 `reference-work:<work_id>` 的等价哈希输入。
- Owner：Synthesis repository。
- 用途：DB foreign key、reference resolution target、citation graph node/edge endpoint、literature identifiers/artifact states/discovery hints。
- 稳定性：Zotero-bound item 在同一 `libraryId:itemKey` binding 未改变时保持稳定；title、year、authors、digest、references 或 citation analysis artifact 变化不改变该 ID。External literature 可因 dedupe/redirect 被 canonicalize；rebuild 必须保留 user override 所需的 redirect/tombstone 等 durable effects。
- 不应用途：不要暴露给 skill author 作为人工输入主键；不要要求用户记住它；不要把它写成 Zotero identity。

### ID 选择规则

| 场景 | 使用 |
| --- | --- |
| 从 Zotero 读取 item / note / attachment | `libraryId:itemKey` |
| Topic artifact 记录历史 evidence 来源 | `paper_ref` + `pe:*` evidence id |
| Reference resolution target | `literature_item_id` |
| Citation graph node/edge | `literature_item_id` 或 graph node id derived from it |
| Discovery hint pair | `topic_id + literature_item_id` |
| UI 展示用户可理解 paper | title/year/authors + optional `paper_ref` |
| Debug 需要跨层追踪 | 同时显示 `libraryId:itemKey`、`paper_ref`、`literature_item_id`，并标明 owner |

## 相关术语

| Term | 定义 |
| --- | --- |
| Zotero binding | `(library_id, item_key)` 与 `literature_item_id` 的绑定 row。Binding 可以 active、merged、deleted_confirmed、tombstoned、ignored。 |
| Literature item | Synthesis 内部统一文献实体，可以是 Zotero-bound，也可以是 external-only。 |
| External literature item | 没有 active Zotero binding 的 literature item，通常来自 references artifact。 |
| Reference instance | 某篇 source literature 的 references artifact 中的一条引用实例。 |
| Reference resolution | `reference_instance` 到 canonical `literature_item` 的解析结果。只有 matched/confirmed resolution 进入 matched citation edge。 |
| Citation Graph | 从 Paper Registry Cache 的 reference facts 派生出的 graph structure、metrics、layout。 |
| Topic dependency baseline | Topic artifact 保存的 source manifest / dependency snapshot。只由 topic apply/update/delete 显式推进。 |
| Discovery hint | literature-digest apply 后对单篇 literature 与 active topics 做 best-effort matching 的候选提示。 |
| Durable effect / user override | 用户确认后需要 rebuild 保留的领域事实，例如 redirect、tombstone、filtered discovery hint、confirmed relation。 |
| Review item | 当前发现的问题实例。它可以 resolved/superseded，但不等于长期 user override。 |
| Epoch / basis | Registry/graph 的轻量 stale guard；topic 使用 artifact version/hash。不是业务事实。 |

## 术语迁移表

| 旧/模糊说法 | 新写法 |
| --- | --- |
| Literature Registry domain | Paper Registry Cache domain |
| index rebuild | registry/cache rebuild，必要时加 `+ citation graph rebuild` |
| topic stale | source check changed / source check diagnostic changed |
| freshness worker keeps topics synced | explicit topic source check records diagnostics |
| paper id | 按语境写 `libraryId:itemKey`、`paper_ref` 或 `literature_item_id` |
| matched paper | reference resolution matched to `literature_item_id`，UI 再显示 title/paper_ref |
| old index JSON | legacy `data/synthesis/**` derived file artifact |
