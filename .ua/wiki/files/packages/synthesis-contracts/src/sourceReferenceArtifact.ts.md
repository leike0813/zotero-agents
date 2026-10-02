
# packages/synthesis-contracts/src/sourceReferenceArtifact.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/sourceReferenceArtifact.ts -->

Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。
源码：[packages/synthesis-contracts/src/sourceReferenceArtifact.ts](../../../../../../packages/synthesis-contracts/src/sourceReferenceArtifact.ts)

## 符号（15）
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:attachReferencesBasis -->
<!-- node: class:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:CanonicalLiteratureArtifactValidationError -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:compactCitationAnalysisSnippets -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:ensureSourceReferenceId -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:exportCanonicalCitationAnalysisArtifact -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:generateSourceReferenceId -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:parseCitationAnalysisArtifact -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:parseSourceReferenceArtifact -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:parseStoredCitationAnalysisArtifact -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:snippetWithMarkerContext -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:toCitationAnalysisInput -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:validateCanonicalArtifactJson -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:validateCitationAgainstReferences -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:validateCitationAnalysisArtifact -->
<!-- node: function:packages/synthesis-contracts/src/sourceReferenceArtifact.ts:validateSourceReferenceArtifact -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| attachReferencesBasis | 函数 | 503–510 | 简单 | basis、可追溯、citation-graph | 0 | 为 citation analysis 附加其 references 基础集合指纹，使引用结论可回溯到具体输入版本。 |
| CanonicalLiteratureArtifactValidationError | 类 | 168–176 | 简单 | 错误类型、校验、合约 | 0 | canonical literature artifact 校验失败时抛出的类型化错误，携带结构化问题列表供 UI 与 Agent 读取。 |
| compactCitationAnalysisSnippets | 函数 | 417–454 | 中等 | snippet、压缩、artifact | 0 | 压缩 citation analysis 中所有 snippet 的上下文长度并去重，控制 artifact 体积。 |
| ensureSourceReferenceId | 函数 | 207–215 | 简单 | id-生成、归一化、references | 0 | 为缺失 ID 的 source reference 补齐生成 ID，已有 ID 时原样保留。 |
| exportCanonicalCitationAnalysisArtifact | 函数 | 558–572 | 简单 | 导出、canonical、citation-graph | 0 | 将 citation analysis 导出为 canonical 形式（含 schema 引用与 ID 稳定性保证），供跨语言 sidecar 使用。 |
| generateSourceReferenceId | 函数 | 186–205 | 简单 | id-生成、确定性、references | 0 | 由文献关键字段派生确定性的 source reference ID，保证同一文献在不同运行中得到稳定标识。 |
| parseCitationAnalysisArtifact | 函数 | 370–378 | 简单 | 解析、citation-graph、artifact | 0 | 解析并返回通过校验的 citation analysis artifact。 |
| parseSourceReferenceArtifact | 函数 | 324–331 | 简单 | 解析、references、artifact | 1 | 校验通过后返回强类型的 source reference artifact，供下游引用图谱消费。 |
| parseStoredCitationAnalysisArtifact | 函数 | 516–546 | 中等 | 解析、持久化、citation-graph | 0 | 解析持久化存储中的 citation analysis artifact，附加存储形态的兼容处理。 |
| snippetWithMarkerContext | 函数 | 380–415 | 中等 | snippet、截断、citation-graph | 0 | 按引用标记位置截取带上下文的正文 snippet，控制单条证据长度同时保留可读语义。 |
| toCitationAnalysisInput | 函数 | 575–579 | 简单 | 投影、citation-graph、合约 | 0 | 将 citation analysis artifact 投影为 sidecar 消费的计算输入形态。 |
| validateCanonicalArtifactJson | 函数 | 247–286 | 中等 | 校验、artifact、结构校验 | 0 | 针对 canonical artifact JSON 做大小、深度与必填字段的通用结构校验，产出统一的问题列表。 |
| validateCitationAgainstReferences | 函数 | 456–501 | 中等 | 校验、交叉校验、references | 0 | 交叉校验 citation analysis 引用的文献是否真实存在于 source reference 集合中，拦截悬空引用。 |
| validateCitationAnalysisArtifact | 函数 | 333–368 | 中等 | 校验、citation-graph、artifact | 0 | 校验 citation analysis artifact 的引用列表、snippet 标记与结构约束。 |
| validateSourceReferenceArtifact | 函数 | 301–322 | 简单 | 校验、references、artifact | 0 | 校验 source reference artifact 的必需字段、标识一致性与其引用的 JSON Schema。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [citation-analysis-artifact.schema.json](../contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json.md) | packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json | canonical literature artifacts v1 契约集中引用分析产物（citation_analysis_artifact.v1）的 JSON Schema，规定 meta / summary / timeline / items / unresolved 六个必填顶层字段，并用 $defs 描述引用条目 CitationItem、引用功能枚举、mention 行号与 snippet、early/mid/recent 时间线分桶、scope 决策与参考文献抽取状态。 |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [source-reference-artifact.schema.json](../contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json.md) | packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json | canonical literature artifacts v1 契约集中来源引用产物（source_reference_artifact.v1）的 JSON Schema，要求 references 数组（上限 25000 条），每条含 sourceReferenceId、extraction 抽取置信度、bibliography 书目字段与 matching 的 DOI/ISBN/citekey 等匹配标识，是引用分析产物所依赖的引用事实来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [converter.ts](../../../src/modules/literatureArtifactMigration/converter.ts.md) | src/modules/literatureArtifactMigration/converter.ts | legacy 文献产物到 canonical 产物的纯转换器：解析旧 payload 标签、匹配 source reference、归一 citation 结构并输出转换分类与诊断。 |
| [libraryAdapter.ts](../../../src/modules/synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [literatureArtifactMigration.ts](../../../src/modules/literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [literatureArtifacts.ts](literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |
| [referenceProjection.ts](../../synthesis-application/src/referenceProjection.ts.md) | packages/synthesis-application/src/referenceProjection.ts | 参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。 |
| [registry.ts](../../../src/modules/synthesis/registry.ts.md) | src/modules/synthesis/registry.ts | 文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。 |
| [researchBundleService.ts](../../../src/modules/hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [types.ts](../../../src/workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflow.ts](workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |
| [zoteroHostCapabilityBroker.ts](../../../src/modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroManagedNotes.ts](../../../src/modules/zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| attachReferencesBasis | 函数 | 503–510 | 为 citation analysis 附加其 references 基础集合指纹，使引用结论可回溯到具体输入版本。 |
| CanonicalLiteratureArtifactValidationError | 类 | 168–176 | canonical literature artifact 校验失败时抛出的类型化错误，携带结构化问题列表供 UI 与 Agent 读取。 |
| compactCitationAnalysisSnippets | 函数 | 417–454 | 压缩 citation analysis 中所有 snippet 的上下文长度并去重，控制 artifact 体积。 |
| ensureSourceReferenceId | 函数 | 207–215 | 为缺失 ID 的 source reference 补齐生成 ID，已有 ID 时原样保留。 |
| exportCanonicalCitationAnalysisArtifact | 函数 | 558–572 | 将 citation analysis 导出为 canonical 形式（含 schema 引用与 ID 稳定性保证），供跨语言 sidecar 使用。 |
| generateSourceReferenceId | 函数 | 186–205 | 由文献关键字段派生确定性的 source reference ID，保证同一文献在不同运行中得到稳定标识。 |
| parseCitationAnalysisArtifact | 函数 | 370–378 | 解析并返回通过校验的 citation analysis artifact。 |
| parseSourceReferenceArtifact | 函数 | 324–331 | 校验通过后返回强类型的 source reference artifact，供下游引用图谱消费。 |
| parseStoredCitationAnalysisArtifact | 函数 | 516–546 | 解析持久化存储中的 citation analysis artifact，附加存储形态的兼容处理。 |
| toCitationAnalysisInput | 函数 | 575–579 | 将 citation analysis artifact 投影为 sidecar 消费的计算输入形态。 |
| validateCanonicalArtifactJson | 函数 | 247–286 | 针对 canonical artifact JSON 做大小、深度与必填字段的通用结构校验，产出统一的问题列表。 |
| validateCitationAgainstReferences | 函数 | 456–501 | 交叉校验 citation analysis 引用的文献是否真实存在于 source reference 集合中，拦截悬空引用。 |
| validateCitationAnalysisArtifact | 函数 | 333–368 | 校验 citation analysis artifact 的引用列表、snippet 标记与结构约束。 |
| validateSourceReferenceArtifact | 函数 | 301–322 | 校验 source reference artifact 的必需字段、标识一致性与其引用的 JSON Schema。 |
