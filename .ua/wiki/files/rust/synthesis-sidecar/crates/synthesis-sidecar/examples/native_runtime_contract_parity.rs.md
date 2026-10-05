
# rust/synthesis-sidecar/crates/synthesis-sidecar/examples/native_runtime_contract_parity.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/examples](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/examples.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/examples/native_runtime_contract_parity.rs -->

parity 校验样例：对比原生 runtime 与仓库实现对同一契约的输出，确保 sidecar 生命周期语义在两条路径上一致。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/examples/native_runtime_contract_parity.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/examples/native_runtime_contract_parity.rs)

## 符号（2）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/examples/native_runtime_contract_parity.rs:Case -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/examples/native_runtime_contract_parity.rs:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| Case | 类 | 22–26 | 简单 | data-model、parity-test、fixture | 0 | parity 用例模型：一个语料输入加上预期输出标识。 |
| main | 函数 | 76–124 | 中等 | parity-test、contract-verification、entry-point | 0 | native runtime 契约 parity 校验主流程：遍历语料用例、施加变异并逐条比对原生与仓库实现输出。 |
