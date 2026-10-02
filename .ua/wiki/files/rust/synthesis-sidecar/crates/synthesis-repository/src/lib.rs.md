
# rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-repository/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-repository/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs -->

synthesis-repository crate 的 crate root，统一导出仓储端口、事务辅助与各领域仓储实现模块。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs)

## 符号（24）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:CacheBasisRecord -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:consume_related_items_sync_echo -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:finish_operation_if_nonterminal -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:insert_operation_if_absent -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:list_operations -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:migrate_repository_foundation_v1_to_v2 -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:migrate_repository_foundation_v5_to_v6 -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:open_database -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:open_internal -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:OperationRecord -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:prepare_production_schema_with_registry -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:prepare_reference_redirect_graph_schema -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:repair_reference_redirect_graph -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:RepositoryIdentity -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:schema_inventory -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:soft_delete_topic_application_state -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:TopicApplicationStateRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:TopicGraphScopeRecord -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:transaction -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:transaction_nested -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:update_operation_if_current -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:upsert_cache_basis -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:upsert_operation -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:verify_required_application_schema -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CacheBasisRecord | 类 | 285–312 | 中等 | basis、缓存、数据契约 | 0 | 缓存 basis 记录，标识某个域缓存所依赖的输入版本。 |
| consume_related_items_sync_echo | 函数 | 1522–1610 | 复杂 | 同步、引用关系、事件消费 | 0 | 消费 related-items 同步的回声事件，把外部变更同步进本地记录。 |
| finish_operation_if_nonterminal | 函数 | 1851–1896 | 中等 | operation、终态、并发控制 | 0 | 仅当 operation 仍为非终态时才写入终态，形成 compare-and-set 语义。 |
| insert_operation_if_absent | 函数 | 1946–1973 | 中等 | operation、admission、并发控制 | 0 | 仅在 operation 不存在时插入，作为 admission 的唯一执行者判定。 |
| list_operations | 函数 | 1765–1822 | 复杂 | operation、分页读取、读取 | 0 | 按查询条件分页列出 operation 记录。 |
| migrate_repository_foundation_v1_to_v2 | 函数 | 564–610 | 中等 | schema、迁移 | 0 | 仓储基础 schema 从 v1 迁移到 v2 的步骤实现。 |
| migrate_repository_foundation_v5_to_v6 | 函数 | 689–734 | 中等 | schema、迁移 | 0 | 仓储基础 schema 从 v5 迁移到 v6 的步骤实现。 |
| open_database | 函数 | 1281–1357 | 复杂 | 仓储层、连接管理、入口守卫 | 0 | 打开（必要时创建）生产仓储数据库，并完成 schema 准备。 |
| open_internal | 函数 | 1228–1279 | 中等 | 仓储层、连接管理 | 0 | 仓储内部打开路径：应用 schema、验证 identity 并配置连接参数。 |
| OperationRecord | 类 | 236–281 | 中等 | operation、生命周期、数据契约 | 0 | 仓储 operation 记录，统一 public maintenance 等持久化操作的 admission、终态与回执。 |
| prepare_production_schema_with_registry | 函数 | 736–801 | 复杂 | schema、迁移、生产环境 | 0 | 按注册表顺序执行生产 schema 迁移，生成备份并逐版本推进。 |
| prepare_reference_redirect_graph_schema | 函数 | 1025–1095 | 复杂 | schema、identity-mapping | 0 | 准备 reference redirect graph 专用 schema 与索引。 |
| repair_reference_redirect_graph | 函数 | 846–1023 | 复杂 | identity-mapping、修复、事务 | 0 | 修复重定向图中的环与悬挂目标，恢复到可解析状态。 |
| RepositoryIdentity | 类 | 219–222 | 简单 | 仓储层、identity、数据契约 | 0 | 仓储实例身份，绑定 host 与数据库实例标识。 |
| schema_inventory | 函数 | 1442–1472 | 中等 | schema、自省、读取 | 0 | 读取当前 schema 清单，报告表、索引与版本状态。 |
| soft_delete_topic_application_state | 函数 | 2423–2475 | 复杂 | 主题图谱、软删除、事务 | 0 | 软删除主题应用状态，并把关联 artifact 移入已删除清单。 |
| TopicApplicationStateRecord | 类 | 316–343 | 中等 | 主题图谱、状态、数据契约 | 0 | 主题应用状态记录，保存 singleton 状态、revision 与索引摘要。 |
| TopicGraphScopeRecord | 类 | 385–391 | 简单 | 主题图谱、scope、数据契约 | 0 | 主题图谱 scope 记录，界定一次重建覆盖的图谱范围。 |
| transaction | 函数 | 1612–1642 | 中等 | 事务、仓储层 | 0 | 开启一次仓储写事务，统一错误映射与提交语义。 |
| transaction_nested | 函数 | 1644–1671 | 中等 | 事务、仓储层 | 0 | 在既有写事务中开启嵌套事务，复用外层连接。 |
| update_operation_if_current | 函数 | 1901–1942 | 中等 | operation、乐观并发、写入 | 0 | 按当前 revision 条件更新 operation 记录，条件不满足即拒绝。 |
| upsert_cache_basis | 函数 | 1987–2033 | 复杂 | basis、缓存、写入 | 0 | 写入域缓存 basis，标记缓存所基于的输入版本。 |
| upsert_operation | 函数 | 1673–1751 | 复杂 | operation、并发控制、写入 | 0 | 创建或更新 operation 记录，durable insert winner 实际生效。 |
| verify_required_application_schema | 函数 | 2560–2639 | 复杂 | schema、校验、生产环境 | 0 | 校验生产库已具备应用要求的全部 schema 项与版本。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [checkpoint_bundle_webdav_debug.rs](checkpoint_bundle_webdav_debug.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs | Synthesis 仓储层的 WebDAV checkpoint bundle 调试工具，解析与比对备份包内容，用于排障 public maintenance operation 的同步问题。 |
| [citation_reference.rs](citation_reference.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs | Citation Graph 的核心持久化实现，负责 Reference 节点、引用边、游标与分页读取等仓储操作。 |
| [legacy_ts_migration.rs](legacy_ts_migration.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs | 旧版时间戳（legacy TS）数据的迁移逻辑，把历史记录规范化到当前引用图谱 schema。 |
| [library_snapshot_index.rs](library_snapshot_index.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs | 文献库快照索引的仓储实现，追踪 library 快照 basis 以支撑增量 rebuild 的变更检测。 |
| [reference_redirect_graph.rs](reference_redirect_graph.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs | Reference 重定向图的仓储实现，记录旧 identity 到新 canonical Reference 的映射与迁移轨迹。 |
| [tag_audit.rs](tag_audit.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs | 标签审计的仓储实现，保存标签规范化的审计证据并支持按批次回溯与回滚判定。 |
| [tag_concept_topic_graph.rs](tag_concept_topic_graph.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs | 标签、概念与主题三层图谱的仓储实现，提供分层邻接、边投影与分页读取供 Synthesis 工作台消费。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| CacheBasisRecord | 类 | 285–312 | 缓存 basis 记录，标识某个域缓存所依赖的输入版本。 |
| consume_related_items_sync_echo | 函数 | 1522–1610 | 消费 related-items 同步的回声事件，把外部变更同步进本地记录。 |
| finish_operation_if_nonterminal | 函数 | 1851–1896 | 仅当 operation 仍为非终态时才写入终态，形成 compare-and-set 语义。 |
| insert_operation_if_absent | 函数 | 1946–1973 | 仅在 operation 不存在时插入，作为 admission 的唯一执行者判定。 |
| list_operations | 函数 | 1765–1822 | 按查询条件分页列出 operation 记录。 |
| migrate_repository_foundation_v1_to_v2 | 函数 | 564–610 | 仓储基础 schema 从 v1 迁移到 v2 的步骤实现。 |
| migrate_repository_foundation_v5_to_v6 | 函数 | 689–734 | 仓储基础 schema 从 v5 迁移到 v6 的步骤实现。 |
| open_database | 函数 | 1281–1357 | 打开（必要时创建）生产仓储数据库，并完成 schema 准备。 |
| open_internal | 函数 | 1228–1279 | 仓储内部打开路径：应用 schema、验证 identity 并配置连接参数。 |
| OperationRecord | 类 | 236–281 | 仓储 operation 记录，统一 public maintenance 等持久化操作的 admission、终态与回执。 |
| prepare_production_schema_with_registry | 函数 | 736–801 | 按注册表顺序执行生产 schema 迁移，生成备份并逐版本推进。 |
| prepare_reference_redirect_graph_schema | 函数 | 1025–1095 | 准备 reference redirect graph 专用 schema 与索引。 |
| repair_reference_redirect_graph | 函数 | 846–1023 | 修复重定向图中的环与悬挂目标，恢复到可解析状态。 |
| RepositoryIdentity | 类 | 219–222 | 仓储实例身份，绑定 host 与数据库实例标识。 |
| schema_inventory | 函数 | 1442–1472 | 读取当前 schema 清单，报告表、索引与版本状态。 |
| soft_delete_topic_application_state | 函数 | 2423–2475 | 软删除主题应用状态，并把关联 artifact 移入已删除清单。 |
| TopicApplicationStateRecord | 类 | 316–343 | 主题应用状态记录，保存 singleton 状态、revision 与索引摘要。 |
| TopicGraphScopeRecord | 类 | 385–391 | 主题图谱 scope 记录，界定一次重建覆盖的图谱范围。 |
| transaction | 函数 | 1612–1642 | 开启一次仓储写事务，统一错误映射与提交语义。 |
| transaction_nested | 函数 | 1644–1671 | 在既有写事务中开启嵌套事务，复用外层连接。 |
| update_operation_if_current | 函数 | 1901–1942 | 按当前 revision 条件更新 operation 记录，条件不满足即拒绝。 |
| upsert_cache_basis | 函数 | 1987–2033 | 写入域缓存 basis，标记缓存所基于的输入版本。 |
| upsert_operation | 函数 | 1673–1751 | 创建或更新 operation 记录，durable insert winner 实际生效。 |
| verify_required_application_schema | 函数 | 2560–2639 | 校验生产库已具备应用要求的全部 schema 项与版本。 |
