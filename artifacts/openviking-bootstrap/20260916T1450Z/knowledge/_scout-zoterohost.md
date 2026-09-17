# Zotero 宿主能力边界与持久化 —— 只读侦察报告

范围：`src/modules/zoteroHostCapabilityBroker.ts`（18,546 行）、`src/modules/zoteroHost/`（9 文件，6,900 行）、`src/modules/pluginStateStore.ts` + `pluginStateStore/`（5 文件）、`runtimePersistence.ts`、`runtimeLogManager.ts`、`runtimePersistenceGovernance.ts`、`zoteroHostMutationAuthority.ts`、`guardedSqlite.ts`、`preferenceScript.ts`。

方法：只读。使用了 `rg`、`wc`、`sed -n`、`read`，以及对本文件的顶层声明索引（`rg '^(export\s+)?(default\s+)?(async\s+)?(abstract\s+)?(declare\s+)?(class|interface|type|enum|function|const|let|var)\s'` 得到 438 个顶层声明，再用相邻行号差定位巨型函数）。未修改任何文件、未执行 git 写操作、未安装依赖、未运行构建或测试。未使用 `codegraph explore`（`rg` + 定向 `read` 已足够定位全部结论，且避免一次性拉入 18k 行源码）。

**对任务描述的三处更正（均为事实差异，非判断）**

1. 任务写 `src/modules/pluginStateStore/`（5 文件），实际**入口是单文件** `src/modules/pluginStateStore.ts`（1,129 行，持有 adapter、schema 初始化、迁移与全部导出），`pluginStateStore/` 目录里只有 5 个表定义/工具文件：`core.ts`(70)、`taskTables.ts`(1167)、`runTables.ts`(629)、`mutationAuthorityTable.ts`(228)、`literatureMigrationTables.ts`(419)。
2. 任务提到 `src/modules/runtimeLog*.ts`，实际**只有** `src/modules/runtimeLogManager.ts`（2,279 行），没有 `runtimeLog/` 目录或第二个 `runtimeLog*.ts`。
3. 任务列出的 `tests/core/`、`tests/node/core/` **在本仓库不存在**（`ls -d tests/core` → No such file or directory）。测试按主题分目录：`tests/zotero-host/`、`tests/runtime/`、`tests/tooling/`、`tests/workflows/`、`tests/zotero/core/{lite,full}/` 等。项目根 `AGENTS.md` 的目录结构章节仍写着 `tests/core/`（~100+ 测试文件）与 `tests/node/core/`，属于**文档漂移**。

---

## 1. 职责与边界

### 1.1 作为"语义唯一事实源"覆盖的能力域

唯一权威定义处：`src/modules/zoteroHostCapabilityBroker.ts:529-762`（`export interface ZoteroHostCapabilityBroker`）。按该接口的域划分：

| 域 | 成员数 | 行号 | 语义 |
| --- | --- | --- | --- |
| `context` | 2 | `:530-536` | `getCurrentView()`（同步）、`getSelectedItems()`（分页，绑定 captured window） |
| `navigation` | 7 | `:537-563` | `focusZotero` / `selectLibraryView` / `selectCollection` / `selectSavedSearch` / `revealItems` / `openItem` / `openReaderLocation` |
| `library` | 16 | `:564-646` | `listItems`/`traverseItems`/`listCollections`/`listSavedSearches`/`syncSnapshot`/`cancelSnapshot`/`readinessAudit`/`getArtifactReadiness`/`getItemDetail`/`getItemAuditState`/`getItemNotes`/`getNoteDetail`/`listNotePayloads`/`getNotePayload`/`listAnnotations`/`exportPortableItems`/`exportAnnotations`/`getItemAttachments` |
| `metadata` | 1 | `:647-652` | `translateIdentifier`（Zotero translator 调用 + 结果收敛） |
| `bibliography` | 1 | `:653` | `WorkflowBibliographyOwner`（直接转发，非自建） |
| `mutations` | 3 | `:654-670` | `getOperation` / `preview` / `execute`（canonical mutation 统一入口） |
| `statusTags` | 2 | `:671-678` | `getPolicy`（内置状态策略）、`transition` |
| `notes` | 4 | `:679-700` | `create`/`updateContent`/`remove`/`upsertPayload` |
| `managedNotes` | 2 | `:701-712` | `writeCustom` / `writeConversation` |
| `literatureArtifacts` | 4 | `:713-734` | `upsertDigest`/`upsertReferences`/`upsertCitationAnalysis`/`upsertScore` |
| `attachments` | 5 | `:735-761` | `create`/`updateMetadata`/`replaceFile`/`move`/`remove` |

Managed Note 六类语义固定在同一处：`src/modules/zoteroHost/zoteroManagedNotes.ts:41-51`（`MANAGED_NOTE_PAYLOAD_TYPES`：custom / conversation-note / digest / references / citation-analysis / literature-score），schema 版本表在 `:52-61`。

### 1.2 明确不负责什么

| 边界 | 证据 |
| --- | --- |
| **不负责 authorization / permission / exposure / noninteractive policy** | 本文件 18,546 行 `rg 'permission|authoriz|approval'` 无策略实现；权限清单在 `src/modules/hostBridge/permissions/hostBridgePermissionManager.ts:32`，能力清单在 `src/modules/hostBridgeCapabilityRegistry.ts`（3,052 行，`capability("library.get_item_attachments", …)` 在 `:2679`） |
| **不负责 transport** | broker 内无 HTTP/socket/MCP 引用；MCP 有自己的 admission（`src/modules/hostBridge/mcp/zoteroMcpServer.ts:91` `inflightLimit: 9`，`:238` `DEFAULT_TOOL_INFLIGHT_LIMIT = 9`） |
| **不负责 attachment remote locality** | descriptor 投影在 Host Bridge：`src/modules/hostBridgeCapabilityRegistry.ts:473-503` 用 `const { path: _path, ...safeAttachment } = attachment` 删除本地路径，输出 `access.mode: "bridge-download" \| "unavailable"`；`library.get_item_attachments` 与 mutation 输出共用同一投影（`:669`、`:693`、`:752`、`:1221`、`:2642`） |
| **不持久化自身状态** | 本文件 `rg 'pluginStateStore'` 零命中；durable 记录经 `src/modules/zoteroHostMutationAuthority.ts:32` 引入 state store |
| **不自己选文件系统 adapter** | 本文件只 import `runtimePersistence` 的 `copyRuntimeFile / ensureRuntimeDirectory / getRuntimePersistencePaths / readRuntimeBytes / removeRuntimePath / statRuntimePathStrict / runtimePathExists / writeRuntimeBytes`（`:220-229`） |
| **公共 DTO 不接受 native 对象** | `assertPortableRef`（`:2965-3012`）要求 ref 恰为 `{key, libraryId}` 且 `key` 匹配 `/^[A-Z0-9]{8}$/`；`isRawZoteroItem`（`:1180`）只在内部判定 |
| **不拥有 Workflow Host 投影** | `WorkflowHostApi` 经 `Pick` 投影，不在本文件；`src/workflows/hostApi.ts` 是 v12 adapter |

---

## 2. 18,546 行单文件的结构剖析（只描述事实）

### 2.1 体量与密度

- 18,546 行；**438 个顶层声明**（class 2、interface 1、其余为 type/const/function/let）；`export` 前缀 48 处；`async function` 98 个；`rg '^\s*switch \('` 8 处；`capabilityError(` 调用 303 处；`withZoteroHostSlice(` 调用 240 处；`mapZoteroHostTargets(` 调用 10 处。
- 只有 2 个 class：`ZoteroHostCapabilityError`（`:462`）、`ZoteroManagedArtifactDiagnostic`（`:494`，非导出）。

### 2.2 声明密度按 1000 行分段（顶部声明数）

```
    1- 1000 : 70      6001- 7000 : 11     12001-13000 : 20
 1001- 2000 : 64      7001- 8000 : 17     13001-14000 :  7
 2001- 3000 : 39      8001- 9000 : 21     14001-15000 : 13
 3001- 4000 : 39      9001-10000 : 13     15001-16000 : 21
 4001- 5000 : 23     10001-11000 :  2     16001-17000 : 33
 5001- 6000 : 16     11001-12000 :  3     17001-18000 : 19
                                          18001-19000 :  7
```

两个低密度带（`10001-11000` 仅 2 个、`11001-12000` 仅 3 个顶层声明）对应整段单函数体。

### 2.3 逻辑区块（按行号区段；★ 为超长函数）

| 区段 | 内容 | 关键符号 |
| --- | --- | --- |
| `:1-262` | 导入 + 再导出 + 内部 scope 类型 | `ZoteroHostNoteMutationCallerScope`(`:247`) |
| `:264-527` | 公共 DTO 与错误类型 | `ZoteroHostItemSummaryDto`(`:264`)、`ZoteroHostCapabilityError`(`:462`) |
| `:529-762` | **broker 接口全量定义** | `ZoteroHostCapabilityBroker` |
| `:764-843` | 私有 prepared mutation 品牌类型与进程内控制表 | `PreparedCanonicalMutation`(`:783`)、`canonicalMutationControls` WeakMap(`:840`) |
| `:845-1063` | 各种预算常量 + snapshot 运行时/会话类型 | `SUMMARY_TEXT_LIMIT`(`:845`)、`LIBRARY_LIST_LIMIT_*`、`snapshotSessions`(`:1040`) |
| `:1064-2219` | **canonical 读取与序列化**（读侧 DTO 构造） | `canonicalCategory` 系列（`:1388-2219`）、`serializeZoteroItemSummary`(`:1300`) |
| `:2222-2625` | metadata translate（标识符归一化、translator 选择、候选收敛） | `normalizeMetadataRequest`(`:2298`)、`boundedMetadataResult`(`:2464`) |
| `:2627-2960` | 源端分页读取与子项/注解/集合序列化 | `serializeLibraryItemSummary`(`:2638`)、`queryZotero*Page` 包装 |
| `:2963-3333` | portable ref 校验 + 字段/标签/内容入参归一化 | `assertPortableRef`(`:2965`)、`validateFieldPatch`(`:3098`) |
| `:3335-3910` | note 创建域请求解析、payload 类型/格式归一化、图片 slot | `resolveNoteCreateRequest`(`:3339`)、`normalizePayloadFormat`(`:3638`) |
| `:3913-4395` | literature ingest 入参归一化 + PDF 探测 | `normalizeLiteratureIngestPaper`(`:3913`)、`itemHasPdfAttachment`(`:4321`) |
| `:4396-4706` | ingest identity 查询构造（原生 Search 编译 SQL） | `buildCanonicalIngestIdentityQuery`(`:4432`) |
| `:4706-5072` | ★ `executeCanonicalLiteratureIngest`（含事务内 identity/revision 复核） | 4,706-5,072 |
| `:4998-5425` | payload hash / inline payload 剥离 | `logicalPayloadHashFromBlock`(`:4998`)、`semanticPayloadHashFromPayload`(`:5045`) |
| `:5425-6190` | canonical mutation 公共入参校验、collection membership 目标解析 | `normalizeItemUpdateMetadataRequest`(`:5451`)、`resolveCollectionMembershipTargets`(`:5981`) |
| `:6100-6354` | canonical related mutation（配对关系）准备 | `prepareCanonicalRelatedMutation`(`:6191`) |
| `:6354-7008` | ★ `executeOtherCanonicalMutation`（单条巨型 operation switch，`:6389` 起 13 个 case 分支） | 6,354-7,008 |
| `:7008-7312` | ★ `executeDestructiveCanonicalMutation` | 7,008-7,312 |
| `:7312-7360` | canonical operation 白名单 | `CANONICAL_MUTATION_OPERATIONS`(`:7312`) |
| `:7360-7875` | managed semantic 请求归一化 + 错误映射 | `normalizeManagedSemanticRequest`(`:7547`)、`mapManagedOwnerError`(`:7472`) |
| `:7875-8165` | ★ `executeCanonicalMutationEffects` | 7,875-8,165 |
| `:8165-8497` | ★ `executeManagedSemanticMutationEffects` | 8,165-8,497 |
| `:8497-8600` | AJV 输入校验器 + 破坏性 preview 判定 | `validateCanonicalMutationExecuteInput`(`:8517`) |
| `:8598-8855` | trash mutation 准备 + 实体 observation 采集/断言 | `prepareCanonicalTrashMutation`(`:8598`)、`assertCanonicalMutationObservations`(`:8798`) |
| `:8857-9207` | ★ `preflightItemUpdateMetadataDomain`；`:8912` `preflightCanonicalMutationDomain` | 8,857-9,207 |
| `:9207-9334` | ★ `preflightCanonicalMutationForPublicSurface` | 9,207-9,334 |
| `:9334-9711` | ★ `createCanonicalMutationControl`（prepare/execute 双阶段私有控制面） | 9,334-9,711 |
| `:9711-9800` | `getZoteroHostCanonicalMutationControl` + migration cleanup 辅助 | `:9711` |
| `:9818-10077` | legacy migration cleanup plan 归一化 | `normalizeLegacyMigrationCleanupPlan`(`:9835`) |
| `:10077-11880` | ★★ `executeManagedParentSetMutation` —— **1,804 行单函数**，占全文件 9.7%；带 26 个嵌套 `const` 箭头局部函数 | 10,077-11,880 |
| `:11882-12120` | managed owner 调用包装、错误转换、note 版本 | `callManagedOwner`(`:11882`)、`canonicalNoteResult`(`:12104`) |
| `:12124-12498` | logical payload 请求归一化、native attachment 暂存 | `normalizeLogicalNotePayloadRequest`(`:12129`)、`generateNativeAttachmentKey`(`:12290`) |
| `:12498-13203` | ★ `resolveNoteImageBindings`（图片 slot 落盘、staging） | 12,498-13,203 |
| `:13203-13905` | ★ `executeAttachmentMutation` | 13,321-13,905 |
| `:13905-14061` | mutation preview 计划构造（含 `mutationPreviewTargetLimit = 10_000`） | `buildItemChangeTypePreview`(`:13907`) |
| `:14061-14421` | 私有 prepared mutation TTL 表、prepared scope | `PRIVATE_PREPARED_MUTATION_TTL_MS`(`:14061`)、`preparedMutationScope`(`:14063`) |
| `:14339-15050` | ★ `canonicalMutationPreviewFacts`(`:14421`) + `previewCanonicalMutation`(`:14749`) + `publicCanonicalLiteratureIngestPlan`(`:14385`) | 14,339-15,050 |
| `:15050-15340` | 集合路径/分页读取/遍历与 completion evidence | `canonicalCollectionPath`(`:15077`)、`traversalEvidenceRegistry`(`:15224`) |
| `:15340-15545` | ★ `traverseLibraryItems` 与预算校验 | 15,340-15,545 |
| `:15545-16130` | snapshot 会话（创建/续页/取消/清理） | `snapshotSessionOrThrow`(`:15823`)、`cancelLibrarySnapshot`(`:15879`) |
| `:16130-16460` | 当前视图来源读取与其 library 判定 | `serializeSelectedSource`(`:16196`)、`getCurrentView`(`:16411`) |
| `:16460-17160` | ★ 七个 navigation 实现（窗口捕获、树选择断言、Reader tab） | `navigationWindow`(`:16555`)、`openReaderLocation`(`:16892`) |
| `:17160-17704` | **`createZoteroHostCapabilityBroker` 投影工厂**（公开对象字面量） | `:17219-17683` |
| `:17705-17860` | 取消检查 + **进程级 Host slice 闸门** | `throwIfWorkflowCallCanceled`(`:17705`)、`withZoteroHostSlice`(`:17779`) |
| `:17860-18546` | tail 辅助：`getCanonicalItemNotes`(`:17863`)、note payload/managed detail 富集 | `canonicalPayloadSummary`(`:18072`) |

### 2.4 可指出的事实

1. **一个 1,804 行单函数**（`:10077-11880`）承载 managed parent-set 全流程；它内部有 26 个缩进 2 空的 `const` 箭头函数，没有任何顶层声明。
2. **巨型 operation switch 有两处**：`:6389`（`executeOtherCanonicalMutation` 内，覆盖单条 canonical 写操作的 13 个分支）与 `:14529`（preview 分支）；另有 `:7402`、`:8689`、`:14343` 三处较小的 switch。
3. **重复模式**：`capabilityError(code, msg, {...})` 303 处调用、`strictJsonObject({...})` 21 处直接包裹 mutation `result`、`withZoteroHostSlice(control, …)` 240 处，是三类高度重复的横切样板（**只陈述重复事实**）。
4. **声明密度前重后轻**：`:1-4000` 有 212 个顶层声明（DTO/序列化器/校验器），`:10001-12000` 只有 5 个。
5. **内嵌 base64 资源**：`:851-854` 内联两个 PNG base64 常量（payload 占位图），是本文件最长的物理行。
6. **domain 混杂**：同一个文件同时持有 metadata translate、literature ingest（含 SQL 构造）、managed note 六类语义、attachment 文件 staging、navigation 窗口捕获、snapshot 会话簿记、mutation preview/execute 双阶段控制面；`src/modules/zoteroHost/` 的 9 个文件只覆盖其中 6 个横切面（page query / payload codec / prepared files / native mutations / trash / managed notes / readiness），其余全部留在主文件。

---

## 3. 公共输入输出契约

### 3.1 JSON-safe 约束

| 层 | 实现 |
| --- | --- |
| 契约源 | `src/workflows/workflowHostErrorContract.ts:309-376` `assertWorkflowHostStrictJsonValue(value, bounds)` |
| 默认上限 | `:173-175` `DEFAULT_MAX_DEPTH = 32`、`DEFAULT_MAX_COLLECTION_ENTRIES = 10_000`、`DEFAULT_MAX_STRING_CHARACTERS = 1_000_000` |
| 拒绝项 | 非有限 number、超深、超集合上限、超长 key/string、循环引用、原型非 `Object.prototype`/`null` 的"类实例"（`:358-361`） |
| broker 内封装 | `assertJsonValue`(`:1115`)、`strictJsonObject`(`:1122`) 两个薄包装 |
| 调用点分布 | 入参侧：`:2136`、`:3656`、`:5542`、`:6378`、`:7536`、`:8188`、`:8508`、`:8621`、`:9808`、`:10120`、`:12746` 等；出参侧：mutation `result` 的 21 处 `strictJsonObject({...})`（`:8482`、`:10093`、`:12880`、`:13071`、`:13098`、`:13187`、`:13274`、`:13348`、`:13568`、`:13658`、`:13713`、`:13859`、`:13889`、`:14533…14725`）、note payload(`:17636`、`:18318`)、managed detail 富集结果(`:18043`) |
| 计数 | 本文件 `assertWorkflowHostStrictJsonValue` 直接调用 15 处；`zoteroHostMutationAuthority.ts` 2 处；`zoteroManagedNotes.ts` 3 处 |
| 读侧 DTO 的 JSON-safe | 多数由构造保证而非断言：`trimText(value, limit)`(`:1093`)、`escapeAttribute`(`:1101`)、`SUMMARY_TEXT_LIMIT=300`/`FIELD_TEXT_LIMIT=4000`/`NOTE_TEXT_LIMIT=4000`(`:845-847`)。`listLibraryItems`(`:14960`) 路径上**没有**显式 `assertJsonValue`，靠 `serializeCanonicalItemSummary` 字段截断保证 |
| 错误详情 sanitize | `sanitizeDetails` + `assertWorkflowHostErrorDetails`（`workflowHostErrorContract.ts:443`、`:540-541`）；`sanitizeWorkflowHostDetailToken`(`:378`) 与 `BOUNDED_DETAIL_TOKEN_LENGTH = 128`(`:176`) 约束自由文本 token |

### 3.2 `ZoteroHostCapabilityError` 结构

定义 `src/modules/zoteroHostCapabilityBroker.ts:462-482`：

- `code: ZoteroHostCapabilityErrorCode` = `WorkflowHostErrorCode`（`:460`），共 **11 个码**：`invalid_request / invalid_ref / not_found / unsupported_operation / interaction_required / permission_denied / resource_limited / conflict / unavailable / canceled / execution_failed`（`src/workflows/workflowHostErrorContract.ts:11-22`）。
- `retryable: boolean`：**不是调用方自由传入**。构造时经 `createWorkflowHostErrorData`（`:535-554`），只有 `options.retryable === true` 且（`code === "unavailable"` 或 `code === "execution_failed"` 且 `recovery === "retry_same_operation"`）时才为 `true`（`:542-547`）。
- `details`：按 code 分别定型的严格结构（`:52-157`）。每码有白名单键集合 `DETAIL_KEYS`（`:207-224`）与枚举白名单 `ENUMS`（`:226-301`）。例如 `resource_limited` 的 `resource` 只能是 12 个枚举值之一（`:97-113`），`conflict.reason` 6 个枚举值（`:114-120` + `:267-274`）。
- `schema: "zotero-agents.workflow-host-error.v1"`（`:8-9`、`:463`）。
- broker 内便捷构造器：`capabilityError`(`:1127`)、`invalidRefError`(`:1136`)、`notFoundError`(`:1144`)、`navigationUnavailableError`(`:1154`)。
- 另有**非公共**诊断类型 `ZoteroManagedArtifactDiagnostic`(`:494-507`)，注释 `:488-493` 明确说明它刻意不进 11 码 taxonomy（`invalid_artifact` / `legacy_artifact_requires_migration`）。

### 3.3 分页读取的默认与上限

| 位置 | 值/行为 |
| --- | --- |
| `zoteroHostCapabilityBroker.ts:855-856` | `LIBRARY_LIST_LIMIT_DEFAULT = 25`、`LIBRARY_LIST_LIMIT_MAX = 100` |
| `zoteroHost/zoteroLibraryPageQuery.ts:5-6` | `DEFAULT_LIMIT = 25`、`MAX_LIMIT = 100`（底层 SQL 分页独立常量） |
| 生效逻辑 | `zoteroLibraryPageQuery.ts:446-461` `normalizeLimit`：`maxLimit = positiveInteger(options.maxLimit) || MAX_LIMIT`；`observed > maxLimit` → 抛 `ZoteroLibraryPageLimitError`(`:105-115`) |
| broker 调用点 | `:14911-14912`（`listItems`，`Math.min(100, Math.max(1, limit || 25))`）、`:14938-14939`、`:14997-14998`、`:16303-16306`（selected items，同规则） |
| 分页实现 | keyset 分页：`limit+1` 探测（`zoteroLibraryPageQuery.ts:34` `limitPlusOne`）、游标 `LibraryCursorV1`(`:87-91`) 绑定 `criteriaHash`；`CursorError`(`:93`)、`CriteriaError`(`:117`) |
| 其他预算 | `TARGET_LIMIT_MAX = 50`、`TAG_LIMIT_MAX = 100`、`TAG_TEXT_LIMIT = 200`(`:862-864`)；`SNAPSHOT_CAPTURE_PAGE_SIZE = 100`(`:987`)；`METADATA_TRANSLATOR_LIMIT = 32`、`METADATA_CANDIDATE_LIMIT = 64`、`METADATA_RESPONSE_BYTE_LIMIT = 4 MiB`(`:2225-2229`)；`mutationPreviewTargetLimit = 10_000`(`:13905`) |
| ingest identity 上限 | `:4564-4573` `if (ids.length > 25) throw resource_limited {resource:"items", limit:25}` |

---

## 4. 并发闸门（进程级 FIFO Host 短片段 admission）

### 4.1 实现位置与状态

`src/modules/zoteroHostCapabilityBroker.ts:17713-17836`：

- `HostSliceWaiter<T>`(`:17713-17723`)：`control / run / resolve / reject / queued / started / settled / canceled / abort`。
- 模块级单例队列：`const hostSliceQueue: Array<HostSliceWaiter<unknown>> = []`(`:17725`) 与 `let hostSliceActive = false`(`:17726`)。**所有 broker 实例共用**（模块作用域，`createZoteroHostCapabilityBroker` 不持有自己的队列）。
- `pumpHostSlices()`(`:17728-17777`)：FIFO `shift()`，跳过已取消（`!waiter.queued`）的项；进入时置 `started = true`、`hostSliceActive = true`；`Promise.resolve().then(...)` 中先复查取消再执行 `waiter.run()`；`.finally` 中 `settled = true` → `hostSliceActive = false` → 递归 `pumpHostSlices()`。
- `withZoteroHostSlice`(`:17779-17818`)：入队前先 `throwIfWorkflowCallCanceled(control)`(`:17783`)。

### 4.2 规则与取消语义

| 规则 | 证据 |
| --- | --- |
| 严格 FIFO、一次一片 | `pumpHostSlices` 的 `while (waiter && !waiter.queued)` + 单 `hostSliceActive` 布尔 |
| **未启动**取消 → 立即出队并 reject | `abort()` 中 `if (!waiter.started)`：置 `canceled`、`queued=false`、`splice` 出队、`settled=true`、reject `canceled/caller_signal`，然后 `pumpHostSlices()`(`:17798-17811`) |
| **已启动**取消 → **不释放槽位** | `abort()` 只在 `!waiter.started` 时动队列；`started` 时仅置 `waiter.canceled = true`。槽位释放只发生在 `run()` 的 promise settle 之后（`.finally`，`:17769-17776`）。这就是"取消或超时不能在底层 Host 工作 settle 前释放槽"的实现方式。取消的结果是在 settle 后由 `.then` 的 rejected 分支把已成功的结果**改写**为 `canceled`（`:17747-17767`） |
| 超时 | 本文件无独立超时定时器；"50 ms" 是主动让出策略而非强制中断（见下） |
| 测试复位 | `resetZoteroHostSliceGateForTests()`(`:17820-17836`) 清空队列并把所有 waiter 以 `canceled/host slice gate was reset` reject |

### 4.3 "至多 100 items 或 50 ms"

`shouldYieldHostSlice(startedAt, processed)`(`:17838-17840`)：`processed >= 100 || Date.now() - startedAt >= 50`。

调用点共 6 处：`mapZoteroHostTargets`(`:17853`)、`:16071`（snapshot 捕获）、`:16343`、`:16388`（当前视图/选中项）、`:17400`（annotation 导出）、`:18526`（tail 富集循环）；命中后 `await yieldToEventLoop()`。

`src/modules/zoteroHost/libraryArtifactReadiness.ts:283` 有**独立的同值策略**（`processed >= 100 || Date.now() - startedAt >= 50`）；`src/modules/zoteroHost/zoteroNotePayloadResolver.ts:218-219` 有第三份（`PAYLOAD_READ_YIELD_ITEMS = 100`、`PAYLOAD_READ_YIELD_MS = 50`）——三处数值一致但各自定义（**重复常量的结构事实**）。

### 4.4 槽外工作

- native admission 钩子：`:4237`、`:4371`、`:14485`（`admit: (work, phase = "effect") => …`，类型 `ZoteroNativeAdmission = <T>(work, phase?: "read"|"effect")` 在 `zoteroHost/zoteroHostNativeMutations.ts:20-25`）。
- 文件/路径读取显式放在槽外：`readAttachmentPathOutsideHostSlice`(`:2069`) 在 `:17281`、`:18390` 被调用。
- 测试对此有锁定：`tests/zotero-host/102-…test.ts:958` "releases Host admission before executing the combined ingest identity query"、`:5097` "serializes native read slices across Broker instances and drops canceled waiters"、`:5157` "holds the native slice until an active canceled read settles"。

---

## 5. 持久化

### 5.1 pluginStateStore 用什么存储、放在哪

- **SQLite**。adapter 走 Zotero 的 `Services.storage.openDatabase`（`src/modules/pluginStateStore.ts:411-429`），底层是 `src/modules/guardedSqlite.ts`（234 行，`openDatabase` 在 `:133-135`）。
- 路径解析：`getStateDirectoryPath()`(`:392`) → `getRuntimePersistencePaths().stateDir`(`src/modules/runtimePersistence.ts:610-642`)；数据库文件名 `SQLITE_FILE_NAME = "zotero-agents.db"`(`runtimePersistence.ts:151`)，落在 `<root>/state/zotero-agents.db`（`stateDbPath` 字段）。根目录优先级见 §6。
- 无 Zotero 环境（Node 测试）时用测试 adapter 工厂注入：`createPluginStateTestAdapter()`(`pluginStateStore/core.ts:60-69`) + `configurePluginStateTestAdapterFactory`(`:49`)；测试实现为 `node:sqlite` 内存库 `tests/helpers/pluginStateNodeSqliteAdapter.ts:1-25`。
- schema 初始化：`ensureSchema(db)`(`pluginStateStore.ts:599-610`) 依次建 `plugin_meta`、task / run / mutation authority / literature migration 四组表。
- 另有旧数据迁移：`migrateLegacyPrefsIntoSqlite`(`:631-708`)、`resetLegacySeparatedAgentRunStateIfNeeded`(`:709-746`)、迁移状态键 `migration_task_state_v1`(`:226`)。

### 5.2 表清单（表名 → 定义位置）

| 表 | 定义 | 用途 |
| --- | --- | --- |
| `plugin_meta` | `pluginStateStore.ts:599-605` 附近 | 迁移状态/元数据；API `getPluginMetaValue`/`setPluginMetaValue`(`:969`/`:981`) |
| `plugin_task_requests` / `plugin_task_contexts` / `plugin_task_rows` | `pluginStateStore/taskTables.ts:32/43/55` | SkillRunner/ACP/工作流产品的任务域记录 |
| `plugin_acp_skill_runs` / `plugin_acp_skill_run_events` | `pluginStateStore/runTables.ts:27/37` | ACP skill run 与事件 |
| `plugin_skillrunner_runs` / `plugin_skillrunner_run_events` | `runTables.ts:48/58` | SkillRunner run 与事件 |
| `plugin_workflow_sequence_runs` | `runTables.ts:69` | 工作流序列运行 |
| **`plugin_mutation_authority`** | `pluginStateStore/mutationAuthorityTable.ts:10-24` | canonical mutation 权威记录，主键 `(scope, operation_id)` |
| `plugin_literature_artifact_migration_runs` / `_sets` | `pluginStateStore/literatureMigrationTables.ts:19/37` | 文献工件迁移 run/set |

### 5.3 mutation 的 scope / operationId / digest 记录在哪里

`plugin_mutation_authority` 表列（`mutationAuthorityTable.ts:10-24`）：
`scope`、`operation_id`、`operation`、`semantic_digest`、`semantic_input_json`、`state`、`result_json`、`created_at`、`terminal_at`、`last_accessed_at`，`PRIMARY KEY (scope, operation_id)`；索引 `idx_plugin_mutation_authority_state_terminal(state, terminal_at)`(`:25-28`)。

配套：`PluginMutationAuthorityEntry`(`pluginStateStore.ts:139-157`)、`PluginMutationAuthorityState = "started" | "terminal" | "identity_only"`(`:129-133`)。

写路径（`mutationAuthorityTable.ts`，经 `pluginStateStore.ts:901-907` 再导出）：
- `claimPluginMutationAuthorityEntry`(`:92`)：`INSERT OR IGNORE INTO plugin_mutation_authority … 'started'`（`:118`），durable insert winner 语义；
- `settlePluginMutationAuthorityEntry`(`:146-184`)：`SET state='terminal', result_json=…, terminal_at=… WHERE … AND state='started'`（非 overwrite 时带该条件，`:170`），更新缺行抛 `plugin_mutation_authority_terminal_update_missing`(`:182`)；
- `expirePluginMutationAuthorityEntryEvidence`(`:186-207`)：只对 `state='terminal'` 置 `state='identity_only'` 并清空 `result_json`；
- `getPluginMutationAuthorityEntry`(`:68`)。

### 5.4 保留与清理策略

`src/modules/zoteroHostMutationAuthority.ts`：

- `TERMINAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000`(`:34`)。
- `isExpirableTerminal(result)`(`:309-311`)：`outcome !== "unknown" && outcome !== "repair_required"` —— 即 unknown / repair_required **永不按龄过期**。
- `terminalExpired(entry, now)`(`:313-318`) 用 `Date.parse(entry.terminalAt)` 与 now 差比对。
- **惰性过期**：`resolveDurableMutation`(`:523-570`) 在读取命中过期 terminal 时调 `expirePluginMutationAuthorityEntryEvidence` 并返回 `{state:"unavailable"}`(`:557-568`)；没有后台定时删除。
- 内存侧：`mutationRecords: Map`(`:137`)、`pinnedMutationReceipts: Map`(`:138`)；`pruneTerminalRecords(now)`(`:327-341`) 删除超期且未 pin 的内存条目（pin 的 receiptId 保留）。
- 重启遗留：`entry.state === "started"` 且内存无 running 记录时 → `interruptedResult(entry)`(`:508-521`) 生成 `outcome:"unknown"` 的 `execution_failed / verification / reconcile` 结果，并**落库为 terminal**(`:544-555`)。
- `identity_only` 记录读取即 `{state:"unavailable"}`(`:538`)，永不删除。
- 测试锁定：`tests/zotero-host/241-…test.ts:222`（live-runtime reset 后保留 terminal 证据）、`:247`（terminal 持久化失败返回 unknown 且不重放）、`:646`（过期证据变永久 unavailable）、`:696`（unknown / repair_required 超出常规过期仍保留）、`:858`（中断的 durable admission 归 unknown）、`:883`（INSERT OR IGNORE winner 判定）。

### 5.5 其他持久化面（同一 authority 之外）

- **stored attachment replacement journal**：`src/modules/zoteroHost/zoteroHostNativeMutations.ts:80-93`，目录 `<stateDir>/stored-attachment-replacements`，文件名为 `sha256Hex(operationId) + ".json"`；schema 常量 `ATTACHMENT_REPLACEMENT_JOURNAL_SCHEMA`(`:66-67`)；串行尾 `attachmentReplacementTail`(`:68`)。
- **进程内存态、不落盘**：`traversalEvidenceRegistry`(`broker :15224`，上限 256 条，`:15332-15336` 按插入序淘汰)、`snapshotSessions`(`:1040`，TTL 见 `ZOTERO_LIBRARY_SNAPSHOT_TTL_MS`)、`canonicalMutationControls` WeakMap(`:840`)。
- **runtime logs**：`src/modules/runtimeLogManager.ts` 落 `<logsDir>/runtime-logs.json`（`RUNTIME_LOG_FILE_NAME` in `runtimePersistence.ts:154`；写入路径 `runtimeLogManager.ts:931/1155/1487`），经 `replaceRuntimeTextFileAtomically`(`:6`, `:880`) 原子替换；保留常量 `NORMAL_MAX_ENTRIES = 2000`、`NORMAL_MAX_IMPORTANT_ENTRIES = 500`、`DIAGNOSTIC_MAX_ENTRIES = 3000`、`DIAGNOSTIC_MAX_BYTES = 20 MiB`、`DIAGNOSTIC_MAX_IMPORTANT_ENTRIES = 1000`、`RETENTION_DAYS = 30`(`:347-355`)；持久化去抖 `PERSIST_IDLE_DEBOUNCE_MS = 250`、`PERSIST_MAX_DELAY_MS = 2000`(`:370-371`)。
- **清理治理**：`src/modules/runtimePersistenceGovernance.ts`（891 行）定义 `RuntimePersistenceCategory = logs | skillrunner-ledger | acp-conversations | acp-skill-runs | workflow-products | cache | tmp`(`:31-38`)，把 state store 计数与文件系统扫描合并成可清理用量报告。

---

## 6. 跨运行时文件系统 adapter（`runtimePersistence.ts`，1,995 行）

### 6.1 选择顺序（晚绑定）

每个文件操作函数**在调用时**读取 `globalThis`，顺序一致：`IOUtils` → `OS.File` → Node `fs/promises`。**没有**模块级缓存的 adapter 变量。示例：

| 操作 | 行号 | 分支 |
| --- | --- | --- |
| exists | `:702-738` | `IOUtils.exists`(`:711`) → `OS.File.exists`(`:718`) → `tryNodeFs`(`:728`)；非 native 绝对路径直接 `false`(`:725`) |
| makeDirectory | `:740-809` | `IOUtils.makeDirectory`(`:767`) → `Zotero.File.pathToFile` + nsIFile(`:781-799`) → Node `fs.mkdir`(`:800-804`)；失败按 `surfaceErrors` 决定抛错(`:806-808`) |
| read bytes | `:902-909` | `IOUtils.read`(`:905`) → `OS.File.read`(`:909`) |
| write bytes | `:936-976` | `IOUtils.write`（两种签名兜底 `:953-967`）→ `OS.File.writeAtomic`(`:971`) |
| readUTF8 | `:1155-1174` | `IOUtils.readUTF8`(`:1165`) → `OS.File.read` + decoder(`:1169`) |
| stat | `:1665-1700` | `IOUtils.stat`(`:1674`) → `tryNodeFs` |
| getChildren | `:1740-1750` | `IOUtils.getChildren`(`:1742`) |
| remove | `:1843-1888` | `IOUtils.remove`(`:1852`/`:1872`) → `OS.File.removeDir`(`:1886`) |
| copy / move | `:876-881` / `:1020-1025` | 同序 |

### 6.2 晚绑定的具体体现

- Node fallback 用**运行时动态 import**：`const dynamicImport: DynamicImport = new Function("specifier", "return import(specifier)")`(`:22-27`)，`tryNodeFs()`(`:686-...`) 内 `await dynamicImport("fs/promises")`(`:692`)。这避免打包器把 `fs/promises` 静态打进 Zotero 环境。
- 全部 adapter 探测都是 `typeof runtime.IOUtils?.xxx === "function"` 形式的特性检测（18 处 `tryNodeFs` 调用点，`:728/800/884/912/976/1028/1079/1118/1174/1217/1298/1426/1496/1700/1750/1862`）。
- 落地为显式治理约束与测试：`tests/runtime/239-runtime-host-adaptation-governance.test.ts:146` "keeps ordinary filesystem adapter selection inside runtime persistence" 用 `inventorySelectors()` 白名单断言除 `OWNER_FILE` 外没有别的文件自行选择 adapter。
- 根目录解析也是晚绑定：`resolvePlatformDataRoot()`(`:504-529`) 顺序 = `ZOTERO_SKILLS_RUNTIME_ROOT` 环境变量 → 插件 pref `runtimeRoot` → `Zotero.DataDirectory.dir` + `zotero-agents`(`INTERNAL_APP_DIR_NAME = "zotero-agents"` `:149`) → `TMPDIR/TEMP/TMP/Temp` → `process.cwd()/.zotero-agents`。`resolveRuntimeTemporaryDirectory()`(`:535-559`) 每次调用重新解析 `PathUtils.tempDir` / `Zotero.getTempDirectory()`。
- 路径布局（`getRuntimePersistencePaths` `:610-642`）：`root/{runtime,data,state,legacy}`；`state/zotero-agents.db`、`state/synthesis.db`、`runtime/logs/runtime-logs.json`、`runtime/acp/chat/{workspace,conversations}`、`runtime/acp/skill-runs`、`runtime/workflow-products`、`runtime/cache`、`runtime/tmp`、`runtime/synthesis/service-runtime`。
- 路径安全：`validateManagedRelativePath`(`:217`)、`assertManagedRelativePath`(`:355`)、`validateManagedAbsolutePath`(`:413`)、`ManagePathPolicyError`(`:106`)、保留名 `WINDOWS_RESERVED_BASENAMES`(`:124`)、上限 `MANAGED_PATH_MAX_SEGMENT_LENGTH = 96` / `MANAGED_RELATIVE_PATH_MAX_LENGTH = 220`(`:119-120`)。
- 大文件策略：`RUNTIME_APPEND_CHUNK_CODE_UNITS = 256 * 1024`、`RUNTIME_TEXT_SCAN_CHUNK_BYTES = 256 * 1024`(`:156-157`)，附加队列 `runtimeAppendQueues`(`:159`)。
- 旧路径兼容（只读解析、不迁移）：`resolveLegacyZoteroPluginDataRoot`(`:644`)、`getLegacyPluginStateDatabasePath`(`:656`)、`LEGACY_APP_DIR_NAME = "zotero-skills"`(`:150`)、`LEGACY_SQLITE_FILE_NAME = "zotero-skills.db"`(`:153`)。

---

## 7. `preferenceScript.ts`（2,612 行）

**是什么**：Zotero 首选项面板脚本。入口 `export async function registerPrefsScripts(window: Window)`(`:31`)，由 `src/hooks.ts:1334` 在 `onPrefsEvent` 的 `case "load"` 中调用；面板标记是 `addon/content/preferences.xhtml`，文案在 `addon/locale/*/preferences.ftl`（11 种语言）。

**结构**：文件只有 **3 个顶层声明**：

| 声明 | 行号 | 说明 |
| --- | --- | --- |
| `unbindSkillRunnerLocalRuntimePreferences` / `unbindContentPackageInstallProgress` | `:27-28` | 两个模块级解绑句柄 |
| `SYNTHESIS_DB_RESET_CONFIRMATION_TEXT` | `:29` | `"RESET SYNTHESIS DATABASE"` 二次确认字面量 |
| `registerPrefsScripts` | `:31-51` | 记录 `addon.data.prefs`、绑 SkillRunner 本地运行时偏好、注册 `unload` 清理，末尾调 `bindPrefEvents()` |
| `bindXulButtonActivation` | `:53-71` | XUL 按钮激活节流包装 |
| **`bindPrefEvents`** | `:73-2612` | **约 2,540 行的单函数**，占全文件 97% |

`bindPrefEvents` 内部模式：从 `addon.data.prefs?.window?.document` 用 `querySelector` 抓取一批元素（`:84-120` 起连续数十个 `const … = doc.querySelector(...)`），然后逐段注册事件。`addEventListener` 出现 46 次。可见的职责分段（按元素命名，非代码分区）：workflow/skill 目录选择与扫描、内容包频道/检查/安装/进度、日志查看、运行时数据用量（`renderRuntimeDataUsage` / `refreshRuntimeDataUsage`）、运行时数据问题展开、Synthesis 数据库重置（`runSynthesisDatabaseReset`，用 `SYNTHESIS_DB_RESET_CONFIRMATION_TEXT` 二次确认）、以及把 `openRuntimePersistenceRoot` 等事件转发给 `addon.hooks.onPrefsEvent`。唯一的模块外抽离是 `src/modules/preferences/skillRunnerLocalRuntimePreferences.ts`。

---

## 8. 测试覆盖

### 8.1 `tests/zotero-host/`（16 文件）

| 文件 | 行数 | 主题 |
| --- | --- | --- |
| `102-zotero-host-broker-capability-api.test.ts` | 6,795 | **主测试**：broker 能力 API 全量（metadata translate、identity ingest ≤25、Host slice 释放/取消、note 写入、managed note 六类、payload staging 补偿、collection membership、attachment 五操作、preview/execute 权威、snapshot 分页与 completion evidence、navigation 七项、strict-JSON 与 fail-closed 替身、bibliography、statusTags 等），`describe` 在 `:468`，用例从 `:490` 起到 `:6756` |
| `241-zotero-host-mutation-authority.test.ts` | 932 | mutation authority：durable winner、并发合并、admission 写失败、进程重启、过期与 unknown 保留、永不重放（`describe` `:24`） |
| `242-zotero-host-trash.test.ts` | 223 | trash 准备/执行 |
| `185-zotero-library-page-query.test.ts` | 535 | keyset 分页、`limit+1`、游标绑定 criteria、跨页不重复、源端不越页 hydration（`describe` `:127`） |
| `11-selection-context-rebuild.test.ts` | 559 | selection context 重建 |
| `10-selection-context-schema.test.ts` | 30 | selection context schema |
| `130/131-zotero*compatibility*.test.ts` | 467 + 371 | Zotero 9 / 兼容性 fixture |
| `91/92/94/95/96/97/53-…test.ts` | 492/302/209/228/417/174/189 | Zotero 测试基础设施本身：mock parity、后台清理、对象清理 harness、泄漏/性能探针摘要、mock 隔离 |
| `159-run-zotero-direct-runtime-root.test.ts` | 174 | 直跑 Zotero 的 runtime root |

### 8.2 `tests/runtime/`（24 文件），与本次范围相关的四个

- `108-runtime-persistence-governance.test.ts`：**最相关**，37 个用例。覆盖严格/宽松读写区分（`:125`）、无 adapter 时严格写失败（`:142`）、temp dir 每次重解析（`:189`）、stat/list/move/remove 语义（`:218`）、IOUtils 分块追加的代理对安全（`:250`、`:428`）、原子替换与失败保留旧目标（`:384`、`:402`）、managed root 与语义子目录（`:504`）、DataDirectory 作用域根（`:632`）、Windows AppData 回退（`:651`）、`runtimeRoot` pref 优先（`:712`）、按类别清理与保留期（`:952`、`:1483`、`:1611`）、durable synthesis 数据不被清理（`:1656`、`:1764`）、SQLite 索引缺失文件与孤儿资产报告（`:1687`）、托管路径策略（`:1877`）。
- `239-runtime-host-adaptation-governance.test.ts`：:126 native workload selector 映射；**:146 "keeps ordinary filesystem adapter selection inside runtime persistence"** —— 直接锁定 §6 的硬约束。
- `45-runtime-log-manager.test.ts`：37 个用例，覆盖 schema 归一化与敏感字段脱敏（`:97`）、固定保留期最旧优先淘汰（`:227`）、诊断模式双预算（`:243`）、持久化到 runtime log 存储并清空旧 prefs（`:320`）、追加合并直到显式 flush（`:434`）、单写者与失败重试（`:627`、`:711`）、warn/error 独立重要队列（`:914`、`:969`）、字节预算下先丢 info（`:992`）。
- `164-runtime-platform-services.test.ts`：平台解析。

### 8.3 `tests/tooling/`（与 pluginStateStore 直接相关）

- `85-plugin-state-store-bootstrap.test.ts`：`describe` `:17`。迁移状态写入 `plugin_meta`(`:35`)、迁移日志默认静默/verbose 才输出(`:40`/`:54`)、丢弃旧 SkillRunner prefs 而不迁移旧本地行(`:70`)、复合任务键独立(`:120`)、**复用 guarded 连接且避免嵌套 `BEGIN IMMEDIATE`**(`:146`)、连接在最后一个 owner 释放后 checkpoint 并关闭(`:188`)、busy 写重试与重试耗尽仍保留诊断(`:226`/`:246`)、事务 BEGIN busy 重试(`:269`)。
- `159-separated-run-stores.test.ts`、`264-literature-artifact-migration.test.ts`、`163-background-refresh-governance.test.ts`（均引用 `pluginStateStore`）。

### 8.4 `tests/zotero/`（真实 Zotero 运行时）

- `tests/zotero/core/lite/275-managed-note-transaction.zotero.test.ts:755` "commits the private parent set and its payload attachment in one native transaction"、`:818` "retains canonical notes and settles one parent-set receipt when migration cleanup fails" —— 对应 §2.3 的 `executeManagedParentSetMutation` 与 migration cleanup required tail。
- `tests/zotero/core/lite/185-zotero-library-page-query.zotero.test.ts`、`187-runtime-log-persistence.zotero.test.ts:41`（hydrate → 单 writer drain → 分块 JSON 原子替换）、`165-runtime-platform-services.zotero.test.ts`、`186-acp-runtime-file-io.zotero.test.ts`。
- `tests/zotero/core/full/188-zotero-navigation.zotero.test.ts:46`（冷 Reader 跨窗口切换拒绝）、`:161`（native navigation seam 的 feature-detected 清理）。

### 8.5 其他

- `tests/host-bridge/101/107/108/138` 通过 broker 测 MCP/Host Bridge 投影与文件下载（remote locality）。
- `tests/workflows/187-workflow-host-contract-governance.test.ts` 测契约治理；`tests/tooling/selection-canonical.test.ts` 测 selection canonical。
- `tests/helpers/zoteroHostCapabilityBrokerHarness.ts`（113 行）提供 **fail-closed 替身**：`createFailClosedZoteroHostCapabilityBroker`，未配置成员一律抛 `unavailable / reason: "capability"`（`:19-…`）；对应 102 号测试 `:6208` "keeps Broker test adapters complete and fail closed"。

---

## 9. 疑点清单（只列待核查项）

| # | 疑点 | 证据路径 |
| --- | --- | --- |
| 1 | `assertWorkflowHostStrictJsonValue` 是否覆盖所有公共读路径？`listLibraryItems`/`listCollections`/`listSavedSearches`/`exportPortableItems`/`getItemAttachments` 出参未见显式断言，仅靠 `trimText`/`escapeAttribute` 构造性保证 | `broker:1115-1125`（两个包装）、`:14960-15020`（listItems 无断言）、对比出参侧 21 处 `strictJsonObject` |
| 2 | 三个"100 items / 50 ms"让出策略各自定义常量，值一致但无单一来源 | `broker:17838-17840`、`zoteroHost/libraryArtifactReadiness.ts:283`、`zoteroHost/zoteroNotePayloadResolver.ts:218-219` |
| 3 | `withZoteroHostSlice` 无独立超时定时器；任务描述中的"超时"语义需确认是指 50 ms 主动让出还是另有调用方超时 | `broker:17713-17836`（无 timer）；`shouldYieldHostSlice`(`:17838`) |
| 4 | 槽队列是模块级单例，是否真正"进程级"取决于打包后模块实例数（多窗口/多次 load 是否共用同一模块实例） | `broker:17725-17726`（模块作用域）；未见显式 `globalThis` 挂载或跨 bundle 共享机制 |
| 5 | `plugin_mutation_authority` 的 terminal 行只做**惰性**过期，无后台清理；长期运行是否会累积 `identity_only` 行（永不删除）尚需实测行数增长 | `zoteroHostMutationAuthority.ts:523-570`、`pluginStateStore/mutationAuthorityTable.ts:127-148`、`TERMINAL_RETENTION_MS`(`:34`) |
| 6 | `pruneTerminalRecords` 只清理内存 Map，SQLite 行不在其中；两条保留路径是否在语义上等价需确认 | `zoteroHostMutationAuthority.ts:327-341`（内存） vs `:557-568`（惰性 SQLite） |
| 7 | strict-JSON 断言失败抛的是 `TypeError`（`workflowHostErrorContract.ts:326-371`），是否在所有公共入口被转换成 `ZoteroHostCapabilityError`，还是可能以裸 `TypeError` 逃出 broker | `workflowHostErrorContract.ts:309-376`；broker 内未见对 `assertJsonValue` 的统一 try/catch 包装 |
| 8 | 任务描述的 `tests/core/`、`tests/node/core/` 不存在，与根 `AGENTS.md` 目录结构章节冲突（文档漂移） | `ls -d tests/core` → 不存在；根 `AGENTS.md` "tests/core/ # 核心功能测试（~100+ 测试文件）" |
| 9 | `executeManagedParentSetMutation`（1,804 行）是"private composition seam"，其 authority identity 固定为 `"managed_note.apply_parent_set"`，该 operation 不在 `CANONICAL_MUTATION_OPERATIONS`/公共 preview/request 投影中 | `broker:10077-10095`（注释与操作名）、`:7312`（白名单）、`:11880`（函数结束） |
| 10 | broker 是否复用了 `zoteroHost/zoteroHostBrokerPrimitives.ts` 的 `save/erase` 事务语义，还是部分路径直接调用 `Zotero.Items.saveTx` —— `zoteroHostNativeMutations.ts` 与 primitives 存在两套写入口 | `zoteroHost/zoteroHostNativeMutations.ts:20-25`（`admit` 阶段契约）、`zoteroHost/zoteroHostBrokerPrimitives.ts:15-56`（`save`/`erase`） |
| 11 | `runtimeLogManager.ts` 的 30 天保留与 mutation authority 的 30 天保留是同值不同源常量，是否存在实际耦合未验证 | `runtimeLogManager.ts:354-355`、`zoteroHostMutationAuthority.ts:34` |
| 12 | `preferenceScript.ts` 的 `bindPrefEvents` 约 2,540 行单函数，是否已有覆盖它的测试（当前只在 `tests/ui/40-gui-preferences-menu-scan.test.ts` 等处被间接引用） | `preferenceScript.ts:73-2612`；`rg -l 'registerPrefsScripts' tests/` 仅 4 个文件且都不是其行为测试 |

---

## 10. 未覆盖范围与实读行段

我没有通读这份 18,546 行的文件。**实读（`read`/`sed` 精确输出）的 broker 行段**，合计约 1,450 行 ≈ 7.8%：

```
1-265          (导入、DTO 头、scope 类型)
440-870        (错误类型、接口 529-762、私有类型、常量表)
990-1040       (snapshot 运行时与会话类型)
1108-1167      (assertJsonValue / capabilityError 系列)
2069           (readAttachmentPathOutsideHostSlice 声明)
2963-3017      (assertPortableRef / resolveItem)
4237, 4371     (admit 钩子两处)
4400-4470      (ingest identity 类型与查询构造头部)
4550-4590      (identity 结果 25 上限)
10060-10095    (executeManagedParentSetMutation 头部，1,804 行函数起点)
11870-11895    (同函数尾部 + callManagedOwner 头部)
11913-11930    (normalizeStatusTransitionKeys)
14212-14232    (collection 遍历 limit 固定为 LIBRARY_LIST_LIMIT_MAX)
14905-14920    (selectLibraryItemPage limit 夹取)
15224-15283    (traversalEvidenceRegistry + traversalLimit)
15325-15354    (证据注册上限 256 + traverseLibraryItems 头)
16298-16312    (getSelectedItems limit 夹取)
17219-17388    (createZoteroHostCapabilityBroker 投影 + getItemDetail/getItemAuditState/...)
17683-17712    (resolveZoteroHostCapabilityBroker / 测试钩子)
17705-17854    (取消检查、Host slice 闸门、shouldYieldHostSlice、mapZoteroHostTargets)
18040-18075    (managed detail 富集尾 + isCitationReferenceDependencyFailure)
```

**完全未逐行阅读的 broker 区段**（仅通过 438 个顶层声明索引 + 定向 `rg` 得知其存在与职责）：`:266-439`、`:871-989`、`:1041-1107`、`:1168-2068`、`:2070-2962`、`:3018-4236`、`:4238-4370`、`:4372-4399`、`:4471-4549`、`:4591-4997`、`:5073-5424`、`:5426-6100`、`:6101-6353`、`:6355-10059`、`:10096-11869`、`:11896-11912`、`:11931-14211`、`:14233-14904`、`:14921-15223`、`:15284-15324`、`:15355-16297`、`:16313-17218`、`:17389-17682`、`:17855-18039`、`:18076-18546`。其中 `:6355-10059` 与 `:10096-11869` 两段合计约 10,400 行（56%）是最大的未逐行阅读区。

**其他文件的实读范围**：

- `zoteroHost/` 9 文件：全部只读了**顶层声明清单**（`rg` 输出），逐行阅读仅 `zoteroLibraryPageQuery.ts:30-109`、`zoteroManagedNotes.ts:35-75`、`zoteroHostNativeMutations.ts:80-95`、`zoteroHostBrokerPrimitives.ts` 声明行、`libraryArtifactReadiness.ts:283`、`zoteroNotePayloadResolver.ts:218-219`。9 个文件的函数体基本未读。
- `pluginStateStore.ts`：读了 `:300-439`，其余靠声明清单与 `rg`。`pluginStateStore/` 5 文件：读了 `core.ts` 全文（70 行）、`mutationAuthorityTable.ts:1-60` + 剩余部分的关键函数行，`taskTables.ts`/`runTables.ts`/`literatureMigrationTables.ts` 只读了表与索引的行号。
- `runtimePersistence.ts`：读了 `:504-660`、`:698-817`，其余靠声明清单与 18 个 `tryNodeFs` 调用点行号。
- `runtimeLogManager.ts`：只读了声明清单与 `:313-384`，37 个测试用例名反推行为。
- `runtimePersistenceGovernance.ts`：读了 `:1-60`。
- `zoteroHostMutationAuthority.ts`：读了 `:30-140`、`:305-379`、`:500-579`。
- `workflowHostErrorContract.ts`：读了 `:1-120`、`:160-289`、`:300-379`、`:530-579`。
- `preferenceScript.ts`：读了 `:1-60`、`:2590-2612` 与全部 3 个顶层声明行号；`bindPrefEvents` 的 2,540 行函数体未逐行阅读。
- `hostBridgeCapabilityRegistry.ts`：读了 `:473-503`、`:640-700`、`:2670-2690`。

**未做**：任何 `codegraph explore` 调用；`tests/` 下除 §8 列出的文件外未展开；`openspec/`、`docs/` 未查（因此本报告中"应该/不应该"类的架构意图均未引用设计文档，全部结论只以代码为准）。
