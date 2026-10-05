
# src/modules/synthesis/libraryAdapter.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/libraryAdapter.ts -->

Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。
源码：[src/modules/synthesis/libraryAdapter.ts](../../../../../../src/modules/synthesis/libraryAdapter.ts)

## 符号（12）
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:buildCitationGraphInputsFromRegistryInputs -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:buildLibraryIndexFromRegistryInputs -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:childNotes -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:createZoteroSynthesisHostReadPort -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:decodeArtifactLocator -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:encodeArtifactLocator -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:extractReferences -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:hostArtifactDescriptor -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:hostItemSummaries -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:metadataFingerprintFromItem -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:payloadBlocksForInput -->
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:readArtifactsFromRegistryInputs -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildCitationGraphInputsFromRegistryInputs | 函数 | 787–804 | 简单 | citation-graph、投影、synthesis | 1 | 把注册表输入投影为引用图谱构建所需的文献与引用输入集合。 |
| buildLibraryIndexFromRegistryInputs | 函数 | 558–588 | 中等 | 索引、library、synthesis | 1 | 按 libraryId 构建条目与集合的索引结构，供后续产物扫描按 ref 快速定位。 |
| [childNotes](../../../../symbols/src/modules/synthesis/libraryAdapter.ts/childNotes.md) | 函数 | 309–388 | 复杂 | managed-note、broker、分类 | 1 | 读取条目的子笔记列表，并按 managed note kind 区分 digest、references 与 citation-analysis 等语义。 |
| createZoteroSynthesisHostReadPort | 函数 | 1248–1572 | 复杂 | port-实现、host-read、synthesis、分页、核心 | 0 | 构造 Synthesis 宿主读 port：实现条目分页、单条目读取、产物扫描页与产物就绪查询等全部读能力。 |
| decodeArtifactLocator | 函数 | 1146–1178 | 中等 | 解析、locator、文献产物 | 0 | 解析产物定位符，还原其 ref、产物类型与 kind 等定位信息。 |
| encodeArtifactLocator | 函数 | 1130–1144 | 简单 | locator、编码、文献产物 | 1 | 把 ref、产物类型与 kind 编码为产物定位符字符串，供后续按需定位产物。 |
| extractReferences | 函数 | 739–785 | 中等 | 引用、projection、citation-graph | 0 | 从 payload 块中抽取 reference 记录并按角色归类，形成引用图谱输入。 |
| hostArtifactDescriptor | 函数 | 1180–1228 | 中等 | 投影、契约、文献产物 | 1 | 把内部产物记录投影为契约要求的 host artifact descriptor。 |
| hostItemSummaries | 函数 | 1109–1128 | 简单 | 投影、契约、批量 | 1 | 批量把条目投影为契约要求的 library item summary 列表。 |
| metadataFingerprintFromItem | 函数 | 463–493 | 中等 | 指纹、增量刷新、sidecar | 0 | 从条目元数据生成指纹，用于 sidecar 索引的增量刷新判断。 |
| [payloadBlocksForInput](../../../../symbols/src/modules/synthesis/libraryAdapter.ts/payloadBlocksForInput.md) | 函数 | 606–681 | 复杂 | payload、解析、文献产物 | 1 | 从条目输入中提取全部 payload 块，识别各块对应的产物类型与解析状态。 |
| [readArtifactsFromRegistryInputs](../../../../symbols/src/modules/synthesis/libraryAdapter.ts/readArtifactsFromRegistryInputs.md) | 函数 | 829–1016 | 复杂 | 产物读取、诊断、host-read | 2 | 按需读取条目产物内容并返回描述符与状态，同时区分宿主读取失败与产物缺失两类诊断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraph.ts](citationGraph.ts.md) | src/modules/synthesis/citationGraph.ts | Citation Graph 投影层：把文献与引用输入归一为稳定 reference key，去重合并 canonical paper 后调用 synthesis-engine 计算统一引用图谱。 |
| [foundation.ts](foundation.ts.md) | src/modules/synthesis/foundation.ts | Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。 |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [libraryArtifactReadiness.ts](../zoteroHost/libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [literatureScore.ts](../../shared/literatureScore.ts.md) | src/shared/literatureScore.ts | 文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。 |
| [registry.ts](registry.ts.md) | src/modules/synthesis/registry.ts | 文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。 |
| [runtimeCompatibility.ts](../../utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [sourceReferenceArtifact.ts](../../../packages/synthesis-contracts/src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroLibraryPageQuery.ts](../zoteroHost/zoteroLibraryPageQuery.ts.md) | src/modules/zoteroHost/zoteroLibraryPageQuery.ts | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisReverseHostHandlers.ts](reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |
| [zoteroReadonlyLibraryAdapter.ts](../harness/zoteroReadonlyLibraryAdapter.ts.md) | src/modules/harness/zoteroReadonlyLibraryAdapter.ts | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildCitationGraphInputsFromRegistryInputs | 函数 | 787–804 | 把注册表输入投影为引用图谱构建所需的文献与引用输入集合。 |
| buildLibraryIndexFromRegistryInputs | 函数 | 558–588 | 按 libraryId 构建条目与集合的索引结构，供后续产物扫描按 ref 快速定位。 |
| createZoteroSynthesisHostReadPort | 函数 | 1248–1572 | 构造 Synthesis 宿主读 port：实现条目分页、单条目读取、产物扫描页与产物就绪查询等全部读能力。 |
| [readArtifactsFromRegistryInputs](../../../../symbols/src/modules/synthesis/libraryAdapter.ts/readArtifactsFromRegistryInputs.md) | 函数 | 829–1016 | 按需读取条目产物内容并返回描述符与状态，同时区分宿主读取失败与产物缺失两类诊断。 |
