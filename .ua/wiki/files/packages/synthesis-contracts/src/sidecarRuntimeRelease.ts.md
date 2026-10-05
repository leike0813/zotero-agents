
# packages/synthesis-contracts/src/sidecarRuntimeRelease.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts -->

定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。
源码：[packages/synthesis-contracts/src/sidecarRuntimeRelease.ts](../../../../../../packages/synthesis-contracts/src/sidecarRuntimeRelease.ts)

## 符号（10）
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:assertSynthesisSidecarRuntimePrebuildResultIdentity -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:assertSynthesisSidecarRuntimePrebuildResultSet -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:computeSynthesisSidecarRuntimePrebuildAggregate -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:createSynthesisSidecarRuntimeReleaseSet -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:rebuildSynthesisSidecarRuntimePrebuildResult -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:rebuildSynthesisSidecarRuntimePrebuildSet -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:rebuildSynthesisSidecarRuntimeReleaseSet -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:rebuildSynthesisSidecarVerificationResult -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:rebuildTargetEvidence -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:synthesisSidecarRuntimeArchiveName -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertSynthesisSidecarRuntimePrebuildResultIdentity | 函数 | 471–487 | 简单 | assertion、contract、sidecar | 0 | 断言 prebuild 结果的 repo/ref/sourceSha 发布身份。 |
| assertSynthesisSidecarRuntimePrebuildResultSet | 函数 | 449–469 | 简单 | assertion、contract、sidecar | 0 | 断言 prebuild 结果与期望集合逐项对应。 |
| computeSynthesisSidecarRuntimePrebuildAggregate | 函数 | 124–138 | 简单 | contract、hashing、sidecar | 0 | 由各 target 归档摘要聚合出 prebuild 集合的 aggregate 标识。 |
| createSynthesisSidecarRuntimeReleaseSet | 函数 | 522–604 | 中等 | factory、contract、sidecar | 0 | 由 prebuild 与 verification 结果创建不可变的 release set。 |
| rebuildSynthesisSidecarRuntimePrebuildResult | 函数 | 367–447 | 中等 | contract、validation、sidecar | 0 | 重建 prebuild 终态结果，校验聚合值与身份字段的一致性。 |
| rebuildSynthesisSidecarRuntimePrebuildSet | 函数 | 140–207 | 中等 | contract、validation、sidecar | 0 | 重建并校验 prebuild 集合：源提交、目标矩阵与归档清单。 |
| rebuildSynthesisSidecarRuntimeReleaseSet | 函数 | 606–667 | 中等 | contract、validation、sidecar | 1 | 重建并校验 release set 的结构与聚合一致性。 |
| rebuildSynthesisSidecarVerificationResult | 函数 | 209–279 | 中等 | contract、validation、sidecar | 0 | 重建 sidecar 验证结果，校验证据结构与终态取值。 |
| rebuildTargetEvidence | 函数 | 289–365 | 中等 | contract、validation、sidecar | 0 | 重建单目标验证证据，绑定当前 runId 与 sourceSha。 |
| synthesisSidecarRuntimeArchiveName | 函数 | 118–122 | 简单 | utility、naming、sidecar | 0 | 由 target 生成预构建归档的规范文件名。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [sidecarRuntimeBundle.ts](sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dispatch-synthesis-sidecar-prebuild.ts](../../../scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts | Synthesis sidecar 预构建的 CI 分发入口：解析命令行参数、校验工作区无未提交改动后，通过 GitHub workflow dispatch 触发 prebuild 分支构建并拉取产物。 |
| [prepare-synthesis-sidecar-release.ts](../../../scripts/synthesis/prepare-synthesis-sidecar-release.ts.md) | scripts/synthesis/prepare-synthesis-sidecar-release.ts | 正式发布前的准备脚本：确认 git 状态与校验结果齐备，生成 release plan 与 release set 作为后续派发的输入。 |
| [publish-synthesis-sidecar-runtime-prebuild.ts](../../../scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts.md) | scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts | 把预构建产物发布到不可变远端 store：以 copy-or-verify 方式幂等上传，校验目标证据后回写 prebuild 集合。 |
| [resolve-synthesis-sidecar-verification.ts](../../../scripts/synthesis/resolve-synthesis-sidecar-verification.ts.md) | scripts/synthesis/resolve-synthesis-sidecar-verification.ts | 解析并重新验证 sidecar runtime 的校验回执：只接受可信来源的 verification result，并按当前内容重新核对身份与指纹。 |
| [stage-synthesis-sidecar-runtime-prebuilds.ts](../../../scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts.md) | scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts | 把预构建归档按目标三元组暂存到本地 store 目录，先断言目标目录集合精确匹配再落盘，避免目录漂移。 |
| [sync-synthesis-sidecar-runtime-prebuilds.ts](../../../scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts.md) | scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts | 从远端预构建分支同步 sidecar runtime 归档到本地 store，按目标三元组增量复制并保持集合与远端一致。 |
| [synthesis-sidecar-runtime-release-set.ts](../../../scripts/synthesis/synthesis-sidecar-runtime-release-set.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-set.ts | 定义 runtime release set 的文件布局与读写：集中 release set 与 receipt 的路径常量，并提供从磁盘读取校验的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertSynthesisSidecarRuntimePrebuildResultIdentity | 函数 | 471–487 | 断言 prebuild 结果的 repo/ref/sourceSha 发布身份。 |
| assertSynthesisSidecarRuntimePrebuildResultSet | 函数 | 449–469 | 断言 prebuild 结果与期望集合逐项对应。 |
| computeSynthesisSidecarRuntimePrebuildAggregate | 函数 | 124–138 | 由各 target 归档摘要聚合出 prebuild 集合的 aggregate 标识。 |
| createSynthesisSidecarRuntimeReleaseSet | 函数 | 522–604 | 由 prebuild 与 verification 结果创建不可变的 release set。 |
| rebuildSynthesisSidecarRuntimePrebuildResult | 函数 | 367–447 | 重建 prebuild 终态结果，校验聚合值与身份字段的一致性。 |
| rebuildSynthesisSidecarRuntimePrebuildSet | 函数 | 140–207 | 重建并校验 prebuild 集合：源提交、目标矩阵与归档清单。 |
| rebuildSynthesisSidecarRuntimeReleaseSet | 函数 | 606–667 | 重建并校验 release set 的结构与聚合一致性。 |
| rebuildSynthesisSidecarVerificationResult | 函数 | 209–279 | 重建 sidecar 验证结果，校验证据结构与终态取值。 |
| synthesisSidecarRuntimeArchiveName | 函数 | 118–122 | 由 target 生成预构建归档的规范文件名。 |
