# Synthesis State Catalog

本文档登记 Synthesis Layer 的主要对象、主 ID、事实源、生命周期和可重建性。新增对象或状态字段时，应先确认它能被放入本 catalog。

## 设计目标

State Catalog 的目标是让 Synthesis 对象可治理：

- 每个对象有唯一主 ID 和事实源。
- 每个对象知道自己是外部事实、运行态事实、派生状态、review item、durable effect / user override，还是显式文件 artifact。
- 每个对象的删除、合并、reset、rebuild 行为可预测。
- UI 能否直接读取该对象有明确边界。
- Rebuild 能区分“可以丢弃重算”、“当前问题实例”和“必须保留的用户覆盖事实”。

## 现有实现状态

Status: `partial`。多数核心对象已进入 `synt_*` typed tables，但 topic artifact state、epoch/basis guard 和 durable effect 管理仍存在过渡状态。

当前实现的对象已经大多进入 `synt_*` 表，但仍有若干 transitional 状态：

- Paper registry cache、citation graph、concept、tag、review item、dirty event、job progress 主要在 `repository.ts` 管理。
- Topic artifact metadata、resolver、resolved paper set、freshness state 仍有部分文件 helper 和 runtime scratch 写入。
- `paper_ref` 对 Zotero-bound paper 的 canonical v1 格式为 `<libraryId>:<itemKey>`；`literature_item_id` 是 opaque deterministic surrogate，当前实现为 `lit:<24 hex chars>`，由 `kind + stable ref` 派生，不是 title/digest/reference content hash。同一 `libraryId:itemKey` binding 在 rebuild 后保持同一 `literature_item_id`。
- Review item 与 durable effect / user override 的关系仍需收口；部分 P0 review action 已会 materialize domain facts，但 saved overrides 管理入口仍缺失。
- Dedupe merge 和 delete review 已有 repository action，但其影响传播到 topic freshness 的路径仍不够集中。
- Epoch/basis state 尚未完整落表：目标合同已经定义 `registry_epoch`、`graph_epoch` 和 topic artifact version/hash，但当前实现还缺少统一 epoch/basis guard、旧 dirty events/job 的 stale-basis 处理，以及 graph 对 `basis_registry_epoch` 或 input hash 的提交校验。当前实现可继续使用历史 `index_generation` 字段名，但语义应降级为 registry/cache epoch。

## Catalog 总览

| 对象 | 主 ID | SSOT | 类型 | 可重建性 | UI 热读 |
| --- | --- | --- | --- | --- | --- |
| Zotero item | `libraryId:itemKey` | Zotero | external source | 不由 Synthesis 重建 | 否 |
| Artifact note payload | note key + payload hash | Zotero note | external/derived source | 可由 skill 重跑 | 否 |
| Literature item | `literature_item_id` | SQLite `synt_literature_item` | registry/cache runtime fact | Zotero-bound 可重建，user override 不可静默覆盖；不是跨 Topics/Tags/Concepts 的全局 SSOT | 间接 |
| Zotero binding | `(library_id,item_key)` | SQLite `synt_zotero_binding` | runtime fact | 可从 Zotero 重建，但 deletion/merge review 要保留 | 是 |
| Literature identifier | `(literature_item_id,kind,value)` | SQLite `synt_literature_identifier` | runtime fact | 可重建 | 间接 |
| Artifact state | `(literature_item_id,artifact_type)` | SQLite `synt_artifact_state` | runtime fact | 可从 artifact notes 重建 | 是 |
| Paper registry cache fact | `paper_ref` | SQLite repository | cache fact | 可重建 | 是 |
| Reference instance | `reference_instance_id` | SQLite `synt_reference_instance` | runtime fact | 可从 references artifact 重建 | 是 |
| Reference resolution | `resolution_id` | SQLite `synt_reference_resolution` | runtime fact/reviewable | 可重建但 confirmed review 不应覆盖 | 是 |
| Citation graph node | `node_id` | SQLite `synt_citation_node` | derived runtime | 可重建 | 是 |
| Citation graph edge | `edge_id` | SQLite `synt_citation_edge` | derived runtime | 可重建 | 是 |
| Citation metrics | metric key | SQLite metrics tables | derived runtime | 可重建 | 是 |
| Citation layout | preset + graph hash | SQLite layout table | derived UI runtime | 可重建 | 是 |
| Topic artifact | `topic_id` | DB + workflow output artifact | user/workflow fact | 只能显式更新或删除 | 是 |
| Topic resolver | `topic_id` | topic runtime state | runtime fact | 可由 topic apply 重建 | 是 |
| Topic source check / freshness diagnostic | `topic_id + check_run_id` 或 current diagnostic row | runtime state | explicit diagnostic derived runtime | 由用户/维护命令显式重算；不由 registry cache 事件持续维护 | 是 |
| Topic interest metadata | `topic_id` | SQLite `synt_topic_interest_metadata` | workflow metadata fact | 可由 topic apply 重建 | 是 |
| Literature matching metadata | `literature_item_id` | SQLite `synt_literature_matching_metadata` | artifact metadata fact | 可由 digest/artifact 重建 | 是 |
| Discovery hint | `topic_id + literature_item_id` | SQLite `synt_topic_discovery_hint` | apply-time best-effort derived / reviewable | 可由 literature-digest apply 或显式 repair 重建；user filtered status 应保留 | 是 |
| Topic graph node/edge | topic/edge id | SQLite topic graph tables | runtime semantic fact | 不应被 background worker 覆盖 | 是 |
| Concept record | `concept_id` | SQLite concept tables | runtime semantic fact | proposal 可重建，review outcome 要保留 | 是 |
| Tag vocabulary entry | tag | SQLite tag tables | user/domain fact | 不由 registry cache rebuild 改写 | 是 |
| Review item | `review_item_id` | SQLite `synt_review_item` / domain-local review tables | current problem instance | 可失效、可 supersede；open/resolved 状态不等于长期 override | 是 |
| Durable effect / user override | domain-local effect id | domain fact row + optional receipt | materialized user override | rebuild 后应保留；只有 orphan/hard conflict 才 needs attention | 是 |
| Override receipt | `receipt_id` 或 embedded domain receipt | optional `synt_override_receipt` / domain row | explanatory metadata | 不是 SSOT；可裁剪、可重建摘要；不驱动 rebuild replay | Review UI / debug |
| Registry epoch | epoch/run id | local runtime control state | stale guard / committed basis | full registry/cache rebuild 可在 final commit 后推进；不是业务事实 | 任务/诊断 |
| Graph epoch | graph epoch + `basis_registry_epoch` 或 input hash | local runtime control state | derived runtime stale guard | citation graph rebuild 可独立推进，但必须基于当前 committed registry epoch | 任务/图诊断 |
| Topic artifact version/hash | topic id + artifact version/hash | topic artifact state | topic-domain stale guard | 只由 topic apply/update/delete 推进；不由 registry/graph rebuild 推进 | topic 诊断 |
| Dirty event | `event_id` | SQLite `synt_dirty_event` | transient runtime | 可清理/重建 | 任务 UI |
| Job progress | job/run id | SQLite `synt_job_state` | transient runtime | 可清理 | 任务 UI |
| Checkpoint/export file | file path | explicit output | file artifact | 可重新导出 | 否 |

## 生命周期分类

### 外部事实

Zotero item、note、attachment、workflow workspace 属于外部事实。Synthesis 只能通过 adapter/materializer 把它们转换成 DB facts。

### 运行态事实

运行态事实是 Workbench 和 worker 的主输入。包括 registry cache literature items、bindings、artifact state、reference facts、tag/concept/topic graph facts。Registry cache facts 只服务 registry UI、cleanup、reference resolution、Citation Graph 和 debug/maintenance，不是 Topic/Tag/Concept 的全局事实源。

### 派生运行态

派生运行态可以丢弃并通过 worker 或显式动作重算。包括 citation graph metrics/layout、topic source check diagnostics、dirty queue、job progress。Topic source check 是显式诊断，不是 registry cache 事件持续维护的 freshness invariant。Discovery hints 属于 apply-time best-effort 派生状态：普通路径由 literature-digest apply 针对单篇 literature 生成，显式 repair 可重算有界范围，但不做周期性全库 worker。

### Review Item

Review item 是当前发现的问题实例。它可以 open、deferred、blocked、resolved、superseded，也可以在 rebuild 后因为问题消失而失效。Review item 不应承担长期 policy 的全部职责。

### Durable Effect / User Override

Durable effect / user override 是用户或系统已经确认并 materialize 的领域事实，例如 delete/tombstone、dedupe redirect、ignore reference、filtered discovery hint、confirmed topic relation。Rebuild 不得无条件删除这些 domain facts；只有 target 消失、scope 无法定位或 hard conflict 时，才进入 `needs_attention`。

当前目标不要求统一 enterprise-style audit ledger。相关目标与 UI 管理入口见 [Review Decisions and Durable Effects](./decision-governance.md)。

Override receipt 只是解释层。它可以帮助 UI 展示“为什么有这个 override”或帮助 debug，但不能替代 domain-local effect row，也不能成为 rebuild 后重新应用用户选择的唯一依据。

### Epoch / Stale Guard State

Epoch / stale guard state 是运行态控制状态，用来防止旧 worker、旧 dirty event 或未完成 rebuild 污染 committed snapshot。它不表达领域事实，也不应成为 Topics 与 Registry/Graph 重新耦合的通道。

- `registry_epoch` 是 registry/cache facts 的根 committed basis。
- `graph_epoch` 是 citation graph structure 的派生 committed basis，必须记录 `basis_registry_epoch` 或等价 input hash。
- topic artifact version/hash 是 topic 领域内 basis，只随显式 topic apply/update/delete 推进。

Graph worker 可以独立推进 `graph_epoch`，但 final commit 必须校验 `basis_registry_epoch` 或 input hash 仍等于当前 committed registry basis。Registry/cache rebuild 不推进 topic artifact version/hash；Topic source check 是显式诊断，不是 epoch 联动。

### 文件 artifact

文件 artifact 包括 checkpoint、export、debug dump、legacy import bundle。它们是显式边界，不是 Workbench SSOT。

## 状态枚举治理

状态字段应归属到固定类别：

- identity/binding：`active`、`pending_delete_review`、`deleted_confirmed`、`merged`、`tombstoned`、`ignored`、`needs_attention`。
- artifact coverage：`available`、`missing`、`invalid`。
- source check / freshness diagnostic：`not_checked`、`checked`、`changed`、`queued`、`running`、`failed`、`unknown`。
- review：`open`、`deferred`、`resolved`、`rejected`、`superseded`、`blocked_by_upstream_review`。
- override：`active`、`needs_attention`、`revoked`、`orphaned`。
- queue/job：`queued`、`running`、`waiting`、`completed`、`failed_retryable`、`failed_terminal`、`paused`。
- discovery：`open`、`filtered`、`accepted`、`rejected`、`superseded`。

新增状态前必须说明它属于哪一类，以及 UI、worker、reset 是否需要特殊处理。

## 状态组合治理

这些状态族是正交状态机，不应合并成一个巨大的对象状态枚举。一个对象可能同时涉及 identity、review、override、queue/job 或 epoch/basis 状态，但每个状态必须由自己的 owner 解释。

组合优先级：

1. **identity/binding terminal state 优先**：`merged`、`tombstoned`、`deleted_confirmed` 会使依赖它的 reference resolution、graph edge、review item 进入 retarget、superseded 或 Needs Attention。
2. **durable effect 优先于 review item**：review item 是当前问题实例；用户已确认的 redirect、tombstone、filtered hint 等 durable effect 才是 rebuild 后要保留的事实。
3. **queue/job 不表达领域事实**：`running`、`queued`、`failed_retryable` 只说明执行状态，不能让 UI 把半完成结果当成 committed domain state。
4. **epoch 只做 stale guard**：旧 epoch/basis job 可以被 supersede，但不得把 registry/graph epoch 推进解释为 topic source-check changed diagnostic。
5. **discovery 与 freshness 分离**：`discovery_hint=open/accepted/filtered/rejected` 不改变 topic source check / freshness diagnostic。

非法或需要降级的组合：

| 组合 | 处理 |
| --- | --- |
| confirmed reference resolution 指向 tombstoned literature item | resolution 进入 `needs_attention` / `superseded`，graph edge 不 ready |
| active Zotero related-items sync 指向 non-active binding | 跳过 sync 并记录 diagnostic |
| `filtered` discovery hint 被 digest rerun 重新命中 | 保持 filtered；不得自动转回 open |
| open review item 的 scope 已被 P0 merge/delete action 改写 | 旧 review 进入 `superseded` 或 `blocked_by_upstream_review` |
| running job 的 epoch/basis 旧于 committed basis | job/event 进入 `superseded`；普通 UI 不展示为 active |
| bulk/structural drift 同时出现 per-item dirty fan-out | per-item fan-out 被禁止；保留 drift incident 和显式 rebuild/repair 建议 |

## 删除与合并语义

| 场景 | 目标语义 | 当前状态 |
| --- | --- | --- |
| Zotero item 删除 | 生成 P0 deletion review；确认后 binding/item/artifacts 进入 deleted/tombstoned 状态；形成 durable tombstone override；下游 reference review 被 supersede | Full rebuild 可生成/保留 P0 review；saved override 管理和增量删除到 freshness 的联动仍待实现 |
| Zotero duplicate 合并 | 生成或执行 dedupe review；duplicate literature item tombstone，binding merged，reference resolutions retarget；形成 durable redirect/tombstone override | Repository action 已存在；saved override 管理与 topic dependency impact 仍待实现 |
| Topic 删除 | topic artifact 和 topic graph materialized node 进入 deleted/hidden；UI 不从 legacy 文件复活 | 已有 service handler；DB-only topic artifact state 仍在推进 |
| Discovery hint 过滤 | 只影响 discovery queue，不改变 topic artifact 或 resolver；形成 durable filtered hint override；digest 重跑、metadata hash 微变、registry cache rebuild 不应自动重新打开 | 已有 hint state；过滤/接受的长期保留策略和管理 UI 需继续收口 |
| Clean install reset | 清运行态和 scratch，保留非 Synthesis 状态 | 已有 debug clean-install reset，仍需和正式 reset 策略区分 |

## Catalog 维护规则

- 新增 `synt_*` 表、review kind、override/effect kind、dirty event type、job source、topic state 字段时，必须更新本 catalog。
- 如果对象既是派生状态又包含 user override，应拆分表或字段，避免 rebuild 覆盖用户确认过的 domain facts。
- UI 直接读取的新 row type 必须标明是否可分页、有界、可重建。
