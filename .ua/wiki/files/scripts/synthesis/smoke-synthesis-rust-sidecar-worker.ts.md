
# scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts -->

Rust sidecar worker 冒烟脚本：拉起 sidecar 的 worker 子进程，校验 provenance 指纹并对 worker 协议做一次 layout 请求往返。
源码：[scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts](../../../../../scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts)

## 符号（2）
<!-- node: function:scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts:expectedFingerprint -->
<!-- node: function:scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| expectedFingerprint | 函数 | 14–26 | 简单 | validation、provenance、sidecar | 0 | 解析并校验 sidecar provenance 文件中的源码指纹，必要时直接接受显式指纹。 |
| main | 函数 | 28–113 | 中等 | entry-point、smoke、worker | 0 | 冒烟入口：以 worker 模式拉起 sidecar 子进程并完成一次 layout 请求往返。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../packages/synthesis-engine/src/index.ts.md) | packages/synthesis-engine/src/index.ts | Synthesis 引用图谱计算引擎：对引用图执行布局与指标（PageRank、连通分量）计算，并重建对应的 request/result contract。 |
