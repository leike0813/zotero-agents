
# hold_once
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs:hold_once -->

若检查点已 armed，则独占占用并在 release 文件出现前阻塞，用于确定性验证中间态。
类型：函数  
复杂度：简单  
入边数：2  
标签：test-support、rust、runtime  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs:9](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs#L9)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [build_production_applications](../runtime_production_ports.rs/build_production_applications.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:153–317 | 组合根：打开 canonical store 与 repository，按依赖顺序构造各 application 并交由运行时持有。 |
| [submit](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:249–261 | public maintenance 提交入口：durable insert winner 才取得 execution owner 并派发 worker。 |

## 调用

该符号没有记录对外调用。
