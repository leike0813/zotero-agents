
# rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs -->

知识检查点应用层：记录并推进知识综合进度检查点，使刷新、重启与继续执行共享同一检查点事实。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs)

## 符号（6）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs:apply_import -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs:diff_payload -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs:KnowledgeCheckpoint -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs:KnowledgeCheckpointApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs:KnowledgeCheckpointDiff -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs:preview_import -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apply_import | 函数 | 247–284 | 中等 | rust、导入、checkpoint、提交 | 0 | 应用知识检查点导入，按差异推进各家族状态并返回应用结果。 |
| diff_payload | 函数 | 442–513 | 中等 | rust、差异、投影、checkpoint | 0 | 生成检查点差异载荷，供 Workbench 与审计展示使用。 |
| KnowledgeCheckpoint | 类 | 52–59 | 简单 | rust | 0 | 知识检查点记录：保存各知识家族（标签、概念、主题图）的当前计数与身份。 |
| KnowledgeCheckpointApplication | 类 | 155–161 | 简单 | rust、A、p、l | 0 | 知识检查点应用层：提供 checkpoint 预览、apply 与 receipt 输出，使刷新与继续共享同一进度事实。 |
| KnowledgeCheckpointDiff | 类 | 99–103 | 简单 | rust、D、i、f | 0 | 检查点差异：描述两次检查点之间各家族的增量，用于预览与审计。 |
| preview_import | 函数 | 217–245 | 简单 | rust、预览、checkpoint、差异 | 0 | 预览知识检查点导入，展示各知识家族的计数差异而不落盘。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [admission.rs](admission.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs | 定义应用层的准入（admission）通用类型：写入操作的 admission scope、去重键与重放基础判定，是所有领域应用共享的入口事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| KnowledgeCheckpoint | 类 | 52–59 | 知识检查点记录：保存各知识家族（标签、概念、主题图）的当前计数与身份。 |
| KnowledgeCheckpointApplication | 类 | 155–161 | 知识检查点应用层：提供 checkpoint 预览、apply 与 receipt 输出，使刷新与继续共享同一进度事实。 |
| KnowledgeCheckpointDiff | 类 | 99–103 | 检查点差异：描述两次检查点之间各家族的增量，用于预览与审计。 |
