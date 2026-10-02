
# scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts -->

Synthesis sidecar 预构建的 CI 分发入口：解析命令行参数、校验工作区无未提交改动后，通过 GitHub workflow dispatch 触发 prebuild 分支构建并拉取产物。
源码：[scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts](../../../../../scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts)

## 符号（5）
<!-- node: function:scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts:assertSynthesisSidecarBundleReplacement -->
<!-- node: function:scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts:assertSynthesisSidecarPrebuildSourceState -->
<!-- node: function:scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts:dispatchSynthesisSidecarPrebuild -->
<!-- node: function:scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts:fetchExactPrebuildStore -->
<!-- node: function:scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts:parseSynthesisSidecarPrebuildArgs -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertSynthesisSidecarBundleReplacement | 函数 | 57–68 | 简单 | validation、prebuild、守卫 | 0 | 断言 bundle 替换被显式允许，防止发布流程在无授权时覆盖既有 runtime bundle。 |
| assertSynthesisSidecarPrebuildSourceState | 函数 | 70–124 | 中等 | validation、git、prebuild | 0 | 校验 dispatch 前源码状态：工作区必须干净，且变更路径与预构建目标 bundle 不发生冲突覆盖。 |
| dispatchSynthesisSidecarPrebuild | 函数 | 134–285 | 复杂 | ci-cd、prebuild、编排、sidecar | 0 | 预构建主流程：派发 workflow、等待 run 完成、下载 artifact 并按目标三元组分发到本地 bundle store。 |
| fetchExactPrebuildStore | 函数 | 287–328 | 中等 | prebuild、下载、产物校验 | 0 | 从指定 prebuild run 拉取精确的 store 快照，并校验其身份与请求一致。 |
| parseSynthesisSidecarPrebuildArgs | 函数 | 330–370 | 中等 | cli、参数解析 | 0 | 解析 prebuild 分发命令的必需/可选参数与布尔开关，缺失时输出用法说明。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-synthesis-sidecar-runtime-freshness.ts](check-synthesis-sidecar-runtime-freshness.ts.md) | scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts | Synthesis sidecar 运行时新鲜度检查：按七平台目标逐一验证 addon 内 bundle 的构建指纹与当前源码是否一致。 |
| [github-workflow-run.ts](../github-workflow-run.ts.md) | scripts/github-workflow-run.ts | GitHub Actions 工作流编排工具：派发 workflow_dispatch、按 request id 精确解析出对应 run，并支持查看、轮询等待与下载产物。 |
| [resolve-synthesis-sidecar-verification.ts](resolve-synthesis-sidecar-verification.ts.md) | scripts/synthesis/resolve-synthesis-sidecar-verification.ts | 解析并重新验证 sidecar runtime 的校验回执：只接受可信来源的 verification result，并按当前内容重新核对身份与指纹。 |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarRuntimeRelease.ts](../../packages/synthesis-contracts/src/sidecarRuntimeRelease.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeRelease.ts | 定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。 |
| [sync-synthesis-sidecar-runtime-prebuilds.ts](sync-synthesis-sidecar-runtime-prebuilds.ts.md) | scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts | 从远端预构建分支同步 sidecar runtime 归档到本地 store，按目标三元组增量复制并保持集合与远端一致。 |
| [synthesis-sidecar-runtime-release-governance.ts](synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertSynthesisSidecarBundleReplacement | 函数 | 57–68 | 断言 bundle 替换被显式允许，防止发布流程在无授权时覆盖既有 runtime bundle。 |
| assertSynthesisSidecarPrebuildSourceState | 函数 | 70–124 | 校验 dispatch 前源码状态：工作区必须干净，且变更路径与预构建目标 bundle 不发生冲突覆盖。 |
| dispatchSynthesisSidecarPrebuild | 函数 | 134–285 | 预构建主流程：派发 workflow、等待 run 完成、下载 artifact 并按目标三元组分发到本地 bundle store。 |
| parseSynthesisSidecarPrebuildArgs | 函数 | 330–370 | 解析 prebuild 分发命令的必需/可选参数与布尔开关，缺失时输出用法说明。 |
