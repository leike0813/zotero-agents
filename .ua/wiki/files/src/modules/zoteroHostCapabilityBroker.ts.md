
# src/modules/zoteroHostCapabilityBroker.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../layers/zotero-host.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/zoteroHostCapabilityBroker.ts -->

Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。

规模：18619 行
源码：[src/modules/zoteroHostCapabilityBroker.ts](../../../../../src/modules/zoteroHostCapabilityBroker.ts)

## 符号（73）
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:assertPortableRef -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:cancelLibrarySnapshot -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:canonicalAnnotationDetail -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:canonicalAttachmentSummary -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:canonicalMutationPreviewFacts -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:canonicalRegularDetail -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:captureSnapshotItems -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:configureZoteroHostMutationRuntimeForTests -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:configureZoteroHostSnapshotRuntimeForTests -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:consumeTagAuditTraversalCompletionEvidence -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:createCanonicalMutationControl -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:createZoteroHostCapabilityBroker -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeAttachmentMutation -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeCanonicalLiteratureIngest -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeCanonicalMutationLifecycle -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeCanonicalTrashMutation -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeDestructiveCanonicalMutation -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeItemChangeType -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeItemCreate -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeManagedParentSetMutation -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeManagedSemanticMutationEffects -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeNoteMutation -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeOtherCanonicalMutation -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:executeStatusTagTransition -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:exportCanonicalPortableItems -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:findCanonicalIngestIdentityMatchInHost -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:getAllRegularZoteroItems -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:getArtifactReadiness -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:getCanonicalItemAttachments -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:getCanonicalNotePayload -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:getCurrentView -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:getSelectedItems -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:getZoteroHostCanonicalMutationControl -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:importPreparedNoteImages -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:listCanonicalNotePayloads -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:listLibraryCollections -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:listLibraryItems -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:listLibrarySavedSearches -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:normalizeLegacyMigrationCleanupPlan -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:normalizeLiteratureIngestPaper -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:normalizeManagedSemanticRequest -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:normalizeMetadataRequest -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:openReaderLocation -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:openSnapshotSession -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:preflightCanonicalMutationDomain -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:preflightManagedSemanticRequest -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:prepareCanonicalLiteratureIngest -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:prepareLegacyDestructiveMutation -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:previewCanonicalMutation -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:pumpHostSlices -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:readSnapshotSession -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:resetZoteroHostMutationRuntimeForTests -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:resetZoteroHostSliceGateForTests -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:resetZoteroHostSnapshotRuntimeForTests -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:resolveNoteCreateRequest -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:resolveSelectedLibraryIds -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:resolveSelectedLibraryTreeRows -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:resolveZoteroHostCapabilityBroker -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:revealItems -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:selectCollectionCanonical -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:selectLibraryView -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:selectSavedSearch -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:serializeCanonicalItemDetail -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:serializeZoteroItemSummary -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:syncLibrarySnapshot -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:translateMetadataIdentifier -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:traverseLibraryItems -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:upsertNotePayloadAttachment -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:verifyLibraryTraversalCompletionEvidence -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:withPreparedFileCleanup -->
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:withZoteroHostSlice -->
<!-- node: class:src/modules/zoteroHostCapabilityBroker.ts:ZoteroHostCapabilityError -->
<!-- node: class:src/modules/zoteroHostCapabilityBroker.ts:ZoteroManagedArtifactDiagnostic -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertPortableRef | 函数 | 2965–3012 | 复杂 | broker、validation、portable-ref、security | 0 | 校验请求只携带 portable ref，拒绝原生 ID 与宿主路径进入公共面。 |
| cancelLibrarySnapshot | 函数 | 15952–15978 | 简单 | broker、snapshot、cancellation、cleanup | 0 | 取消进行中的库快照并释放其持有的资源。 |
| canonicalAnnotationDetail | 函数 | 2109–2198 | 复杂 | broker、projection、annotation、dto | 0 | 把批注投影为 canonical detail，含文本、定位与所属附件引用。 |
| canonicalAttachmentSummary | 函数 | 1799–1836 | 简单 | broker、projection、attachment、canonical | 0 | 把附件投影为 canonical summary，含链接模式与角色。 |
| canonicalMutationPreviewFacts | 函数 | 14494–14820 | 复杂 | broker、preview、facts、mutation | 0 | 汇总预览所需的 canonical 事实：实体观察值、预期差异与影响范围。 |
| canonicalRegularDetail | 函数 | 1917–1978 | 复杂 | broker、projection、canonical、dto | 0 | 把常规文献条目投影为 canonical detail DTO，字段命名与语义由 Broker 独占定义。 |
| captureSnapshotItems | 函数 | 15680–15850 | 复杂 | broker、snapshot、batching、bounds | 0 | 批量抓取条目快照，按批大小分片执行并维护游标。 |
| configureZoteroHostMutationRuntimeForTests | 函数 | 17760–17772 | 简单 | test、seam、mutation、exported | 0 | 注入测试用变更运行时。 |
| configureZoteroHostSnapshotRuntimeForTests | 函数 | 1042–1056 | 简单 | test、seam、snapshot、exported | 0 | 注入测试用快照运行时。 |
| consumeTagAuditTraversalCompletionEvidence | 函数 | 15322–15342 | 简单 | broker、evidence、consumption、exported | 0 | 消费一次标签审计的遍历完成证据，保证一次性使用。 |
| createCanonicalMutationControl | 函数 | 9339–9741 | 复杂 | broker、mutation、control、orchestration | 0 | 创建 canonical mutation 的执行控制面，串起预检、审批、durable winner、宿主写入与终态证据。 |
| [createZoteroHostCapabilityBroker](../../../symbols/src/modules/zoteroHostCapabilityBroker.ts/createZoteroHostCapabilityBroker.md) | 函数 | 17292–17754 | 复杂 | broker、factory、capability、exported | 2 | 创建 Broker 实例：装配只读能力、canonical mutation 控制、快照会话与导航适配器，是全部宿主能力的唯一构造入口。 |
| executeAttachmentMutation | 函数 | 13367–13976 | 复杂 | broker、mutation、attachment、execution | 0 | 执行附件创建或替换：受管暂存、身份校验后创建 Zotero attachment，失败时删除新建条目。 |
| executeCanonicalLiteratureIngest | 函数 | 4706–4996 | 复杂 | broker、ingest、transaction、execution | 0 | 执行文献摄取：在一个宿主 slice 与原生事务中提交身份检查与条目创建，审批后身份变化判为 stale。 |
| executeCanonicalMutationLifecycle | 函数 | 9753–9796 | 复杂 | broker、mutation、lifecycle、orchestration | 0 | 驱动一次 canonical mutation 的完整生命周期并返回 typed 结果。 |
| executeCanonicalTrashMutation | 函数 | 8610–8660 | 中等 | broker、mutation、trash、execution | 0 | 执行 canonical 回收站变更。 |
| executeDestructiveCanonicalMutation | 函数 | 7008–7310 | 复杂 | broker、mutation、destructive、execution | 0 | 执行破坏性 canonical mutation（删除、移入回收站），要求重校验后才真正写入。 |
| executeItemChangeType | 函数 | 5788–5922 | 复杂 | broker、mutation、item-type、execution | 0 | 变更条目类型，校验目标类型允许的字段与关联附件。 |
| executeItemCreate | 函数 | 5585–5786 | 复杂 | broker、mutation、item-create、execution | 0 | 在宿主事务内创建常规文献条目，并按提交后的实体观察值构造结果。 |
| executeManagedParentSetMutation | 函数 | 10109–11912 | 复杂 | broker、mutation、managed-note、parent-set | 0 | 处理受管父子引用集变更：校验依赖、生成 legacy 清理计划并作为同一 authority operation 的必需收尾执行。 |
| executeManagedSemanticMutationEffects | 函数 | 8165–8500 | 复杂 | broker、mutation、managed-note、execution | 0 | 执行受管语义变更的宿主效果，父引用集在一次私有写入中提交。 |
| executeNoteMutation | 函数 | 12710–13247 | 复杂 | broker、mutation、note、execution | 0 | 执行笔记创建或更新：构造受管笔记 HTML、绑定图片槽位并写入笔记负载。 |
| executeOtherCanonicalMutation | 函数 | 6354–7006 | 复杂 | broker、mutation、execution、native-transaction | 0 | 执行条目/分类/关系等非破坏性 canonical mutation 的宿主效果。 |
| executeStatusTagTransition | 函数 | 11983–12134 | 复杂 | broker、mutation、tag、state-transition | 0 | 执行状态标签的合法状态迁移，非法迁移直接拒绝。 |
| exportCanonicalPortableItems | 函数 | 18557–18619 | 复杂 | broker、export、portable-ref、security | 0 | 把条目导出为可移植引用集合，剔除原生 ID 与本地路径。 |
| findCanonicalIngestIdentityMatchInHost | 函数 | 4523–4630 | 复杂 | broker、ingest、identity、query | 0 | 在宿主源端按编译出的 SQL 查找已存在的摄取身份候选，超出上限整体拒绝。 |
| getAllRegularZoteroItems | 函数 | 2923–2941 | 简单 | broker、query、library、exported | 0 | 取回全部常规文献条目，供遍历与统计使用。 |
| getArtifactReadiness | 函数 | 16165–16201 | 简单 | broker、readiness、delegation、exported | 0 | 对外提供库级产物就绪度查询，内部委托就绪度评估模块。 |
| getCanonicalItemAttachments | 函数 | 18399–18484 | 复杂 | broker、attachment、read、query | 0 | 读取条目的全部附件详情，含链接附件与文件事实。 |
| getCanonicalNotePayload | 函数 | 18274–18397 | 复杂 | broker、note-payload、read、pagination | 0 | 读取条目某个笔记负载的完整详情，按页返回以控制单次读取量。 |
| getCurrentView | 函数 | 16484–16531 | 简单 | broker、navigation、view、exported | 0 | 返回当前 Zotero 视图（库、分类或已保存检索）的 canonical 描述。 |
| getSelectedItems | 函数 | 16370–16482 | 复杂 | broker、selection、projection、exported | 0 | 返回当前选中条目的 canonical 事实，含所在分类与父项关系。 |
| [getZoteroHostCanonicalMutationControl](../../../symbols/src/modules/zoteroHostCapabilityBroker.ts/getZoteroHostCanonicalMutationControl.md) | 函数 | 9743–9751 | 复杂 | broker、mutation、authority、exported | 1 | 取得 canonical mutation 的执行控制面，durable insert winner 与审批流程都由此驱动。 |
| importPreparedNoteImages | 函数 | 12592–12708 | 复杂 | broker、note-image、transaction、import | 0 | 把 prepared 图片在原生事务中导入为笔记附件并绑定到图片槽位。 |
| listCanonicalNotePayloads | 函数 | 18199–18272 | 复杂 | broker、note-payload、query、listing | 0 | 列出条目下的全部 canonical 笔记负载摘要。 |
| listLibraryCollections | 函数 | 15170–15234 | 中等 | broker、query、collection、pagination | 0 | 分页列出库分类，含 canonical 路径。 |
| listLibraryItems | 函数 | 15033–15121 | 复杂 | broker、query、pagination、exported | 0 | 分页列出库条目，返回 portable ref、摘要与下一页游标。 |
| listLibrarySavedSearches | 函数 | 15236–15295 | 中等 | broker、query、saved-search、pagination | 0 | 分页列出已保存检索。 |
| normalizeLegacyMigrationCleanupPlan | 函数 | 9867–9953 | 复杂 | broker、migration、cleanup、validation | 0 | 规范化 legacy 清理计划，限定其删除范围在已批准清单内。 |
| normalizeLiteratureIngestPaper | 函数 | 3913–4012 | 复杂 | broker、ingest、normalization、literature | 0 | 规范化文献摄取请求：校验标识、作者与字段，并保留来源事实。 |
| normalizeManagedSemanticRequest | 函数 | 7547–7694 | 复杂 | broker、mutation、normalization、managed-note | 0 | 规范化受管语义变更请求：解析 kind、绑定 portable ref 并拒绝超出范围的操作。 |
| normalizeMetadataRequest | 函数 | 2298–2350 | 复杂 | broker、metadata、normalization、validation | 0 | 规范化元数据创建请求的字段、作者与集合归属。 |
| openReaderLocation | 函数 | 16965–17231 | 复杂 | broker、navigation、reader、exported | 0 | 在捕获窗口的内置标签页中打开 Reader 的指定位置，禁止全局复用 Reader。 |
| openSnapshotSession | 函数 | 15852–15894 | 简单 | broker、snapshot、session、lifecycle | 0 | 打开一个只读快照会话并登记其取消句柄。 |
| preflightCanonicalMutationDomain | 函数 | 8917–9210 | 复杂 | broker、preflight、mutation、validation | 0 | 对任一 canonical mutation 做无副作用预检：校验输入、绑定范围与 revision，产出私有 prepared plan 与实体观察值。 |
| preflightManagedSemanticRequest | 函数 | 7769–7873 | 复杂 | broker、preflight、managed-note、mutation | 0 | 对受管语义变更做无副作用预检并产出私有 prepared plan。 |
| prepareCanonicalLiteratureIngest | 函数 | 4632–4688 | 复杂 | broker、ingest、preparation、identity | 0 | 准备文献摄取：合并身份候选、锁定 operationId 并产出待写入条目。 |
| prepareLegacyDestructiveMutation | 函数 | 14147–14369 | 复杂 | broker、preflight、destructive、mutation | 0 | 为旧式破坏性变更准备预检计划，绑定实体观察值以供重校验。 |
| previewCanonicalMutation | 函数 | 14822–14980 | 复杂 | broker、preview、mutation、exported | 0 | 产出 canonical mutation 的公开预览计划，不产生任何副作用。 |
| pumpHostSlices | 函数 | 17801–17850 | 简单 | broker、slice、queue、scheduler | 0 | 驱动待处理宿主 slice 队列，按窗口顺序推进执行。 |
| readSnapshotSession | 函数 | 15980–16073 | 复杂 | broker、snapshot、session、read | 0 | 从快照会话读取已抓取的分页数据，会话失效即失败。 |
| resetZoteroHostMutationRuntimeForTests | 函数 | 17774–17777 | 简单 | test、seam、mutation、exported | 0 | 重置变更运行时注入配置。 |
| resetZoteroHostSliceGateForTests | 函数 | 17893–17909 | 简单 | test、seam、slice、exported | 0 | 重置宿主 slice 闸门的状态。 |
| resetZoteroHostSnapshotRuntimeForTests | 函数 | 1058–1062 | 简单 | test、seam、snapshot、exported | 0 | 重置快照运行时注入配置。 |
| resolveNoteCreateRequest | 函数 | 3339–3521 | 复杂 | broker、note、resolution、managed-note | 0 | 解析笔记创建请求：判定受管 kind、构造内容并绑定图片槽位。 |
| resolveSelectedLibraryIds | 函数 | 891–928 | 简单 | broker、selection、navigation、exported | 0 | 解析当前选中的条目 ID 集合。 |
| resolveSelectedLibraryTreeRows | 函数 | 867–889 | 简单 | broker、selection、navigation、exported | 0 | 把当前选中集合解析为有序 canonical 行事实，供导航类能力使用。 |
| resolveZoteroHostCapabilityBroker | 函数 | 17756–17758 | 简单 | broker、resolution、lifecycle、exported | 0 | 解析当前生效的 Broker 实例，供投影层在多次重建后仍定位到正确 owner。 |
| revealItems | 函数 | 16829–16948 | 复杂 | broker、navigation、effect、exported | 0 | 在 Zotero 中定位并选中给定条目，结果需以请求捕获的可信窗口为准。 |
| selectCollectionCanonical | 函数 | 16801–16827 | 简单 | broker、navigation、collection、effect | 0 | 把选中集合切换为给定 canonical 分类。 |
| selectLibraryView | 函数 | 16734–16768 | 简单 | broker、navigation、view、effect | 0 | 切换到目标库视图的 canonical 引用。 |
| selectSavedSearch | 函数 | 16770–16799 | 简单 | broker、navigation、saved-search、effect | 0 | 把选中集合切换为给定已保存检索。 |
| serializeCanonicalItemDetail | 函数 | 2200–2220 | 简单 | broker、serialization、canonical、dto | 0 | 序列化任意条目的 canonical detail，统一字段顺序与缺失值表达。 |
| serializeZoteroItemSummary | 函数 | 1300–1333 | 简单 | broker、serialization、dto、exported | 0 | 把 Zotero 条目序列化为跨边界可传输的摘要 DTO，只暴露 portable ref 与展示字段。 |
| syncLibrarySnapshot | 函数 | 16075–16114 | 复杂 | broker、snapshot、sync | 0 | 同步库快照到最新状态，返回变更统计。 |
| translateMetadataIdentifier | 函数 | 2480–2625 | 复杂 | broker、metadata、translator、bounded | 0 | 通过 Zotero 元数据翻译器解析标识并给出有界候选结果。 |
| traverseLibraryItems | 函数 | 15413–15616 | 复杂 | broker、traversal、evidence、bounds | 0 | 有界遍历整库条目，签发并消费完成证据，未走完全程不得视为可信。 |
| upsertNotePayloadAttachment | 函数 | 5072–5424 | 复杂 | broker、note-payload、upsert、attachment | 0 | 写入或更新笔记负载块及其内嵌附件，保持逻辑哈希与锚点状态一致。 |
| verifyLibraryTraversalCompletionEvidence | 函数 | 15310–15320 | 简单 | broker、evidence、verification、exported | 0 | 校验一次库遍历确实完整走完，未完成时拒绝其结论。 |
| withPreparedFileCleanup | 函数 | 9252–9337 | 复杂 | broker、cleanup、prepared-files、scoped | 0 | 在给定作用域内持有 prepared 文件，无论成功或失败都执行清理。 |
| withZoteroHostSlice | 函数 | 17852–17891 | 简单 | broker、transaction、slice、serialization | 0 | 在单个宿主 slice 内执行回调，保证同一窗口上的写入串行且不跨窗口。 |
| ZoteroHostCapabilityError | 类 | 462–482 | 简单 | error、broker、capability、exported | 0 | 宿主能力错误：携带 schema、retryable 与结构化 details，供 MCP、CLI 与工作流面统一映射。 |
| ZoteroManagedArtifactDiagnostic | 类 | 494–507 | 简单 | diagnostics、artifact、retryable | 0 | 受管产物诊断：说明某个引用或产物缺失的具体原因与是否可重试。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [bibliography.ts](../workflows/bibliography.ts.md) | src/workflows/bibliography.ts | 工作流参考文献渲染 owner：按 bibliography 格式调用 Zotero 内置 export translator 渲染书目，并规范化格式选项与 portable ref 输入。 |
| [builtinTagPolicy.ts](synthesis/builtinTagPolicy.ts.md) | src/modules/synthesis/builtinTagPolicy.ts | Synthesis 内置状态标签策略的 SSOT：定义 status facet 的固定标签集合、可变/不可变字段，并在词表保存与协议写回时强制保护这些内置语义不被用户覆盖。 |
| [index.ts](../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [libraryArtifactReadiness.ts](zoteroHost/libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [literatureArtifacts.ts](../../packages/synthesis-contracts/src/literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |
| [notePayloadCodec.ts](zoteroHost/notePayloadCodec.ts.md) | src/modules/zoteroHost/notePayloadCodec.ts | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [referenceProjection.ts](../../packages/synthesis-application/src/referenceProjection.ts.md) | packages/synthesis-application/src/referenceProjection.ts | 参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。 |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeCompatibility.ts](../utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [sourceReferenceArtifact.ts](../../packages/synthesis-contracts/src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [types.ts](../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](../workflows/workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [workflowStoredAttachmentImport.ts](../workflows/workflowStoredAttachmentImport.ts.md) | src/workflows/workflowStoredAttachmentImport.ts | 已存附件的受管暂存：规范化伴随文件相对路径、拒绝越界与重复项，在创建 Zotero attachment 之前完成校验并返回带 cleanup 的暂存句柄。 |
| [zoteroHostBrokerPrimitives.ts](zoteroHost/zoteroHostBrokerPrimitives.ts.md) | src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts | Broker 的原生写入原语集合：封装 Zotero.Item 的保存、删除、作者更新、元数据写入、分类更新与链接附件创建，供 Broker 在原生事务内调用。 |
| [zoteroHostMutationAuthority.ts](zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |
| [zoteroHostMutationSchemas.ts](../schemas/zoteroHostMutationSchemas.ts.md) | src/schemas/zoteroHostMutationSchemas.ts | Zotero 宿主变更的 JSON Schema 契约：定义 note detail、managed note 写入、文献产物 upsert 与各 mutation 操作的输入/预览/执行结果 schema 及其按操作索引的映射表。 |
| [zoteroHostNativeMutations.ts](zoteroHost/zoteroHostNativeMutations.ts.md) | src/modules/zoteroHost/zoteroHostNativeMutations.ts | Zotero 宿主原生 mutation 执行层：把已审批的写操作落到原生 transaction 与 Zotero API，覆盖元数据创建、附件写入等 canonical mutation 路径。 |
| [zoteroHostPreparedFiles.ts](zoteroHost/zoteroHostPreparedFiles.ts.md) | src/modules/zoteroHost/zoteroHostPreparedFiles.ts | 已准备文件的事实描述层：为受管附件的主文件与伴随文件计算相对路径、大小与 sha256 摘要，形成可被审批与重放校验的不可变快照。 |
| [zoteroHostTrash.ts](zoteroHost/zoteroHostTrash.ts.md) | src/modules/zoteroHost/zoteroHostTrash.ts | 宿主回收站变更的准备与执行：按 portable ref 解析目标条目、采集变更前版本与实体观察值，先产出无副作用的预检结果，再执行实际的置入回收站。 |
| [zoteroLibraryPageQuery.ts](zoteroHost/zoteroLibraryPageQuery.ts.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |
| [zoteroManagedNotes.ts](zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |
| [zoteroNotePayloadResolver.ts](zoteroHost/zoteroNotePayloadResolver.ts.md) | src/modules/zoteroHost/zoteroNotePayloadResolver.ts | 笔记负载解析器：按条目分页列出笔记中的 payload 块，必要时从笔记附件中读取并校验内嵌负载字节，为引用图谱与产物读取提供统一的取数入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpContextBuilder.ts](acp/chat/acpContextBuilder.ts.md) | src/modules/acp/chat/acpContextBuilder.ts | 构造随 prompt 发给 ACP Agent 的宿主上下文：当前选中条目、library 范围与 Reader 位置，统一收敛为 AcpHostContext 结构。 |
| [assistantWorkspaceActionRouter.ts](assistant/workspace/assistantWorkspaceActionRouter.ts.md) | src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts | 工作区动作路由：解析 action 的 owner 后分派给对应后端处理（权限、模型、推理档、队列取消、transcript 分页加载等），并为子面板动作提供统一入口。 |
| [dashboardSnapshot.ts](dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [hostApi.ts](../workflows/hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [hostBridgeCapabilityRegistry.ts](hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeCapabilityRoutes.ts](hostBridge/server/routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeMutationAdapter.ts](hostBridge/server/hostBridgeMutationAdapter.ts.md) | src/modules/hostBridge/server/hostBridgeMutationAdapter.ts | canonical mutation 的适配层：把 Host Bridge 的 mutation 请求转成 ZoteroHostCapabilityBroker 的 canonical mutation 操作，并缓存 prepared 资源以复用文件与授权事实。 |
| [hostBridgeServer.ts](hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeWorkflowAgentRun.ts](hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [libraryAdapter.ts](synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [libraryArtifactsColumn.ts](libraryArtifactsColumn.ts.md) | src/modules/libraryArtifactsColumn.ts | 为 Zotero 文献库列表注册「文献产物」与「文献评分」两个虚拟列，负责单元格数据供给、渲染、缓存与防抖刷新。 |
| [literatureArtifactMigration.ts](literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [selectionContext.ts](selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [synthesisReverseHostHandlers.ts](synthesis/reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |
| [tagEffectAdapter.ts](synthesis/tagEffectAdapter.ts.md) | src/modules/synthesis/tagEffectAdapter.ts | Synthesis 标签 effect port 实现：经 Broker 写入受审批的标签绑定，并支持 staged tag binding 的解析与迁移。 |
| [types.ts](../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowExecute.ts](workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowHostClient.ts](synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |
| [workflowHostOwners.ts](../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowMenu.ts](workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowParameterOptions.ts](workflow/settings/workflowParameterOptions.ts.md) | src/modules/workflow/settings/workflowParameterOptions.ts | 工作流动态参数候选项的来源解析器，按参数声明的来源类型从 Synthesis sidecar 合约或 Zotero Host 能力 Broker 拉取可选值并附带诊断信息。 |
| [zoteroMcpProtocol.ts](hostBridge/mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| configureZoteroHostMutationRuntimeForTests | 函数 | 17760–17772 | 注入测试用变更运行时。 |
| configureZoteroHostSnapshotRuntimeForTests | 函数 | 1042–1056 | 注入测试用快照运行时。 |
| consumeTagAuditTraversalCompletionEvidence | 函数 | 15322–15342 | 消费一次标签审计的遍历完成证据，保证一次性使用。 |
| [createZoteroHostCapabilityBroker](../../../symbols/src/modules/zoteroHostCapabilityBroker.ts/createZoteroHostCapabilityBroker.md) | 函数 | 17292–17754 | 创建 Broker 实例：装配只读能力、canonical mutation 控制、快照会话与导航适配器，是全部宿主能力的唯一构造入口。 |
| getAllRegularZoteroItems | 函数 | 2923–2941 | 取回全部常规文献条目，供遍历与统计使用。 |
| [getZoteroHostCanonicalMutationControl](../../../symbols/src/modules/zoteroHostCapabilityBroker.ts/getZoteroHostCanonicalMutationControl.md) | 函数 | 9743–9751 | 取得 canonical mutation 的执行控制面，durable insert winner 与审批流程都由此驱动。 |
| resetZoteroHostMutationRuntimeForTests | 函数 | 17774–17777 | 重置变更运行时注入配置。 |
| resetZoteroHostSliceGateForTests | 函数 | 17893–17909 | 重置宿主 slice 闸门的状态。 |
| resetZoteroHostSnapshotRuntimeForTests | 函数 | 1058–1062 | 重置快照运行时注入配置。 |
| resolveSelectedLibraryIds | 函数 | 891–928 | 解析当前选中的条目 ID 集合。 |
| resolveSelectedLibraryTreeRows | 函数 | 867–889 | 把当前选中集合解析为有序 canonical 行事实，供导航类能力使用。 |
| resolveZoteroHostCapabilityBroker | 函数 | 17756–17758 | 解析当前生效的 Broker 实例，供投影层在多次重建后仍定位到正确 owner。 |
| serializeZoteroItemSummary | 函数 | 1300–1333 | 把 Zotero 条目序列化为跨边界可传输的摘要 DTO，只暴露 portable ref 与展示字段。 |
| verifyLibraryTraversalCompletionEvidence | 函数 | 15310–15320 | 校验一次库遍历确实完整走完，未完成时拒绝其结论。 |
| ZoteroHostCapabilityError | 类 | 462–482 | 宿主能力错误：携带 schema、retryable 与结构化 details，供 MCP、CLI 与工作流面统一映射。 |
