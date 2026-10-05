
# scripts/synthesis/resolve-synthesis-sidecar-verification.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/resolve-synthesis-sidecar-verification.ts -->

解析并重新验证 sidecar runtime 的校验回执：只接受可信来源的 verification result，并按当前内容重新核对身份与指纹。
源码：[scripts/synthesis/resolve-synthesis-sidecar-verification.ts](../../../../../scripts/synthesis/resolve-synthesis-sidecar-verification.ts)

## 符号（3）
<!-- node: function:scripts/synthesis/resolve-synthesis-sidecar-verification.ts:resolveSynthesisSidecarVerification -->
<!-- node: function:scripts/synthesis/resolve-synthesis-sidecar-verification.ts:revalidateSynthesisSidecarVerificationReceipt -->
<!-- node: function:scripts/synthesis/resolve-synthesis-sidecar-verification.ts:selectTrustedSynthesisSidecarVerification -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [resolveSynthesisSidecarVerification](../../../symbols/scripts/synthesis/resolve-synthesis-sidecar-verification.ts/resolveSynthesisSidecarVerification.md) | 函数 | 198–292 | 复杂 | 校验、编排、解析 | 1 | 校验解析主流程：检索近期 run、选定可信结果、重算身份并输出最终 verification 结论。 |
| revalidateSynthesisSidecarVerificationReceipt | 函数 | 104–153 | 中等 | 校验、回执、证据链 | 0 | 针对已存在的校验回执重新求值，检测内容漂移后判定其是否仍然有效。 |
| selectTrustedSynthesisSidecarVerification | 函数 | 48–102 | 中等 | 校验、信任边界、解析 | 0 | 在候选 verification 结果中挑选可信的一条，拒绝来源分支或身份不匹配的记录。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarRuntimeRelease.ts](../../packages/synthesis-contracts/src/sidecarRuntimeRelease.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeRelease.ts | 定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dispatch-synthesis-sidecar-prebuild.ts](dispatch-synthesis-sidecar-prebuild.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts | Synthesis sidecar 预构建的 CI 分发入口：解析命令行参数、校验工作区无未提交改动后，通过 GitHub workflow dispatch 触发 prebuild 分支构建并拉取产物。 |
| [prepare-synthesis-sidecar-release.ts](prepare-synthesis-sidecar-release.ts.md) | scripts/synthesis/prepare-synthesis-sidecar-release.ts | 正式发布前的准备脚本：确认 git 状态与校验结果齐备，生成 release plan 与 release set 作为后续派发的输入。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [resolveSynthesisSidecarVerification](../../../symbols/scripts/synthesis/resolve-synthesis-sidecar-verification.ts/resolveSynthesisSidecarVerification.md) | 函数 | 198–292 | 校验解析主流程：检索近期 run、选定可信结果、重算身份并输出最终 verification 结论。 |
| revalidateSynthesisSidecarVerificationReceipt | 函数 | 104–153 | 针对已存在的校验回执重新求值，检测内容漂移后判定其是否仍然有效。 |
| selectTrustedSynthesisSidecarVerification | 函数 | 48–102 | 在候选 verification 结果中挑选可信的一条，拒绝来源分支或身份不匹配的记录。 |
