
# scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts -->

从远端预构建分支同步 sidecar runtime 归档到本地 store，按目标三元组增量复制并保持集合与远端一致。
源码：[scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts](../../../../../scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts)

## 符号（2）
<!-- node: function:scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts:remoteStore -->
<!-- node: function:scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts:syncSynthesisSidecarRuntimePrebuilds -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| remoteStore | 函数 | 46–68 | 中等 | 远端、git、存储布局 | 0 | 解析远端预构建 store 的目录布局与目标路径，构造同步所需的远端映射。 |
| [syncSynthesisSidecarRuntimePrebuilds](../../../symbols/scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts/syncSynthesisSidecarRuntimePrebuilds.md) | 函数 | 70–183 | 复杂 | 同步、预构建、编排 | 1 | 同步主流程：按目标比对远端与本地差异，增量复制并重建预构建集合。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarRuntimeRelease.ts](../../packages/synthesis-contracts/src/sidecarRuntimeRelease.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeRelease.ts | 定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。 |
| [synthesis-sidecar-runtime-release-governance.ts](synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dispatch-synthesis-sidecar-prebuild.ts](dispatch-synthesis-sidecar-prebuild.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts | Synthesis sidecar 预构建的 CI 分发入口：解析命令行参数、校验工作区无未提交改动后，通过 GitHub workflow dispatch 触发 prebuild 分支构建并拉取产物。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [syncSynthesisSidecarRuntimePrebuilds](../../../symbols/scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts/syncSynthesisSidecarRuntimePrebuilds.md) | 函数 | 70–183 | 同步主流程：按目标比对远端与本地差异，增量复制并重建预构建集合。 |
