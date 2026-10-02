
# scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts -->

把预构建归档按目标三元组暂存到本地 store 目录，先断言目标目录集合精确匹配再落盘，避免目录漂移。
源码：[scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts](../../../../../scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts)

## 符号（3）
<!-- node: function:scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts:assertExactTargetDirectories -->
<!-- node: function:scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts:stageSynthesisSidecarRuntimePrebuildArchives -->
<!-- node: function:scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts:stageSynthesisSidecarRuntimePrebuildSet -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertExactTargetDirectories | 函数 | 49–62 | 简单 | validation、守卫、目标三元组 | 0 | 断言 store 中现有目录与期望目标集合完全一致，多一个或少一个都失败。 |
| stageSynthesisSidecarRuntimePrebuildArchives | 函数 | 168–218 | 中等 | 预构建、暂存、归档 | 0 | 仅执行归档解包与目录落盘，不回写集合，供分段重试使用。 |
| stageSynthesisSidecarRuntimePrebuildSet | 函数 | 64–166 | 复杂 | 预构建、暂存、编排 | 0 | 暂存主流程：逐目标解包归档、校验布局与清单、写入 store 并更新预构建集合。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarRuntimeRelease.ts](../../packages/synthesis-contracts/src/sidecarRuntimeRelease.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeRelease.ts | 定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。 |
| [synthesis-sidecar-runtime-release-governance.ts](synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [publish-synthesis-sidecar-runtime-prebuild.ts](publish-synthesis-sidecar-runtime-prebuild.ts.md) | scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts | 把预构建产物发布到不可变远端 store：以 copy-or-verify 方式幂等上传，校验目标证据后回写 prebuild 集合。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| stageSynthesisSidecarRuntimePrebuildArchives | 函数 | 168–218 | 仅执行归档解包与目录落盘，不回写集合，供分段重试使用。 |
| stageSynthesisSidecarRuntimePrebuildSet | 函数 | 64–166 | 暂存主流程：逐目标解包归档、校验布局与清单、写入 store 并更新预构建集合。 |
