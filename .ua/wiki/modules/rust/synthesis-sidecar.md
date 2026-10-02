
# rust/synthesis-sidecar
> 目录聚合页：4 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [rust/synthesis-sidecar/build-recipe.json](../../files/rust/synthesis-sidecar/build-recipe.json.md) | 配置 | 0 | 侧车跨平台构建配方（synthesis-sidecar.build-recipe.v1）：固定 node 24.18.0 / rust nightly-2026-07-25 / zig 0.13.0 工具链版本，并按 runner 与 target 声明 win32-x64、darwin-x64、darwin-arm64、linux-x86/x64/arm/arm64 七个发布目标及其是否使用 zig 交叉链接、是否做原生冒烟验证。 |
| [rust/synthesis-sidecar/Cargo.toml](../../files/rust/synthesis-sidecar/Cargo.toml.md) | 配置 | 0 | Synthesis 侧车 Rust workspace 的根 Cargo 清单：注册 14 个 crates（protocol、repository、application、citation-graph 等），统一 edition 2024 与 AGPL-3.0-only 授权，集中声明 serde、rusqlite、forceatlas2 等共享依赖，并设定 release 侧车的 LTO + opt-level=z + panic=abort + strip 精简编译 profile。 |
| [rust/synthesis-sidecar/licenses.json](../../files/rust/synthesis-sidecar/licenses.json.md) | 配置 | 0 | 侧车随包分发的许可证清单（synthesis-rust-sidecar-license-inventory.v1）：登记 bundledComponents 中静态链接的 sqlite3 3.53.2（Public-Domain），以及 71 个 Rust 依赖包的名称、精确版本与 SPDX 许可表达式，供合规审计与 NOTICE 生成使用。 |
| [rust/synthesis-sidecar/rust-toolchain.toml](../../files/rust/synthesis-sidecar/rust-toolchain.toml.md) | 配置 | 0 | 锁定侧车 workspace 的 Rust 工具链为 nightly-2026-07-25（minimal profile），保证本地、CI 与发布构建使用同一编译器版本。 |

## 子目录
- [crates/synthesis-application/examples](synthesis-sidecar/crates/synthesis-application/examples.md)、[crates/synthesis-application/src/citation_graph](synthesis-sidecar/crates/synthesis-application/src/citation_graph.md)、[crates/synthesis-canonical-store/src](synthesis-sidecar/crates/synthesis-canonical-store/src.md)、[crates/synthesis-citation-graph-build/src](synthesis-sidecar/crates/synthesis-citation-graph-build/src.md)、[crates/synthesis-citation-layout/src](synthesis-sidecar/crates/synthesis-citation-layout/src.md)、[crates/synthesis-concept-kb/src](synthesis-sidecar/crates/synthesis-concept-kb/src.md)、[crates/synthesis-metrics/src](synthesis-sidecar/crates/synthesis-metrics/src.md)、[crates/synthesis-protocol/src](synthesis-sidecar/crates/synthesis-protocol/src.md)、[crates/synthesis-reference-matcher/src](synthesis-sidecar/crates/synthesis-reference-matcher/src.md)、[crates/synthesis-repository/src](synthesis-sidecar/crates/synthesis-repository/src.md)、[crates/synthesis-sidecar/examples](synthesis-sidecar/crates/synthesis-sidecar/examples.md)、[crates/synthesis-sidecar/src/bin](synthesis-sidecar/crates/synthesis-sidecar/src/bin.md)、[crates/synthesis-tag-vocabulary/src](synthesis-sidecar/crates/synthesis-tag-vocabulary/src.md)、[crates/synthesis-test-support/src](synthesis-sidecar/crates/synthesis-test-support/src.md)、[crates/synthesis-topic-graph/src](synthesis-sidecar/crates/synthesis-topic-graph/src.md)、[crates/synthesis-topic-structured-artifact/src](synthesis-sidecar/crates/synthesis-topic-structured-artifact/src.md)
