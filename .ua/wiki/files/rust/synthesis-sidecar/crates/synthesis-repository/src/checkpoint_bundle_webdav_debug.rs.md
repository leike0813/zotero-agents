
# rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-repository/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-repository/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs -->

Synthesis 仓储层的 WebDAV checkpoint bundle 调试工具，解析与比对备份包内容，用于排障 public maintenance operation 的同步问题。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs)

## 符号（15）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:apply_durable_entry -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:apply_durable_import_state -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:capture_debug_projection -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:capture_durable_bundle_state -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:capture_durable_import_state -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:capture_knowledge_checkpoint_state -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:DebugProjection -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:DebugSchemaSummary -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:DurableBundleCapture -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:DurableImportCapture -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:KnowledgeCheckpointBases -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:KnowledgeCheckpointCapture -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:KnowledgeCheckpointPayload -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:replace_knowledge_checkpoint_state -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs:update_domain_bases -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apply_durable_entry | 函数 | 850–946 | 复杂 | 备份、回滚、分派 | 0 | 按 backup entry 类型分派到具体域的恢复逻辑，完成单条 durable 记录回放。 |
| apply_durable_import_state | 函数 | 630–710 | 中等 | 导入、回滚、写入 | 0 | 把捕获的 durable import 状态写回仓储，供导入回滚使用。 |
| capture_debug_projection | 函数 | 719–772 | 中等 | 调试工具、投影 | 0 | 组装完整调试投影：schema 摘要、域 basis 与 durable 备份状态一并输出。 |
| capture_durable_bundle_state | 函数 | 373–572 | 复杂 | 备份、快照、事务 | 0 | 捕获 durable bundle 全量状态，包含 operation、cache basis 与三类图谱域记录。 |
| capture_durable_import_state | 函数 | 574–628 | 中等 | 备份、导入、快照 | 0 | 在导入前捕获 durable import 需要的最小状态子集。 |
| capture_knowledge_checkpoint_state | 函数 | 229–301 | 中等 | checkpoint、快照、读取 | 0 | 读取知识 checkpoint 相关的 tag、concept、topic 域记录，形成可比较的状态快照。 |
| DebugProjection | 类 | 146–152 | 中等 | 调试工具、投影、webdav | 0 | WebDAV 调试投影，汇总 schema、各域 basis 与 durable 备份的完整快照。 |
| DebugSchemaSummary | 类 | 138–142 | 简单 | 调试工具、schema | 0 | 调试投影中的 schema 摘要，报告表清单与版本状态。 |
| DurableBundleCapture | 类 | 66–70 | 简单 | 备份、快照、数据契约 | 0 | durable bundle 备份包的捕获结果，含各域记录与摘要指纹。 |
| DurableImportCapture | 类 | 106–112 | 简单 | 备份、导入、数据契约 | 0 | durable import 前的备份捕获结果，保存待恢复的原始状态。 |
| KnowledgeCheckpointBases | 类 | 12–16 | 简单 | checkpoint、basis、数据契约 | 0 | 知识 checkpoint 的各域 basis 集合（tag revision、concept manifest 等），用于判定备份是否已过期。 |
| KnowledgeCheckpointCapture | 类 | 28–31 | 简单 | checkpoint、快照 | 0 | 从仓储捕获知识 checkpoint 当前状态的只读快照结果。 |
| KnowledgeCheckpointPayload | 类 | 20–24 | 简单 | checkpoint、数据契约 | 0 | 知识 checkpoint 的载荷 DTO，承载 bases 与 entries 集合。 |
| replace_knowledge_checkpoint_state | 函数 | 303–371 | 中等 | checkpoint、事务、写入 | 0 | 在单个事务内把知识 checkpoint 状态整体替换为给定记录集合。 |
| update_domain_bases | 函数 | 948–1019 | 中等 | basis、一致性、写入 | 0 | 依据恢复后的记录集合重算并更新各域 basis，保证后续增量判断一致。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs | synthesis-repository crate 的 crate root，统一导出仓储端口、事务辅助与各领域仓储实现模块。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| apply_durable_entry | 函数 | 850–946 | 按 backup entry 类型分派到具体域的恢复逻辑，完成单条 durable 记录回放。 |
| apply_durable_import_state | 函数 | 630–710 | 把捕获的 durable import 状态写回仓储，供导入回滚使用。 |
| capture_debug_projection | 函数 | 719–772 | 组装完整调试投影：schema 摘要、域 basis 与 durable 备份状态一并输出。 |
| capture_durable_bundle_state | 函数 | 373–572 | 捕获 durable bundle 全量状态，包含 operation、cache basis 与三类图谱域记录。 |
| capture_durable_import_state | 函数 | 574–628 | 在导入前捕获 durable import 需要的最小状态子集。 |
| capture_knowledge_checkpoint_state | 函数 | 229–301 | 读取知识 checkpoint 相关的 tag、concept、topic 域记录，形成可比较的状态快照。 |
| DebugProjection | 类 | 146–152 | WebDAV 调试投影，汇总 schema、各域 basis 与 durable 备份的完整快照。 |
| DebugSchemaSummary | 类 | 138–142 | 调试投影中的 schema 摘要，报告表清单与版本状态。 |
| DurableBundleCapture | 类 | 66–70 | durable bundle 备份包的捕获结果，含各域记录与摘要指纹。 |
| DurableImportCapture | 类 | 106–112 | durable import 前的备份捕获结果，保存待恢复的原始状态。 |
| KnowledgeCheckpointBases | 类 | 12–16 | 知识 checkpoint 的各域 basis 集合（tag revision、concept manifest 等），用于判定备份是否已过期。 |
| KnowledgeCheckpointCapture | 类 | 28–31 | 从仓储捕获知识 checkpoint 当前状态的只读快照结果。 |
| KnowledgeCheckpointPayload | 类 | 20–24 | 知识 checkpoint 的载荷 DTO，承载 bases 与 entries 集合。 |
| replace_knowledge_checkpoint_state | 函数 | 303–371 | 在单个事务内把知识 checkpoint 状态整体替换为给定记录集合。 |
| update_domain_bases | 函数 | 948–1019 | 依据恢复后的记录集合重算并更新各域 basis，保证后续增量判断一致。 |
