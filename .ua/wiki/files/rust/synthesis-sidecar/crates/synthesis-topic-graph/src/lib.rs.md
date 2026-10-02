
# rust/synthesis-sidecar/crates/synthesis-topic-graph/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-topic-graph/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-topic-graph/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-topic-graph/src/lib.rs -->

主题图谱 crate：定义主题节点与边、图谱布局身份以及基于主题图谱的邻域与分页读取结构。
源码：[rust/synthesis-sidecar/crates/synthesis-topic-graph/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-topic-graph/src/lib.rs)

## 符号（1）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-topic-graph/src/lib.rs:compute -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| compute | 函数 | 18–62 | 中等 | graph、validation、worker、topic-graph | 0 | 主题图谱 worker：校验父子边不构成环，规范化节点与边并输出图谱构建结果。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../synthesis-protocol/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs | Synthesis sidecar 的线缆协议定义：集中声明请求/响应 DTO、事件类型与版本字段，是 sidecar 与 Workbench 之间跨进程契约的唯一事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| compute | 函数 | 18–62 | 主题图谱 worker：校验父子边不构成环，规范化节点与边并输出图谱构建结果。 |
