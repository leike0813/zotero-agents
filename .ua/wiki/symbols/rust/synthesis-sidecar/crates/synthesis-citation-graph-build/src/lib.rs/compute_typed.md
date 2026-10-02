
# compute_typed
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:compute_typed -->

类型化图谱计算主流程：装配库内节点、聚合引用边、绑定解析并产出节点、边与 metrics，全程响应取消信号。
类型：函数  
复杂度：复杂  
入边数：1  
标签：citation-graph、核心算法、分页输入、取消、metrics  
所属文件：[rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:374](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs#L374)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [compute](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:606–637 | 非分页入口的图谱计算包装，复用 compute_typed 语义并返回带契约版本的结果。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [append_raw_page](append_raw_page.md) | rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:146–179 | 校验并追加一页原始输入：核对 descriptor 的 basis、累计 JSON 节点预算，超限即拒绝。 |
| [primary_role](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:350–372 | 按提及次数与角色计数推导一条边的 primary role，用于边状态与展示归类。 |
