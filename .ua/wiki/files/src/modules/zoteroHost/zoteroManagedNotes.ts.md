
# src/modules/zoteroHost/zoteroManagedNotes.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[src/modules/zoteroHost](../../../../modules/src/modules/zoteroHost.md)
<!-- node: file:src/modules/zoteroHost/zoteroManagedNotes.ts -->

受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。

规模：1974 行
源码：[src/modules/zoteroHost/zoteroManagedNotes.ts](../../../../../../src/modules/zoteroHost/zoteroManagedNotes.ts)

## 符号（28）
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:assertLiteratureArtifactApplyAnalysisRequest -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:assertManagedWriteWithinLimit -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:classifyManagedNoteContent -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:classifyManagedNoteTransfer -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:deriveCitationHealth -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:finalizeManagedNoteDetail -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:inspectManagedNote -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:literatureScoreRadarSvg -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:managedArtifactContent -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:managedMarkdownPayload -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:managedNoteKindHint -->
<!-- node: class:src/modules/zoteroHost/zoteroManagedNotes.ts:ManagedNoteOwnerError -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:managedRepresentativeImageFromHtml -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:managedSourceRefFromHtml -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:migrationPayloadValue -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:normalizeArtifactMarkdown -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:normalizePayload -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:readAllPayloadBlocksForMigration -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:readLegacyManagedNoteForMigration -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:readManagedNoteDetail -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:renderCitationAnalysisBody -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:renderLiteratureScoreBody -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:renderReferencesBody -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:reservedMarker -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:semanticBlockHash -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:semanticBlockValue -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:transferPayloadSummaryFromBlock -->
<!-- node: function:src/modules/zoteroHost/zoteroManagedNotes.ts:transferPayloadValueFromBlock -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertLiteratureArtifactApplyAnalysisRequest | 函数 | 1341–1528 | 中等 | validation、artifact、citation-graph、exported | 0 | 校验文献产物应用分析请求，范围、依赖与身份绑定错误均在此拒绝。 |
| assertManagedWriteWithinLimit | 函数 | 1877–1904 | 简单 | validation、resource-limit、managed-note | 0 | 校验受管笔记写入尺寸在限额内。 |
| classifyManagedNoteContent | 函数 | 806–887 | 中等 | managed-note、classification、exported | 0 | 把笔记内容分类为具体的受管 kind 与负载类型。 |
| classifyManagedNoteTransfer | 函数 | 964–1101 | 中等 | migration、classification、exported | 0 | 判定旧受管笔记的迁移目标 kind 与所需动作。 |
| deriveCitationHealth | 函数 | 1260–1276 | 简单 | citation-graph、derivation、health | 1 | 由引用分析负载推导引用健康度指标。 |
| finalizeManagedNoteDetail | 函数 | 658–679 | 简单 | managed-note、composition、dto、exported | 0 | 把分类与渲染结果收敛为受管笔记详情 DTO。 |
| inspectManagedNote | 函数 | 1530–1583 | 中等 | managed-note、inspection、classification、exported | 1 | 检查一条笔记是否为受管笔记，并返回其分类与摘要。 |
| literatureScoreRadarSvg | 函数 | 460–501 | 简单 | literature-score、rendering、svg | 0 | 把评分维度渲染为雷达图 SVG。 |
| managedArtifactContent | 函数 | 1760–1875 | 中等 | managed-note、composition、content、exported | 1 | 构建受管笔记的渲染内容，含结构化与 Markdown 两种形态。 |
| managedMarkdownPayload | 函数 | 1709–1758 | 简单 | managed-note、markdown、payload | 0 | 解析受管笔记的 Markdown 主体负载。 |
| managedNoteKindHint | 函数 | 695–720 | 简单 | managed-note、classification、hint | 0 | 从负载类型推断受管笔记的 kind 提示。 |
| ManagedNoteOwnerError | 类 | 85–98 | 简单 | error、managed-note、diagnostics、exported | 0 | 受管笔记 owner 错误：承载 kind、依赖失败等诊断信息，并区分是否可重试。 |
| managedRepresentativeImageFromHtml | 函数 | 420–454 | 简单 | managed-note、image、extraction | 0 | 从笔记 HTML 中提取代表性图片引用。 |
| managedSourceRefFromHtml | 函数 | 401–418 | 简单 | managed-note、parsing、provenance | 0 | 从笔记 HTML 中解析其声明的来源文献引用。 |
| migrationPayloadValue | 函数 | 231–252 | 简单 | migration、note-payload、utility | 0 | 从迁移上下文中提取负载值。 |
| normalizeArtifactMarkdown | 函数 | 1916–1934 | 简单 | normalization、markdown、artifact | 0 | 规范化产物 Markdown 正文，剥离不可用标记。 |
| normalizePayload | 函数 | 1103–1253 | 中等 | managed-note、normalization、validation | 0 | 规范化受管笔记负载：校验 schema、裁剪字段并拒绝非法结构。 |
| readAllPayloadBlocksForMigration | 函数 | 200–229 | 简单 | migration、note-payload、reading | 0 | 读取笔记中全部负载块，供旧负载迁移使用。 |
| readLegacyManagedNoteForMigration | 函数 | 259–356 | 中等 | migration、managed-note、reading、exported | 0 | 按旧 schema 读取受管笔记并返回其负载与来源事实。 |
| readManagedNoteDetail | 函数 | 1622–1707 | 中等 | managed-note、reading、dto、exported | 0 | 读取受管笔记的完整详情 DTO。 |
| renderCitationAnalysisBody | 函数 | 573–631 | 中等 | rendering、citation-graph、html | 0 | 渲染引用分析笔记的正文区块。 |
| renderLiteratureScoreBody | 函数 | 503–531 | 简单 | literature-score、rendering、html | 0 | 渲染文献评分笔记的正文区块。 |
| renderReferencesBody | 函数 | 533–571 | 简单 | rendering、references、html | 0 | 渲染参考文献笔记的正文区块。 |
| reservedMarker | 函数 | 722–754 | 简单 | managed-note、marker、html | 0 | 构造受管笔记的保留标记行，用于锚定负载块位置。 |
| semanticBlockHash | 函数 | 777–788 | 简单 | managed-note、hash、semantics | 0 | 计算负载块的语义哈希，忽略资源型字段。 |
| semanticBlockValue | 函数 | 756–775 | 简单 | managed-note、semantics、extraction | 0 | 从负载块中提取参与语义比较的字段。 |
| transferPayloadSummaryFromBlock | 函数 | 931–957 | 简单 | migration、note-payload、summary | 0 | 汇总负载块的迁移摘要而不加载完整值。 |
| transferPayloadValueFromBlock | 函数 | 907–929 | 简单 | migration、note-payload、extraction | 0 | 从负载块中提取可迁移的负载值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [literatureArtifacts.ts](../../../packages/synthesis-contracts/src/literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |
| [literatureScore.ts](../../shared/literatureScore.ts.md) | src/shared/literatureScore.ts | 文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。 |
| [notePayloadCodec.ts](notePayloadCodec.ts.md) | src/modules/zoteroHost/notePayloadCodec.ts | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |
| [sourceReferenceArtifact.ts](../../../packages/synthesis-contracts/src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](../../workflows/workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [zoteroHostMutationAuthority.ts](../zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |
| [zoteroNotePayloadResolver.ts](zoteroNotePayloadResolver.ts.md) | src/modules/zoteroHost/zoteroNotePayloadResolver.ts | 笔记负载解析器：按条目分页列出笔记中的 payload 块，必要时从笔记附件中读取并校验内嵌负载字节，为引用图谱与产物读取提供统一的取数入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostApi.ts](../../workflows/hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [libraryArtifactReadiness.ts](libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [literatureArtifactMigration.ts](../literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [workflowHostOwners.ts](../../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroReadonlyLibraryAdapter.ts](../harness/zoteroReadonlyLibraryAdapter.ts.md) | src/modules/harness/zoteroReadonlyLibraryAdapter.ts | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertLiteratureArtifactApplyAnalysisRequest | 函数 | 1341–1528 | 校验文献产物应用分析请求，范围、依赖与身份绑定错误均在此拒绝。 |
| classifyManagedNoteContent | 函数 | 806–887 | 把笔记内容分类为具体的受管 kind 与负载类型。 |
| classifyManagedNoteTransfer | 函数 | 964–1101 | 判定旧受管笔记的迁移目标 kind 与所需动作。 |
| deriveCitationHealth | 函数 | 1260–1276 | 由引用分析负载推导引用健康度指标。 |
| finalizeManagedNoteDetail | 函数 | 658–679 | 把分类与渲染结果收敛为受管笔记详情 DTO。 |
| inspectManagedNote | 函数 | 1530–1583 | 检查一条笔记是否为受管笔记，并返回其分类与摘要。 |
| managedArtifactContent | 函数 | 1760–1875 | 构建受管笔记的渲染内容，含结构化与 Markdown 两种形态。 |
| managedMarkdownPayload | 函数 | 1709–1758 | 解析受管笔记的 Markdown 主体负载。 |
| managedNoteKindHint | 函数 | 695–720 | 从负载类型推断受管笔记的 kind 提示。 |
| ManagedNoteOwnerError | 类 | 85–98 | 受管笔记 owner 错误：承载 kind、依赖失败等诊断信息，并区分是否可重试。 |
| readLegacyManagedNoteForMigration | 函数 | 259–356 | 按旧 schema 读取受管笔记并返回其负载与来源事实。 |
| readManagedNoteDetail | 函数 | 1622–1707 | 读取受管笔记的完整详情 DTO。 |
| transferPayloadValueFromBlock | 函数 | 907–929 | 从负载块中提取可迁移的负载值。 |
