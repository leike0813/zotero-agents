
# rust/synthesis-sidecar/crates/synthesis-test-support/Cargo.toml
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-test-support](../../../../../modules/rust/synthesis-sidecar/crates/synthesis-test-support.md)
<!-- node: config:rust/synthesis-sidecar/crates/synthesis-test-support/Cargo.toml -->

synthesis-test-support crate 的 Cargo 清单：仅作为 dev-dependency 被其它 crate 引入，提供共享测试工具。
源码：[rust/synthesis-sidecar/crates/synthesis-test-support/Cargo.toml](../../../../../../../rust/synthesis-sidecar/crates/synthesis-test-support/Cargo.toml)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-test-support/src/lib.rs | 跨 crate 共享的测试支撑库：提供临时目录、canonical store 夹具与断言辅助，供 sidecar 各 crate 的测试复用。 |
