
# scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts -->

解析并复用最近可用的 sidecar runtime 缓存：列举 workflow runs 与 artifact，按目标三元组和摘要选定可下载的缓存命中。
源码：[scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts](../../../../../scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts)

## 符号（4）
<!-- node: function:scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts:listRecentWorkflowRuns -->
<!-- node: function:scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts:listRunArtifacts -->
<!-- node: function:scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts:resolveSynthesisSidecarRuntimeCache -->
<!-- node: function:scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts:runSynthesisSidecarRuntimeCacheCommand -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| listRecentWorkflowRuns | 函数 | 77–107 | 中等 | ci-cd、枚举 | 0 | 调用 gh CLI 列举近期 workflow run，并解析为结构化记录。 |
| listRunArtifacts | 函数 | 109–152 | 中等 | ci-cd、产物枚举 | 0 | 列举指定 run 的 artifact 列表，附带名称、id 与过期时间。 |
| resolveSynthesisSidecarRuntimeCache | 函数 | 154–294 | 复杂 | 缓存、解析、编排、sidecar | 0 | 缓存解析核心：按 run → artifact → 目标三元组逐层筛选，最终给出可下载的缓存候选。 |
| runSynthesisSidecarRuntimeCacheCommand | 函数 | 296–339 | 中等 | cli、命令分发 | 0 | 命令行分发入口，解析子命令与必需参数后调用缓存解析逻辑。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| listRecentWorkflowRuns | 函数 | 77–107 | 调用 gh CLI 列举近期 workflow run，并解析为结构化记录。 |
| listRunArtifacts | 函数 | 109–152 | 列举指定 run 的 artifact 列表，附带名称、id 与过期时间。 |
| resolveSynthesisSidecarRuntimeCache | 函数 | 154–294 | 缓存解析核心：按 run → artifact → 目标三元组逐层筛选，最终给出可下载的缓存候选。 |
| runSynthesisSidecarRuntimeCacheCommand | 函数 | 296–339 | 命令行分发入口，解析子命令与必需参数后调用缓存解析逻辑。 |
