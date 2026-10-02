
# packages/synthesis-contracts/src/protocolSchema.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/protocolSchema.ts -->

按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。
源码：[packages/synthesis-contracts/src/protocolSchema.ts](../../../../../../packages/synthesis-contracts/src/protocolSchema.ts)

## 符号（6）
<!-- node: function:packages/synthesis-contracts/src/protocolSchema.ts:protocolAjv -->
<!-- node: function:packages/synthesis-contracts/src/protocolSchema.ts:rebuildProtocolJsonValue -->
<!-- node: function:packages/synthesis-contracts/src/protocolSchema.ts:rebuildSynthesisProtocolCapabilityDto -->
<!-- node: function:packages/synthesis-contracts/src/protocolSchema.ts:rebuildSynthesisProtocolDto -->
<!-- node: function:packages/synthesis-contracts/src/protocolSchema.ts:rebuildSynthesisProtocolWorkerDto -->
<!-- node: function:packages/synthesis-contracts/src/protocolSchema.ts:registryLocation -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| protocolAjv | 函数 | 83–92 | 简单 | validation、schema-definition、protocol | 0 | 按 contract-set 的 schema 初始化 Ajv 校验器实例。 |
| rebuildProtocolJsonValue | 函数 | 94–115 | 简单 | validation、protocol、serialization | 0 | 把 schema 校验通过的值收敛为协议 JSON 值类型。 |
| rebuildSynthesisProtocolCapabilityDto | 函数 | 182–233 | 中等 | contract、rebuild、capability-registry | 0 | 重建 capability 描述 DTO，校验标识、边界与策略字段。 |
| rebuildSynthesisProtocolDto | 函数 | 117–167 | 中等 | contract、rebuild、protocol | 0 | 按 schema 校验并重建 sidecar 协议 DTO，是 wire 数据的统一入口。 |
| rebuildSynthesisProtocolWorkerDto | 函数 | 235–292 | 中等 | contract、rebuild、protocol | 0 | 重建 worker 描述 DTO，校验 worker 种类与并发参数。 |
| registryLocation | 函数 | 169–180 | 简单 | schema-definition、protocol、lookup | 0 | 从 registry.json 推导指定 schema 的相对位置。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citation-analysis-artifact.schema.json](../contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json.md) | packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/citation-analysis-artifact.schema.json | canonical literature artifacts v1 契约集中引用分析产物（citation_analysis_artifact.v1）的 JSON Schema，规定 meta / summary / timeline / items / unresolved 六个必填顶层字段，并用 $defs 描述引用条目 CitationItem、引用功能枚举、mention 行号与 snippet、early/mid/recent 时间线分桶、scope 决策与参考文献抽取状态。 |
| [client-artifact-library-debug.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/client-artifact-library-debug.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-artifact-library-debug.schema.json | 定义 Artifact Library 客户端读取与调试快照的 JSON Schema，约束产物筛选、分页调试视图、导出状态以及文献质量与作者等字段。 |
| [client-citation-graph.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/client-citation-graph.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-citation-graph.schema.json | 定义 Citation Graph 客户端查询协议的 JSON Schema，涵盖 basis 基础校验、图谱/切片查询、布局与度量读取以及更新命令。 |
| [client-concept-topic-graph.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/client-concept-topic-graph.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-concept-topic-graph.schema.json | 定义概念知识库与主题图谱客户端协议的 JSON Schema，包含概念查询、概念知识库查询、主题图谱变更结果与索引重建请求。 |
| [client-reference-canonical.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/client-reference-canonical.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-reference-canonical.schema.json | 定义 canonical Reference 客户端协议的 JSON Schema，约束文献索引请求与结果、排序请求以及刷新/匹配回执结构。 |
| [client-tag.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/client-tag.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-tag.schema.json | 定义标签客户端协议的 JSON Schema，覆盖标签协议条目、标签清单与快照、保存请求、父级绑定以及校验警告。 |
| [client-topic-workbench.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/client-topic-workbench.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-topic-workbench.schema.json | 定义 Topic Workbench 客户端 surface 协议的 JSON Schema，是本协议集中最大的 DTO 契约，约束主题记录、列表分页结果、主题上下文与更新意图。 |
| [client-webdav-maintenance.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json | 定义 WebDAV 维护客户端协议的 JSON Schema，包含连接测试与诊断、冲突报告条目、同步状态、进度与上次运行记录。 |
| [client-workflow-review.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/client-workflow-review.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-workflow-review.schema.json | 定义工作流审阅客户端协议的 JSON Schema，约束审阅请求、结构化主题与时间线内容、注册表覆盖行以及缺失产物诊断。 |
| [common.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/common.schema.json | 协议集共用基础 JSON Schema，提供 identifier、sha256、sidecarError、opaqueCanonicalJson 与 canonicalTextChunk 等跨域通用定义。 |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [compute.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/compute.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/compute.schema.json | 定义 sidecar 计算能力协议的 JSON Schema，涵盖引用图谱布局请求/结果（force、radial、component 参数）与度量请求/结果。 |
| [lifecycle.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/lifecycle.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/lifecycle.schema.json | 定义 sidecar 生命周期协议的 JSON Schema，包含启动配置 v4、发现文档 v2/生产发现 v5、平台签名与反向宿主描述。 |
| [observability.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/observability.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/observability.schema.json | 定义可观测性协议的 JSON Schema，统一 trace 上下文、身份、指标与事实字段，承载 sidecar 运行时观测事件。 |
| [registry.json](../contract-set/synthesis-sidecar-protocol-v1/registry.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json | sidecar 协议 v1 的注册表，本批最大的契约文件，系统登记全部 capability、worker 与 DTO 的 schema 标识、版本和 wire 结构，供 protocolSchema 与插件侧校验共用。 |
| [reverse-host.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json | 定义 sidecar 反向调用 Zotero 宿主能力的通道协议 JSON Schema，包含库条目引用、库快照请求/引用/标识与结构化诊断。 |
| [runtime-bundle.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/runtime-bundle.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/runtime-bundle.schema.json | 定义运行时 bundle 协议的 JSON Schema，描述 bundle v3、指针 v2、相对路径文件条目与来源证明（Provenance）。 |
| [source-reference-artifact.schema.json](../contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json.md) | packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json | canonical literature artifacts v1 契约集中来源引用产物（source_reference_artifact.v1）的 JSON Schema，要求 references 数组（上限 25000 条），每条含 sourceReferenceId、extraction 抽取置信度、bibliography 书目字段与 matching 的 DOI/ISBN/citekey 等匹配标识，是引用分析产物所依赖的引用事实来源。 |
| [system.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/system.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/system.schema.json | 定义 system 能力协议的 JSON Schema，包含握手请求/结果、健康检查、关闭请求、能力描述与仓库/计算池/传输快照。 |
| [topic-domain.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json | 定义 topic domain 领域模型的 JSON Schema，是主题、解析器、摘要引用、已解析文献与产物元数据等领域实体的公共结构来源。 |
| [transfer.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/transfer.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/transfer.schema.json | 定义数据传输面协议的 JSON Schema，涵盖分页描述符（引用输入/输出、内容页）、库节点、引用行、图节点与解析边及归属信息。 |
| [worker.schema.json](../contract-set/synthesis-sidecar-protocol-v1/schemas/worker.schema.json.md) | packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/worker.schema.json | 定义 worker 作业协议的 JSON Schema，涵盖标签条目与标签协议、标签词表校验的运行头/输入段/结果头等作业消息结构。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [concepts.ts](concepts.ts.md) | packages/synthesis-contracts/src/concepts.ts | 概念审阅客户端合约：定义 concepts 子客户端的读方法与审阅动作枚举，并重建 capability 描述结果供插件侧协商能力。 |
| [debug.ts](debug.ts.md) | packages/synthesis-contracts/src/debug.ts | 调试子客户端合约：声明 debug 能力的方法签名，并重建 capability 结果，把可用的调试命令与维护入口暴露给宿主。 |
| [libraryIndex.ts](libraryIndex.ts.md) | packages/synthesis-contracts/src/libraryIndex.ts | 文献库索引合约：定义 libraryIndex 子客户端方法与索引结果结构（文献数、artifact 覆盖度与索引哈希），并重建 capability 结果。 |
| [references.ts](references.ts.md) | packages/synthesis-contracts/src/references.ts | 参考文献域契约：canonical revision 审阅动作、匹配提案动作枚举，以及 reference capability 结果重建。 |
| [sidecarSystem.ts](sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [tags.ts](tags.ts.md) | packages/synthesis-contracts/src/tags.ts | 标签域契约：词表 regulator 导出、审计 staging 条目、verified commit DTO 与 tag capability 结果重建。 |
| [topicGraph.ts](topicGraph.ts.md) | packages/synthesis-contracts/src/topicGraph.ts | 主题图谱审阅动作枚举与 topic graph capability 结果重建。 |
| [topics.ts](topics.ts.md) | packages/synthesis-contracts/src/topics.ts | 主题查询契约：list / find / context / resolver / workflow options 的请求与结果重建。 |
| [workbench.ts](workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |
| [workflow.ts](workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |
| [workflowReview.ts](workflowReview.ts.md) | packages/synthesis-contracts/src/workflowReview.ts | 工作流审阅契约：审阅请求与结果重建，聚合 topic domain 与引用图谱数据。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisProtocolCapabilityDto | 函数 | 182–233 | 重建 capability 描述 DTO，校验标识、边界与策略字段。 |
| rebuildSynthesisProtocolDto | 函数 | 117–167 | 按 schema 校验并重建 sidecar 协议 DTO，是 wire 数据的统一入口。 |
| rebuildSynthesisProtocolWorkerDto | 函数 | 235–292 | 重建 worker 描述 DTO，校验 worker 种类与并发参数。 |
