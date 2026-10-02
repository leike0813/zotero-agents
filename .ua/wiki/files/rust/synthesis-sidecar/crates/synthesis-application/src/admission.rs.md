
# rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs -->

定义应用层的准入（admission）通用类型：写入操作的 admission scope、去重键与重放基础判定，是所有领域应用共享的入口事实源。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs)

## 符号（3）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs:AdmissionLease -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs:AdmissionState -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs:SingleFlightAdmission -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AdmissionLease | 类 | 22–25 | 简单 | rust | 0 | 准入租约句柄，携带 key 与释放语义，确保执行结束或失败时都能收敛回未占用状态。 |
| AdmissionState | 类 | 12–15 | 简单 | rust、S、t、a | 0 | 准入状态枚举，区分未占用、已持有与被拒绝三种准入结果，供各领域应用共享判定语义。 |
| SingleFlightAdmission | 类 | 17–20 | 简单 | rust | 0 | 单飞（single-flight）准入协调器：保证同一 key 上只有一个执行者获得 lease，durable insert winner 由此产生。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [concept_kb.rs](concept_kb.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs | 概念知识库（Concept KB）应用层：维护概念 identity、别名归一与知识条目准入，向 topic 层提供概念维度的事实来源。 |
| [debug_maintenance.rs](debug_maintenance.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs | 调试用维护操作的应用层实现：面向 Harness 的只读探测与受限修复入口，复用统一 admission 判定并保证不越过生产事实源。 |
| [durable_bundle.rs](durable_bundle.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs | 持久化 bundle 应用层：负责跨设备同步所需 bundle 的组装、比较与提交，保持 durable 记录与事务边界的单一来源。 |
| [knowledge_checkpoint.rs](knowledge_checkpoint.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs | 知识检查点应用层：记录并推进知识综合进度检查点，使刷新、重启与继续执行共享同一检查点事实。 |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [tag_vocabulary.rs](tag_vocabulary.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs | 标签词表应用层：管理受控标签词表、别名映射与导入准入，是标签规范化与批量维护的最大领域模块。 |
| [topic_graph.rs](topic_graph.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs | 主题图谱应用层：维护主题之间的共现与邻接关系，支撑主题聚类、演进时间线与图页渲染。 |
| [webdav_sync.rs](webdav_sync.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs | WebDAV 同步应用层：驱动远端 bundle 的拉取、合并与推送，复用 durable bundle 与统一 admission，保证同步过程可重放。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| AdmissionLease | 类 | 22–25 | 准入租约句柄，携带 key 与释放语义，确保执行结束或失败时都能收敛回未占用状态。 |
| AdmissionState | 类 | 12–15 | 准入状态枚举，区分未占用、已持有与被拒绝三种准入结果，供各领域应用共享判定语义。 |
| SingleFlightAdmission | 类 | 17–20 | 单飞（single-flight）准入协调器：保证同一 key 上只有一个执行者获得 lease，durable insert winner 由此产生。 |
