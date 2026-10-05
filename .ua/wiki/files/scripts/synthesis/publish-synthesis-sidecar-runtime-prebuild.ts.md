
# scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts -->

把预构建产物发布到不可变远端 store：以 copy-or-verify 方式幂等上传，校验目标证据后回写 prebuild 集合。
源码：[scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts](../../../../../scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts)

## 符号（4）
<!-- node: function:scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts:copyOrVerifySet -->
<!-- node: function:scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts:publishImmutableSynthesisSidecarRuntimeSet -->
<!-- node: function:scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts:publishSynthesisSidecarRuntimePrebuild -->
<!-- node: function:scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts:readTargetEvidence -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| copyOrVerifySet | 函数 | 55–76 | 中等 | 幂等、发布、一致性校验 | 0 | 对已存在的远端对象改为逐文件摘要比对，保证重复发布不覆盖也不重复上传。 |
| publishImmutableSynthesisSidecarRuntimeSet | 函数 | 125–226 | 复杂 | 发布、幂等、编排、预构建 | 0 | 发布主流程：校验证据 → 幂等上传 → 生成不可变集合并返回发布回执。 |
| publishSynthesisSidecarRuntimePrebuild | 函数 | 228–326 | 复杂 | 发布、预构建、入口 | 0 | 对外发布入口，串联集合发布与 prebuild 集合回写，并输出结构化结果。 |
| readTargetEvidence | 函数 | 78–116 | 中等 | 证据、产物校验、预构建 | 0 | 读取目标三元组对应的预构建证据，核对身份、指纹与布局是否满足发布条件。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [package-synthesis-sidecar-runtime-symbols.ts](package-synthesis-sidecar-runtime-symbols.ts.md) | scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts | 为已构建的 Synthesis sidecar runtime 生成符号清单（symbol manifest）并打包，支撑崩溃栈符号化与发布证据链。 |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarRuntimeRelease.ts](../../packages/synthesis-contracts/src/sidecarRuntimeRelease.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeRelease.ts | 定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。 |
| [stage-synthesis-sidecar-runtime-prebuilds.ts](stage-synthesis-sidecar-runtime-prebuilds.ts.md) | scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts | 把预构建归档按目标三元组暂存到本地 store 目录，先断言目标目录集合精确匹配再落盘，避免目录漂移。 |
| [synthesis-sidecar-runtime-release-governance.ts](synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| publishImmutableSynthesisSidecarRuntimeSet | 函数 | 125–226 | 发布主流程：校验证据 → 幂等上传 → 生成不可变集合并返回发布回执。 |
| publishSynthesisSidecarRuntimePrebuild | 函数 | 228–326 | 对外发布入口，串联集合发布与 prebuild 集合回写，并输出结构化结果。 |
