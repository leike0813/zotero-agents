# Design: complete-workflow-host-v12-leaf-contracts

## Context

动机见 proposal.md。本设计只记录实现层决策。权威语义源是 `artifact/workflow-host-v12-architecture-decisions.md`（ADR）：§12.0（metadata translateIdentifier）、§11.4（notes.create）、§11.7/§11.1（upsertPayload 与 LogicalNotePayloadDto）、§11.14（replaceFile）、§8（mutation authority 共享约束）、§17（错误 taxonomy）。

四个切片的生产现状（已 grep 确认）：

- **M1** `translateMetadataIdentifier`（`src/modules/zoteroHostCapabilityBroker.ts:2173-2256`）：接受 `normalized` alias（2177）与开放 `type`；返回 v11 形状 `{ok, item, itemCount, translators, diagnostics[]}`；直接取 `itemList[0]`（2234）；translator 异常被 catch 后降级为 `ok:false` 正常返回（2250-2255）；creators `.slice(0, 50)` 静默截断（2103）。`MetadataLookupResultDto` 仅是 `ZoteroHostMetadataTranslateIdentifierResponse` 的 alias（`src/workflows/types.ts:1739`）。
- **M2** `attachments.replaceFile`：broker 路由已就位（`executeAttachmentMutation`，9365-9372），但 primitive 是可选的（838-841）且生产从不提供，执行时恒抛 `unsupported_operation`（7124-7133）。
- **M3** `upsertNotePayloadAttachment`（3974-4073）：无 hash 短路，每次重新 `importEmbeddedImage`；静默删除全部同 payloadType 旧 payload（4034-4061）；`importEmbeddedImage` 成功后 `updateNoteContentDirect` 失败时无补偿（4024-4031），残留孤儿 attachment；result DTO 为 `{note, payloadType, payloadHash, replaced}`（6724-6729）。request DTO 是扁平的 `{payloadType, noteKind, payload}`（`src/workflows/types.ts:1167-1174`），format 被硬编码为 `"json"`（6695），与 ADR §11.1 的嵌套 `LogicalNotePayloadDto`（payloadType/noteKind/schemaVersion/format/value）不符。
- **M4** `NoteCreateRequestDto` 是 optional-field bag `{operationId, parentRef?, content}`（types.ts:1150-1154），无 placement union、`collectionRefs`、`initialTags`；research import 在 `notes.create` 之后另行编排 `item.updateTags` 设置初始 tag（`src/workflows/workflowHostOwners.ts:516-532`）。

共享 seam 均已存在，本 change 不新建：`executeNoteMutation`（6347）与 `executeAttachmentMutation`（6877）已接入 mutation authority（reservation / receipt / attempt envelope）；`src/workflows/workflowHostErrorContract.ts` 是 stable taxonomy 的 neutral contract module；`src/modules/runtimePersistence.ts` 是 filesystem adapter 选择的唯一事实源。

## Goals / Non-Goals

**Goals:**

- 四个成员的公开 DTO/outcome/错误语义与 ADR 逐条对齐，consumer 按 ADR 编码即可工作。
- 所有写路径复用既有 mutation authority envelope（`MutationExecutionResult`），不新增平行 envelope。
- 所有错误经 `workflowHostErrorContract` 的 closed code + closed details，不新增 top-level code。
- consumer（literature metadata curator、research import 编排、builtin workflows 调用点）在同一 change 内迁移，不留 v11 形状依赖。

**Non-Goals:**

- 不改变 23 keys / 87 members 的 manifest identity，不引入 v13（v12 尚未对外发布）。
- 不改变 Host Bridge / MCP 的 exposure、permission 与 remote locality 投影。
- 不为 metadata module 增加通用 identifier 提取、多 identifier 批量查询或 caller-controlled resource knobs。
- 不实现 ADR §11.7 之外的 payload 存储策略变更（inline vs attachment 选择策略本身沿用现有 embedded-attachment 路径）。
- 不处理 `notes.updateContent`、`attachments.create/move/remove` 等已在 v12 闭合的成员。

## Decisions

### D1（M1）：translateIdentifier 重写为有界三态 lookup，exact-match 在序列化后的 canonical DTO 上做

在 broker 内重写 `translateMetadataIdentifier`：

1. **输入校验先行**：closed `type` union（`DOI|ISBN|arXiv|PMID`）、非空 `value` ≤ 2,048 字符；出现 `normalized` alias、额外字段、开放 type 或 resource knob 一律 `invalid_request`（reason 按 §17.3 closed union）。ISBN 先做格式与 checksum 校验。
2. **per-type normalization table**：DOI 去 `doi:` 前缀/`https://doi.org/` 包装并小写化；ISBN 去分隔符统一为 ISBN-13 可比形式；arXiv 去 `arXiv:` 前缀与版本号差异按 closed table 处理；PMID 去 `PMID:`/URL 包装。该 table 只有一份 Host 内事实源， normalizes 后的值进入 evidence.normalizedIdentifier。
3. **exact-match selection**：candidate 先经现有 translator-item 序列化（`serializeMetadataItem` 已读取 `DOI`/`ISBN`/`archiveID`/`PMID` 字段），再按 type 对应字段做规范化值相等比较：DOI↔`DOI`、ISBN↔`ISBN`、arXiv↔`archiveID`、PMID↔`PMID`。禁止 `itemList[0]` 与 `find()` 以外的隐式选择；恰好 1 个 match → `matched`，>1 → `ambiguous`（只含 match），0 → `not_found`（reason：`no_translator` / `no_candidate` / `identifier_mismatch`）。
4. **三态 outcome 是返回值，不是异常**：lookup 的 `outcome: "not_found"` 永不映射为 §17 的 `code: "not_found"` 错误；异常只用于调用未完成（`invalid_request` / `unavailable` / `resource_limited` / `execution_failed` / `canceled`）。translator 抛错 → `execution_failed`，`Translate.Search` 缺失 → `unavailable`，均经 `ZoteroHostCapabilityError` 落入共享 taxonomy，不再 catch 成 `ok:false`。
5. **evidence 与预算**：三分支共用 `{normalizedIdentifier, candidateCount, matchingCandidateCount, translators: [{id, label}]}`；translators > 32、candidates examined > 64、ambiguous 返回 > 64、id > 128 字符、label > 256 字符、序列化结果 > 4 MiB 均整体 `resource_limited`（details 只含受控 `resource/limit/observed`），不截断。
6. **creators**：删除 `.slice(0, 50)`，复用 §12.1 唯一 CreatorDto serializer/schema（不新建第二套转换分支），每 item > 100 creators 整体 `resource_limited`。
7. 公开类型：`MetadataLookupResultDto` 改为 ADR §12.0 的判别联合，`MetadataLookupRequestDto` 固定为 `{type, value}`；删除 v11 alias `ZoteroHostMetadataTranslateIdentifierResponse` 的公开引用。`PortableRegularItemDto` 复用 library reads 的 canonical regular-item DTO，不另建 metadata 专用 item 形状。

备选方案（拒绝）：保留 `{ok, item, diagnostics[]}` 形状在其上叠加 outcome 字段——会把正常 outcome 与异常混在一个 optional-field bag 里，正是 ADR §8.3/§17.4 禁止的"靠 optional 字段猜结果可信度"。

### D2（M2）：replaceFile 作为生产 primitive 接入既有 mutation 路由，复用 attachments.create 的 staging 语义

实现并提供 `ZoteroHostAttachmentMutationPrimitives.replaceFile`（当前 838-841 的可选槽位），不改变 `executeAttachmentMutation` 的 reservation/receipt/attempt 机制：

1. **mode 匹配在 admission/validation 阶段完成**：读取目标 link mode，stored-file/stored-URL 只接受 `stored_file` source，linked-file 只接受 `linked_file` source；linked-URL、note image/payload attachment 拒绝（`invalid_request` 或 `unsupported_operation` 按 §17.2 语义选择：member 不适用该目标种类用 `invalid_request` + `invalid_combination`，目标根本不是 file-backed attachment 用 `invalid_ref`/`invalid_request`）。link-mode 不匹配永远 `invalid_request`，不做隐式转换。
2. **stored 路径**：复用 `attachments.create` 已实现的 stored import 校验与 managed staging（同一套 entry count / total bytes / filename / path traversal / duplicate target / symlink policy，DRY，不复制第二份）；filesystem 访问一律 `runtimePersistence` 按调用晚绑定。**原子切换**定义为操作级 commit point：staging 文件先落在同一 Zotero storage 目录内，commit point 是同目录 rename 交换；swap 之前失败 = `failed`（原文件保留、原错误为主错误），swap 之后状态无法确认 = `unknown`，commit 成功但旧 managed content 清理无法确认 = `repair_required` 或 `unknown`，残留进 `residualRefs`。
3. **linked 路径**：只验证新 path 存在、是 regular readable file、canonicalize，然后更新 Zotero link；绝不复制、删除或修改 old/new path 的外部文件。canonical path 相同 → `unchanged`。
4. **unchanged 判定**：stored 比较 content hash + 完整 companion set；linked 比较 canonical path。hash 计算复用 attachment 既有 fingerprint 设施，不新建第二套。
5. **receipt**：`MutationExecutionResult` 的 result 为 `{attachment: AttachmentDetailDto, outcome: "replaced" | "unchanged"}`，receipt 的 changes 记录 before/after revision（现有 `canonicalAttachmentVersion`/`canonicalAttachmentResult` 已具备）；filename/MIME 从实际 source 重新识别。
6. replay 语义由 mutation authority 的 operationId registry 免费获得：同 identity replay 返回原 receipt 与 result snapshot，不重复 staging/swap/cleanup。

备选方案（拒绝）：在 Workflow Host adapter 层实现替换逻辑——违反 broker 是 Zotero capability 语义唯一事实源的硬约束。

### D3（M3）：upsertPayload 对齐 LogicalNotePayloadDto，hash 短路 + 冲突拒绝 + 失败补偿

1. **request DTO**：改为 ADR §11.1 的 `{operationId, noteRef, expectedRevision?, payload: LogicalNotePayloadDto}`，`LogicalNotePayloadDto = {payloadType, noteKind, schemaVersion, format, value}`；`markdown`/`text` 只接受 string value，decoded 超 1 MiB 拒绝；`encoding`/`source`/`attachmentRef`/storage preference 一律 `invalid_request`。删除 broker 内 `payloadFormat: "json"` 硬编码（6695）。
2. **hash 短路**：canonical payload hash 覆盖 logical content + schema identity（payloadType、noteKind、schemaVersion、format、规范化 value），与已存 payload 的 hash 相等时在执行体中直接返回 `unchanged`（receipt 记录 verified state），不重写 note 或 attachment。hash 实现只有一份 Host 事实源。旧 v1/hidden-HTML payload 没有 schema identity，天然不命中 → 按 `replaced` 处理，这与 ADR"schema identity 不同返回 replaced"一致。
3. **冲突拒绝**：同 note 存在多个同 payloadType payload 时，在读/validation 阶段（reservation 之前）抛 stable `conflict` + details reason `ambiguous_state`；不自动挑选、不静默全替（删除现 4034-4061 的全量替换循环语义，替换为：恰好一个旧 payload → 替换；零个 → 创建；多个 → conflict）。
4. **失败补偿**：`importEmbeddedImage` 成功后 note 更新失败 → 尝试删除新 attachment，原失败为主错误，删不掉的进 attempt 的 `residualRefs`；note 已更新但旧 attachment 清理无法确认 → outcome 只能是 `repair_required` 或 `unknown`。这些都走既有 `MutationAuthorityExecutionError`/attempt 通道，不新建错误类型。
5. **result DTO**：`{note: NoteSummaryDto, payload: NotePayloadSummaryDto, outcome: "created" | "replaced" | "unchanged"}`；`NotePayloadSummaryDto` 复用 §11.3 已闭合的 provenance/health 形状（`library.listNotePayloads` 的同一 serializer），不新建第二份 summary。
6. 同步更新 v11 legacy mutations adapter（9412-9489 的 `note.upsertPayload` 分支）对新 result 形状的投影，保持 v11 wire 形状不变（它有自己的 envelope）。

### D4（M4）：notes.create placement union + initialTags 同 operation 提交

1. **request DTO**：`{operationId, placement: {kind:"top_level", libraryId?, collectionRefs?} | {kind:"child", parentRef}, content, initialTags?}`；扁平 `parentRef` 混排、standalone `title` 一律 `invalid_request`。
2. **placement 校验前置**：`top_level` 缺省 libraryId → user library；`collectionRefs` 只允许出现在 `top_level`，全部必须存在、active、同库；`child` 的 library 由 parent 决定且拒绝任何 library/collection 输入。空内容、>50,000 字符、无效 parent、无效/跨库 collection 全部在 commit 前失败（broker admission/validation 阶段）。
3. **initialTags 同一次 Zotero save**：tag 列表先做 bounded 校验，随后在 note item 的同一次 save 中与 content、placement 一起提交——不存在"已提交但未打 tag"的中间态，因此无需 tag 失败补偿；tag 校验失败发生在任何 write 之前。
4. **research import 迁移**：删除 `workflowHostOwners.ts:516-532` 的 create 后 `item.updateTags` 编排，把 `note.tags` 作为 `initialTags` 传入 `notes.create`（placement 用 `child`）。这同时消除了 research import 对 note 的跨 operation 部分失败窗口。

### D5（共享）：错误与 envelope 纪律

- 四个切片的所有失败只使用 §17 closed code + 对应 closed details；mutation acceptance 之后的失败只经 structured attempt（§17.4），acceptance 之前的校验失败抛 stable error。
- 不新增 top-level error code；`unknown`/`repair_required` 只作为 mutation outcome，不作为 error code。
- Host Bridge / MCP projection 不变；三表面语义源如引用这四个 DTO，发布后按治理流程同步评审与重新 materialize（见 proposal Impact）。

## Risks / Trade-offs

- **BREAKING 波及面**：四个 DTO 同时变化会打红一批现有测试与 consumer（metadata curator workflow、research import、102 broker 套件、workflow-* 套件）。→ 同一 change 内迁移全部 consumer 与测试；TDD 逐切片推进，每切片先锁定新契约的测试再改实现，利用 23/87 manifest conformance 证明 surface identity 未变。
- **exact-match 行为回退**：旧实现"取第一个 candidate"在 identifier 规范化有歧义时会假成功；新契约会返回 `not_found`/`ambiguous`。依赖旧行为的 consumer 必须显式处理三态。→ M1 任务内显式迁移 metadata curator，并在测试中固定三态分支。
- **"原子切换"无 OS 级保证**：Zotero 不提供事务性文件交换。→ D2 明确定义操作级 commit point（同目录 rename swap），commit point 前后分别归类 `failed`/`unknown`/`repair_required`，不声称超过实际保证的原子性。
- **hash 短路依赖 envelope 完整性**：v2 envelope 的 `payloadHash` 覆盖范围若与 canonical hash 输入不一致会误判 unchanged。→ canonical hash 单一事实源，unchanged 判定前对 stored payload 重新计算，不信任缓存 hash。
- **M3 request 嵌套化影响 Host Bridge 复用路径**：Host Bridge note payload API 复用 broker upsert。→ 保持其 wire 形状不变，只在 broker 边界做 DTO 归一化（与 v11 legacy adapter 同一模式）。

## Migration Plan

1. 按 M1 → M2 → M3 → M4 顺序逐切片 TDD（顺序无强依赖，按风险从纯读到写排列）；每切片：先写/改契约测试（红）→ 实现 → consumer 迁移 → 相关套件转绿。
2. 每切片完成后跑最小验证集（broker 套件 + 该切片 consumer 套件 + node 契约治理套件）；四切片完成后跑全量 core 套件与 manifest conformance。
3. v12 未对外发布，BREAKING 不发生版本迁移；不需要 v13 或兼容 shim。旧 v11 wire（legacy mutations、Host Bridge note payload API）形状保持不变，由各自 adapter 消化新 result。
4. 回滚策略：四个切片相互独立，单切片问题可单独 revert；无持久化格式变更（payload envelope 格式不变，仅 hash 输入与写入时机变化），无数据迁移。

## Open Questions

- **OQ1**：ADR §11.7 的 `LogicalNotePayloadDto` 引入 `schemaVersion`/`format`，但现有 v2 payload envelope（`buildWorkbenchPayloadEnvelope`）没有 schemaVersion 槽位；schema identity 是持久化进 envelope 还是只作为 canonical hash 输入，ADR 未指明。这不影响 spec（spec 只要求 schema identity 参与 hash 与 unchanged 判定），实现时在 M3 内定夺并记录。
- 未发现 ADR 内部矛盾；ADR 与本 change proposal 措辞差异处（proposal 称 "closed diagnostics union"，ADR §12.0 实为删除开放式 `diagnostics[]`、以三态 outcome + stable taxonomy 取代）已按 ADR 为准处理。
