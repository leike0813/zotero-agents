
# scripts/synthesis/synthesis-sidecar-runtime-release-set.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/synthesis-sidecar-runtime-release-set.ts -->

定义 runtime release set 的文件布局与读写：集中 release set 与 receipt 的路径常量，并提供从磁盘读取校验的入口。
源码：[scripts/synthesis/synthesis-sidecar-runtime-release-set.ts](../../../../../scripts/synthesis/synthesis-sidecar-runtime-release-set.ts)

## 符号（1）
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-set.ts:readSynthesisSidecarRuntimeReleaseSet -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [readSynthesisSidecarRuntimeReleaseSet](../../../symbols/scripts/synthesis/synthesis-sidecar-runtime-release-set.ts/readSynthesisSidecarRuntimeReleaseSet.md) | 函数 | 22–33 | 简单 | 读取、契约、sidecar | 2 | 从磁盘读取 release set JSON 并按 schema 重建受治理结构。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarRuntimeRelease.ts](../../packages/synthesis-contracts/src/sidecarRuntimeRelease.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeRelease.ts | 定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。 |
| [synthesis-sidecar-runtime-release-governance.ts](synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dispatch-synthesis-sidecar-release.ts](dispatch-synthesis-sidecar-release.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-release.ts | 触发正式 runtime release 的 workflow dispatch 脚本，先校验 checkout 处于预期分支与干净状态，再派发发布流水线。 |
| [prepare-synthesis-sidecar-release.ts](prepare-synthesis-sidecar-release.ts.md) | scripts/synthesis/prepare-synthesis-sidecar-release.ts | 正式发布前的准备脚本：确认 git 状态与校验结果齐备，生成 release plan 与 release set 作为后续派发的输入。 |
| [synthesis-sidecar-runtime-release-controller.ts](synthesis-sidecar-runtime-release-controller.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts | runtime release 回执的状态机控制器：创建初始回执并按阶段推进状态，保证发布生命周期有唯一可追踪记录。 |
| [synthesis-sidecar-runtime-release-plan.ts](synthesis-sidecar-runtime-release-plan.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts | 把 release set 展开为可执行的 release plan，列出每个目标三元组及其对应的预构建结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [readSynthesisSidecarRuntimeReleaseSet](../../../symbols/scripts/synthesis/synthesis-sidecar-runtime-release-set.ts/readSynthesisSidecarRuntimeReleaseSet.md) | 函数 | 22–33 | 从磁盘读取 release set JSON 并按 schema 重建受治理结构。 |
