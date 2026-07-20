## Why

R4 已证明 Rust sidecar 可以在统一的有界 compute pool 中承载确定性内核，但 reference matcher、Topic Structured Artifact 与 Citation Graph Build 仍由 private Node worker 执行，并保留一套重复的 worker 计算、校验和大对象传输路径。R5 需要把这些复杂内核和 graph transfer 一次迁移到同一个 Rust child，才能继续收缩 Node sidecar，并为后续 layout、durable parity 与最终 cutover 建立单一执行模型。

## What Changes

- 新增八个严格 versioned、private-only Rust operation：reference binding/canonical dedupe、Topic manifest/assembly/artifact/patch，以及 Citation Graph Build monolithic/transfer。
- 为 matcher 与 graph 引入 canonical row paging，为任意嵌套 Topic JSON 引入有序、带 hash、受限的 canonical UTF-8 chunk paging；worker 回显 canonical request hash，Node publication 前严格验证完整结果协议。
- 将 reference matching review、isolated Topic application、graph canary 与 staged graph transfer 路由到统一 Rust compute child；不新增 HTTP capability、SynthesisClient 方法、配置或运行时 fallback。
- 删除已迁移的 private Node compute branches 和 matcher/Topic/graph test-worker fixtures；TypeScript engines 仅保留为插件生产实现和 differential-test oracle。
- 扩展跨语言 schema/corpus/fingerprint、worker source/build parity、运行时 freshness、打包 provenance、资源门禁和五目标平台验收。
- 修正 matcher/graph 的排序与 canonical 细节，使 UTF-16、NFKC、英文小写、浮点取整、安全整数及 hash 行为成为跨语言唯一契约。
- 更新 reference-resolution harness 与 current-state 文档，将 R5 标为完成，并保留 R6–R9 的既定边界。

## Capabilities

### New Capabilities

- `synthesis-rust-sidecar-complex-kernels`: 定义八个复杂 Rust operation、分页协议、差分正确性、资源门禁和 private-only 路由。

### Modified Capabilities

- `synthesis-cross-language-sidecar-contract`: 纳入复杂内核 DTO、canonical paging/chunking、request hash 与跨语言 corpus。
- `synthesis-reference-matcher-engine`: matcher 私有计算迁移到 Rust，并以严格 invariant validation 取代生产 TypeScript 重算。
- `synthesis-topic-structured-artifact-engine`: Topic 四类私有计算迁移到 Rust，并保留 bounded arbitrary-JSON 语义。
- `synthesis-citation-graph-build-engine`: graph build 私有计算迁移到 Rust，同时保持插件数据所有权与 canonical DTO。
- `synthesis-citation-graph-build-large-transfer-contract`: staged transfer 复用 canonical page bytes 与 Rust raw-result artifact，维持原子 publication。
- `synthesis-sidecar-compute-worker-pool`: 十四个 Rust operation 共用单一 admission、deadline、cancel、replacement、shutdown 与 fuse。
- `synthesis-worker-source-build-parity`: source fingerprint、smoke、freshness 与 candidate inventory 覆盖十四个 Rust operation。
- `synthesis-sidecar-reference-matching-review-application-foundation`: private matcher application 注入 pool-backed Rust adapter。
- `synthesis-sidecar-topic-application-foundation`: private Topic application 注入 pool-backed Rust adapter。
- `synthesis-citation-graph-build-packed-worker-canary`: packed graph canary 与 transfer 使用同一 Rust child，不再依赖 Node graph worker。
- `synthesis-rust-sidecar-migration-governance`: R5 的删除边界、五平台资源门禁与后续阶段边界成为 current-state 迁移约束。

## Impact

- 影响 `packages/synthesis-contracts`、Synthesis engines/application/service composition、compute pool 与 graph transfer owner。
- 新增三个 Rust domain crates，并更新 Cargo workspace/lock、依赖许可证与 native candidate provenance。
- 更新 Core 186、187、191、195、199、201、202、206、207、209、218 及 reference-resolution benchmark fixtures/report。
- 不修改生产数据库或 canonical 文件格式，不移动 Host effects/DB/canonical/SynthesisClient 所有权，不增加公开 API。
