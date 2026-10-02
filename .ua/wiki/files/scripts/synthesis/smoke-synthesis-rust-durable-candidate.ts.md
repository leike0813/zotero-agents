
# scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts -->

Rust sidecar durable candidate 冒烟脚本：以真实子进程启动 sidecar，覆盖 loopback 转发、reverse host fixture、饱和、布局与 citation graph build 等生产路径。
源码：[scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts](../../../../../scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts)

## 符号（5）
<!-- node: function:scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts:graphBuildFixture -->
<!-- node: function:scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts:loopbackRequest -->
<!-- node: function:scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts:main -->
<!-- node: function:scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts:saturationFixture -->
<!-- node: function:scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts:startReverseHostFixture -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| graphBuildFixture | 函数 | 467–482 | 简单 | integration、citation-graph、fixture | 0 | 构造 citation graph build 场景，验证传输分页与结果重建的一致性。 |
| loopbackRequest | 函数 | 177–297 | 中等 | integration、http、sidecar | 0 | 向 sidecar loopback 端口发起一次带 deadline 的请求并解析响应包络。 |
| main | 函数 | 484–989 | 复杂 | entry-point、smoke、sidecar | 0 | 冒烟入口：依次执行各 fixture、子进程干净关闭检查并汇总结果。 |
| saturationFixture | 函数 | 415–435 | 简单 | integration、stress、sidecar | 0 | 构造并发饱和场景，验证 sidecar 在高压下的有界响应与清理行为。 |
| startReverseHostFixture | 函数 | 309–386 | 中等 | integration、fixture、sidecar | 0 | 启动 reverse host 反向调用桩，用于验证 sidecar 主动回调宿主的路径。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphBuildTransfer.ts](../../packages/synthesis-engine/src/citationGraphBuildTransfer.ts.md) | packages/synthesis-engine/src/citationGraphBuildTransfer.ts | 引用图谱构建的传输封装：分页 artifact 与 manifest 的构建与重建，供 engine 与 sidecar 之间搬运图谱页。 |
| [schemaVersion.ts](../../packages/synthesis-contracts/src/schemaVersion.ts.md) | packages/synthesis-contracts/src/schemaVersion.ts | 只导出 repository foundation schema 版本常量的单行版本锚点，供仓库与合约两侧对齐迁移版本。 |
| [sidecarLifecycle.ts](../../packages/synthesis-contracts/src/sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts | sidecar 启动与发现契约：launch config 与 discovery 的 JSON Schema 及严格重建，确保发现记录可被插件安全消费。 |
| [sidecarSystem.ts](../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| loopbackRequest | 函数 | 177–297 | 向 sidecar loopback 端口发起一次带 deadline 的请求并解析响应包络。 |
