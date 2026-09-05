# Issue #39：Zotero Host 能力合同统一——实施指导与计划

> 状态：五个 OpenSpec change 的切分方案已确认；尚未创建 change 工件、实施代码或发布。
> 整理日期：2026-09-05。
> 目标版本：v0.9.0；#39 作为总任务，五个 OpenSpec change 的清单和依赖见第 14 节。
> 代码审计基线：`4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`。开始审计时工作区干净；该 SHA 是本次只读审计基线，实施前须重新固定开发基线。

本文件将 [#39 正文及全部 93 条评论](https://github.com/leike0813/zotero-agents/issues/39) 合并为一份实施合同，并回查 [#20 的原始能力决议](https://github.com/leike0813/zotero-agents/issues/20#issuecomment-5507754387) 与 [#26 的最终修订](https://github.com/leike0813/zotero-agents/issues/26)。其中两组评论内容重复，按一项决策处理。后文附逐评论索引。

本文区分三种信息：**已确认合同**必须实现；**实施建议**是据当前代码提出的任务安排；**待冻结项**不能由实现者猜成既定合同。后续评论明确修订早期决策时，以修订后的合同为准。本文不授权提交、推送、切换分支或发布，也不把“文档写完”视为 #39 完成。

## 1. 交付目标与范围

#39 已从 Host Bridge mutation 重命名扩大为一次完整的 Zotero 能力硬切。交付后，Broker 是 Zotero 读取、分页、导航、preflight、写入和写入结果观察的唯一语义 owner；所有适配层使用同一组 portable DTO、稳定错误与权威回执。

本次必须一并完成：

1. 所有增长型读取的源头分页、取消与进程级 Host 短片段串行控制。
2. 精确选择分页，以及 ACP/Workflow 的一次获取、锁定输入和任务级投影。
3. 全域 mutation preflight、私有 prepared plan、调用者 operationId、持久化准入与权威 receipt/attempt。
4. 原生 Trash/restore、列表操作、prepared-file 导入/替换和 canonical 单篇 `literature.ingest`。
5. 六类 Managed Note 的统一读写、Source Reference/Citation Analysis 全链路合同和 Synthesis 消费收敛。
6. 显式 Literature Artifact 迁移与永久 Dashboard Migrations 页面。
7. 七项 canonical navigation、Bridge/MCP/CLI 导航准入与 Workflow Host 导航删除。
8. Host Bridge registry、直接 REST 路径、MCP、CLI、内置 Workflow/相关 Skill 的原子切换，以及旧 DSL/别名/回退删除。
9. OpenSpec、架构文档、三层受治理表面、兼容性验证和正式 Host Bridge release receipt。

上述范围按五个可分别验收的 change 实施，整组统一发布。#39 与本文件持有总范围、依赖和最终完成条件，不另建仅汇总任务的空 OpenSpec change。原名称 `canonicalize-host-bridge-zotero-capabilities` 保留给写入合同切换；其余读取、选择、工件和导航各有独立 change。每个 change 贯穿 Broker、适用的 adapters、消费者、删除、测试与文档，不按 TypeScript/Rust 或 Broker/Bridge/MCP/CLI 层分别交付半条调用链。

不纳入 Pi runtime、Pi tool descriptors/catalog、Pi UI、provider、preferences 或 C07/C19 的产品生命周期实现。Pi C12/C13/C14/C15/C19 是后续消费者，不能替本票实现缺失的 Broker 行为。C12/C13 的生产启动条件仍包含本票实现、验证、归档、v0.9.0 发布与完整 Host Bridge receipt。

不新增通用 repository、capability 元框架、adapter 继承体系、通用 batch、多版本兼容层、动态 migration 注册、迁移 DSL、重放调度器或凭据系统。保留现有非本票领域的 notification、watched runs、attention、catalog/index、maintenance、workflow control 和 Generic Input Planning v2 语义。

## 2. 必须采用的最终修订

以下是最容易因只读正文或早期评论而实施错误的部分。

| 旧描述 | 最终合同 | 决策依据 |
| --- | --- | --- |
| 保留 legacy wire/CLI 兼容 | 硬切；无旧 operation alias、旧 DTO、fallback、双 envelope | #26 Q62、#39 正文 |
| selected items 提升 attachment 到 parent 并去重 | 返回精确 UI 对象和顺序；子对象携带 `parentRef`；Broker 不提升、不去重 | Q77 覆盖 Q76 对 normalization 的旧描述 |
| V12 保持所有原成员 | 删除整个 Workflow Host `navigation`；其余成员继续显式投影，版本仍为未发布的 V12 | Q125 |
| caller 提交 `expectedRevision` | public semantic DTO 删除该字段；当前 revision/state 进入 Broker 私有 prepared plan | Q91 |
| 普通写入不需 prepared plan | 所有 mutation 先做 effect-free preflight；可信 execute 路径持有私有计划/token | Q91 修订正文及早期 preflight 范围 |
| mutation receipt 可以是 partial/failed/unknown | receipt 仅 `committed / unchanged`；失败、取消、未知、残留属于 attempt | Q92 |
| attachment source 可直接传路径或 linked replacement | 私有 prepared-file lease；文件导入只进入 managed storage；不支持 linked replacement | Q94/Q95 |
| mutation authority 仅在内存，重启事实全由外部 owner 保存 | Broker 持久化 identity/semantic binding/结果，并提供只读观察 | Q207–Q214 |
| 回执过期后同 operationId 可以再次执行 | 保留最小 identity/digest；同输入 `outcome_unavailable`，不同输入 conflict，均不重写 | Q213 |
| scan plan 必须跨 Zotero 重启可执行 | durable history 保留；重启后必须显式重新扫描；不能执行旧 preview | C14 closeout 覆盖 Q123 |
| 为 navigation 新建签名/委派凭据 | 保留 master token 与协作 scope；不宣称 scope 防伪 | Q149b 覆盖 Q149a 凭据要求 |
| MCP scope 绑定会话或来自 initialize | 每个 HTTP request 解析一次 `X-Zotero-Bridge-Scope`，用于 list/call | Q152 |
| `location_unsupported` 是顶层错误码 | `unsupported_operation.details.reason = location_unsupported` | Q143 |
| `openItem` 成功证明 Reader/editor/external app 已显示 | 只证明 native dispatch；Reader 精确位置也是命令接受级结果 | Q132/Q136/Q154/Q158 |
| workflow migration inventory 中的 debug migrator 需要迁移保留 | 删除 `debug-migrate-note-payloads`，改由 Dashboard 本地迁移 owner 执行 | Q115 |

此外，正文要求纠正 `AGENTS.md` 中 V11 标签；本次基线已是 V12，不应制造无意义的版本标签修改。但 Broker/Workflow 的旧语义限制需在实际硬切时同步修订。

## 3. 当前代码与目标差距

下列是当前实现事实，不是最终合同。CodeGraph 部分 selection/workflow 记录已过时，核验以当前工作区源码为准；实施前必须按固定基线重新做 caller/result audit。

| 区域 | 当前事实 | 实施落点 |
| --- | --- | --- |
| Broker interface | `zoteroHostCapabilityBroker.ts` 已有 canonical/legacy 并存，部分 child reads 返回完整数组 | 深化原 Broker；收敛 DTO、页、preflight 和执行语义 |
| Library query | `zoteroLibraryPageQuery.ts` 已有 SQL count、keyset、`limit + 1` 和页内 hydration | 复用源头分页；补齐 collection、note、payload、attachment、annotation、Saved Search |
| Selection | Broker 仍返回 snapshot，attachment 会提升为 parent；`selectionContext.ts` 仍建 raw rich tree | 精确页与 locked refs；删除 rich tree 和重复 Host 获取 |
| Mutation authority | `zoteroHostMutationAuthority.ts` 的 records/token/pin 为内存状态 | 复用现有 authority，增加 Broker-owned durable identity/结果；私有 token 保持临时 |
| Bridge | `LegacyHostBridgeReadProjection`、`injectedLegacyReadProjection`、unsafe cast、数组切页与 legacy mutation 仍存在 | registry 与 REST 同时改为完整 Broker 注入；remote locality 只处理当前页 |
| MCP | `ZoteroMcpToolCallQueue` 串行整个 tools/call | Host 串行下沉到 Broker；只保留职责明确的 transport admission/guard |
| CLI | 旧 mutation builders、旧 `context … open`；`operation get` 读取通用 HTTP operation store | canonical builders、新导航、独立 canonical mutation observation 查询 |
| Notes | raw `NoteDetailDto.content`、包内 note/payload writer 与 duplicate cleanup 并行存在 | 一个 Managed Note owner 与六项语义操作 |
| Migration | 旧 debug workflow 直接处理 payload；Dashboard 无 Migrations | 删除旧入口，新增最小本地实现与永久 tab |
| DSL | `src/handlers` aggregate 仍被 Broker、Workflow 和 Synthesis tag adapter 消费 | 将必要 raw effects 内收；删除公开领域 DSL |
| 文档 | Broker SSOT 仍称 stateless、保留 handlers、Workflow navigation、MCP 整调用队列和 linked source | 与实现同时更新，不能用文档旧描述推翻 #39 修订 |

本次审计时 `openspec list --json` 只有 `complete-synthesis-r9-stage1-acceptance`；本票五个 change 尚未创建。不可把本票任务写进该无关 change，也不可提前把现有主 specs 改成“已实现”。

## 4. 接口、所有权与信任边界

```text
Workflow locked refs ---> explicit Workflow Host V12 ---+
ACP context / local composition -----------------------+--> Broker --> private Zotero effects
Host Bridge registry / REST --> locality + admission ---+       |
    ^                                                          +--> canonical mutation evidence
    +--- inbound MCP mirror / Rust CLI

Dashboard Migrations --> explicit local migration --> Managed Note parent-set writer --> Broker
canonical Source Reference Artifact --> Synthesis Application --> derived reference projections
```

- **Broker**：portable refs、normalization、领域 validation、分页、取消检查点、Host gate、prepared plan、实际 effects、compensation、receipt/attempt、mutation observation。
- **Host Bridge**：authentication、exposure、approval、connection mode、请求/响应体预算、上传 lease、下载 handle、remote locality；不能解释第二套 Zotero 业务规则。
- **MCP**：复用 Bridge definition/handler，并负责 JSON-RPC/HTTP 投影；不能另设写入、分页或路径策略。
- **CLI**：将命令构造为 canonical DTO；为每个 execute intent 生成一次 operationId，并允许原 ID 查询/重试；raw `call` 同样受严格 schema 与 admission 约束。
- **Workflow Host V12**：member-level `Pick` 和对象字面量投影；无 domain spread/proxy/runtime catalog 继承。移除 navigation 和旧 reference helpers，不能以通用 wrapper 复活。
- **Managed Note**：一个 Broker 内部深模块，持有 note 类型识别、semantic payload、HTML、payload attachment、派生图片、成组写入和验证。
- **Migration**：自己的 classification/conversion/plan/parent-set 生命周期；共享 UI 只投影元数据、命令与 bounded receipt。Zotero effects 仍通过 Broker-owned 语义。
- **Synthesis Application**：只接受完整 canonical Source Reference Artifact，在内部一次性生成自身 Raw/Canonical Reference facts；不决定 Zotero note storage。

Public DTO 仅允许严格 JSON。`PortableItemRef`、`PortableCollectionRef`、`PortableSavedSearchRef` 使用 `{ libraryId, key }`；拒绝 raw Zotero object、native cause、DOM、窗口、函数及未声明字段。非有限数、循环对象、class instance、undefined 属性等不能跨接口。

`WorkflowCallControl`、导航 resolver、prepared token/file lease 属于可信临时控制通道，不是 public semantic DTO。路径、revision authority、caller scope、permission state 不得通过模型或 remote semantic 字段注入。稳定错误沿用 `ZoteroHostCapabilityError` 的 `code/retryable/details`，不以 message 文本分类。

## 5. 读取、分页与 Host 响应性

### 5.1 读取合同审计表

逐项登记：当前 Broker member、请求/结果类型、实际 source read、ordering、cursor basis、预算、取消点、直接消费者和对应测试。

| 能力 | 目标合同 |
| --- | --- |
| `context.getCurrentView` | 小型同步 DTO，无内嵌 selection 数组；Saved Search 使用稳定 ref；不添加形式化 control 参数 |
| `context.getSelectedItems` | 第 5.2 节的精确、无状态 basis-bound page |
| `library.listItems` | 保留过滤语义与 source-level keyset page；不以全量 getAll 作为 fallback |
| `library.listCollections` | 源头有界分页；删除全量 getByLibrary/getAll/ID scan 后切页 |
| `library.listSavedSearches` | 新增，default 25/max 100、稳定顺序、opaque cursor；名称只作展示 |
| `library.getItemNotes`、`listNotePayloads`、`getItemAttachments`、`listAnnotations` | 各自 task-specific page；从源头取页，仅 hydrate/serialize 当前页 |
| `library.getItemDetail`、`getItemAuditState`、`getNotePayload` | 单对象有界 detail；大内容遵守领域 byte 限制，不把所有 detail 改成通用分页 |
| `library.getNoteDetail` | ordinary/managed union；managed 返回完整 semantic payload 和精确 serialized byte facts |
| `library.readinessAudit`、`exportAnnotations` | 显式 control；以 bounded slices 遍历/导出，不先收集全量对象 |
| `library.traverseItems` | 页之间释放 Host gate；callback、coverage/digest 在 gate 外；保留既有 coverage 语义 |
| `metadata.translateIdentifier` | 前后取消检查和 late-result suppression；网络等待不能占 Host gate |
| 其它增长型读取、保留的 snapshot/export | 纳入同一审计；拆成短片段或删除垄断 Host 的路径；不要擅自扩展 Bridge/Pi exposure |

使用 Broker 持有的统一列表上限。公开分页应有明确 default/max、稳定 ordering、opaque cursor 和 structured cursor failure；逐项移除旧 offset/numeric cursor/full-read escape hatch。不要强行将所有领域结果包成 `{ data, meta }`。现存 list/traversal 的业务字段可以保留，但其语义必须在 delta spec 中固定。

列表页不是 snapshot 一致性的通用承诺。每种 cursor 必须绑定自己的查询/来源/必要 basis，明确 malformed、unsupported、expired（若该 cursor 本身有生命周期）、query mismatch、basis change 的错误行为；不能在错误后静默重开第一页。Selection 的无 TTL 规则不应被普通 library cursor 的实现覆盖。

### 5.2 精确 selection

请求包含 `limit? / cursor?`，默认 25、最大 100。结果至少包含 `items / nextCursor / hasMore / returned / total`，item 是精确选中的对象；attachment/note 等可携带 `parentRef`，不替换成 parent。

每页重新读取当前 UI 的有序精确 refs，以该序列 digest 和 `afterIndex` 绑定 cursor。内容或顺序变化返回 `basis_mismatch`，调用者重新获取整个逻辑选择。仅当前页 hydrate/serialize；为计算 basis 读取全序列 refs 不等于物化全部 item detail。

不维护 selection cache、snapshot owner、TTL 或 persistence；不在 Broker 内 promotion、dedupe 或排序。测试应覆盖 parent 与 child 同时选择、同父多个 attachment、顺序变化和精确对象不丢失；Q76 旧“提升/归一后去重”的测试不能照搬。

### 5.3 一个进程级短片段 gate

在 Broker 实现内复用一个 module-level FIFO gate，所有 Broker 实例和适配层共享，Host critical slice 最大重入为 1。

- 一次 page/有限 native transaction 是一个受控片段，完成后释放；不得锁整个 tool、transport 或 workflow。
- callback、网络、文件准备、序列化后的 coverage/digest、approval 等待、receipt persistence 留在 gate 外。
- readiness/export 等循环至多处理 100 items 或运行 50 ms 就 yield，以先到为准；不可通过接受 signal 却没有检查点来“完成取消”。
- queued cancellation 阻止 Host entry。运行中 timeout 不提前释放槽；必须等底层 native slice settle。
- 检查调用前、bounded batch/item 间以及 awaited Host work 后的 signal；观察到取消返回稳定 `canceled`。
- `Zotero.Translate.Search` 无证据支持 cancel/abort 方法，不调用猜测的 API。调用者可逻辑取消并抑制 late result，物理终止未知必须如实记录。
- 移除 MCP queue 的 Host serialization 职责；transport flood limit、watchdog/circuit 等仅在职责仍成立时保留，并更新状态/诊断文案。

验收不能只检查调用次数：需要并发 Broker/Bridge/MCP 的最大 native 重入、FIFO、queued cancel、超时后的槽占用，以及 callback/network/file work 不占 gate 的可观察证据。

## 6. Workflow 与 ACP 选择模型硬切

目标链路固定为：

```text
live basis-consistent Broker pages / durable PortableItemRef[]
  -> selectionContext.ts: locked ordered refs + canonical facts
  -> workflowInputPlanning.ts: named task policy
  -> narrow task DTO -> hook
  -> final local adapter: ref -> native numeric ID/path only when necessary
```

1. Workflow trigger 一次性获取 basis 一致的 selection，锁定后复用于 settings preview、preparation、execute。分页中 basis 变化应重启获取或返回明确失败，不能混合两份选择。
2. explicit override、durable plan 使用其锁定 refs；删除 `preparationSeam` 及 hook 的 live-selection fallback。
3. 深化现有 `selectionContext.ts`，仅通过 canonical `library.*` hydrate。禁止 refs → raw `Zotero.Item[]` → 旧 builder 的兼容回路。
4. 迁移 ACP context、Workflow menu/execute/preparation、selection sampling、Bridge workflow control 和其它生产 acquisition。包内不得独立再次调用 selected-items。
5. planner/compiler/runtime/hook 不再接收 `libraryID / parentItemID / parent / data / filePath / sourceAttachmentPaths` 等旧 rich 字段。portable ref 内合法的 `libraryId`、迁移 receipt 的 `libraryID` 和最终 native adapter 的数字 ID 不属于名称级误删对象。
6. promotion、dedupe、paper grouping 只留在命名的 task-level projection；不能恢复通用 rich selection adapter。

### 6.1 内置 Workflow 清单及保留行为

审计覆盖当前 **43 个** manifest：Literature Workbench 19、MinerU 1、Synthesis 4、Debug Probe 19。Q78 清单是 12 项语义迁移、6 项机械迁移、1 项文档/测试修正、24 项不受影响。后续 Q115 删除 debug migrator，因此实施后为 42 个活动 manifest；原 12 项中的该项按删除关闭。

| 类别 | Workflow |
| --- | --- |
| Literature 语义迁移 | `add-digest-representative-image`、`debug-note-artifact-inspector`、`export-literature-bundle`、`export-notes`、`literature-analysis`、`literature-deep-reading`、`literature-explainer`、`literature-metadata-curator`、`literature-translator` |
| 语义入口删除 | `debug-migrate-note-payloads`；由 Dashboard 迁移替代 |
| 其它语义迁移 | `mineru`、根 `workflow-debug-probe` |
| 机械 DTO 迁移 | `debug-digest-apply-fixture`、`import-literature-bundle`、`import-notes`、`tag-regulator`、`debug-apply-existing-parent-bundle`、`debug-host-queue-probe` |
| 文档/测试修正 | `tag-auditor`：实际扫描 library，不是只处理选中文献 |
| selection 不受影响 | `collection-collector`、`export-research-bundle`、`literature-search-ingest`、`tag-bootstrapper`；四项 Synthesis workflow；其余 16 项 Debug workflow |

“selection 不受影响”不表示不参与 artifact、ingest 或 DSL 审计。例如 export/import/research bundle 仍须使用新的 canonical artifact。

任务行为必须保留：

- Literature source：按任务需要提升到 paper，一篇 paper 一个 source unit，Markdown 优先 PDF，保留 basename/earliest 顺序与 parent/direct-attachment 优先级，按 ref 去重。
- MinerU：直接选 PDF 只处理该 PDF；选 parent 展开全部符合条件 PDF；过滤非 PDF，每 PDF 一个 unit。
- Metadata curator：attachment/note/annotation 投影到 regular parent，按 parent ref 去重。
- Export notes：parent 展开 generated notes；直接选 note 保持自身；按 note ref 去重。
- Digest representative image：恰好一个 regular parent 或 digest note，解析出唯一 digest note。
- Literature bundle selection：仅 top-level regular item，按输入顺序去重；collection/library 模式不消费 selection。
- Debug note inspector：使用 locked ref 或 parent 的相关 notes，不读取新的 live selection。
- Tag regulator：manifest 只允许 regular parent；删除不可达的 child fallback。

如果 earliest attachment 需要 canonical `createdAt`，增加这一最小事实或固定 Broker 排序，不能为此重新暴露 raw item。删除未使用的 `lib/sourceSelection.mjs`、`referencesNote.mjs` 的旧选择 helper，并收窄 `lib/runtime.mjs` aliases。

Skill/文档仅修改实际受影响源：metadata-search input schema 删除旧 id/key/libraryID envelope 字段；Metadata Curator README 修正 child selection；四项 literature-source README 准确描述优先级；Tag Auditor 修正文义。不要无差别重写未受影响 Skill/profiles prose。

## 7. Canonical mutation 与持久化结果

### 7.1 请求、preflight 与执行

Bridge 保留 `mutation.preview / mutation.execute` 这两个 transport capability，但输入原子替换为 canonical operation union。正文所列 `item.updateMetadata / item.updateTags / collection.updateMembership / notes.create / notes.updateContent / notes.upsertPayload / attachments.create / literature.ingest` 使用 Broker 语义；后续新增 Trash、Managed Note 同样进入明确投影。Pi 的 snake_case tool identity 不能反向改名 Broker member。

- 每个 execute intent 必须提供合法的 caller-supplied `operationId`；Broker 不生成、不从参数 hash 派生。CLI 为一次 intent 生成一次，调用者重试使用同一 ID。
- `mutation.preview` effect-free，不要求 operationId；返回结构化 plan facts。approval 文案由 Bridge 生成。
- 所有 write domains 共用 normalization、validation、preflight；当前 revisions/states 进入 Broker 私有 prepared plan/token。public DTO 不允许 caller 提交 expectedRevision。
- token 绑定 normalized semantic input、实际 effect scope、caller scope、observed basis/revisions；需要文件时绑定 prepared-file identity/size/SHA-256。
- token/lease 不进入 public schema、approval UI、transcript、audit、可复用配置或跨重启持久化。trusted execute 路径内部取得并传递它们。
- permission wait/restart 后重新 preflight；`domainPlanDigest` 相同才可继续既有批准，发生变化必须重新展示真实范围。
- stale/expired token、revision/state/basis 漂移在 effect 前失败，进入 reevaluation；不得在 execute 内静默取得新 token 后继续写。
- 常规写入无需用户交互时仍执行 preflight。token 是并发/范围证据，不等于必须弹权限窗口。

### 7.2 列表与原生 Trash

统一顶层 portable list 上限 100；同 target family 的多个列表规范化、去重后合计不超过 100；Broker expansion 后实际目标也不超过 100。重复是否允许按领域合同决定：related list 可规范化去重，Trash/reveal 的显式重复 ref 必须拒绝。

add/remove 冲突先报 `invalid_request`，不能相互抵消后计数；超限在 write/transaction/reservation 前报 `resource_limited`，不截断、不自动分批。替换现有语义相同的 50-target/10,000-preview 漂移值；content/file/string/payload 内部限制仍按各自领域执行。

`item.addRelated / item.removeRelated` 接受一个 source + `relatedRefs`，不保留 singular alias。验证全部目标，拒绝 self-reference、跨库、inactive/unsupported targets；一个 operation、一份 receipt 和逐 relation 事实；适配层不能循环单条写入后拼回执。

`trash.setItemsState` 接受一个 library 内 1–100 个唯一 regular item/note/attachment refs 和 `trashed | active`。collection、annotation 不作为 target。

| 输入 | 原生语义 |
| --- | --- |
| Trash | 等价 `Zotero.Items.trashTx(ids)`：直接标记显式 targets |
| Restore parent-only | 恢复 parent 和它已 trashed 的直接 notes/attachments |
| Restore parent + 部分 children | 仅恢复 parent 和显式 children |
| Restore child-only | 仅恢复该 child |

Broker 从当前 Host facts 计算 expansion，不调用 Pane、不读 UI selection。preflight 返回显式 refs、展开后的真实改写 refs/count、current revision/state 与 would-change/unchanged。所有目标与 expansion 在一个 Zotero transaction 前验证完，实际改写最多 100；receipt changes 逐项记载真实写入。

删除 `item.remove / notes.remove / attachments.remove` 中重复的 `disposition: trash`。如有保留需求，永久删除必须是独立明确的 irreversible operation，并按既有 exposure 审阅；本票不因此给 Pi 或远程表面新增永久删除授权。

### 7.3 权威结果与取消

| 结果 | 含义与恢复 |
| --- | --- |
| `MutationReceipt: committed` | required effects 完整完成并有权威证据 |
| `MutationReceipt: unchanged` | 权威确认无需变化 |
| `MutationAttemptReport: failed / canceled` | 有完整 rollback/compensation 证据时为 `confirmed_none` |
| `MutationAttemptReport: unknown` | commit/verification/证据持久化不足；`reconcile`，不能声称 rollback 或 success |
| `MutationAttemptReport: repair_required` | 已确认有补偿残留；bounded affectedRefs/residualRefs 与 `manual_repair` |

没有 partial success receipt。列表 mutation 优先一个 Host transaction；跨文件/宿主边界无法事务化时作有界 compensation，残留与不确定结果如实进入 attempt。

事务开始前取消可证明无写入；开始后须等待 Host settle，不能以逻辑 timeout/cancel 提前释放 gate 或伪造无 effect。不能自动给未知写入换 operationId 或 token 重放。

### 7.4 Durable admission、观察与保留

深化 `zoteroHostMutationAuthority.ts`，复用 `pluginStateStore.ts` 的生产 SQLite substrate。Host Bridge 通用 HTTP operation store 不是 canonical mutation authority；两者 ID/结果用途必须分开。

```text
trusted scope + operationId + kind + normalized semantic digest
  -> input/resource validation + private preflight + adapter approval when needed
  -> durable admission (failure => no Host effect)
  -> prepared-plan revalidation + bounded Host effect
  -> authoritative receipt or attempt
  -> durable terminal evidence
  -> return
```

同 identity、同 semantic input 返回既有权威结果或当前运行事实，不能重复 dispatch；不同 semantic input 返回稳定 conflict。持久化 identity/binding 必须早于 first effect；成功 receipt durable 后才能返回 success。commit 后 receipt 写盘失败为 unknown/evidence-persistence failure，不构造跨 Zotero DB 与 plugin DB 的伪事务。

上图描述首次执行路径；已有 identity 应先查询权威 binding/result，不为 replay 再要求原始上传 lease 或重新取得当前 plan。durable admission 必须解决并发 winner，只有 winner 可进入 effect。receipt/admission persistence 不占 Host gate；进入 native critical slice 后须在写入前再次校验 prepared plan 的 revision/state/basis，不能让持久化或 approval 等待形成无保护的 TOCTOU 窗口。

新增只读 canonical observation，并注册 Bridge `mutation.get_operation`；MCP 复用、CLI 提供对应查询。它不调用 execute、不重放、不通过当前 item 内容推断历史成功。

| Observation | 条件 |
| --- | --- |
| `running` | 当前进程确有 live execution |
| `settled` | 已有 receipt 或 attempt；包括 unknown/repair_required |
| `unavailable` | 无可返回证据；从不证明无 effect |
| typed error | storage failure；不能吞成 unavailable |

重启后 durable started 无 terminal evidence 归 unknown，无假 running、无自动 replay。普通 known terminal evidence 默认保留 30 天；unknown/repair_required 不自动按龄删除。清理后 observation 为 unavailable，但永久保留最小 scope/operationId/kind/原 semantic digest：同输入 execute 返回 `outcome_unavailable`，不同输入仍 conflict，旧 identity 永不重新可执行。

同一 Zotero profile 的 Bridge/入站 MCP/CLI 共用稳定 mutation namespace。HTTP requestId、临时 connection、token bytes、导航 scope header 不参与 identity。Workflow 保留显式 caller scope；Pi 将来用 durable owner namespace，Broker 不知道 Pi 产品状态。

取消仍走 AbortSignal；不增加 operationId cancel interface、control registry、cross-consumer pin/ack 或自动 polling/replay/repair scheduler。CLI 现有通用 `operation get` 若仍服务 workflow/maintenance 应保留其职责，另加清晰的 mutation observation command，不能误接为同一个查询。

## 8. 附件 locality 与单篇 ingest

### 8.1 Prepared-file 边界

Host Bridge 上传文件以 opaque `fileId` 进入；adapter 校验 handle、acquire lease 并完成 managed staging，转换为可信私有 prepared-file snapshot。Workflow 本地准备继续通过 `runtimePersistence` 和现有 host adapter；Broker 持有 Zotero mutation、compensation 与 receipt。

public semantic DTO 不能把 arbitrary path、storage path、generic resource ref 或 Bridge file handle 当作 native write authority。prepared path/lease 不进入 DTO、receipt、错误详情、日志或持久化；execute 验证 token 所绑定 size/SHA-256/identity。

- 本地文件 import 使用原生 `importFromFile`，只产生 managed stored attachment。
- `replaceFile` 仅接受 `stored_file / stored_url` target，保持 attachment identity、placement、link mode。
- `linked_file / linked_url / embedded_image` replacement 为稳定 `unsupported_operation`；删除 linked-path source/replacement fallback，不预留 relink mode。
- 只有 authoritative committed/unchanged 后才能 consume upload handle；failure/cancel/unknown 遵循现有 lease/reconciliation，不能把 handle 消失当作写入成功。
- `library.get_item_attachments` 与所有 mutation 附件输出共用 locality projection，只为当前页登记下载 handle；删除 local path，输出 opaque handle 或 unavailable。
- 先验证 companion/source 并 staging，再创建 Zotero attachment；后续复制/清理失败尝试删除本次新建对象，保留原始错误为主错误。

先复用 `hostBridgeFileRegistry.ts` 的 lease API，仅在确有缺口时修改，不能为“形式统一”重建文件 registry。

### 8.2 `literature.ingest` 的实施前决定

必须把现有单篇 ingest 放到 canonical Broker member；不新增 Pi exposure，不恢复 batch ingest/paper.ingest。保留已接受的 typed itemType/fields/creators/identifiers validation 与 DOI field/Extra 规则。

当前实现有 metadata item 成功后 PDF/landing URL best-effort，以及 collection failure 的局部处理；不能直接把旧 `created/existing` 结果包装成“全部 effect 完成”的 canonical receipt。**待冻结项 D3** 必须明确 required effects 与 optional enrichment 的界线（见第 13 节）。同时移除 dedup 的全库 `getAllRegularZoteroItems()` 路径，复用有界 identity/query 读取。

URL 获取、文件准备在 gate 外，最终 Zotero effects 仍由 Broker 收敛；ingest 自己不得成为第二套 identity/receipt/compensation owner。

## 9. Managed Note 与 Literature Artifact

### 9.1 六类 note 与统一实现

类型固定为 `custom / conversation-note / digest / references / citation-analysis / literature-score`；后四项为 Literature Artifact 子集。

| Canonical operation | 目标与语义内容 |
| --- | --- |
| `managed_note.write_custom` | 显式 create-parent 或 update-note；`{ title, markdown }` |
| `managed_note.write_conversation` | 同上；类型必须为 conversation-note |
| `literature_artifact.upsert_digest` | parentRef + digest 单例；`{ markdown }` |
| `literature_artifact.upsert_references` | parentRef + references 单例；canonical Source Reference Artifact |
| `literature_artifact.upsert_citation_analysis` | parentRef + citation-analysis 单例；当前 References 关联与 runtime basis |
| `literature_artifact.upsert_score` | parentRef + literature-score 单例；closed score semantic payload |

一个内部 Managed Note owner 统一识别、normalization、canonical rendering、singleton、payload attachments、derived image、compensation、verification 和 receipt。每次整体写入只有一个 operation identity，包内不能串联 list/create/upsert/cleanup 拼 partial result。

`getNoteDetail` 返回 ordinary/managed discriminated result。managed 分支内联完整 normalized semantic payload，并提供确定的 serialized byte facts，支持下游 50 KiB ToolResult 门禁。超限 typed `resource_limited`，不截断、不分页 payload、不隐式文件化、不回退 raw ordinary HTML。低层 payload reads 如有明确内部消费者可保留，但所有依赖旧 `NoteDetailDto.content` 的消费者必须迁移。

普通 `notes.updateContent` 的 preflight 拒绝所有 Managed Note；ordinary create 拒绝 reserved marker/anchor。失败提供稳定 code、managed type 和 required capability identity。损坏/歧义 Managed Note fail closed，不能伪装 ordinary note。

artifact 单例以 `parentRef + type` 识别：0=create，1=update，>1=conflict/ambiguous_state，无 effect，返回 bounded candidate refs。不得接受 `noteRef` override、选第一个、merge 或自动 Trash duplicates。

custom/conversation 非单例，update 必须 exact type，不能改 type 或移动 parent。conversation 的旧 path/version/format wrapper 在 canonical semantic owner 收敛成 `{ title, markdown }`，调用者不见 storage wrapper。

digest 规范化换行与重复 wrapper heading；create 生成固定标题/readable view/primary payload；update 只改 primary semantic content，保留有效 source metadata、representative image、auxiliary payload。HTML、entry/path/format/anchor/image storage 只在内部。

### 9.2 Source Reference 与 Citation 一起硬切

严格区分：**Source Reference** 是 source item 内尚未完成 canonical identity resolution 的引用事实；**Canonical Reference** 是 Synthesis 归并后的持久身份；**Reference Projection** 是可重建视图；**Source Reference Artifact** 是一篇 source item 的唯一 portable semantic artifact。

建立 versioned、closed/strict-JSON schema。extraction facts、bibliographic description、downstream matching facts 分开；extraction confidence 只能表示抽取证据，人工输入不得伪造。每个概念只有一个字段，无 alias family、unknown spread 或二次静默 quality filtering；不采用完整 CSL-JSON 替代该领域合同。

同一个 artifact 必须贯穿：pinned literature-analysis output → Managed Note primary payload → Broker → import/export → bundle → Synthesis Application。删除 native-array/plugin-wrapper/converted-export 三套形状。

- 每条 Source Reference 使用可信 runtime/producer 生成的 opaque `sourceReferenceId`，不由位置、ref-N、title、DOI、内容 hash 或 Synthesis ID 派生。
- Citation 只引用该 ID；artifact 的 `referencesBasis` 由可信 runtime 对完整 canonical Source Reference Artifact 算 semantic hash，caller 不提交。
- note revision 保持 Broker 外层并发事实；不新增 artifact revision counter/global ID registry。
- `citation.referencesBasis !== currentReferencesBasis` 派生 stale；不持久化 stale flag，不启动自动修复。
- References-only write 保留旧 Citation Note；basis 变化使其不能作当前 Synthesis evidence，失效 citation-role projection，并返回 bounded dependent-stale fact。
- Citation-only write 对当前 References 验证 IDs、计算 basis；private preflight/token 防 call-to-commit TOCTOU，无 earlier-read tracking/provenance 要求。
- trusted workflow、paired import、migration 使用内部 parent-set writer 成组提交，不拼两个 public tools。
- sync 单边先到暂时 stale，另一方匹配后自然恢复。只有重写 Citation、精确恢复匹配 References、显式删除 Citation 才收敛 stale。

完整 Source Reference/Citation 字段布局与正常 rewrite 的 ID 保留规则仍需 D1/D2 冻结。不能把 opaque/non-content-derived identity 本身或已确认的 offline import seam 重新列为未决。

删除 `SynthesisReferenceEntry` duplicate DTO；workflow apply 与 cold Host scan 都向 Synthesis Application 提交完整 artifact，由 Application 唯一投影。同步 TS/Rust strict schema 与实际消费字段；不能在 Pi/MCP adapter 增加 alias normalizer。上游 Skill 与 sidecar 可以协调 change 执行，但未 pin 到同一合同前本票不能完成。

## 10. 显式 Artifact 迁移与 Dashboard

### 10.1 入口、数据与分类

普通 Broker/Workflow/Synthesis/canonical importer 只读新合同，旧 payload 返回 `legacy_artifact_requires_migration`。legacy parsing/classification/conversion 仅在 migration-only module；不作为普通 reader fallback。

Dashboard system navigation 在 Runtime Logs 后永久增加 **Migrations** tab。首项为 Literature Artifact library migration，使用静态对象/list 注册当前可信实现。页面只负责展示元数据、scope、availability、bounded preview/progress/attention/history 与命令路由；不解释 artifact payload。

注册资格必须同时满足：改写用户持有的 durable data，需要显式 scope/scan/preview/confirmed apply，产生 durable auditable receipt，并有可执行的 review/attention/continue UI。排除自动 SQLite/schema/storage/internal-state 升级、cache/index/projection rebuild、ordinary Import、developer/debug/test-only scripts；这些仍归原有 integrity/maintenance/import owner。成功或空扫描不能隐藏整个 Migrations tab，entry 按自己的 availability 展示状态。

打开、渲染、选中、deep-link、notification 只能导航/观察，不能 scan/write。library migration 的 scan/apply/stop/continue 仅限 Dashboard-local；Workflow Host、Bridge、MCP、Pi、CLI 无注册/透传入口。普通 Import 仍为独立用户入口，按第 10.5 节使用隔离 converter，不能向 Workflow 暴露通用 migration command。

每次 library run 仅一个明确 library，默认当前 library 但提供 selector。runtime 绑定 `libraryID`，plan 不混库。只读库允许 scan，affected sets 标 blocked；每 set apply 重新检查 native permission。

迁移单位是 regular parent 的 References/Citation artifact set。References-only 可迁移；有 Citation 时必须与 References 同 plan、同成组提交；library-note citation-only、duplicate、损坏、矛盾、不可写或无法无损表示保持原样。

| Classification | 行为 |
| --- | --- |
| `ready` | 所有 linkage 有确定性唯一证据；仍需用户确认 apply |
| `review_required` | 可以无损转 canonical，但存在 unresolved 或 snapshot recovery；必须 set-level opt-in |
| `blocked` | duplicate/citation-only/损坏/矛盾/不可写/会丢数据等；不能 force apply |

preview 为每 set 提供 bounded verified/unresolved/recovered counts、reason codes 与必要摘要。unsupported/dropped data 必须计数；实际 dropped 非零阻止提交。未选 review set 不写入，并计入 attention。UI 不提供逐 citation mapping editor、fuzzy suggestions 或完整 artifact 编辑器。

### 10.2 确定性 linkage 与 snapshot recovery

匹配顺序：unique shared non-positional legacy identity → unique normalized DOI → unique normalized raw citation → unique normalized title+year+authors tuple。旧 index/position/ref-N 仅候选 locator，必须由上述内容证据确认；`ref_number` 永不作 identity。

仅允许 NFKC、whitespace、DOI wrapper/case、authors array/semicolon 表示、strict integer/string year normalization；禁止 punctuation stripping、year tolerance、token similarity、fuzzy/model matching、cross-parent lookup。

zero match 转 unresolved；multiple match 为 review_required/unresolved；strong identity 与事实冲突为 blocked。不能复用 Synthesis fuzzy matcher 当迁移 fallback。

旧 Citation snapshot 满足 canonical minimum facts、无等价 existing row 且相关证据一致时，可恢复缺失 Source Reference；runtime 分配新 ID，与 basis/linkage 同一 plan；一律 review_required。snapshot 不足转 unresolved，矛盾 blocked；不猜字段/置信度，receipt 单列 recovery count/evidence。

### 10.3 Apply 与清理

当前进程内 preview 是 runtime-owned plan。UI 只能回传 `scanOperationId` 与 runtime-issued candidate IDs 作为选择引用；不能创建 operation/plan/basis authority，不能提交转换后 artifact、mapping 或 legacy input。apply 从可信 plan 取 refs/classification/version/library，再读当前事实。

每个 set 的顺序：校验存在/权限/definition/basis → staging → References/Citation 成组写入 → schema/linkage/basis verification → 清理旧表示 → durable set receipt。visible note HTML 保留，只替换 machine payload 和必要 anchor，不能借迁移覆盖手工编辑。

- basis 变化：无写入 `changed_since_scan`，继续其它 set。
- canonical pair 验证成功后才移除旧 inline payload、Trash 旧用户 payload attachment；不能用 `eraseTx()` 永久删除旧用户数据。
- canonical resolver 排除 deleted/trashed attachment，避免回收站副本形成歧义。
- cleanup 失败：保留 canonical result，set=`repair_required`，run=`completed_with_attention`。
- 意外 DB/transaction/infrastructure failure：run=`failed`；不回滚已独立提交的其它 sets。
- 只有本次失败创建且从未提交的 staging residue 可以永久清理。
- 不建隐藏 backup note/attachment、第二长期 payload、完整内容 receipt 副本或全局 rollback coordinator。

### 10.4 生命周期、历史与 Continue

进程内只允许一个 active scan/apply，多个 Dashboard 订阅同一 snapshot。第二次 start 返回 typed `busy` 与 active run identity，不排队；history/receipt/preview 读取可并发。终态释放内存 gate，无 durable lock，不声称阻止 Zotero Sync 或用户编辑。

Stop 停止领取后续 set；已开始 commit 的 set 完成提交、验证、receipt 后再停。run=`completed_with_attention`，reason=`user_stopped`，报告 processed/remaining。

run 终态只有 `completed / completed_with_attention / failed`。每个 set 完成后立即持久化 result receipt。crash 残留 nonterminal run 仅在用户打开 UI 时归类 `failed: interrupted`，不自动 scan/dispatch/replay。

Continue 生成新的 runtime apply operation。旧 receipt 仅定位 remaining/retry candidates，必须重新读取、分类和校验 basis；需要 review 的变化先展示再确认。**Zotero 重启后必须显式 fresh scan，旧 actionable preview 不可执行**。不实现 paused/continuation_required/reservation/worker replay/scheduler。

durable history 默认不自动删除，仅保存 run envelope 和逐 set refs、basis/hash、classification/outcome、timestamps、counts、bounded diagnostics。run/items list 使用统一 bounded limit、stable ordering、opaque cursor，无 migration-specific 分页策略。

每个记录保存 runtime `migrationId / definitionVersion`。只注册当前实现，apply exact version match；语义变更才升 definitionVersion，非每次插件发版；无 code hash/fingerprint gate。旧定义 receipt 至少显示 common summary，不执行旧代码；不兼容 nonterminal work 以 typed stale-plan/version-mismatch 失败。

没有永久 library-migrated flag、后台全库 scan、watcher、自动 purge/compaction、retention UI 或 Clear history。一次 completed 只证明本次选中 scope，不证明 library 永久没有 legacy。

### 10.5 用户选取的旧文件/bundle

保留一个 Import UI。输入分为 canonical、recognized legacy、unknown/damaged：canonical 进入正常 importer；recognized legacy 先 preview、明确确认，再由同一 migration-only converter 转 canonical；unknown/damaged fail closed。

References-only 可转换，paired References/Citation 必须成组。offline Citation-only 必须先满足目标 parent 已有 canonical References；在此基础上，能建立确定性 mapping，或未证明 linkage 可形成经用户 set-level 接受的 unresolved plan，才可继续。没有 canonical References 的 Citation-only 必须 blocked；这是 Q109 对 offline 输入的明确规则，不放宽 library-note citation-only 的 blocked。

原文件/zip 不覆盖、不删除，不扫描任意文件系统。成功只写 canonical payload；export 只输出新 schema。note/file 两种 adapter 复用同一纯 classifier/converter 及共享行为测试，不复制两套 alias expectations。

## 11. 七项导航与 transport 准入

### 11.1 操作与成功边界

| Broker member / Bridge capability | public input | success |
| --- | --- | --- |
| `focusZotero` / `navigation.focus_zotero` | `{}` | `{ outcome: focus_dispatched }` |
| `selectLibraryView` / `navigation.select_library_view` | 直接 `PortableLibraryViewRef` | `{ outcome: selected, target }` |
| `selectCollection` / `navigation.select_collection` | 直接 `PortableCollectionRef` | 同上 |
| `selectSavedSearch` / `navigation.select_saved_search` | 直接 `PortableSavedSearchRef` | 同上 |
| `revealItems` / `navigation.reveal_items` | `{ items: PortableItemRef[] }` | `{ outcome: revealed, targets }`，保留请求顺序 |
| `openItem` / `navigation.open_item` | 直接 `PortableItemRef` | `{ outcome: dispatched, target }` |
| `openReaderLocation` / `navigation.open_reader_location` | 直接 closed `ReaderLocation` | `{ outcome: reader_location_dispatched, target, location }` |

单目标 input 不加无意义的 target/location wrapper。receipt 不含 window/native row ID、labels、timestamp、完整 view/selection snapshot。navigation 的小型 success DTO 不能混成 durable mutation receipt；Pi 的 started/receipt lifecycle 留给 C07。

Library view 只允许 `library / trash / duplicates / unfiled / retracted / publications`，带 `libraryId`；不收内部 row ID、label、recently_read 或 global feeds。不可用 view 失败，不能退到 library root。Saved Search ref 为 `{ libraryId, key }`，名称不是 identity，numeric search ID 仅在 native 实现解析。

reveal 接受 1–100 个唯一 refs，一个 library，且在一个 view 可共同显示。只允许 bibliographic item/note/attachment，拒绝 annotation/feed；不提升、去重、丢弃或部分选择。

全部 resolve/validate 后才能改 UI。先激活 captured main window 的 Library tab；必要时展开 parent row 保持 exact child。当前 view 能显示全部目标则保留；否则 all-active 用 library root，all-deleted 用 Trash；mixed active/deleted 预先拒绝。仅清理阻塞的 quick-search/tag filters，保留 sort/columns/持久定义。

selectCollection/selectSavedSearch 可清理遮挡目标的临时 collection-tree filter、展开祖先；不改 special-view visibility preferences。四项 Library-pane 操作 await native selection 后只读一次 public pane state，校验 exact row/ref set；无 DOM/private state/polling。reveal 按集合验证，receipt 按请求顺序。

focus 仅 restore/request focus，不切 tab/selection/Reader；六项 content navigation 自带同窗口 restore/focus，无需额外组合 focus。不得声称 OS 已把窗口置前。

`openItem` 调 captured window 的 `ZoteroPane.viewItems()`，保留 native handler dispatch。annotation 由 native path 找 parent/annotationID；文件继续经过 `Zotero.FileHandlers.open`，保留 Markdown probe。native no-op 但正常 resolve 仍为 dispatched，不检查最终呈现、不复制 per-kind dispatcher。

```ts
type ReaderLocation =
  | { kind: "page"; attachment: PortableItemRef; pageIndex: number }
  | { kind: "annotation"; annotation: PortableItemRef }
  | { kind: "epub"; attachment: PortableItemRef; cfi: string };
```

PDF pageIndex 为非负、零基整数；annotation 由 Broker 校验 authoritative parent；EPUB CFI 非空且最多 4096 字符，保持 opaque，不加 parser/regex grammar/dependency。未知字段/variant、kind 不匹配、orphan/不可精确定位 fail closed。

精确 location 只用 captured main window 中的 built-in Reader tab；忽略 external handler 和 `openReaderInNewWindow` preference。仅复用该窗口已有 tab，否则创建该窗口 tab；需处理三个基线中 Reader.open 内部 getMainWindow/global reuse 行为。不能证明 exact target 时直接失败，无其它窗口/default open/location-free fallback。

await Reader initialization 并成功提交 normalized location command 后才返回 dispatched；不 inspect private Reader DOM，不验证像素级视口。`openItem` 的最终内容目的地仍由 native handler 决定，不能把 exact Reader placement 要求误加到它上面。

### 11.2 可信临时窗口与取消

navigation call control 扩展 `WorkflowCallControl`，要求临时 `target.resolveAndValidate()`。在 effect 前重新验证 exact window；resolver 缺失/失效 fail closed。无 public window ID、持久 window ref、per-window Broker 或 ambient fallback。

Bridge/CLI/MCP 在 request admission 时只取一次 `Zotero.getMainWindow()` 并捕获该 window；之后不重定向。该模式不保证 ACP Chat 的 Workspace origin 多窗口语义，须在说明中如实记载。未来 direct Pi Conversation 使用原 turn-origin window；approval UI 所在窗口不是目标。

first UI effect 前取消应无 effect；effect 开始后不能因 signal 变化抛 canceled 或补偿 UI rollback，尽量到达定义的 postcondition/dispatch boundary。无法确认结果由调用方 lifecycle owner 记 unknown，不自动 replay。

所有导航错误 `retryable:false`；顶层沿用 `invalid_request / invalid_ref / not_found / resource_limited / unsupported_operation / unavailable / execution_failed`。unsupported 的 closed reason 包括 `location_unsupported / target_kind_unsupported / view_unsupported`。不要按错误文案匹配；新的显式调用才是下一次尝试。

### 11.3 共用准入规则

保留 master token，scope 只防正常调用路径误用，不宣称对持有 master token 的客户端形成隔离安全边界。

| `X-Zotero-Bridge-Scope` 规范化结果 | Navigation |
| --- | --- |
| 无 header 或 `global` | operator，允许 |
| `acp-chat` | interactive，允许 |
| `acp-skill-run / acp-run / skillrunner-run` | automated，拒绝 |
| 非空 malformed/unknown | invalid，拒绝，不默认 operator |

Host Bridge capability calls、CLI/raw call、MCP tools/list 与 tools/call 共用一份 mapping。MCP 每 request 解析一次 header，无 session store/clientInfo/initialize/params/tool args authority。automated scope 的 list 隐藏 navigation，call 独立 hard-deny。

准入通过且 window 有效的 interactive caller，对这七项 project-owned capability 直接执行，不弹逐次批准；保留 host-control 分类，不扩大成 blanket grant。automated caller 在 approval routing 前拒绝，不可借 prompt 提权。Workflow Host/Pi Skill Run 不获得导航。

Pi 每个 assistant batch 最多一个 navigation 的规则属于未来 C15，不进入 Broker，也不在本票添加 Pi batch 逻辑。

## 12. 文件变更与明确删除清单

下面是实施文件组。新增文件名是建议，除已点名合同/路径外不构成必须建立新模块的要求；能在现有 owner 中实现则复用。

| 文件/目录 | 计划变更 |
| --- | --- |
| `src/modules/zoteroHostCapabilityBroker.ts` | canonical read/page/navigation/mutation composition；删除 legacy exports/branches；共享 Host gate |
| `src/modules/zoteroHostMutationAuthority.ts`、`pluginStateStore.ts` | 持久化 admission/结果/最小过期 identity；只读 observation；私有 plan 与 durable evidence 分离 |
| `src/modules/zoteroLibraryPageQuery.ts` | 复用并扩展真实 source-page 查询；源头预算与 cursor 校验 |
| `src/workflows/types.ts`、`hostApi.ts`、`workflowHostOwners.ts`、`workflowHostContract.ts` | page/ref/receipt/control DTO；显式 V12 projection；删除 navigation/expectedRevision/handler/旧 reference helpers |
| `src/modules/selectionContext.ts`、`src/schemas/selectionContextSchema.ts` | locked canonical selection；删除 rich tree/model |
| `src/modules/acpContextBuilder.ts`、`workflowMenu.ts`、`workflowExecute.ts`、`selectionSample.ts`、`workflowExecution/preparationSeam.ts` | acquisition 收敛；preview/preparation/execute 共用 locked selection |
| `src/modules/hostBridgeWorkflowControl.ts`、`workflowDebugProbe.ts`、`src/workflows/workflowInputPlanning.ts`、相关 compiler/runtime | durable/explicit refs 不回到 raw builder；保留命名任务策略 |
| `src/modules/hostBridgeCapabilityRegistry.ts`、`hostBridgeCapabilityContract.ts`、`hostBridgeServer.ts` | canonical schema/handler 注入、REST reads、新导航准入/窗口捕获、mutation observation |
| `src/modules/hostBridgePermissionManager.ts`、`src/workflows/workflowHostErrorContract.ts` | 七项导航的明确免逐次批准与 automated scope 前置拒绝；V12 删除 navigation 的错误合同 |
| `src/modules/hostBridgeFileRegistry.ts`、`hostBridgePagination.ts` | lease 仅按必要缺口调整；删除 Zotero canonical reads 的二次分页，不影响其它领域分页 |
| `src/modules/zoteroMcpProtocol.ts`、`zoteroMcpServer.ts`、相关 queue/guard | exact mirror、scope list/call、移除 whole-call Host serialization |
| `cli/zotero-bridge/src/{args,commands,contract,client}.rs` | canonical payload/page/navigation/query；operationId 生命周期与稳定重试 |
| Broker 内部 Managed Note 实现（建议 `src/modules/zoteroManagedNotes.ts`） | 一个 semantic reader/writer，六类 note，共享 payload/image/parent-set commit |
| `packages/synthesis-contracts/src/topicDomain.ts`、`packages/synthesis-application/src/referenceProjection.ts`、`packages/synthesis-repository/src/referenceRefresh.ts`、`src/modules/synthesis/libraryAdapter.ts` | 一个 closed artifact、ID/basis、单一 Synthesis projection；删除旧 DTO/alias，保持 repository/application 职责 |
| `native/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs`、`native/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs` 及相关 Rust contract | 与 canonical artifact 同形的读入/投影；不把旧 rawReferenceId/referenceIndex 当 sourceReferenceId |
| `src/modules/synthesis/tagEffectAdapter.ts` | 替换 `handlers.tag.add` 为 canonical mutation |
| `src/workflows/helpers.ts`、`workflows_builtin/literature-workbench-package/lib/**` | 删除 reference alias/render/writer DSL 与重复 note orchestration |
| 显式迁移模块（建议 `src/modules/literatureArtifactMigration.ts`） | 唯一 migration-only converter、current plan、parent-set 生命周期与 durable history |
| `src/modules/taskDashboardSnapshot.ts`、`taskManagerDialog.ts`、`addon/content/dashboard/app.js`、相关样式 | 永久 Migrations tab、本地 actions、shared active snapshot、bounded preview/history |
| `src/modules/harness/dashboardReadonlyModel.ts`、`addon/locale/*/addon.ftl` | 更新只读 projection 和 11 语言 locale，保持无 effect 的 harness |
| `workflows_builtin/**`、受影响 `skills_builtin/**`、`skills_src/**` | 43 项审计闭合；删除 debug migrator；上游 literature-analysis 合同与 pin 协调 |
| `AGENTS.md`、`doc/components/zotero-host-capability-broker-ssot.md`、`doc/components/host-bridge-lifecycle.md`、`doc/host-bridge-cli.md`、相关 selection/note/Workflow/Synthesis 文档 | 同步实际 ownership、scope、回执、删除面；不提前宣称已完成 |
| `skills_src/zotero-bridge-cli/**`、受影响 `skills_src/zotero-library-agent/**`、`profiles_src/hermes/zotero-librarian/**` | 按 manifest ownership 更新确实受影响语义，保留其它指令厚度 |
| `host-bridge/contracts/**`、materialized packages/release set | 确认生成来源后通过治理 renderer/prebuild/release 流程更新，禁止手工改生成物 |
| `openspec/changes/<第 14 节列出的五个 change 名称>/**` | 各自创建 proposal/design/tasks/delta specs，记录依赖与验收；使用 OpenSpec CLI scaffold，不另建汇总 change |

### 12.1 删除 inventory

每项删除前登记 symbol、所有生产 caller、替代接口、稳定测试和受治理语义单元；实际删除清单由所属 change 的 P0 固定，归属见第 14.2 节，不能借本表扩大无关清理。消费者、旧入口与替代行为在所属 change 内一起关闭；P9 仅作跨 change 审计，不接收延后的实现或删除任务。

| ID | 删除对象 | 替代/条件 |
| --- | --- | --- |
| DEL-01 | `LegacyHostBridgeReadProjection`、`injectedLegacyReadProjection`、canonical-to-legacy unsafe casts、直接 read fallbacks | 完整 canonical Broker resolver；缺失/不完整 fail closed |
| DEL-02 | 无其它合法消费者的 `getLegacyZotero* / listLegacyZotero* / openLegacyZotero*` | 按全部 caller 迁移后删除，不保留 alias |
| DEL-03 | `legacyMutations`、`ZoteroHostMutationRequest`、legacy preview/execute types、专属 normalize/execute | canonical operation/receipt/attempt |
| DEL-04 | 旧 `item.updateFields/addTags/removeTags/attachFile`、`note.createChild/update/upsertPayload`、`collection.addItems/removeItems` wire schemas/builders/examples/tests | 对应 Broker canonical operations；raw call 也拒绝旧名 |
| DEL-05 | Zotero reads 的 `paginateCapabilityRows / paginateRequestRows` 路径及全数组/unsafe fallback loops | Broker source pages；非 Zotero 分页按现有领域保留 |
| DEL-06 | legacy selection/current-view helpers、raw rich context/tree、重复 serializers/promotion、production live fallback、旧路径字段 | exact selection + locked refs + named task projection |
| DEL-07 | `lib/sourceSelection.mjs`、`referencesNote.mjs` 未用选择 helper、`lib/runtime.mjs` 旧字段 alias | canonical task DTO |
| DEL-08 | public `expectedRevision`、singular related alias、duplicate Trash disposition、linked-path import/replace authority | private plan、relatedRefs、trash.setItemsState、prepared-file |
| DEL-09 | Workflow Host navigation 全域：type/composition/availability/error/manifest/conformance/spec/tests | 从未发布 V12 移除，不增加兼容模块 |
| DEL-10 | `/context/items/open`、`/context/notes/open`、`/context/collections/open`、`/context/selection/open`（含 Bridge base prefix） | 七项 registry navigation；保留 current/selection reads |
| DEL-11 | CLI `context item/note/collection/selection open` 与 builder/response/card/instruction | `navigation …` → 同一 registry；无 direct-route alias |
| DEL-12 | 包内 list/create-or-update/upsert-payload/duplicate-cleanup 的 note 并行编排 | Managed Note owner；禁止 keep-first+Trash-duplicates |
| DEL-13 | reference normalizers/render/replace public helpers、`referenceModel.mjs`、宽松 import、alias readers、逆向 export shape/year conversion、`SynthesisReferenceEntry` | canonical artifact；legacy 解析仅隔离 migration seam |
| DEL-14 | `src/handlers` public aggregate、`WorkflowRuntimeInfrastructureContext.handlers`、生产 imports/runtime.handlers | 必要 raw primitive 内收到 Broker 实现，不保留领域 DSL |
| DEL-15 | `debug-migrate-note-payloads` workflow/入口 | Dashboard 本地迁移，禁止包装旧 workflow 当 backend |
| DEL-16 | `ZoteroMcpToolCallQueue` 的整调用 Host serialization、相应旧规范断言 | Broker module-level FIFO short slices；transport admission 单独审阅 |

`doc/components/handlers.md` 应删除或合并到新 owner 文档；`result-apply-handlers` 按 spec/其它引用审计，当前不存在同名 `doc/components/result-apply-handlers.md`，不要把猜测路径当现存文件。不要因 dispatch handler 同名而误删 Host Bridge capability handlers。

生成内容包括 `addon/content/help-docs/**`、Host Bridge materialized packages、`profiles/**`、generated deep-reading/topic-synthesis 等，只更新其语义源后按治理生成。不得为满足计数重写无关 Skill prose。

## 13. 实施前须冻结的合同与风险处理

以下不阻塞本文落稿，但相关代码切片必须先有明确合同。

| ID | 缺口/张力 | 必须产出的可审阅决定 | 阻塞 change / 切片 |
| --- | --- | --- | --- |
| D1 | Q103 未给完整 Source Reference/Citation closed 字段布局 | 单一 schema owner、字段表、required/optional/null、版本身份、minimum facts、unresolved 表示、byte facts、正反例；与上游 renderer/TS/Rust 对齐，不推翻已定 ID/basis | 工件：P4/P5/P6 |
| D2 | Q108 后仍未固定正常 References rewrite 的 sourceReferenceId 保留/重发规则 | authoring/import/round-trip 如何区分保留既有 row 与新 row；同 semantic rewrite 保持 basis 的规则；不得按 DOI/title/content hash 猜身份 | 工件：P4/P5/P6 |
| D3 | 现有 ingest 的 PDF/landing/collection best-effort 与 Q92 完整 effect/no partial 有张力 | 明确 required effects 与 optional enrichment；若全 required 则定义 compensation；结果不能掩盖失败，不能直接沿用旧 created/existing envelope | 写入：ingest 的 P3/P7；不阻塞该 change 内已确定的其它任务 |

各 change 的 P0 只冻结自身所需合同，无需等待所有 D 项一起关闭。工程设计记录按 owner 分配：读取负责 opaque cursor 的逐领域 basis/error 与 Host gate；选择负责 exact selection/locked refs；写入负责 operation union/schema 的事实源和生成路径、prepared plan 在 approval wait 中的传递、durable admission/再校验与最小 SQLite layout；工件负责从既有 contract 提取 score 等类型专用 semantic schema，以及 D1/D2；导航负责三版 native API 的 feature detection。共享接口引用前置 change 的决定，不另造框架或复制事实源。

若上述记录改变已确认行为或需要新授权范围，提交具体 DTO/例子后再确认，不能用实现便利取代决策。其余内部函数名、table 名、组件拆分由实现者决定。

三个关键依赖必须单独留证：

- `skills_builtin/literature-analysis` 是外部 submodule，当前 pin 为 `243ca2a63c36165796f8ddffc23f0cc1e4615b6a`；上游 schema/renderer 要与本票一起收敛，发布/push/pin 变更另按授权执行。
- Synthesis contract/runtime 修改不得破坏现有 Application/Repository/Runtime ownership；若 sidecar build identity 变化，需要其既有预构建/发布链，不能仅跑 TS 测试。
- exact Reader window 必须在 7.0.32/9.0.6/10.0.1 有实际 native 证据；无法建立 exact target 的路径按合同失败，不“尽量打开”。本次 `git submodule status` 显示三个参考 gitlink 尚未初始化，因此尚未取得本地 native source/运行证据。P0/P8 需按固定 gitlink 获取主仓源码并核对 API，不初始化无关嵌套 submodule。

V12 当前 conformance 为 23 top-level / 21 nested / 87 callables；单独移除旧四项 navigation 后为 22/20/83，但本票还会替换 reference helpers/投影，因此 **22/20/83 只能是导航删除子步骤的预期值**。最终计数必须从最终批准的显式 member list 重新计算，不能硬套局部数字。

## 14. 五个 OpenSpec change 与实施顺序

五个 change 的切分已经确认。下表短称仅用于本文映射，实际目录使用完整名称；每个 change 各自维护 proposal/design/tasks/delta specs，独立验证、同步与归档。#39 统一追踪整组完成和发布，不再另建汇总 change。

### 14.1 Change 清单与依赖

| 短称 / Change | 完整交付范围 | 前置依赖与退出条件 |
| --- | --- | --- |
| 读取：`canonicalize-zotero-host-reads` | 源头分页、非平凡读取取消、跨实例 Host gate、MCP queue 职责调整、Saved Search discovery；同步 Bridge/MCP/Workflow/CLI 的相关读取消费者，删除对应二次分页和 legacy 回退 | 无其它本票 change 前置。交付页内 hydration、cursor/basis/budget、cancel/FIFO/native settle 证据。exact selected-items 和 current-view 中嵌入 selection 的移除由选择 change 端到端处理 |
| 选择：`canonicalize-workflow-selection` | exact selected-items page、小型 current-view、locked refs、ACP/Workflow acquisition、planner/compiler/runtime/hooks 和内置 Workflow selection 迁移；同步 Bridge REST/registry、MCP、CLI selection/current-view 合同 | 依赖读取的 gate/page/control。四项 selection closure counters 为 0；43 项 inventory 中 debug migrator 的最终入口删除归工件 change，选择 change 须先消除其旧 selection acquisition |
| 写入：`canonicalize-host-bridge-zotero-capabilities` | 保留原名称，聚焦 mutation：全域 preflight、durable identity/receipt/attempt/observation、列表/Trash、prepared-file、ingest；贯穿 Bridge/MCP/CLI/Workflow 与其它写入消费者；删除 legacy mutation 和公开 handler DSL | 依赖读取基础；D3 阻塞 ingest 收口。无 partial receipt，跨 restart/transport/retention 不重复 effect，完整 Broker 注入。此 change 保持现有 Managed Note 任务可运行；六类语义 hard cut 与普通 note 保护在工件 change 随 writer 消费者同时落地 |
| 工件：`canonicalize-managed-literature-artifacts` | 六类 Managed Note、Source Reference/Citation schema/ID/basis、上游 Skill、import/export/bundle、Synthesis 产消链、显式迁移与 Dashboard Migrations；删除旧 reference/payload orchestration 和 debug migrator | 依赖写入基础与 D1/D2 冻结。新 artifact、全部生产者/消费者、library/offline 升级路径共同验收；不能先删除旧 reader，再让另一个 change 补迁移 |
| 导航：`canonicalize-zotero-navigation` | 七项 Broker 导航、可信窗口、scope/approval、Bridge/MCP/CLI 投影；完整删除 Workflow navigation 及旧 REST/CLI open 路径 | 依赖读取基础（含 Saved Search ref/discovery）。exact window/selection/native dispatch、list/call 准入、三版 native 证据完整 |

```text
canonicalize-zotero-host-reads
  +--> canonicalize-workflow-selection
  +--> canonicalize-host-bridge-zotero-capabilities
  |      +--> canonicalize-managed-literature-artifacts
  +--> canonicalize-zotero-navigation

all five verified / synced / archived
  --> issue #39 cross-change acceptance
  --> exact release set + authorized v0.9.0 publication
  --> complete Host Bridge release receipt + source-main finalize
```

读取基础完成后，选择、写入和导航可分别推进。工件 change 内部按 Managed Note、artifact 产消链、migration/UI 拆任务，共同验收；D1/D2 不阻塞其它 change，D3 不阻塞读取/选择/导航。工件与选择会修改同一批 workflow hooks，须同步已落地的 canonical task DTO，不能覆盖彼此改动或恢复 rich selection。

按行为贯穿各层：Bridge/MCP/CLI 的页面、mutation、selection、navigation changes 分别归对应 owner，不建立按 transport 或语言拆分的独立 change。新 member 不自动扩大其它 projection；类型/能力变化须与受影响 caller、schema、tests、语义源同步完成。

### 14.2 删除、共享文件与 specs 的归属

| 删除项 | 负责 change |
| --- | --- |
| DEL-01/02/05 | 读取关闭自己涉及的 read projection、legacy helpers、二次分页；选择关闭 current-view/selection 剩余路径；导航关闭 legacy open helpers。P0 将共享条目细化到 symbol/member，最后一个消费者所属 change 删除空壳，不能留待总验收 |
| DEL-03/04/08 | 写入关闭 legacy mutation types/builders/aliases、expectedRevision、旧 related/Trash/file authority；工件后续切换六类 Managed Note 的 canonical 语义，不恢复旧 transport operation |
| DEL-06/07 | 选择关闭 rich context、live fallback、重复 acquisition/promotion/serializer 和 package selection aliases |
| DEL-09/10/11 | 导航关闭 Workflow navigation、四个 REST route、旧 CLI commands/cards/instructions |
| DEL-12/13/15 | 工件关闭并行 note orchestration、reference aliases/DTO/projection 与 debug migration workflow |
| DEL-14 | 写入将生产 handler consumers 迁到 canonical Broker，内收必要 native primitives，删除 aggregate/infrastructure context 与旧公开 DSL 文档；工件继续消除迁移到 Broker 之后尚存的 package-local note 编排 |
| DEL-16 | 读取移除 MCP 整调用 Host serialization，保留有明确职责的 transport admission/guard |

每项消费者迁移与对应删除都是所属 change 的完成条件。不能以其它 change 尚未完成为由宣布当前范围闭合；仍被其它既有路径使用的共享 symbol 必须明确列出剩余 caller 和负责 change，不新增 alias/fallback 帮当前切片过关。

`zoteroHostCapabilityBroker.ts`、`src/workflows/types.ts`、`hostApi.ts`、`workflowHostOwners.ts`、Bridge registry/contract、MCP/CLI、Broker SSOT 与 governed semantic sources 会被多个 change 修改。共享文件不是单独 change：按成员/行为划分任务；后续实施以已落地前置结果为基线，重新核对 caller 与 conformance，禁止覆盖另一个 change 的投影。

同一主 spec 可以被多个 change 修改不同 requirement。后续 delta 必须基于已同步的最新主 spec；相同 requirement 的修改按依赖顺序收敛，不复制整段旧 requirement，也不由后归档的旧 delta 覆盖前一个结果。P0 在各自 design/tasks 标明共享 requirement 和同步顺序。

每个 change 自行更新它实际影响的文档、受治理语义源、render 结果和 semantic review evidence。总任务保留同一固定治理 baseline，各 change 另记实施基线和删除子清单；最终仍对总 baseline 进行整组 parity，不能逐 change 重置比较基线掩盖累计变薄。

### 14.3 P0–P11 任务归属

P 编号保留为原实施任务的定位索引，**不再表示十二个串行阶段或十二个 change**。每个行为切片先改/扩展已有接口测试，观察失败，再实现和删除旧路径。

| 任务 | 所属 change / 总任务 | 具体输出与完成条件 |
| --- | --- | --- |
| P0 冻结与审计 | 五个 change 各自执行；#39 汇总范围 | 分别用 CLI 创建 scaffold，读取 artifact instructions，形成 proposal/design/tasks/delta specs；冻结自身所需合同，记录基线/caller/result/producer/删除子清单/surface metrics。无全局“等待 D1–D3 全部完成”前置 |
| P1 读取基础 | 读取 | child/collection/Saved Search 源头页；跨实例 gate、readiness/export/translate control、MCP queue 职责；同步适用读取消费者，验证 cursor/budget/cancel/FIFO/页内 hydration |
| P2 选择链 | 选择 | exact selection page 和小 current-view；locked selectionContext；ACP/menu/execute/preparation/sample/Bridge workflow control/planner/compiler/runtime/hook；preview/preparation/execute 同 identity，四项 closure counters 为 0 |
| P3 写入基础 | 写入 | durable authority/observation、全域 private preflight、relatedRefs/100-item limits/Trash、prepared-file、D3 冻结后的 ingest；同时迁移 handler consumers（含 tagEffectAdapter/stored attachment composition）并删除公开 DSL |
| P4 Note/Artifact | 工件 | 一个 Managed Note owner、六类 semantic detail/write、ordinary 保护、singleton、bytes；D1/D2 冻结后的 schema/ID/basis 和内部 parent-set writer；与所有调用者一起切换 |
| P5 产消链 | 工件 | literature Workflow、Skill renderer/pin、import/export/bundle、reference helpers、TS/Rust Synthesis；一个 artifact 与一个 Application projection，删除旧 aliases/duplicate DTO |
| P6 显式迁移 | 工件 | note/file 共用 converter；本地 scan/apply/stop/continue、single-flight/history、Dashboard/locales/deep-link；parent-set verification/Trash/receipt/restart fresh scan，删除 debug migrator，最终 42 个活动 workflow |
| P7 Bridge/MCP/CLI | 按行为分配给五个 change | 读取负责普通 read pages；选择负责 selection/current-view；写入负责 mutation envelope/locality/operationId/query；工件负责新 note/artifact 输入输出与适用投影；导航负责七项 capability/admission。每条路径在其 change 内同步 schema/handler/CLI/consumer 并删除旧名 |
| P8 导航 | 导航 | 七项 native behavior、exact target control、scope list/call、CLI navigation；旧 REST/CLI/Workflow navigation 删除；三版 native 和 no-fallback/no-auto-retry 证据 |
| P9 删除闭合 | #39 总验收 | 汇总各 change 已完成的 DEL-01–16、selection/surface counters、V12 conformance 与 42 个 workflow，核对整组无 Pi 代码、无剩余 legacy。发现遗漏回到负责 change 修复；P9 不承接延后的代码或删除 |
| P10 治理与验证 | 各 change + #39 总验收 | 每个 change 完成自身相关 suites、文档/语义源/render/review 与官方 verify/sync/archive；整组再核对跨 change 行为、full/release gates、总 baseline parity、上游/sidecar/pin、exact prebuild/release inputs |
| P11 正式收口 | #39 发布里程碑 | 五个 change 完成后，用户另行授权提交/推送/发布，执行 exact release set；远端三表面、mutable pointers、v0.9.0、complete receipt、source-main finalize 全部成功后关闭 #39 |

### 14.4 OpenSpec 映射与归档边界

优先修改已有 capability spec，只有没有对应用户/调用者合同才新增。各 change 只修改自身 requirement：

| Change | 主要 specs |
| --- | --- |
| 读取 | `zotero-host-broker-capability-api` 的 pages/gate/read control；`zotero-mcp-concurrency-queue-policy`；read 相关 `zotero-mcp-host-bridge-capability-catalog`、`host-bridge-service`、`host-bridge-output-boundaries`、`host-bridge-file-downloads`、`workflow-host-api-v12`、CLI/agent surfaces |
| 选择 | `selection-context`、`workflow-host-api-v12`、Broker selection/current-view requirement；Bridge workflow/context、MCP/CLI selection 与 affected Workflow contracts |
| 写入 | Broker mutation/observation；`host-bridge-operation-receipts`、`host-bridge-approval-prompts`、`host-bridge-file-downloads`、`host-bridge-cli-literature-ingest`；适用 service/output/MCP/CLI/V12/handler requirements |
| 工件 | Broker Managed Note/Artifact detail/write；note/import/export、Synthesis host artifact/native reference/application specs；新显式数据迁移与 Dashboard Migrations capability specs（无既有对应项时） |
| 导航 | Broker navigation/Saved Search 使用合同；`workflow-host-api-v12` navigation 删除；Bridge service/approval、MCP catalog、CLI interface 与 agent surfaces 的导航 requirements |

不能只追加新 requirement 而保留相反旧条文。普通 reader 自动读取 legacy payload、execute delegates to handlers、V12 暴露 navigation、partial receipt 等条文分别由负责 change 明确替换/删除。

每个 change 的 task 完成条件只包含自身可验收交付、消费者/删除闭合、必要测试与文档/语义审阅。满足后可按官方流程独立验证、同步、归档；不在每个 change 中复制一遍整组 v0.9.0 发布任务。工件 change 必须连同显式迁移入口一起归档，不能用“schema 已完成”代替完整交付。

五个 change 全部归档仍只意味着实施阶段结束。#39 总体验收、整组 release set 和发布 receipt 是另外的完成层次；任何单个 change 的归档都不能解除 Pi 的 #39 前置 gate，也不意味着可单独发布混合合同。

## 15. 验收矩阵与验证命令

### 15.1 稳定行为矩阵

验收归属：读取负责 R1/R3，选择负责 R2/R4，写入负责 M1–M5，工件负责 N1/N2/G1–G4，导航负责 V1–V3。C1/C2 按每个 change 的实际范围分别验证，#39 再做整组闭合检查；同一测试套件可以服务多个 change，无需复制测试文件。跨 change 的回归风险在后续 change 中扩展原有 suite。

| 验收组 | 必须失败/成功的代表行为 | 优先复用测试 |
| --- | --- | --- |
| R1 source pages | 当前页 hydration；无全库 getAll；malformed/query/basis cursor 失败；default/max/ordering | `test/node/core/185-zotero-library-page-query.test.ts`、`test/core/102-zotero-host-broker-capability-api.test.ts` |
| R2 exact selection | child 不提升、UI order、不丢同父 child；跨页 selection/order 变化 basis_mismatch | `102`、`10-selection-context-schema`、`11-selection-context-rebuild`、`59-selection-sample-risk-regression` |
| R3 Host responsiveness | 多实例/表面重入≤1，FIFO、queued cancel、native settle 前不释放；外部工作不占 gate | `102`、`105-zotero-mcp-concurrency-policy`、`101-zotero-mcp-server` |
| R4 locked Workflow | trigger 后改 UI 不影响 preview/preparation/execute；override/durable plan 不被 live 替换；任务策略不变 | `48-workflow-execution-seams`、`173-workflow-input-planning-v2`、相关 Literature/MinerU/Tag tests |
| M1 canonical identity | 缺失/非法 operationId 拒绝；同输入不重复效果，不同输入 conflict；跨 Bridge/MCP/CLI namespace 一致 | Broker `102`、Bridge `107/108`、Rust CLI |
| M2 crash/durability | admission 失败无 effect；commit 后 receipt persist 失败 unknown；restart started 无 terminal unknown；observe 不 execute | Broker interface suite 与既有 persistence tests |
| M3 retention | known evidence 30 天边界；unknown/repair 不龄删；过期同 ID outcome_unavailable、不同输入 conflict | 同 authority/interface suite；可控时钟，不等真实 30 天 |
| M4 Trash/list | parent-only/parent+部分 children/child-only；already state；跨库/重复/101/expansion>100；rollback/cancel/commit | `102` + Zotero 7/9/10 real-runtime |
| M5 file/ingest | trusted lease、source 变化、path 不泄漏、handle consume 时点；required/optional ingest 故障合同 | `138-host-bridge-file-downloads`、`107`、ingest tests、Rust schema_mode |
| N1 Managed Note | ordinary write 保护、reserved marker、0/1/>1 singleton、六类 round-trip、digest auxiliary 保留、oversize 不降级 | `102`、`102-note-payload-codec`、Literature Workbench note tests |
| N2 Artifact/Synthesis | D1/D2 冻结后验证 closed fields 拒 alias/unknown、ID/basis round-trip 与正常 rewrite ID 保留；References-only stale；live/cold 同形；单 Application projection | `232-synthesis-native-reference-canonical-surface`、相关 TS/Rust contract/application tests |
| G1 classifier | deterministic evidence 层级、冲突 blocked、unresolved/recovery opt-in、zero dropped、note/file 同结果 | 优先现有 artifact/import suite；无合适 suite 才新增 migration interface 文件 |
| G2 migration effects | pair verification 前不清理；HTML 保留；旧 attachment Trash；cleanup failure repair；changed_since_scan 无写 | migration interface + real Zotero fixtures |
| G3 lifecycle/UI | multi-window busy、stop-at-set、per-set receipt、crash no replay、restart fresh scan、version mismatch、history bounded | `62-task-dashboard-snapshot`、既有 Dashboard UI/harness tests |
| G4 exposure | mount/select/deep-link 不 scan/write；Workflow/Bridge/MCP/CLI 无 migration entry；Import 无静默 legacy write | Dashboard 与 catalog/interface tests，辅以 registration audit |
| V1 navigation | exact refs、Library-tab activation、filters、public postcondition 一次读、native no-op dispatch、Reader initialized+location accepted | Broker `102`、Bridge `106/107`、真实 native 矩阵 |
| V2 admission/window | missing/global/acp-chat 允许；三个 run kinds/unknown/malformed 拒绝；list 隐藏、call 硬拒；capture 后窗口关闭无 fallback | MCP `101/108`、Bridge `106/107`、Rust CLI |
| V3 Reader fidelity | 目标窗口已有 tab/别窗 reader/new-window pref、Markdown on/off、annotation、CFI 0/4096/4097、unsupported reason | Zotero 7.0.32/9.0.6/10.0.1；不以 fake DOM 代替 native 证据 |
| C1 conformance/deletion | partial broker 无 native fallback；V12 无 navigation/handlers；旧 operation/REST 拒绝；raw call 同样拒绝 | broker harness、`187-workflow-host-contract-governance`、`106/107/108`、CLI |
| C2 governed surfaces | current-state 指令、各层 ownership、schema/CLI 对齐、四个 parity 计数为 0 | `169/170`、既有 surface validators 与语义审阅；不写 prose snapshot tests |

测试断言 stable DTO/code/receipt/identity/effect/locality，不锁完整 error/approval 文案、字段顺序、JSON whitespace、内部 call order、Skill/generated prose。只在现有 interface suite 无法表达稳定行为时新增测试文件；删除旧 shape 测试时补等价用户行为证据。

先更新 `test/helpers/zoteroHostCapabilityBrokerHarness.ts` 的完整 fail-closed broker；缺省成员抛稳定错误，不能 partial object/as any 或默认真实 runtime。CLI schema 验证优先扩展 `cli/zotero-bridge/tests/schema_mode.rs`。Managed Note 消费审计必须同时检查 `getNoteDetail / listNotePayloads / getNotePayload / notes.create / notes.updateContent / notes.upsertPayload` 的直接及结果消费者，不能只统计 import 名称。

### 15.2 命令与证据层次

开发切片先运行受影响的最小 suite；下列是最终实现验收命令，不代表本次文档任务已运行它们：

```text
npm run lint:check
npm run build
npm run test:node:core
npm run test:node:workflow
npm run test:node:ui
npm run test:zotero:core
npm run test:zotero:workflow
npm run test:zotero:ui
cargo test --manifest-path cli/zotero-bridge/Cargo.toml
npm run check:host-bridge-content
npm run check:host-bridge-surface
npm run check:host-bridge-review-mirror
```

`build` 包含 help-doc generation、Synthesis guards 和两套 TypeScript 检查；不能把它当纯只读命令。`test:node:core`/`test:zotero:core` 当前为 lite，不能把 core 通过外推为 UI/Workflow/full/跨版本通过。正式 release 用项目 `test:gate:release`/full 流程，不重复运行已由包装器覆盖的同组测试。

兼容性复用 `test/zotero/compatibility-matrix.json` 和 `test:zotero:compatibility:plan/run/matrix`，保持其中平台与阻塞策略。固定 native 参考 7.0.32、9.0.6、10.0.1；CLI 七平台预构建是另一组证据，不替代 Zotero 行为矩阵。

Synthesis TS/Rust 受影响时使用其既有 `check:synthesis-*`、`test:synthesis-rust-sidecar` 和相关 application/process tests；只有 build/runtime 输入变化才走相应 sidecar prebuild/release。上游 literature-analysis 修改使用该仓声明工具链，不安装新依赖来绕过约束。

五个 OpenSpec change 各自使用官方 verify change skill 核对 implementation/spec/tasks，再按官方 sync/archive 流程关闭。共享 requirement 按第 14.2 节同步顺序处理；`openspec validate` 的结构通过不能替代 implementation verification。任何验证不可运行都记录命令、环境、原因与未覆盖行为，不能填 PASS。

## 16. 受治理表面与发布完成定义

#39 是五个 change 的共同发布与验收总任务。每个 change 负责自身语义源、render/review 与删除证据；正式 release set 只在五个 change 的交付全部收敛后准备、验证和发布。单个 change 可以独立归档，不能用其归档状态声称 #39 或 v0.9.0 已完成。

修改语义源前，按 `host-bridge/surfaces.json` 解析 minimum-core、Generic、Hermes 的真实 composition，记录固定 clean baseline 和每个受影响 materialized SKILL/reference 的 substantive instruction lines、normalized prose characters、明确删除 semantic units。

除 DEL 对应并获批的确切单元外，不压缩、删除、归并、重排或变薄现有指令；新增指令覆盖相称的条件、分支、证据、完成、失败与恢复。正文“删除旧命令”不授权删 notification/watched runs/attention/catalog/maintenance/receipt/Generic Input Planning v2。

实施时使用项目 `host-bridge-semantic-surface-review`、`host-bridge-review-mirror` 与 `host-bridge-release-pipeline`。先语义审阅，再从 sources render，禁止手改 materialized packages。每个包一条规则一个规范 owner；Skill 包只写 current behavior，版本迁移说明放 release notes/面向用户文档。

最终必须报告：

```text
selection:
  unmigrated consumers = 0
  legacy producers = 0
  duplicate Host acquisition = 0
  unauthorized promotion/dedupe = 0

governed surfaces:
  unmapped = 0
  downgraded = 0
  unauthorized dropped = 0
  intra-package duplicate = 0
```

每个 whitelist 限于已审阅的 Broker-private collector、test mock、不可达 deprecated/reference 或命名 task projection。计数只在实际完整审计后填写，不能以局部 rg 无匹配冒充语义 parity。

每个 materialized SKILL/reference 的 substantive instruction line count 不低于 baseline，normalized prose characters 至少为 baseline 95%；同时遵守绝对深度门禁和 warning disposition。数字只发现明显变薄，不能替代逐条 semantic parity。

本票分三种完成状态：

1. **实施可验收**：五个 change 分别验证、同步、归档；整组代码/消费者/删除/文档一致，P9 跨 change 审计与必要回归证据齐全。
2. **发布就绪**：语义审阅、中文 mirror、content/surface gates、exact CLI 七平台 prebuild freshness、必要 sidecar/upstream pin 全部通过，release set 可供审阅。
3. **Issue/release 完成**：另行得到提交/推送/发布授权后，经 dedicated pipeline 发布 exact set；三表面远端验证、mutable pointers、complete receipt、自动 source-main finalize 全部成功，并有 v0.9.0 发布记录。

正式 dispatch 只能执行 `npm run release:host-bridge:dispatch` 指向已经准备好的 exact releaseSetId；失败恢复复用该 identity，不重造集合掩盖失败。完成凭证必须为同一 release set 的 `host-bridge.release-receipt.v2`，`status: complete`。prebuild、render、prepare、CLI 某一平台构建或单个 GitHub workflow success 都不能单独关闭 #39。

GitHub 是正式发布事实源。Gitee 同步不属于本票主线；仅用户当前任务另外明确要求时才执行，不等待 Gitee 来判定正式发布完成。

## 17. 决策来源索引

以下索引覆盖抓取时 #39 的全部 93 条评论；重复项也保留来源，以便实施审阅逐条核对。章节正文已经合并同义要求并落实后续修订，不能把索引中的早期原文重新当成最终合同。

| 序号 | 评论 | 本文落点 |
| --- | --- | --- |
| 1 | [Accepted scope amendment: canonical pagination for every growing read](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5538283396) | §5 |
| 2 | [Accepted scope amendment: canonical cancellation for non-trivial reads](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5539383954) | §5 |
| 3 | [Accepted scope amendment: process-wide Zotero Host short-slice gate](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5539526940) | §5 |
| 4 | [Accepted scope amendment: basis-bound selected-items pagination](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5539600709) | §5 |
| 5 | [Accepted scope amendment: exact selection and one Broker-owned acquisition path](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5540106212) | §6 |
| 6 | [Accepted scope amendment: exact selection and one Broker-owned acquisition path](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5540108564) | §6 |
| 7 | [Accepted scope amendment: hard-cut the Workflow selection model to canonical refs](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5540461199) | §6 |
| 8 | [Q78 implementation appendix: exhaustive Workflow and Skill semantic audit](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5540670059) | §6 |
| 9 | [Accepted scope amendment from #26 Q82: canonical reversible Trash state](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5540931408) | §7–8 |
| 10 | [Accepted scope amendment from #26 Q83: Zotero-native Trash/restore parent-child semantics](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541001422) | §7–8 |
| 11 | [Accepted scope amendment from #26 Q84: bounded native Trash/restore transaction](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541021973) | §7–8 |
| 12 | [Accepted scope amendment from #26 Q85: Trash/restore preflight and preview-token binding](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541066773) | §7–8 |
| 13 | [#39 / C14 决策 Q89：related-items 列表语义下沉到 canonical Broker（已确认）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541229278) | §7–8 |
| 14 | [#39 / C14 决策 Q90：Broker 统一 100-item 顶层列表合同（已确认）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541298197) | §7–8 |
| 15 | [#39 / C14 决策 Q91：revision precondition 收入 Broker 私有 prepared plan（已确认）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541347198) | §7–8 |
| 16 | [#39 / C14 决策 Q92：canonical Zotero mutation 终态不含 partial success（已确认）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541371748) | §7–8 |
| 17 | [#39 / C14 决策 Q94：canonical attachment mutation 不接收未经准备的原始路径（已确认）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541491236) | §7–8 |
| 18 | [#39 / C14 决策 Q95：删除 canonical attachment mutation 的 linked-path 写入语义（已确认）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541535084) | §7–8 |
| 19 | [#39 / C14 决策 Q95：删除 canonical attachment mutation 的 linked-path 写入语义（已确认）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541537874) | §7–8 |
| 20 | [Q97 follow-up：Managed Note canonical hard cut responsibility](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541826840) | §9 |
| 21 | [Q98 follow-up：Managed Note detail 的 canonical inline contract](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541862697) | §9 |
| 22 | [Q99 follow-up：Managed Note canonical operation identities 已固定](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541908569) | §9 |
| 23 | [Q100 follow-up：Managed Note identity 与 duplicate handling](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5541977852) | §9 |
| 24 | [Q101 follow-up：Managed Markdown canonical semantic DTO](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5542007142) | §9 |
| 25 | [Q102 follow-up：digest canonical semantic contract](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5542064550) | §9 |
| 26 | [Q103 follow-up：Source Reference / Citation Analysis canonical hard cut responsibility](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5542647242) | §9 |
| 27 | [补充实现约束：Q104 显式一次性 Literature Artifact migration](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5542798788) | §10 |
| 28 | [补充实现约束：Q105 migration classification](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5542837596) | §10 |
| 29 | [补充实现约束：Q106 Citation snapshot recovery](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5542901522) | §10 |
| 30 | [补充实现约束：Q107 deterministic legacy linkage evidence](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5542934954) | §10 |
| 31 | [补充实现约束：Q108 Source Reference identity / Citation basis / stale lifecycle](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543196129) | §10 |
| 32 | [补充实现约束：Q109 legacy file/bundle import seam](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543242053) | §10 |
| 33 | [实现约束补充：legacy artifact migration 必须可重复、幂等（对应 #26 Q110）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543278858) | §10 |
| 34 | [实现约束补充：迁移旧 payload 必须使用 Zotero Trash（对应 #26 Q111）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543315519) | §10 |
| 35 | [删除范围扩充：移除旧 `src/handlers` 领域 DSL（对应 #26 Q112）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543423913) | §12 DEL-14 |
| 36 | [实现约束补充：migration continuation 使用新 operation + parent-set checkpoints（对应 #26 Q113）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543478164) | §10 |
| 37 | [实现约束补充：review_required 采用 set-level acceptance（对应 #26 Q114）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543514367) | §10 |
| 38 | [UI scope amendment：永久通用 Migrations tab（对应 #26 Q115）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543553112) | §10 |
| 39 | [Migrations registry admission rule（对应 #26 Q116）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543594431) | §10 |
| 40 | [Exposure constraint：Migration commands are Dashboard-local only（对应 #26 Q117）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543611615) | §10 |
| 41 | [Execution constraint：process-wide migration single-flight, no queue（对应 #26 Q118）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543627956) | §10 |
| 42 | [Persistence constraint：receipts are durable history, never current-state SSOT（对应 #26 Q119）](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543662176) | §10 |
| 43 | [Q120 confirmed — migration definition identity and upgrade semantics](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543692569) | §10 |
| 44 | [Q121 confirmed — Zotero library boundary for migration operations](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543776340) | §10 |
| 45 | [Q122 confirmed — apply-time divergence and failure handling](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543790903) | §10 |
| 46 | [Q123 confirmed — durable immutable scan plans and apply binding](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543814770) | §10 |
| 47 | [Q124 confirmed — trusted built-in migration registry only](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543827813) | §10 |
| 48 | [C14 implementation closeout — avoid migration-framework overbuild](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5543869905) | §10 |
| 49 | [Scope amendment from C15/Q125 — complete canonical navigation and remove Workflow Host navigation](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548302680) | §11 |
| 50 | [Navigation amendment from C15/Q126 — explicit turn-origin window targeting](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548315644) | §11 |
| 51 | [Canonical navigation detail from C15/Q127 — closed library-view kinds](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548368357) | §11 |
| 52 | [Canonical capability amendment from C15/Q128 — Saved Search discovery and stable identity](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548425784) | §11 |
| 53 | [Canonical navigation detail from C15/Q129 — exact bounded item reveal](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548444982) | §11 |
| 54 | [Canonical navigation detail from C15/Q130 — bounded view fallback for reveal](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548452463) | §11 |
| 55 | [Canonical navigation detail from C15/Q131 — native default open with Markdown interception](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548549724) | §11 |
| 56 | [Navigation amendment — `openItem` success is dispatch-level](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548565720) | §11 |
| 57 | [Navigation amendment — Broker owns the portable Reader-location union](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548577188) | §11 |
| 58 | [Navigation amendment — portable `ReaderLocation` fields fixed](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548588558) | §11 |
| 59 | [Navigation amendment — `openReaderLocation` targets only the built-in Reader](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548595154) | §11 |
| 60 | [Navigation amendment — `openReaderLocation` success threshold](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548600339) | §11 |
| 61 | [Navigation amendment — transient collection-tree filter handling](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548610415) | §11 |
| 62 | [Navigation amendment — transient item-filter handling for `revealItems`](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548626874) | §11 |
| 63 | [Navigation amendment — `focusZotero` is a window-only effect](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548639309) | §11 |
| 64 | [Navigation amendment — navigation foregrounds the bound window](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548649287) | §11 |
| 65 | [Navigation amendment — verify selection postconditions](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548655606) | §11 |
| 66 | [Navigation amendment — minimal success receipts](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548671078) | §11 |
| 67 | [Navigation amendment — use the generic Broker error taxonomy](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548700145) | §11 |
| 68 | [Navigation amendment — no automatic retry](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548743280) | §11 |
| 69 | [Navigation projection amendment — one navigation call per Pi batch](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548757956) | §11 |
| 70 | [Navigation amendment — permission continuation cannot retarget the window](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548764218) | §11 |
| 71 | [Navigation amendment — origin window is supplied through trusted call control](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548771195) | §11 |
| 72 | [Navigation amendment — cancellation boundary](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548781626) | §11 |
| 73 | [Scope amendment — Host Bridge/CLI/MCP navigation uses trusted caller admission](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548870771) | §11 |
| 74 | [Scope amendment — no delegated credential system for navigation](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548891398) | §11 |
| 75 | [Navigation amendment — Host Bridge target-window capture](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548907374) | §11 |
| 76 | [Navigation amendment — no per-call approval for eligible interactive principals](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548924367) | §11 |
| 77 | [Scope/deletion amendment — one navigation registry for Host Bridge, MCP, and CLI](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548931325) | §11 |
| 78 | [Navigation amendment — closed caller-scope mapping](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548944207) | §11 |
| 79 | [MCP navigation amendment — scope comes from `X-Zotero-Bridge-Scope`](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548951723) | §11 |
| 80 | [MCP amendment — request-header scope only](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548955714) | §11 |
| 81 | [Broker navigation Q153 mirror — annotation opening](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548972536) | §11 |
| 82 | [Broker navigation Q154 mirror — native no-op semantics](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548979185) | §11 |
| 83 | [Broker navigation Q155 mirror — `revealItems` target domain](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5548995177) | §11 |
| 84 | [Broker navigation Q156 mirror — EPUB CFI validation](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5549013092) | §11 |
| 85 | [Broker navigation Q157 mirror — Reader placement](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5549026231) | §11 |
| 86 | [Broker navigation Q158 mirror — `openItem` window boundary](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5549032559) | §11 |
| 87 | [Broker navigation Q159 mirror — Library-tab activation](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5549039060) | §11 |
| 88 | [Broker navigation Q160 mirror — C15 adds no second navigation layer](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5549050910) | §11 |
| 89 | [Broker navigation Q161 mirror — Pi/transport input projection](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5549062517) | §11 |
| 90 | [Scope amendment from C19 Q207–Q209 — durable read-only mutation observation](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5551447861) | §7.4 |
| 91 | [C19 Q210–Q212 — mutation observation, durability and retention](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5551463843) | §7.4 |
| 92 | [C19 Q213–Q214 — expired operation identity and observation projections](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5551485460) | §7.4 |
| 93 | [C19 Q222 — stable mutation namespace for execution and observation](https://github.com/leike0813/zotero-agents/issues/39#issuecomment-5551555870) | §7.4 |

补充来源：[Q103 完整领域定义](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5542640534)、[Q108 identity/basis 细则](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5543196139)、[C14 closeout 对 Q123/Q124 的明确修订](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5543869931)。
