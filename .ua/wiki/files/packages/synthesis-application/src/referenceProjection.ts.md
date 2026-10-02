
# packages/synthesis-application/src/referenceProjection.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/referenceProjection.ts -->

参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。
源码：[packages/synthesis-application/src/referenceProjection.ts](../../../../../../packages/synthesis-application/src/referenceProjection.ts)

## 符号（8）
<!-- node: function:packages/synthesis-application/src/referenceProjection.ts:buildSynthesisCanonicalReferenceRecord -->
<!-- node: function:packages/synthesis-application/src/referenceProjection.ts:classifySynthesisReferenceQuality -->
<!-- node: function:packages/synthesis-application/src/referenceProjection.ts:contentTokens -->
<!-- node: function:packages/synthesis-application/src/referenceProjection.ts:hashSynthesisReferenceProjection -->
<!-- node: function:packages/synthesis-application/src/referenceProjection.ts:projectSynthesisReferencePayloads -->
<!-- node: function:packages/synthesis-application/src/referenceProjection.ts:renderCitationAnalysisMarkdown -->
<!-- node: function:packages/synthesis-application/src/referenceProjection.ts:reportItemFromCitation -->
<!-- node: function:packages/synthesis-application/src/referenceProjection.ts:synthesisReferenceIdentity -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSynthesisCanonicalReferenceRecord | 函数 | 553–582 | 中等 | 规范化、参考文献、实体构造 | 0 | 由归一化字段构建 canonical reference 记录，生成稳定引用标识并补齐缺失的年份与作者。 |
| classifySynthesisReferenceQuality | 函数 | 139–186 | 中等 | 质量分级、参考文献、启发式 | 0 | 按标题、作者、标识符等字段的可用性把参考文献分为可信、可用与残缺三档，并识别仅元数据标题与纯作者噪声标题。 |
| contentTokens | 函数 | 74–104 | 中等 | 分词、参考文献、纯函数 | 1 | 把标题与作者串切分为去重后的内容 token 集合，供匹配与噪声过滤使用。 |
| hashSynthesisReferenceProjection | 函数 | 734–784 | 复杂 | hash、canonical-json、basis、参考文献 | 0 | 对整个参考文献投影取 canonical JSON 哈希，作为 reference refresh 判定是否需要重算的 basis。 |
| [projectSynthesisReferencePayloads](../../../../symbols/packages/synthesis-application/src/referenceProjection.ts/projectSynthesisReferencePayloads.md) | 函数 | 595–732 | 复杂 | 投影、参考文献、去重、有界、核心 | 1 | 从 source/artifact 中投影出 raw、canonical 与 binding 三类参考文献载荷，按 itemKey 索引去重并施加规模上限。 |
| [renderCitationAnalysisMarkdown](../../../../symbols/packages/synthesis-application/src/referenceProjection.ts/renderCitationAnalysisMarkdown.md) | 函数 | 393–531 | 复杂 | markdown-渲染、引用分析、参考文献、核心 | 1 | 把引用分析结果渲染为 Markdown 报告：按角色归组引用条目，生成带编号的引用列表与正文首次提及标记。 |
| reportItemFromCitation | 函数 | 355–371 | 简单 | 引用分析、参考文献、组装 | 0 | 由引用条目与参考文献记录组装报告中的引用行，输出作者年份标签与引用序号。 |
| synthesisReferenceIdentity | 函数 | 537–551 | 简单 | 实体判定、参考文献、去重 | 0 | 综合 citekey、DOI 等标识符与归一化标题作者，判定一条参考文献是否与既有记录为同一实体。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-contracts/src/canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [canonicalJson.ts](../../synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [hostRead.ts](../../synthesis-contracts/src/hostRead.ts.md) | packages/synthesis-contracts/src/hostRead.ts | 宿主只读合约：定义文献条目分页、按 ref 批量读取、artifact 扫描与就绪度查询、artifact 读取的分页请求与结果重建，以及文献质量评估。 |
| [referenceMatcher.ts](../../synthesis-engine/src/referenceMatcher.ts.md) | packages/synthesis-engine/src/referenceMatcher.ts | 参考文献匹配引擎：从原始引文文本抽取标识符、归一化标题、聚类去重并按策略解析为 canonical reference，是引用图谱与引用分析的前置计算核心。 |
| [referenceRefresh.ts](../../synthesis-repository/src/referenceRefresh.ts.md) | packages/synthesis-repository/src/referenceRefresh.ts | 引用刷新仓储：维护 raw/canonical reference、artifact、source 与 binding 行的 canonical 重建，并支持按来源删除与整体投影替换。 |
| [sourceReferenceArtifact.ts](../../synthesis-contracts/src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [referenceRefreshApplication.ts](referenceRefreshApplication.ts.md) | packages/synthesis-application/src/referenceRefreshApplication.ts | 参考文献刷新应用层：按 source 描述符判定增量或全量刷新计划，合并新旧 source/artifact/raw reference 行，并以 basis 哈希守卫 repository 投影替换。 |
| [researchBundleService.ts](../../../src/modules/hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [zoteroHostCapabilityBroker.ts](../../../src/modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSynthesisCanonicalReferenceRecord | 函数 | 553–582 | 由归一化字段构建 canonical reference 记录，生成稳定引用标识并补齐缺失的年份与作者。 |
| classifySynthesisReferenceQuality | 函数 | 139–186 | 按标题、作者、标识符等字段的可用性把参考文献分为可信、可用与残缺三档，并识别仅元数据标题与纯作者噪声标题。 |
| hashSynthesisReferenceProjection | 函数 | 734–784 | 对整个参考文献投影取 canonical JSON 哈希，作为 reference refresh 判定是否需要重算的 basis。 |
| [projectSynthesisReferencePayloads](../../../../symbols/packages/synthesis-application/src/referenceProjection.ts/projectSynthesisReferencePayloads.md) | 函数 | 595–732 | 从 source/artifact 中投影出 raw、canonical 与 binding 三类参考文献载荷，按 itemKey 索引去重并施加规模上限。 |
| [renderCitationAnalysisMarkdown](../../../../symbols/packages/synthesis-application/src/referenceProjection.ts/renderCitationAnalysisMarkdown.md) | 函数 | 393–531 | 把引用分析结果渲染为 Markdown 报告：按角色归组引用条目，生成带编号的引用列表与正文首次提及标记。 |
| synthesisReferenceIdentity | 函数 | 537–551 | 综合 citekey、DOI 等标识符与归一化标题作者，判定一条参考文献是否与既有记录为同一实体。 |
