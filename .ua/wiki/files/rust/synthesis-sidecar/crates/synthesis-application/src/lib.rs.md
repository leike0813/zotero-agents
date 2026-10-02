
# rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs -->

synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [admission.rs](admission.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs | 定义应用层的准入（admission）通用类型：写入操作的 admission scope、去重键与重放基础判定，是所有领域应用共享的入口事实源。 |
| [canonical_literature_artifacts.rs](canonical_literature_artifacts.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs | 维护文献侧 canonical artifact（规范化附件、Digest、引用分析产物）的领域模型与投影规则，保证同一文献在多处消费时看到一致事实。 |
| [citation_graph.rs](citation_graph.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs | Citation Graph 应用层唯一 owner：管理图快照、重建 attempt 生命周期、basis-bound 读视图、metrics/layout identity 与图级持久化协调。 |
| [concept_kb.rs](concept_kb.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs | 概念知识库（Concept KB）应用层：维护概念 identity、别名归一与知识条目准入，向 topic 层提供概念维度的事实来源。 |
| [debug_maintenance.rs](debug_maintenance.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs | 调试用维护操作的应用层实现：面向 Harness 的只读探测与受限修复入口，复用统一 admission 判定并保证不越过生产事实源。 |
| [dto.rs](dto.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs | 应用层跨边界 DTO 集合：定义 Workbench、Topic、Citation Graph 等对外投影视图与 wire 结构，作为宿主与 Workbench 的唯一契约来源。 |
| [durable_bundle.rs](durable_bundle.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs | 持久化 bundle 应用层：负责跨设备同步所需 bundle 的组装、比较与提交，保持 durable 记录与事务边界的单一来源。 |
| [knowledge_checkpoint.rs](knowledge_checkpoint.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs | 知识检查点应用层：记录并推进知识综合进度检查点，使刷新、重启与继续执行共享同一检查点事实。 |
| [library_snapshot_index.rs](library_snapshot_index.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs | 文献库快照索引：为一次 library snapshot 建立可寻址的索引结构，使读路径能在同一 basis 下定位条目而不做全库 projection。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |
| [reference_application.rs](reference_application.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs | Reference 应用层最大模块：编排文献身份匹配、刷新、canonical artifact 落地与跨域投影，是文献写入路径的编排中枢。 |
| [reference_matching.rs](reference_matching.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs | 文献身份匹配：基于标题、作者、年份与标识符计算候选并给出置信度评分，为 canonical 身份收敛提供决策依据。 |
| [reference_refresh.rs](reference_refresh.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs | 文献刷新流程：从 canonical artifact 与 Host facts 重建文献派生视图与健康状态，保证刷新幂等且不重复产生宿主副作用。 |
| [reference.rs](reference.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs | Reference 领域模型：定义文献条目的规范身份、字段语义与派生视图，充当匹配、刷新与展示的公共结构来源。 |
| [related_items.rs](related_items.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs | 相关文献应用层：基于引用与主题关系推导 related items 视图，为 Workbench 与宿主提供只读的相关性结果。 |
| [tag_audit.rs](tag_audit.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs | 标签审计应用层：检测库内标签的规范冲突、冗余与漂移，产出可复现的审计结论供导入与清理流程使用。 |
| [tag_vocabulary.rs](tag_vocabulary.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs | 标签词表应用层：管理受控标签词表、别名映射与导入准入，是标签规范化与批量维护的最大领域模块。 |
| [topic_digest.rs](topic_digest.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs | 主题 Digest 应用层：构造与评估主题级结构化笔记（Digest）产物，定义其健康度与引用分析结论。 |
| [topic_graph.rs](topic_graph.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs | 主题图谱应用层：维护主题之间的共现与邻接关系，支撑主题聚类、演进时间线与图页渲染。 |
| [topic.rs](topic.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs | Topic 领域应用层：管理主题 identity、成员变更、合并与查询，并结合 concept KB 与 topic graph 投影跨域主题视图。 |
| [webdav_sync.rs](webdav_sync.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs | WebDAV 同步应用层：驱动远端 bundle 的拉取、合并与推送，复用 durable bundle 与统一 admission，保证同步过程可重放。 |
| [workbench.rs](workbench.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs | Workbench 跨域投影：把 Citation Graph、Topic 等领域视图组合成工作台所需的读模型，是宿主 observation 的组装点。 |
