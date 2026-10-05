
# rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs -->

相关文献应用层：基于引用与主题关系推导 related items 视图，为 Workbench 与宿主提供只读的相关性结果。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs)

## 符号（4）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs:EffectPlan -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs:host_effect -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs:RelatedItemsApplication -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs:try_sync -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| EffectPlan | 类 | 97–102 | 简单 | rust | 0 | 宿主副作用计划：先在无副作用状态完成预检，再由 Broker 实际执行写入。 |
| host_effect | 函数 | 420–452 | 简单 | rust、宿主副作用、计划、related-items | 0 | 构造宿主副作用载荷，确保 plan 与实际 effect 使用同一份已验证输入。 |
| RelatedItemsApplication | 类 | 104–108 | 简单 | rust、A、p、l | 0 | 相关文献应用层：推导 related items 结果并把宿主副作用包装成可回放的 effect plan。 |
| try_sync | 函数 | 151–393 | 复杂 | rust、同步、宿主副作用、related-items | 0 | 尝试把相关文献结果同步到宿主，遇到权限或范围问题返回带诊断的失败而非部分提交。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| EffectPlan | 类 | 97–102 | 宿主副作用计划：先在无副作用状态完成预检，再由 Broker 实际执行写入。 |
| RelatedItemsApplication | 类 | 104–108 | 相关文献应用层：推导 related items 结果并把宿主副作用包装成可回放的 effect plan。 |
