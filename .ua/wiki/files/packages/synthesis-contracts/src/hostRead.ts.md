
# packages/synthesis-contracts/src/hostRead.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/hostRead.ts -->

宿主只读合约：定义文献条目分页、按 ref 批量读取、artifact 扫描与就绪度查询、artifact 读取的分页请求与结果重建，以及文献质量评估。
源码：[packages/synthesis-contracts/src/hostRead.ts](../../../../../../packages/synthesis-contracts/src/hostRead.ts)

## 符号（9）
<!-- node: function:packages/synthesis-contracts/src/hostRead.ts:rebuildArtifactDescriptor -->
<!-- node: function:packages/synthesis-contracts/src/hostRead.ts:rebuildArtifactReadResult -->
<!-- node: function:packages/synthesis-contracts/src/hostRead.ts:rebuildLibraryItem -->
<!-- node: function:packages/synthesis-contracts/src/hostRead.ts:rebuildLiteratureQuality -->
<!-- node: function:packages/synthesis-contracts/src/hostRead.ts:rebuildPageFields -->
<!-- node: function:packages/synthesis-contracts/src/hostRead.ts:rebuildSynthesisHostArtifactReadinessRequest -->
<!-- node: function:packages/synthesis-contracts/src/hostRead.ts:rebuildArtifactScanPageRequest -->
<!-- node: function:packages/synthesis-contracts/src/hostRead.ts:rebuildSynthesisHostLibraryItemsByRefResult -->
<!-- node: function:packages/synthesis-contracts/src/hostRead.ts:rebuildSynthesisHostPageRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [rebuildArtifactDescriptor](../../../../symbols/packages/synthesis-contracts/src/hostRead.ts/rebuildArtifactDescriptor.md) | 函数 | 584–658 | 复杂 | artifact、描述符、校验、宿主读取、核心 | 1 | 重建 artifact 描述符：校验类型、相对路径、字节大小、哈希与时间戳，输出可供扫描列表使用的规范条目。 |
| rebuildArtifactReadResult | 函数 | 731–833 | 复杂 | artifact、读取、结果、有界 | 0 | 重建 artifact 读取结果：按类型返回规范化内容（文献元数据或解析文本）、哈希与截断诊断。 |
| rebuildLibraryItem | 函数 | 227–283 | 复杂 | 宿主读取、文献条目、校验、DTO | 0 | 重建文献条目 DTO：校验 itemKey、标题、作者、年份、DOI 与标签集合的形状与上限。 |
| rebuildLiteratureQuality | 函数 | 483–582 | 复杂 | 质量评估、宿主读取、打分、核心 | 0 | 重建文献质量评估：综合摘要、附件、标签、DOI 等维度打分，输出等级、缺失项与可改进建议。 |
| [rebuildPageFields](../../../../symbols/packages/synthesis-contracts/src/hostRead.ts/rebuildPageFields.md) | 函数 | 285–311 | 中等 | 分页、归一化、有界 | 2 | 归一化通用分页字段（limit、cursor、total、hasMore），非法取值统一收敛到允许区间。 |
| rebuildSynthesisHostArtifactReadinessRequest | 函数 | 462–481 | 简单 | 就绪度、请求校验、artifact | 1 | 重建 artifact 就绪度查询请求：绑定目标 ref 与期望的 artifact 类型集合。 |
| rebuildSynthesisHostArtifactScanPageRequest | 函数 | 411–460 | 复杂 | 分页、有界、artifact、请求校验 | 0 | 重建 artifact 扫描分页请求：归一化 artifact 类型过滤、游标与分页上限，避免全库无界扫描。 |
| rebuildSynthesisHostLibraryItemsByRefResult | 函数 | 386–409 | 中等 | 批量读取、结果、宿主读取 | 1 | 重建按 ref 批量读取的结果：保持请求顺序、标注缺失条目并施加返回数量上限。 |
| rebuildSynthesisHostPageRequest | 函数 | 313–338 | 中等 | 分页、请求校验、宿主读取 | 1 | 重建宿主分页读取请求：校验库 ID、排序字段与分页参数，拒绝越界 limit。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [librarySnapshot.ts](librarySnapshot.ts.md) | packages/synthesis-contracts/src/librarySnapshot.ts | Zotero 文献库快照契约：定义快照请求、条目、完成证据与分页结果的 schema 常量、范围/顺序/批量上限，并提供对应的严格重建函数。 |
| [literatureArtifacts.ts](literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [referenceProjection.ts](../../synthesis-application/src/referenceProjection.ts.md) | packages/synthesis-application/src/referenceProjection.ts | 参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。 |
| [referenceRefreshApplication.ts](referenceRefreshApplication.ts.md) | packages/synthesis-contracts/src/referenceRefreshApplication.ts | 参考文献刷新应用契约：prepare/apply/page 请求，以及条目、描述符与文献质量快照的严格重建。 |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [rebuildArtifactDescriptor](../../../../symbols/packages/synthesis-contracts/src/hostRead.ts/rebuildArtifactDescriptor.md) | 函数 | 584–658 | 重建 artifact 描述符：校验类型、相对路径、字节大小、哈希与时间戳，输出可供扫描列表使用的规范条目。 |
| rebuildArtifactReadResult | 函数 | 731–833 | 重建 artifact 读取结果：按类型返回规范化内容（文献元数据或解析文本）、哈希与截断诊断。 |
| rebuildLiteratureQuality | 函数 | 483–582 | 重建文献质量评估：综合摘要、附件、标签、DOI 等维度打分，输出等级、缺失项与可改进建议。 |
| rebuildSynthesisHostArtifactReadinessRequest | 函数 | 462–481 | 重建 artifact 就绪度查询请求：绑定目标 ref 与期望的 artifact 类型集合。 |
| rebuildSynthesisHostArtifactScanPageRequest | 函数 | 411–460 | 重建 artifact 扫描分页请求：归一化 artifact 类型过滤、游标与分页上限，避免全库无界扫描。 |
| rebuildSynthesisHostLibraryItemsByRefResult | 函数 | 386–409 | 重建按 ref 批量读取的结果：保持请求顺序、标注缺失条目并施加返回数量上限。 |
| rebuildSynthesisHostPageRequest | 函数 | 313–338 | 重建宿主分页读取请求：校验库 ID、排序字段与分页参数，拒绝越界 limit。 |
