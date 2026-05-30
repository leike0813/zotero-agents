# Synthesis 领域与动作边界

## 目的

本文档定义 Synthesis 的主要领域，以及随着实现演进仍必须保持稳定的动作语义。二期设计的核心规则是：review action 和 workflow apply 步骤必须更新领域事实，而不仅仅是更新 proposal 状态。

Status: `partial`。Literature identity、reference resolution、topic graph/concept/tag review surfaces 已有实现锚点；external dedupe benchmark、Zotero related items sync 和统一 Review & Overrides 仍待实现。

## 文献实体（Literature Item）与 Paper Registry Cache

`literature_item` 是 Paper Registry Cache / Citation Graph 内的统一实体。Zotero 库内条目和外部 references 不是两套模型；Zotero item 是 literature item 上的一种绑定。该实体服务 registry UI、cleanup、reference resolution 和 graph，不是 Topics/Tags/Concepts 的全局事实源。

Canonical identity 规则：

- `paper_ref` 是 Zotero-bound paper 的可读 locator，canonical v1 格式为 `<libraryId>:<itemKey>`，例如 `1:EIMSDEU3`。它由 normalized positive integer `libraryId` 和 non-empty Zotero `itemKey` 生成，只能按 Zotero binding 语义解析；它不是 DB foreign key 的 canonical target。
- `literature_item_id` 是 opaque deterministic surrogate key，不是内容 hash。当前实现形状为 `lit:<24 hex chars>`：Zotero-bound literature 由 `hashCanonicalJson({ kind: "zotero-paper", ref: paper_ref })` 派生；external literature 由 kind-specific stable ref 派生。
- 只要 `libraryId:itemKey` binding 不变，Zotero-bound `literature_item_id` 在 rebuild 后应保持稳定；title、authors、digest、references 或 citation analysis artifact 改变不应改变它。
- DOI、URL、arXiv、citeKey、title、normalized title、raw reference 和 agent-authored metadata 都是身份信号，不是主键。
- `normalized_title` 是确定性的弱证据。它必须保留为可查询、可复审的文本，而不只是 hash。
- Zotero binding 通过 `(library_id, item_key)` 唯一，可以处于 active、pending review、deleted、ignored 或 merged 状态。
- 库外文献 dedupe 使用与库内 reference matching 相同的 normalization / candidate generation primitives，但 materialization policy 更保守：强 identifier 可自动 redirect，弱/fuzzy 证据默认进入 review。
- 当库内 Zotero-bound candidate 与库外 external candidate 同时命中时，库内 item 优先；库外 item 应通过 redirect 指向库内 survivor，而不是在 graph 中保留重复 canonical target。

库外 dedupe 正式实现前必须像 reference matching 一样建立可重复评测闭环：从当前库提取 fixture，使用人工审阅 harness 生成 golden labels，再通过实验报告确定自动 merge、review 和 danger-pair 阈值。不能只凭规则直觉直接上线 external-external auto-merge。

当前实现锚点：

- `src/modules/synthesis/repository.ts`
  - `upsertLiteratureItem`
  - `upsertLiteratureIdentifier`
  - `upsertZoteroBinding`
  - `upsertReferenceInstance`
  - `upsertReferenceResolution`
- `src/modules/synthesis/service.ts`
  - `getPaperRegistry`
  - Workbench registry snapshot assembly

## 复检动作（Review Actions）

成功的 review action 必须在同一个事务中改变相关领域事实和 review state。它不能只把 review item 标记为 approved 或 rejected。

Review 优先级：

- P0：identity 与 binding review，包括 Zotero deletion、dedupe、merge 和 literature item merge。
- P1：reference resolution review，包括 match existing、create external item、ignore reference 或 defer。
- P2：metadata freshness、diagnostics 和较低优先级 cleanup。

P0 决策必须维护依赖它的 P1 reviews：只在受影响的有界 scope 内 retarget、supersede、unblock 或 deduplicate。默认 fallback 不应是全库扫描。External literature merge/redirect 属于 P0 identity action；reference instance 指向哪个 target 属于 P1 resolution action，二者不能混成一个“matched”状态。

### Review Action 冲突处理

虽然 Zotero 插件运行在单进程协作式异步环境中，用户动作、Host Bridge 调用和 worker tick 仍可能在 `await` 之后交错。Review action 必须用短事务和 stale-action guard 处理同 scope 冲突。

冲突规则：

- 同一 `literature_item_id` / binding scope 上的 P0 identity action（delete、merge、redirect、tombstone）采用 first-commit-wins。后提交的 action 如果看到 binding state/version、redirect target 或 evidence hash 已变化，必须返回 `conflict_requires_attention`，不得覆盖已提交的 P0 durable effect。
- P0 action 成功后，受影响 scope 内的 P1 reference resolution reviews 必须 retarget、supersede、block 或 deduplicate。不能让旧 P1 review 继续针对已 merged/tombstoned target 执行。
- P1 reference resolution action 必须校验 `reference_instance_id`、resolution version、target literature identity/binding state。目标 target 已 tombstoned、merged 到别处或失去 active binding 时，action 失败并进入 Needs Attention 或重新打开 review。
- Worker 可以创建/更新候选 review、dirty events 和 diagnostics，但不得绕过 review action 直接覆盖用户刚提交的 durable effect。
- UI 收到 `conflict_requires_attention` 时应刷新对应 review card/snapshot，而不是重试旧 payload。

当前实现锚点：

- `src/modules/synthesis/reviewInput.ts`
- `src/modules/synthesis/service.ts`
  - review item enrichment and action handlers
- [Synthesis Review Input 合同](./review-input-contract.md)

## 引用图（Citation Graph）

Citation Graph 是 registry cache 和 reference facts 的 DB-native derived state。它分为四层：

- structure：nodes、edges、source ownership、incoming groups；
- lightweight metrics：随 structure 更新的局部计数和 degree-like metrics；
- complex metrics：低优先级 worker 输出；
- layout：按 preset 缓存的 UI-driven 数据。

任何影响 literature items、Zotero bindings、reference instances 或 resolutions 的 registry cache 写入，都必须同步更新受影响的 graph structure 和 lightweight metrics。Complex metrics 与 layout 可以滞后。

Read APIs 必须返回有界 graph slices 或 metrics。普通读取不得 rebuild graph、compute layout 或组装完整 graph JSON。

### Zotero related items 外部 sync

旧 `reference-matching` workflow 在 apply 时会把匹配到的库内文献加入父条目的 Zotero native related items。新架构中，这个能力不应复活旧 workflow 或 citeKey baseline，而应作为 Citation Graph 到 Zotero Library 的受控外部 sync。

Sync 规则：

- 输入只来自 DB-backed reference resolution / citation edge facts。
- 只处理 source 与 target 都有 active Zotero binding 的 library-to-library matched/confirmed citation edge。
- `unresolved`、`ambiguous`、`ignored`、external-only、target binding 缺失或 source 等于 target 的 edge 必须跳过并记录 diagnostic。
- 该 sync 只补充缺失 related link，不自动删除 Zotero 中已有的 related link；Zotero related items 是用户可编辑的 native 状态，不是 Citation Graph 的事实源。
- Sync 必须在 graph/reference facts commit 之后由 worker 或显式 maintenance command 执行；Zotero API 写入失败不得回滚 registry cache 或 citation graph facts。
- 进度可以按候选库内 matched edge 数报告 `current/total`，输出 `added`、`existing`、`skipped`、`failed`。

当前实现锚点：

- `src/modules/synthesis/citationGraph.ts`
- `src/modules/synthesis/service.ts`
  - `readCitationGraphSnapshot`
  - `buildCitationGraphSlice`
  - graph metrics read APIs
- `src/modules/synthesis/repository.ts`
  - citation node、edge、ownership、incoming group 和 metric records

## 主题图（Topic Graph）

Topic Graph 关系是来自 topic synthesis apply 或用户复检的语义事实。Paper registry workers 不得自动重写 topic relations。

Topic source check 可以在显式用户/维护动作下报告 saved source manifest 与当前 Host Library / Artifact Facade 的差异，Discovery 可以提供 candidates；二者都不得在没有显式 workflow apply 或 review action 的情况下更新 topic artifact text、resolver 或 graph relations。Registry cache dirty events 和 registry/graph cache rebuild 不应直接把 topic 标为 dirty。

当前实现锚点：

- `src/modules/synthesis/topicGraph.ts`
- `src/modules/synthesis/service.ts`
  - topic graph relation proposal ingestion
  - topic graph review action handling
- `src/modules/synthesis/repository.ts`
  - topic graph node、edge 和 review item records

## 概念知识库（Concept KB）

Concept records、senses、aliases、relations、topic links 和 review items 都是运行态。Proposal ingestion 与 review actions / saved overrides 应在事务中更新 DB facts。JSON concept assets 是 checkpoint/export 输出，不是热路径状态。

Concept KB 与 Topics 的交互必须经过 anti-corruption DTO：

- Topics -> Concept KB：topic synthesis apply 提交 concept proposal / topic-concept link proposal；Concept KB 负责验证、合并、review 和 materialization。
- Concept KB -> Topics：Concept KB read facade 返回只读 overlay/context；Topics 可以显示或作为 workflow 可选上下文，但不能把 overlay 当作 topic artifact、source manifest 或 freshness baseline 的事实源。
- Concept KB 不可用、为空或 overlay read 失败时，Topic 正常功能必须降级继续；失败只能产生 bounded diagnostic 或 explicit retry/rebuild recommendation。
- Concept review action 不得自动改写 topic artifact 正文或 topic graph relation；Topic update 必须仍通过显式 topic workflow apply。

当前实现锚点：

- `src/modules/synthesis/conceptKb.ts`
- `src/modules/synthesis/service.ts`
  - concept card proposal ingestion
- `src/modules/synthesis/repository.ts`
  - concept、sense、alias、relation、review 和 topic link records

## 标签词表（Tag Vocabulary）

Tag Vocabulary 在 import/export 边界保持协议兼容，但 active UI 和 tag-regulator 使用的状态来自 SQLite rows。Import preview 和 apply 应先更新 DB 状态；之后 JSON checkpoint export 可以写出协议形状。

当前实现锚点：

- `src/modules/synthesis/tagVocabulary.ts`
- `src/modules/synthesis/repository.ts`
  - tag vocabulary、alias、abbreviation、protocol 和 validation records

## 动作命名

用户可见动作必须描述真实领域效果：

- 使用 `Match to paper`、`Create external item`、`Ignore reference` 或 `Confirm relation` 这类动作标签。
- 当 approval 只会改变 proposal 状态，或会掩盖真实后果时，避免使用泛化的 `Approve`。
- UI cards 应说明 source、target、confidence 和 transaction outcome，而不是把内部 proposal ID 作为主要含义。
