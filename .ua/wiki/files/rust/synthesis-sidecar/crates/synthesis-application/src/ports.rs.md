
# rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs -->

应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs)

## 符号（12）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:ConceptKbRepositoryPort -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:new_with_readers -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:prepare_import -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:reference_review_facts -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:ReferenceRefreshRepositoryPort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:RepositoryPort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:RepositoryReadPool -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:StructuredArtifactPort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:TagVocabularyRepositoryPort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:TopicCanonicalPort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:TopicGraphRepositoryPort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:TopicRepositoryPort -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ConceptKbRepositoryPort | 类 | 129–168 | 中等 | rust、P、o、r | 0 | 概念知识库 repository 端口：声明概念条目、提案与审阅结果的持久化能力。 |
| new_with_readers | 函数 | 431–453 | 简单 | rust、repository、读连接、构造 | 0 | 使用共享读连接构造 repository，读事务按需获取并保证最短持有时间。 |
| prepare_import | 函数 | 1545–1608 | 中等 | rust、导入、preflight、repository | 0 | 在无副作用状态下准备导入所需的记录与文件事实，绑定范围与 revision。 |
| reference_review_facts | 函数 | 566–615 | 中等 | rust、事实收集、分页、文献 | 0 | 一次性分页取齐审阅所需的 canonical 事实并锁定有序结果，basis 变化使整次获取失败。 |
| ReferenceRefreshRepositoryPort | 类 | 58–79 | 简单 | rust、P、o、r | 0 | 文献刷新 repository 端口：声明刷新 run、状态与派生产物的持久化能力。 |
| RepositoryPort | 类 | 394–397 | 简单 | rust、P、o、r | 0 | 应用层主 repository 端口：汇总各领域持久化能力，是 Citation Graph Application 唯一允许依赖的存储接口。 |
| RepositoryReadPool | 类 | 344–347 | 简单 | rust | 0 | repository 读连接池抽象：每次读取获取短 reader transaction，跨调用不得持有。 |
| StructuredArtifactPort | 类 | 1736–1750 | 简单 | rust、P、o、r | 0 | 结构化 artifact 端口：声明 canonical artifact 的读写与就绪判定能力。 |
| TagVocabularyRepositoryPort | 类 | 81–127 | 中等 | rust、P、o、r | 0 | 标签词表 repository 端口：声明词表条目、别名映射与导入暂存区的持久化能力。 |
| TopicCanonicalPort | 类 | 1396–1413 | 简单 | rust、P、o、r | 0 | Topic canonical 端口：声明主题 canonical 记录与宿主事实的读取写入能力。 |
| TopicGraphRepositoryPort | 类 | 170–229 | 中等 | rust、P、o、r | 0 | 主题图谱 repository 端口：声明图关系、提案与计划记录的持久化能力。 |
| TopicRepositoryPort | 类 | 254–340 | 中等 | rust、P、o、r | 0 | 主题 repository 端口：定义主题 CRUD、成员变更与应用操作记录的事务边界。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debug_maintenance.rs](debug_maintenance.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs | 调试用维护操作的应用层实现：面向 Harness 的只读探测与受限修复入口，复用统一 admission 判定并保证不越过生产事实源。 |
| [dto.rs](dto.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs | 应用层跨边界 DTO 集合：定义 Workbench、Topic、Citation Graph 等对外投影视图与 wire 结构，作为宿主与 Workbench 的唯一契约来源。 |
| [durable_bundle.rs](durable_bundle.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs | 持久化 bundle 应用层：负责跨设备同步所需 bundle 的组装、比较与提交，保持 durable 记录与事务边界的单一来源。 |
| [knowledge_checkpoint.rs](knowledge_checkpoint.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs | 知识检查点应用层：记录并推进知识综合进度检查点，使刷新、重启与继续执行共享同一检查点事实。 |
| [library_snapshot_index.rs](library_snapshot_index.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs | 文献库快照索引：为一次 library snapshot 建立可寻址的索引结构，使读路径能在同一 basis 下定位条目而不做全库 projection。 |
| [reference_matching.rs](reference_matching.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs | 文献身份匹配：基于标题、作者、年份与标识符计算候选并给出置信度评分，为 canonical 身份收敛提供决策依据。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citation_graph.rs](citation_graph.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs | Citation Graph 应用层唯一 owner：管理图快照、重建 attempt 生命周期、basis-bound 读视图、metrics/layout identity 与图级持久化协调。 |
| [citation_graph/persistence.rs](citation_graph/persistence.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs | 引用图谱的持久化辅助子模块，把图 rows/state 与 attempt 终态收敛为单个 repository transaction 提交单元。 |
| [citation_graph/read.rs](citation_graph/read.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs | 引用图谱读路径子模块：实现 basis-bound 的 page/continuation/neighborhood 读取，短 reader transaction 内重新校验 basis 并对过期游标以 basis_mismatch 失败。 |
| [concept_kb.rs](concept_kb.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs | 概念知识库（Concept KB）应用层：维护概念 identity、别名归一与知识条目准入，向 topic 层提供概念维度的事实来源。 |
| [durable_bundle.rs](durable_bundle.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs | 持久化 bundle 应用层：负责跨设备同步所需 bundle 的组装、比较与提交，保持 durable 记录与事务边界的单一来源。 |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [reference_application.rs](reference_application.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs | Reference 应用层最大模块：编排文献身份匹配、刷新、canonical artifact 落地与跨域投影，是文献写入路径的编排中枢。 |
| [reference_matching.rs](reference_matching.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs | 文献身份匹配：基于标题、作者、年份与标识符计算候选并给出置信度评分，为 canonical 身份收敛提供决策依据。 |
| [reference_refresh.rs](reference_refresh.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs | 文献刷新流程：从 canonical artifact 与 Host facts 重建文献派生视图与健康状态，保证刷新幂等且不重复产生宿主副作用。 |
| [tag_vocabulary.rs](tag_vocabulary.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs | 标签词表应用层：管理受控标签词表、别名映射与导入准入，是标签规范化与批量维护的最大领域模块。 |
| [topic_graph.rs](topic_graph.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs | 主题图谱应用层：维护主题之间的共现与邻接关系，支撑主题聚类、演进时间线与图页渲染。 |
| [topic.rs](topic.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs | Topic 领域应用层：管理主题 identity、成员变更、合并与查询，并结合 concept KB 与 topic graph 投影跨域主题视图。 |
| [workbench.rs](workbench.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs | Workbench 跨域投影：把 Citation Graph、Topic 等领域视图组合成工作台所需的读模型，是宿主 observation 的组装点。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ConceptKbRepositoryPort | 类 | 129–168 | 概念知识库 repository 端口：声明概念条目、提案与审阅结果的持久化能力。 |
| ReferenceRefreshRepositoryPort | 类 | 58–79 | 文献刷新 repository 端口：声明刷新 run、状态与派生产物的持久化能力。 |
| RepositoryPort | 类 | 394–397 | 应用层主 repository 端口：汇总各领域持久化能力，是 Citation Graph Application 唯一允许依赖的存储接口。 |
| RepositoryReadPool | 类 | 344–347 | repository 读连接池抽象：每次读取获取短 reader transaction，跨调用不得持有。 |
| StructuredArtifactPort | 类 | 1736–1750 | 结构化 artifact 端口：声明 canonical artifact 的读写与就绪判定能力。 |
| TagVocabularyRepositoryPort | 类 | 81–127 | 标签词表 repository 端口：声明词表条目、别名映射与导入暂存区的持久化能力。 |
| TopicCanonicalPort | 类 | 1396–1413 | Topic canonical 端口：声明主题 canonical 记录与宿主事实的读取写入能力。 |
| TopicGraphRepositoryPort | 类 | 170–229 | 主题图谱 repository 端口：声明图关系、提案与计划记录的持久化能力。 |
| TopicRepositoryPort | 类 | 254–340 | 主题 repository 端口：定义主题 CRUD、成员变更与应用操作记录的事务边界。 |
