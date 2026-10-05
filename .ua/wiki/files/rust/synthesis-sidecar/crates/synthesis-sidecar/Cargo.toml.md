
# rust/synthesis-sidecar/crates/synthesis-sidecar/Cargo.toml
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar](../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar.md)
<!-- node: config:rust/synthesis-sidecar/crates/synthesis-sidecar/Cargo.toml -->

sidecar 运行时 crate 的 Cargo 清单：聚合各领域 crate 依赖，并声明 lib/worker/serve 等 binary target 与 example parity 目标。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/Cargo.toml](../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/Cargo.toml)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [main.rs](src/main.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/main.rs | sidecar 可执行入口：仅负责把命令行参数转交 CLI 适配层，不组装任何 runtime module graph。 |
