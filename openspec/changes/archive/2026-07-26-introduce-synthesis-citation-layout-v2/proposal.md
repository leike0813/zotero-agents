## Why

R5 已将除 Citation Graph layout 以外的 private compute kernels 收敛到统一 Rust child，但 layout 仍通过 Node worker 与 `d3-force` 执行，留下第二套 worker 生命周期、依赖库存和打包路径。R6 需要以新的布局版本完成最后一个 kernel 的 Rust 迁移，才能在不改变插件数据所有权和公开 API 的前提下删除生产 D3/Node compute runtime。

## What Changes

- 新增 Rust-owned Citation Graph Layout v2：force 使用固定参数的 ForceAtlas2，radial/components 保留既有稳定排序与间距语义。
- 将 private operation 升级为 `citation_graph_layout.v2`，同时保持外部 `compute.citation_graph_layout` capability 与 `SynthesisClient` graph API 不变。
- 通过现有 one-active/two-queued compute pool 和 Rust child 执行 layout；不保留 TypeScript/Node runtime fallback。
- 将旧 `1.2` layout 作为可重建 stale cache 读取，不自动改写 canonical graph 或数据库历史。
- 删除 Node layout worker、TypeScript layout kernels、`d3-force` 运行时及其 XPI/license/fingerprint inventory。
- 固定 Synthesis native workspace 到 `nightly-2026-07-25`，新增精确版本 `forceatlas2 = 0.8.0`，扩展跨语言 corpus、资源门禁和五目标打包验收。
- 更新 current-state 文档，并修正 R5 已归档的文档漂移。

## Capabilities

### New Capabilities

- `synthesis-citation-graph-layout-v2`: 定义 Rust Layout v2 的算法、确定性、缓存升级、质量与资源边界。

### Modified Capabilities

- `synthesis-citation-graph`: 将 production layout identity 与 stale-cache 语义升级到 v2。
- `synthesis-citation-graph-layout-engine`: 用 Rust-owned v2 contract 取代 TypeScript/d3-force process-portable kernel。
- `synthesis-citation-graph-layout-production-routing`: 将 layout 路由到现有 Rust child，并保持插件数据与 promotion authority。
- `synthesis-cross-language-sidecar-contract`: 纳入 layout v2 schema、canonical corpus、result validation 与 cancellation。
- `synthesis-sidecar-compute-worker-pool`: 删除 Node backend switching，使十五个 production operations 共用单一 Rust child。
- `synthesis-worker-source-build-parity`: 将 layout v2 纳入 source/build identity、smoke 与 candidate inventory。
- `synthesis-sidecar-runtime-packaging`: 删除 D3 runtime inventory，纳入 ForceAtlas2/Rust 许可证与五目标体积门禁。
- `synthesis-rust-sidecar-migration-governance`: 固化 R6 完成边界及 R7–R9 后续边界。

## Impact

- 影响 `packages/synthesis-engine`、Citation Graph application adapters、Synthesis service compute protocol/pool、native Rust workspace 和 release-governance scripts。
- 新增一个 Rust domain crate，更新 Cargo workspace/lock、Synthesis-only pinned toolchain、CI workflow、依赖许可证和 provenance。
- 删除 `apps/synthesis-service/src/computeWorker.ts` 以及 npm D3 依赖。
- 不修改公开 HTTP capability、`SynthesisClient` 方法、canonical graph 格式、Host/DB/repository ownership，也不影响 Host Bridge Rust toolchain。
