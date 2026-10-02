
# rust/synthesis-sidecar/crates/synthesis-application/src
> 目录聚合页：23 个文件、134 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs.md) | 文件 | 3 | 定义应用层的准入（admission）通用类型：写入操作的 admission scope、去重键与重放基础判定，是所有领域应用共享的入口事实源。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs.md) | 文件 | 8 | 维护文献侧 canonical artifact（规范化附件、Digest、引用分析产物）的领域模型与投影规则，保证同一文献在多处消费时看到一致事实。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs.md) | 文件 | 10 | Citation Graph 应用层唯一 owner：管理图快照、重建 attempt 生命周期、basis-bound 读视图、metrics/layout identity 与图级持久化协调。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs.md) | 文件 | 8 | 概念知识库（Concept KB）应用层：维护概念 identity、别名归一与知识条目准入，向 topic 层提供概念维度的事实来源。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs.md) | 文件 | 2 | 调试用维护操作的应用层实现：面向 Harness 的只读探测与受限修复入口，复用统一 admission 判定并保证不越过生产事实源。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs.md) | 文件 | 0 | 应用层跨边界 DTO 集合：定义 Workbench、Topic、Citation Graph 等对外投影视图与 wire 结构，作为宿主与 Workbench 的唯一契约来源。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs.md) | 文件 | 8 | 持久化 bundle 应用层：负责跨设备同步所需 bundle 的组装、比较与提交，保持 durable 记录与事务边界的单一来源。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs.md) | 文件 | 6 | 知识检查点应用层：记录并推进知识综合进度检查点，使刷新、重启与继续执行共享同一检查点事实。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs.md) | 文件 | 0 | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs.md) | 文件 | 5 | 文献库快照索引：为一次 library snapshot 建立可寻址的索引结构，使读路径能在同一 basis 下定位条目而不做全库 projection。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs.md) | 文件 | 12 | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs.md) | 文件 | 7 | Reference 应用层最大模块：编排文献身份匹配、刷新、canonical artifact 落地与跨域投影，是文献写入路径的编排中枢。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs.md) | 文件 | 6 | 文献身份匹配：基于标题、作者、年份与标识符计算候选并给出置信度评分，为 canonical 身份收敛提供决策依据。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs.md) | 文件 | 7 | 文献刷新流程：从 canonical artifact 与 Host facts 重建文献派生视图与健康状态，保证刷新幂等且不重复产生宿主副作用。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs.md) | 文件 | 5 | Reference 领域模型：定义文献条目的规范身份、字段语义与派生视图，充当匹配、刷新与展示的公共结构来源。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs.md) | 文件 | 4 | 相关文献应用层：基于引用与主题关系推导 related items 视图，为 Workbench 与宿主提供只读的相关性结果。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs.md) | 文件 | 5 | 标签审计应用层：检测库内标签的规范冲突、冗余与漂移，产出可复现的审计结论供导入与清理流程使用。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs.md) | 文件 | 8 | 标签词表应用层：管理受控标签词表、别名映射与导入准入，是标签规范化与批量维护的最大领域模块。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs.md) | 文件 | 5 | 主题 Digest 应用层：构造与评估主题级结构化笔记（Digest）产物，定义其健康度与引用分析结论。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs.md) | 文件 | 7 | 主题图谱应用层：维护主题之间的共现与邻接关系，支撑主题聚类、演进时间线与图页渲染。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs.md) | 文件 | 6 | Topic 领域应用层：管理主题 identity、成员变更、合并与查询，并结合 concept KB 与 topic graph 投影跨域主题视图。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs.md) | 文件 | 7 | WebDAV 同步应用层：驱动远端 bundle 的拉取、合并与推送，复用 durable bundle 与统一 admission，保证同步过程可重放。 |
| [rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs.md) | 文件 | 5 | Workbench 跨域投影：把 Citation Graph、Topic 等领域视图组合成工作台所需的读模型，是宿主 observation 的组装点。 |

## 子目录
- [citation_graph](src/citation_graph.md)
