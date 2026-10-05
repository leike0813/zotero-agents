
# rust/synthesis-sidecar/crates/synthesis-protocol/Cargo.toml
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-protocol](../../../../../modules/rust/synthesis-sidecar/crates/synthesis-protocol.md)
<!-- node: config:rust/synthesis-sidecar/crates/synthesis-protocol/Cargo.toml -->

synthesis-protocol crate 的 Cargo 清单，声明其对 serde 等序列化依赖的引用，是侧车协议类型的构建入口。
源码：[rust/synthesis-sidecar/crates/synthesis-protocol/Cargo.toml](../../../../../../../rust/synthesis-sidecar/crates/synthesis-protocol/Cargo.toml)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs | Synthesis sidecar 的线缆协议定义：集中声明请求/响应 DTO、事件类型与版本字段，是 sidecar 与 Workbench 之间跨进程契约的唯一事实源。 |
