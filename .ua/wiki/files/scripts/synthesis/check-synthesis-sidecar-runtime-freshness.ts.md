
# scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts -->

Synthesis sidecar 运行时新鲜度检查：按七平台目标逐一验证 addon 内 bundle 的构建指纹与当前源码是否一致。
源码：[scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts](../../../../../scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts)

## 符号（1）
<!-- node: function:scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts:checkSynthesisSidecarRuntimeFreshness -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| checkSynthesisSidecarRuntimeFreshness | 函数 | 11–43 | 简单 | validation、sidecar、release-gate | 1 | 计算当前构建指纹并逐目标验证 bundle，输出结构化诊断结果。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesis-sidecar-runtime-release-governance.ts](synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dispatch-synthesis-sidecar-prebuild.ts](dispatch-synthesis-sidecar-prebuild.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts | Synthesis sidecar 预构建的 CI 分发入口：解析命令行参数、校验工作区无未提交改动后，通过 GitHub workflow dispatch 触发 prebuild 分支构建并拉取产物。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| checkSynthesisSidecarRuntimeFreshness | 函数 | 11–43 | 计算当前构建指纹并逐目标验证 bundle，输出结构化诊断结果。 |
