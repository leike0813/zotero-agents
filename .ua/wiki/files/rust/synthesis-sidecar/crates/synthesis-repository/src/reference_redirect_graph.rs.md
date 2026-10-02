
# rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-repository/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-repository/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs -->

Reference 重定向图的仓储实现，记录旧 identity 到新 canonical Reference 的映射与迁移轨迹。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs)

## 符号（3）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs:cycles -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs:ReferenceRedirectGraph -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs:RemovedReferenceRedirect -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| cycles | 函数 | 127–155 | 中等 | identity-mapping、图算法、校验 | 1 | 在重定向图中检测环并返回参与环的边集合，阻止循环引用污染。 |
| ReferenceRedirectGraph | 类 | 5–7 | 简单 | identity-mapping、图结构 | 0 | Reference 重定向图的内存投影，维护 from→to 的 identity 映射。 |
| RemovedReferenceRedirect | 类 | 10–13 | 简单 | identity-mapping、数据契约 | 0 | 被移除的重定向边记录，描述 from/to canonical reference 对。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs | synthesis-repository crate 的 crate root，统一导出仓储端口、事务辅助与各领域仓储实现模块。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| cycles | 函数 | 127–155 | 在重定向图中检测环并返回参与环的边集合，阻止循环引用污染。 |
| ReferenceRedirectGraph | 类 | 5–7 | Reference 重定向图的内存投影，维护 from→to 的 identity 映射。 |
| RemovedReferenceRedirect | 类 | 10–13 | 被移除的重定向边记录，描述 from/to canonical reference 对。 |
