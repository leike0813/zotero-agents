
# run_fault
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs:run_fault -->

驱动 FaultRepository 注入的各类故障，校验重启后状态、投影与软删除的一致性。
类型：函数  
复杂度：复杂  
入边数：1  
标签：test、parity、故障注入、recovery、重启一致性  
所属文件：[rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs:703](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs#L703)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [main](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs:804–1123 | 类型化应用层 parity 主流程：加载共享 typed 契约语料，跑完 drain 与 fault 全部场景并汇总差异。 |

## 调用

该符号没有记录对外调用。
