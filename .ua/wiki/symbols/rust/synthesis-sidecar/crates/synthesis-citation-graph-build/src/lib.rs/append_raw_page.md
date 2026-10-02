
# append_raw_page
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:append_raw_page -->

校验并追加一页原始输入：核对 descriptor 的 basis、累计 JSON 节点预算，超限即拒绝。
类型：函数  
复杂度：复杂  
入边数：2  
标签：分页输入、输入校验、资源预算、citation-graph  
所属文件：[rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:146](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs#L146)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [compute_typed](compute_typed.md) | rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:374–604 | 类型化图谱计算主流程：装配库内节点、聚合引用边、绑定解析并产出节点、边与 metrics，全程响应取消信号。 |

## 调用

该符号没有记录对外调用。
