
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/main.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/main.rs -->

sidecar 可执行入口：仅负责把命令行参数转交 CLI 适配层，不组装任何 runtime module graph。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/main.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/main.rs)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_cli.rs](runtime_cli.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_cli.rs | sidecar CLI 适配层：解析 worker / serve --config 等子命令并转调 runtime_service 生命周期入口。 |
