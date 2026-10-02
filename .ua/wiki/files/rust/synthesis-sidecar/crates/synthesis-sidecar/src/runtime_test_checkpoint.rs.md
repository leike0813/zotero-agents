
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs -->

进程级测试检查点：以 armed/held/release 文件协议让集成测试在 sidecar 的特定时序点精确阻塞，用于确定性验证中间态。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs)

## 符号（1）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs:hold_once -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [hold_once](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs/hold_once.md) | 函数 | 9–31 | 简单 | test-support、rust、runtime | 2 | 若检查点已 armed，则独占占用并在 release 文件出现前阻塞，用于确定性验证中间态。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_public_maintenance_operation.rs](runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [hold_once](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs/hold_once.md) | 函数 | 9–31 | 若检查点已 armed，则独占占用并在 release 文件出现前阻塞，用于确定性验证中间态。 |
