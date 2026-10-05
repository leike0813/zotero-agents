
# rust/synthesis-sidecar/crates/synthesis-test-support/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-test-support/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-test-support/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-test-support/src/lib.rs -->

跨 crate 共享的测试支撑库：提供临时目录、canonical store 夹具与断言辅助，供 sidecar 各 crate 的测试复用。
源码：[rust/synthesis-sidecar/crates/synthesis-test-support/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-test-support/src/lib.rs)

## 符号（1）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-test-support/src/lib.rs:TestRoot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| TestRoot | 类 | 15–93 | 中等 | test-support、fixture、resource-owner | 0 | 测试用临时目录所有者：创建唯一 fixture 根目录，并在最后一个依赖者析构时递归清理。 |
