
# rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-repository/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-repository/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs -->

旧版时间戳（legacy TS）数据的迁移逻辑，把历史记录规范化到当前引用图谱 schema。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs)

## 符号（10）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:build_current_database -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:classify_legacy_ts_schema -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:copy_artifacts -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:copy_direct_tables -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:copy_related_effects -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:copy_topic_payloads -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:insert_legacy_topics -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:LegacyProductionTopicInventory -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:LegacyTsVariant -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:migrate_if_known_legacy_ts -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| build_current_database | 函数 | 630–753 | 复杂 | 迁移、schema、构建 | 0 | 在临时库上构建当前 schema 的完整数据库，完成全部 legacy 数据的转换。 |
| classify_legacy_ts_schema | 函数 | 261–324 | 中等 | 迁移、schema、分类 | 0 | 读取 legacy 库的 schema 版本与表结构，判定其属于哪个已知变体。 |
| copy_artifacts | 函数 | 395–459 | 复杂 | 迁移、artifact | 0 | 迁移 topic 及其关联的 artifact 记录，维护外键与归属关系。 |
| copy_direct_tables | 函数 | 350–393 | 中等 | 迁移、表复制 | 0 | 把无需转换的直接表整体复制到当前 schema。 |
| copy_related_effects | 函数 | 461–491 | 中等 | 迁移、引用关系 | 0 | 迁移 related-items 同步效果记录，保持引用重定向的一致性。 |
| copy_topic_payloads | 函数 | 493–545 | 中等 | 迁移、数据规范化 | 0 | 迁移 topic 的 JSON 载荷字段，规范化旧版结构到当前契约。 |
| insert_legacy_topics | 函数 | 567–628 | 复杂 | 迁移、图谱、写入 | 0 | 把 legacy 主题行写入当前 topic 图谱表，并按状态分派索引建立方式。 |
| LegacyProductionTopicInventory | 类 | 814–817 | 简单 | 迁移、清单、数据契约 | 0 | 生产 legacy 库的主题清单，统计各图谱状态下的行数分布。 |
| LegacyTsVariant | 类 | 18–23 | 简单 | 迁移、兼容处理、枚举 | 0 | 已知 legacy TS 数据库变体标识，驱动分派到对应迁移路径。 |
| migrate_if_known_legacy_ts | 函数 | 772–811 | 中等 | 迁移、入口守卫 | 0 | 入口守卫：仅当检测到已知 legacy TS 变体时才执行迁移，否则直接放行。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs | synthesis-repository crate 的 crate root，统一导出仓储端口、事务辅助与各领域仓储实现模块。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| build_current_database | 函数 | 630–753 | 在临时库上构建当前 schema 的完整数据库，完成全部 legacy 数据的转换。 |
| classify_legacy_ts_schema | 函数 | 261–324 | 读取 legacy 库的 schema 版本与表结构，判定其属于哪个已知变体。 |
| copy_artifacts | 函数 | 395–459 | 迁移 topic 及其关联的 artifact 记录，维护外键与归属关系。 |
| copy_direct_tables | 函数 | 350–393 | 把无需转换的直接表整体复制到当前 schema。 |
| copy_related_effects | 函数 | 461–491 | 迁移 related-items 同步效果记录，保持引用重定向的一致性。 |
| copy_topic_payloads | 函数 | 493–545 | 迁移 topic 的 JSON 载荷字段，规范化旧版结构到当前契约。 |
| insert_legacy_topics | 函数 | 567–628 | 把 legacy 主题行写入当前 topic 图谱表，并按状态分派索引建立方式。 |
| LegacyProductionTopicInventory | 类 | 814–817 | 生产 legacy 库的主题清单，统计各图谱状态下的行数分布。 |
| LegacyTsVariant | 类 | 18–23 | 已知 legacy TS 数据库变体标识，驱动分派到对应迁移路径。 |
| migrate_if_known_legacy_ts | 函数 | 772–811 | 入口守卫：仅当检测到已知 legacy TS 变体时才执行迁移，否则直接放行。 |
