## Why

R6 已把 Synthesis 的十五个 compute operation 收敛到 Rust child，但 durable repository、Topic canonical store 和全部 private application orchestration 仍只由 Node shadow service 实现。R7 需要在不触碰生产 owner 的前提下建立完整 Rust durable parity，才能让后续 R8 native lifecycle 和 R9 single-writer cutover 有可验证的实现基础。

## What Changes

- 在现有 Synthesis native workspace 中新增 Rust repository、canonical store 和 application 深层 crate，复刻可观察 durable semantics，而不照搬 Node 类结构。
- Rust repository 固定使用 bundled SQLite，并保持现有 schema/index、WAL、事务、锁竞争、safe-integer、严格行重建与 restart reconciliation 语义。
- Rust canonical store 保持 Topic canonical bytes/hash、CAS、唯一 writer、staging/fsync/journal/receipt、rollback 与 forward recovery 语义。
- 为 Workbench、Topic、Citation Graph、Reference、Tag、Concept、Topic Graph、Checkpoint、Durable Bundle、WebDAV 和 Debug/Maintenance 建立 Node-oracle/Rust-candidate differential parity。
- 仅在现有 candidate `serve` 中增加 authenticated、bounded、mutation-disabled 的 `workbench.chrome.read` 与 `topics.canonical.inspect` canary；其余 mutation application 只在库内 harness 中验证。
- 将 repository locking、journal fault/recovery、application parity、十五 operation smoke、source/build fingerprint 和包体积门禁纳入五目标 candidate workflow。
- 保留生产 `SynthesisClient`、生产数据库、canonical owner 和冻结 Node oracle；不增加 Rust→Node fallback，不引入 R8 manifest/lifecycle 或 R9 production cutover。
- 更新 current-state 文档，修正仍把 R6 描述为未开始的内容。

## Capabilities

### New Capabilities

- `synthesis-rust-durable-foundation-parity`: 定义 Rust durable repository、canonical store、全部 private application differential parity、独立 shadow roots、fault injection 和 R7 验收边界。

### Modified Capabilities

- `synthesis-sidecar-isolated-repository-foundation`: 增加 Rust SQLite owner、完整 schema/index、transaction/locking/restart parity 与关闭语义。
- `synthesis-sidecar-topic-canonical-store-foundation`: 增加 Rust canonical owner、全 journal phase recovery、import/promote 单 writer admission 与只读 inspect canary。
- `synthesis-sidecar-workbench-chrome-read-model`: 将 authenticated Workbench chrome canary 纳入 Rust candidate，同时保持 control-plane bounded。
- `synthesis-cross-language-sidecar-contract`: 增加 durable fixture、公开 DTO、稳定错误、全表状态、canonical bytes/hash 和 receipt 的 differential contract。
- `synthesis-rust-sidecar-migration-governance`: 固化 R7 完成边界以及 R8 native lifecycle、R9 cutover 的后续边界。
- `synthesis-worker-source-build-parity`: 将三个 durable crate、两个 read canary 和十五 operation smoke 纳入 source/build fingerprint。
- `synthesis-sidecar-runtime-packaging`: 纳入 bundled SQLite 依赖、许可证、五目标 fault gate 和 15/75 MiB candidate 预算。

## Impact

- 影响 `native/synthesis-sidecar` Cargo workspace、candidate service/protocol、cross-language fixture/checker、五目标 build workflow、license/provenance/fingerprint 脚本和 Synthesis current-state 文档。
- 新增精确锁定的 `rusqlite 0.40.1`（仅 `bundled`、`backup` features）及其传递依赖；不新增通用 HTTP client，也不把凭据传入 Rust application。
- 不修改插件 production routing、runtime manifest/installer/supervisor、生产数据格式、生产 writer 或公开 `SynthesisClient` surface。
