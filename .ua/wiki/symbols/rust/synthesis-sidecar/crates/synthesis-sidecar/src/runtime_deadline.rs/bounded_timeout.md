
# bounded_timeout
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs:bounded_timeout -->

把调用方请求的超时收敛为不超过当前请求剩余时间的有界值。
类型：函数  
复杂度：简单  
入边数：3  
标签：deadline、rust、validation  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs:25](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs#L25)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [call_reverse_host_traced](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs:190–301 | 带 trace 的实际调用：生成 request id、注入观察上下文、发送请求并校验响应结构。 |
| [run_direct_json](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:735–804 | direct 执行的 JSON 实现：完成帧交换、结果解析与 validate_direct_result 校验。 |
| [run_paged](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:806–959 | 以 paged 形态执行：按页推送输入、拉取输出页并提交，未消费的输出被请求清理。 |

## 调用

该符号没有记录对外调用。
