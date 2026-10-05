
# rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs -->

标签审计应用层：检测库内标签的规范冲突、冗余与漂移，产出可复现的审计结论供导入与清理流程使用。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs)

## 符号（5）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs:begin -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs:commit_acknowledgement -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs:promote -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs:TagAuditApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs:TagRegulationAcknowledgementResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| begin | 函数 | 248–323 | 中等 | rust、审计、run、tag-audit | 0 | 开启一次标签审计 run，记录执行主体与审计范围，产出可追加的 run handle。 |
| commit_acknowledgement | 函数 | 550–648 | 中等 | rust、提交、标签规整、canonical | 0 | 提交标签规整确认：把已确认的规范化改动与 canonical 提交证据一并落盘。 |
| promote | 函数 | 349–481 | 复杂 | rust、审计、提交、tag-audit | 0 | 将审计暂存条目提升为正式改动，promote 前的准备与确认缺一不可。 |
| TagAuditApplication | 类 | 229–233 | 简单 | rust、A、p、l | 0 | 标签审计应用层 owner：编排审计 run 的 begin/append/promote/abort 与标签规整确认提交。 |
| TagRegulationAcknowledgementResult | 类 | 158–173 | 简单 | rust、R、e、s | 0 | 规整确认结果：记录已确认的规范化改动与对应的 canonical 提交证据。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| TagAuditApplication | 类 | 229–233 | 标签审计应用层 owner：编排审计 run 的 begin/append/promote/abort 与标签规整确认提交。 |
| TagRegulationAcknowledgementResult | 类 | 158–173 | 规整确认结果：记录已确认的规范化改动与对应的 canonical 提交证据。 |
