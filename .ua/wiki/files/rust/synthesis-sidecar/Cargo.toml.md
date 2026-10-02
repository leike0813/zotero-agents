
# rust/synthesis-sidecar/Cargo.toml
所属分层：[Synthesis 领域与侧车](../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar](../../../modules/rust/synthesis-sidecar.md)
<!-- node: config:rust/synthesis-sidecar/Cargo.toml -->

Synthesis 侧车 Rust workspace 的根 Cargo 清单：注册 14 个 crates（protocol、repository、application、citation-graph 等），统一 edition 2024 与 AGPL-3.0-only 授权，集中声明 serde、rusqlite、forceatlas2 等共享依赖，并设定 release 侧车的 LTO + opt-level=z + panic=abort + strip 精简编译 profile。
源码：[rust/synthesis-sidecar/Cargo.toml](../../../../../rust/synthesis-sidecar/Cargo.toml)
