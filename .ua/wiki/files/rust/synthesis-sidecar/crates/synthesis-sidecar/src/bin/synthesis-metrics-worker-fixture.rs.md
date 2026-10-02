
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/bin/synthesis-metrics-worker-fixture.rs
所属分层：[Synthesis 领域与侧车](../../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/bin](../../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src/bin.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/bin/synthesis-metrics-worker-fixture.rs -->

指标计算 worker 的测试夹具二进制：以固定输入驱动 metrics worker，供端到端与契约测试复用。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/bin/synthesis-metrics-worker-fixture.rs](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/bin/synthesis-metrics-worker-fixture.rs)

## 符号（1）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/bin/synthesis-metrics-worker-fixture.rs:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 13–80 | 中等 | test-support、fixture、worker、metrics | 0 | 指标 worker 测试夹具：读取固定输入文件、调用 metrics worker 并输出结果，供协议与端到端测试断言。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../../synthesis-protocol/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs | Synthesis sidecar 的线缆协议定义：集中声明请求/响应 DTO、事件类型与版本字段，是 sidecar 与 Workbench 之间跨进程契约的唯一事实源。 |
