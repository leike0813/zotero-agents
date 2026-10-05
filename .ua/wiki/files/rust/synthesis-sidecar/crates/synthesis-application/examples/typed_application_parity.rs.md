
# rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/examples](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/examples.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs -->

类型化应用层 parity 示例测试，用共享契约语料校验 typed application 的 DTO 与领域行为跨实现一致。
源码：[rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs)

## 符号（5）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs:DrainEngine -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs:FaultRepository -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs:main -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs:run_drain -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs:run_fault -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| DrainEngine | 类 | 158–160 | 中等 | test、fake engine、drain、parity | 1 | 可分批 drain 的引擎替身，用于验证 artifact 装配与重开操作的续跑语义。 |
| FaultRepository | 类 | 446–449 | 中等 | test、fake repository、故障注入、parity | 1 | 可注入故障的仓储替身，实现 RepositoryPort 并在指定调用点抛出受控错误。 |
| main | 函数 | 804–1123 | 复杂 | test、parity、入口、契约语料、typed-application | 0 | 类型化应用层 parity 主流程：加载共享 typed 契约语料，跑完 drain 与 fault 全部场景并汇总差异。 |
| [run_drain](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs/run_drain.md) | 函数 | 571–700 | 复杂 | test、parity、artifact、drain、fault-injection | 1 | 驱动可 drain 引擎的 artifact 装配、校验与分节 patch 场景，验证类型化 artifact 的收敛行为。 |
| [run_fault](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs/run_fault.md) | 函数 | 703–802 | 复杂 | test、parity、故障注入、recovery、重启一致性 | 1 | 驱动 FaultRepository 注入的各类故障，校验重启后状态、投影与软删除的一致性。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs | Synthesis 规范存储层（canonical store）主体，提供 SQLite schema、迁移、事务与图谱/标签/引用等规范记录的读写。 |
