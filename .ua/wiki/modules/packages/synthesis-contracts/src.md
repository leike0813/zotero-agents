
# packages/synthesis-contracts/src
> 目录聚合页：53 个文件、366 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [packages/synthesis-contracts/src/canonicalJson.ts](../../../files/packages/synthesis-contracts/src/canonicalJson.ts.md) | 文件 | 6 | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [packages/synthesis-contracts/src/citationGraphApplication.ts](../../../files/packages/synthesis-contracts/src/citationGraphApplication.ts.md) | 文件 | 8 | 引用图谱应用层合约：定义 slice/metrics/layout/rebuild/refresh-metrics 请求与 inspect、mutation 结果的判别式重建函数，施加统一的字段精确性与规模上限。 |
| [packages/synthesis-contracts/src/client.ts](../../../files/packages/synthesis-contracts/src/client.ts.md) | 文件 | 0 | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |
| [packages/synthesis-contracts/src/common.ts](../../../files/packages/synthesis-contracts/src/common.ts.md) | 文件 | 5 | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [packages/synthesis-contracts/src/conceptKbApplication.ts](../../../files/packages/synthesis-contracts/src/conceptKbApplication.ts.md) | 文件 | 13 | 概念知识库应用层合约（1155 行，全批最大合约文件）：逐字段重建概念、义项、别名、关系、proposal、审阅项与主题链接，并定义 replace/ingest/review/delete/query 等请求与 mutation 结果。 |
| [packages/synthesis-contracts/src/conceptKbCore.ts](../../../files/packages/synthesis-contracts/src/conceptKbCore.ts.md) | 文件 | 0 | 概念知识库索引核心类型：定义概念状态、置信度枚举，以及索引概念、义项、别名、查询请求与结果的共享结构，被 application 合约与 engine 共用。 |
| [packages/synthesis-contracts/src/concepts.ts](../../../files/packages/synthesis-contracts/src/concepts.ts.md) | 文件 | 1 | 概念审阅客户端合约：定义 concepts 子客户端的读方法与审阅动作枚举，并重建 capability 描述结果供插件侧协商能力。 |
| [packages/synthesis-contracts/src/debug.ts](../../../files/packages/synthesis-contracts/src/debug.ts.md) | 文件 | 1 | 调试子客户端合约：声明 debug 能力的方法签名，并重建 capability 结果，把可用的调试命令与维护入口暴露给宿主。 |
| [packages/synthesis-contracts/src/debugMaintenance.ts](../../../files/packages/synthesis-contracts/src/debugMaintenance.ts.md) | 文件 | 5 | 调试与维护合约：定义调试快照、缓存项、操作项与隔离快照结构，提供有界分页构造、诊断重建与两个快照之间的差异比较。 |
| [packages/synthesis-contracts/src/durableBundle.ts](../../../files/packages/synthesis-contracts/src/durableBundle.ts.md) | 文件 | 5 | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |
| [packages/synthesis-contracts/src/durableBundleImport.ts](../../../files/packages/synthesis-contracts/src/durableBundleImport.ts.md) | 文件 | 6 | durable bundle 导入合约：构建同步索引，校验导入条目路径与载荷标量，规范化 live envelope 并把条目分类为可新增、可更新、可跳过三类事实。 |
| [packages/synthesis-contracts/src/exportDelivery.ts](../../../files/packages/synthesis-contracts/src/exportDelivery.ts.md) | 文件 | 7 | 宿主导出交付合约：校验导出条目集合（数量、单条与总体字节上限、控制字符、路径形状），并定义导出请求、传输请求与运行工作区物化请求/结果。 |
| [packages/synthesis-contracts/src/graph.ts](../../../files/packages/synthesis-contracts/src/graph.ts.md) | 文件 | 0 | 引用图谱客户端合约：定义布局算法枚举、布局与指标刷新请求、命令结果状态集合，以及节点、边、窗口等 wire DTO。本文件为纯类型声明。 |
| [packages/synthesis-contracts/src/hostRead.ts](../../../files/packages/synthesis-contracts/src/hostRead.ts.md) | 文件 | 9 | 宿主只读合约：定义文献条目分页、按 ref 批量读取、artifact 扫描与就绪度查询、artifact 读取的分页请求与结果重建，以及文献质量评估。 |
| [packages/synthesis-contracts/src/index.ts](../../../files/packages/synthesis-contracts/src/index.ts.md) | 文件 | 0 | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [packages/synthesis-contracts/src/itemRef.ts](../../../files/packages/synthesis-contracts/src/itemRef.ts.md) | 文件 | 1 | Zotero 条目引用合约：校验 libraryId 与 itemKey 的组合，提供稳定的比较函数、键构造函数与批量重建，供跨边界传递 portable refs。 |
| [packages/synthesis-contracts/src/knowledgeCheckpoint.ts](../../../files/packages/synthesis-contracts/src/knowledgeCheckpoint.ts.md) | 文件 | 8 | 知识检查点合约：定义三类知识 basis（标签修订、概念清单、主题图）、载荷结构与计数族，并重建检查点对象与 apply 请求。 |
| [packages/synthesis-contracts/src/libraryIndex.ts](../../../files/packages/synthesis-contracts/src/libraryIndex.ts.md) | 文件 | 1 | 文献库索引合约：定义 libraryIndex 子客户端方法与索引结果结构（文献数、artifact 覆盖度与索引哈希），并重建 capability 结果。 |
| [packages/synthesis-contracts/src/librarySnapshot.ts](../../../files/packages/synthesis-contracts/src/librarySnapshot.ts.md) | 文件 | 8 | Zotero 文献库快照契约：定义快照请求、条目、完成证据与分页结果的 schema 常量、范围/顺序/批量上限，并提供对应的严格重建函数。 |
| [packages/synthesis-contracts/src/lifecycle.ts](../../../files/packages/synthesis-contracts/src/lifecycle.ts.md) | 文件 | 0 | 跨域生命周期契约：聚合 sidecar 启动对账、数据库重置、公共维护操作状态机，以及引用、标签、图谱、概念各域的 mutation result 类型。 |
| [packages/synthesis-contracts/src/literatureArtifacts.ts](../../../files/packages/synthesis-contracts/src/literatureArtifacts.ts.md) | 文件 | 2 | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |
| [packages/synthesis-contracts/src/protocolSchema.ts](../../../files/packages/synthesis-contracts/src/protocolSchema.ts.md) | 文件 | 6 | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |
| [packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts](../../../files/packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts.md) | 文件 | 19 | 参考文献匹配审阅应用契约：prepare/apply/discard 请求、匹配提案与审阅决策 DTO、提案分页以及带图谱增量的 mutation 结果重建。 |
| [packages/synthesis-contracts/src/referenceRefreshApplication.ts](../../../files/packages/synthesis-contracts/src/referenceRefreshApplication.ts.md) | 文件 | 12 | 参考文献刷新应用契约：prepare/apply/page 请求，以及条目、描述符与文献质量快照的严格重建。 |
| [packages/synthesis-contracts/src/references.ts](../../../files/packages/synthesis-contracts/src/references.ts.md) | 文件 | 1 | 参考文献域契约：canonical revision 审阅动作、匹配提案动作枚举，以及 reference capability 结果重建。 |
| [packages/synthesis-contracts/src/relatedItemsEffect.ts](../../../files/packages/synthesis-contracts/src/relatedItemsEffect.ts.md) | 文件 | 4 | 宿主 related-items 批量 effect 契约：定义批次与诊断条数上限，重建 effect 请求、逐条 receipt 与批次结果。 |
| [packages/synthesis-contracts/src/representativeImageRead.ts](../../../files/packages/synthesis-contracts/src/representativeImageRead.ts.md) | 文件 | 9 | 宿主代表图读取契约：限制内容字节与诊断条数，重建读取请求以及 available / unavailable 两态结果。 |
| [packages/synthesis-contracts/src/schemaVersion.ts](../../../files/packages/synthesis-contracts/src/schemaVersion.ts.md) | 文件 | 0 | 只导出 repository foundation schema 版本常量的单行版本锚点，供仓库与合约两侧对齐迁移版本。 |
| [packages/synthesis-contracts/src/sidecarCanonicalStore.ts](../../../files/packages/synthesis-contracts/src/sidecarCanonicalStore.ts.md) | 文件 | 1 | 主题 canonical store 快照的 schema 版本与快照重建函数，是 sidecar 与仓库之间的一致性锚点。 |
| [packages/synthesis-contracts/src/sidecarLifecycle.ts](../../../files/packages/synthesis-contracts/src/sidecarLifecycle.ts.md) | 文件 | 6 | sidecar 启动与发现契约：launch config 与 discovery 的 JSON Schema 及严格重建，确保发现记录可被插件安全消费。 |
| [packages/synthesis-contracts/src/sidecarObservability.ts](../../../files/packages/synthesis-contracts/src/sidecarObservability.ts.md) | 文件 | 3 | sidecar 可观测性契约：observation schema、来源/边界/结局枚举、identity/metric/fact 键，以及 trace context 与 observation event 重建。 |
| [packages/synthesis-contracts/src/sidecarProduction.ts](../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | 文件 | 13 | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |
| [packages/synthesis-contracts/src/sidecarRuntimeBundle.ts](../../../files/packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | 文件 | 13 | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [packages/synthesis-contracts/src/sidecarRuntimeRelease.ts](../../../files/packages/synthesis-contracts/src/sidecarRuntimeRelease.ts.md) | 文件 | 10 | 定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。 |
| [packages/synthesis-contracts/src/sidecarSystem.ts](../../../files/packages/synthesis-contracts/src/sidecarSystem.ts.md) | 文件 | 13 | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [packages/synthesis-contracts/src/sidecarTransfer.ts](../../../files/packages/synthesis-contracts/src/sidecarTransfer.ts.md) | 文件 | 31 | sidecar 传输层契约：分页描述符与 manifest、库节点/参考文献/图节点/边/归属/指标各类页、会话动作与 transfer 状态快照重建。 |
| [packages/synthesis-contracts/src/sourceReferenceArtifact.ts](../../../files/packages/synthesis-contracts/src/sourceReferenceArtifact.ts.md) | 文件 | 15 | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [packages/synthesis-contracts/src/sync.ts](../../../files/packages/synthesis-contracts/src/sync.ts.md) | 文件 | 0 | WebDAV 同步命令契约：冲突解决动作枚举、冲突解决请求，以及 SyncTransportClient 的 run/pause/resume/retry 接口。 |
| [packages/synthesis-contracts/src/tagEffect.ts](../../../files/packages/synthesis-contracts/src/tagEffect.ts.md) | 文件 | 8 | 宿主标签 effect 契约：staged binding 解析请求与结果，以及标签 effect 批次请求、逐条 receipt 与批次结果重建。 |
| [packages/synthesis-contracts/src/tags.ts](../../../files/packages/synthesis-contracts/src/tags.ts.md) | 文件 | 5 | 标签域契约：词表 regulator 导出、审计 staging 条目、verified commit DTO 与 tag capability 结果重建。 |
| [packages/synthesis-contracts/src/tagVocabularyApplication.ts](../../../files/packages/synthesis-contracts/src/tagVocabularyApplication.ts.md) | 文件 | 21 | 标签词表应用契约：候选、保存、分页、staging、条目更新删除、索引重建与审计替换清空的完整请求/结果 DTO 集合。 |
| [packages/synthesis-contracts/src/tagVocabularyCore.ts](../../../files/packages/synthesis-contracts/src/tagVocabularyCore.ts.md) | 文件 | 0 | 标签词表引擎核心类型：词条、引擎协议、校验警告与索引检索行的定义。 |
| [packages/synthesis-contracts/src/topicApplication.ts](../../../files/packages/synthesis-contracts/src/topicApplication.ts.md) | 文件 | 6 | 主题应用契约：apply / list / detail 请求重建，以及主题 ID 清洗、资产 ID 与 UTF-8 字节数等边界校验。 |
| [packages/synthesis-contracts/src/topicDomain.ts](../../../files/packages/synthesis-contracts/src/topicDomain.ts.md) | 文件 | 0 | 主题领域模型：topic 定义、resolver 条件、artifact、manifest 与 report 等核心类型集合，是 Synthesis 层的领域类型事实源。 |
| [packages/synthesis-contracts/src/topicGraph.ts](../../../files/packages/synthesis-contracts/src/topicGraph.ts.md) | 文件 | 1 | 主题图谱审阅动作枚举与 topic graph capability 结果重建。 |
| [packages/synthesis-contracts/src/topicGraphApplication.ts](../../../files/packages/synthesis-contracts/src/topicGraphApplication.ts.md) | 文件 | 20 | 主题图谱应用契约：快照、replace/upsert/ingest/物化主题、关系裁决、审阅、标记删除与索引重建请求及 mutation 结果。 |
| [packages/synthesis-contracts/src/topicGraphCore.ts](../../../files/packages/synthesis-contracts/src/topicGraphCore.ts.md) | 文件 | 0 | 主题图谱索引引擎常量与类型：契约/算法/schema 版本、节点与边上限，以及关系、边状态、定义状态枚举。 |
| [packages/synthesis-contracts/src/topics.ts](../../../files/packages/synthesis-contracts/src/topics.ts.md) | 文件 | 12 | 主题查询契约：list / find / context / resolver / workflow options 的请求与结果重建。 |
| [packages/synthesis-contracts/src/webDavSync.ts](../../../files/packages/synthesis-contracts/src/webDavSync.ts.md) | 文件 | 12 | WebDAV 同步状态契约：sync head/state/conflict 的 schema ID 与版本、诊断与冲突报告重建、远端快照指针与路径生成。 |
| [packages/synthesis-contracts/src/webDavSyncPort.ts](../../../files/packages/synthesis-contracts/src/webDavSyncPort.ts.md) | 文件 | 12 | 宿主 WebDAV 端口契约：连接测试、远端描述、读写与 ensure-collection 的请求结果重建，含托管路径与 base URL 安全校验。 |
| [packages/synthesis-contracts/src/workbench.ts](../../../files/packages/synthesis-contracts/src/workbench.ts.md) | 文件 | 14 | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |
| [packages/synthesis-contracts/src/workflow.ts](../../../files/packages/synthesis-contracts/src/workflow.ts.md) | 文件 | 12 | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |
| [packages/synthesis-contracts/src/workflowReview.ts](../../../files/packages/synthesis-contracts/src/workflowReview.ts.md) | 文件 | 1 | 工作流审阅契约：审阅请求与结果重建，聚合 topic domain 与引用图谱数据。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas](contract-set/synthesis-sidecar-protocol-v1/schemas.md) | 18 |
| [packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas](contract-set/canonical-literature-artifacts-v1/schemas.md) | 5 |
| [packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1](contract-set/synthesis-sidecar-protocol-v1.md) | 1 |
