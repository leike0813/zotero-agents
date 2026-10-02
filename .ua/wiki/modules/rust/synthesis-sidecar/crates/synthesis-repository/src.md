
# rust/synthesis-sidecar/crates/synthesis-repository/src
> 目录聚合页：9 个文件、126 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs.md) | 文件 | 15 | Synthesis 仓储层的 WebDAV checkpoint bundle 调试工具，解析与比对备份包内容，用于排障 public maintenance operation 的同步问题。 |
| [rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs.md) | 文件 | 28 | Citation Graph 的核心持久化实现，负责 Reference 节点、引用边、游标与分页读取等仓储操作。 |
| [rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs.md) | 文件 | 10 | 旧版时间戳（legacy TS）数据的迁移逻辑，把历史记录规范化到当前引用图谱 schema。 |
| [rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs.md) | 文件 | 24 | synthesis-repository crate 的 crate root，统一导出仓储端口、事务辅助与各领域仓储实现模块。 |
| [rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs.md) | 文件 | 8 | 文献库快照索引的仓储实现，追踪 library 快照 basis 以支撑增量 rebuild 的变更检测。 |
| [rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs.md) | 文件 | 3 | Reference 重定向图的仓储实现，记录旧 identity 到新 canonical Reference 的映射与迁移轨迹。 |
| [rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../files/rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql.md) | 表 | 0 | Synthesis sidecar 的 SQLite 库表结构：定义引用图谱、主题图谱、concept 与维护操作等核心表的列、外键与索引。 |
| [rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs.md) | 文件 | 15 | 标签审计的仓储实现，保存标签规范化的审计证据并支持按批次回溯与回滚判定。 |
| [rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs](../../../../../files/rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs.md) | 文件 | 23 | 标签、概念与主题三层图谱的仓储实现，提供分层邻接、边投影与分页读取供 Synthesis 工作台消费。 |
