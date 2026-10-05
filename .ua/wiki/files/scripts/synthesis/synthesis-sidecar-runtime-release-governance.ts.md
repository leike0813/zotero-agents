
# scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts -->

Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。
源码：[scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts](../../../../../scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts)

## 符号（9）
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:assertSynthesisSidecarRuntimeArchiveLayout -->
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:computeSynthesisRustSidecarSourceFingerprint -->
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:computeSynthesisSidecarRuntimeBuildFingerprint -->
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:computeSynthesisSidecarRuntimeIdentities -->
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:readSynthesisSidecarRuntimeBuildRecipe -->
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:synthesisSidecarRuntimeAddonBundleRoot -->
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:synthesisSidecarRuntimeIdentityInputs -->
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:synthesisSidecarRuntimeTar -->
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:verifySynthesisSidecarRuntimeBundleDirectory -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertSynthesisSidecarRuntimeArchiveLayout | 函数 | 357–390 | 中等 | validation、归档布局、守卫 | 1 | 断言归档内部目录布局符合 bundle 约定，拒绝缺失或多余路径。 |
| computeSynthesisRustSidecarSourceFingerprint | 函数 | 304–312 | 简单 | 指纹、rust、sidecar | 0 | 对 Rust sidecar 源码树求摘要指纹，隔离非 Rust 变更对构建身份的影响。 |
| computeSynthesisSidecarRuntimeBuildFingerprint | 函数 | 392–400 | 简单 | 指纹、构建、治理 | 0 | 汇总构建输入计算最终 build fingerprint。 |
| computeSynthesisSidecarRuntimeIdentities | 函数 | 256–296 | 中等 | 身份、指纹、治理 | 0 | 基于归一化输入计算各目标三元组的 runtime 身份。 |
| readSynthesisSidecarRuntimeBuildRecipe | 函数 | 52–110 | 中等 | 构建、配置、治理 | 0 | 读取并校验构建配方，产出目标三元组与编译选项等受治理构建输入。 |
| synthesisSidecarRuntimeAddonBundleRoot | 函数 | 22–27 | 简单 | 工具函数、路径、sidecar | 0 | 返回 addon 目录下 sidecar runtime bundle 的根路径。 |
| synthesisSidecarRuntimeIdentityInputs | 函数 | 193–254 | 复杂 | 身份、治理、输入归一 | 0 | 收集并归一化构成 runtime 身份的全部输入，是指纹计算的唯一上游。 |
| synthesisSidecarRuntimeTar | 函数 | 329–355 | 中等 | 打包、确定性、归档 | 0 | 以确定性顺序与元数据生成 runtime tar 归档，保证同输入同字节。 |
| [verifySynthesisSidecarRuntimeBundleDirectory](../../../symbols/scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts/verifySynthesisSidecarRuntimeBundleDirectory.md) | 函数 | 416–487 | 复杂 | validation、产物校验、治理 | 3 | 完整校验 bundle 目录：清单、指针、可执行位、布局与指纹全部一致才算通过。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acceptance.ts](../system-e2e/acceptance.ts.md) | scripts/system-e2e/acceptance.ts | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [check-synthesis-sidecar-runtime-freshness.ts](check-synthesis-sidecar-runtime-freshness.ts.md) | scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts | Synthesis sidecar 运行时新鲜度检查：按七平台目标逐一验证 addon 内 bundle 的构建指纹与当前源码是否一致。 |
| [check-synthesis-sidecar-runtime-xpi.ts](check-synthesis-sidecar-runtime-xpi.ts.md) | scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts | 校验已构建的 XPI 内是否携带与目标平台匹配的 Synthesis sidecar 运行时 bundle，并按构建指纹判定其新鲜度。 |
| [dispatch-synthesis-sidecar-prebuild.ts](dispatch-synthesis-sidecar-prebuild.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts | Synthesis sidecar 预构建的 CI 分发入口：解析命令行参数、校验工作区无未提交改动后，通过 GitHub workflow dispatch 触发 prebuild 分支构建并拉取产物。 |
| [download-synthesis-sidecar-runtime-cache.ts](download-synthesis-sidecar-runtime-cache.ts.md) | scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts | 从 GitHub Actions artifact 下载 Synthesis sidecar runtime 压缩包并解包到本地 tar.gz 缓存，同时校验目标三元组与摘要。 |
| [package-synthesis-sidecar-runtime.ts](package-synthesis-sidecar-runtime.ts.md) | scripts/synthesis/package-synthesis-sidecar-runtime.ts | Synthesis sidecar runtime 的打包 CLI：按平台目标收集 Rust 构建产物、清单与指针文件，组装成可分发的 bundle 目录。 |
| [prepare-synthesis-sidecar-release.ts](prepare-synthesis-sidecar-release.ts.md) | scripts/synthesis/prepare-synthesis-sidecar-release.ts | 正式发布前的准备脚本：确认 git 状态与校验结果齐备，生成 release plan 与 release set 作为后续派发的输入。 |
| [publish-synthesis-sidecar-runtime-prebuild.ts](publish-synthesis-sidecar-runtime-prebuild.ts.md) | scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts | 把预构建产物发布到不可变远端 store：以 copy-or-verify 方式幂等上传，校验目标证据后回写 prebuild 集合。 |
| [stage-synthesis-sidecar-runtime-prebuilds.ts](stage-synthesis-sidecar-runtime-prebuilds.ts.md) | scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts | 把预构建归档按目标三元组暂存到本地 store 目录，先断言目标目录集合精确匹配再落盘，避免目录漂移。 |
| [sync-synthesis-sidecar-runtime-prebuilds.ts](sync-synthesis-sidecar-runtime-prebuilds.ts.md) | scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts | 从远端预构建分支同步 sidecar runtime 归档到本地 store，按目标三元组增量复制并保持集合与远端一致。 |
| [synthesis-sidecar-runtime-release-set.ts](synthesis-sidecar-runtime-release-set.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-set.ts | 定义 runtime release set 的文件布局与读写：集中 release set 与 receipt 的路径常量，并提供从磁盘读取校验的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertSynthesisSidecarRuntimeArchiveLayout | 函数 | 357–390 | 断言归档内部目录布局符合 bundle 约定，拒绝缺失或多余路径。 |
| computeSynthesisRustSidecarSourceFingerprint | 函数 | 304–312 | 对 Rust sidecar 源码树求摘要指纹，隔离非 Rust 变更对构建身份的影响。 |
| computeSynthesisSidecarRuntimeBuildFingerprint | 函数 | 392–400 | 汇总构建输入计算最终 build fingerprint。 |
| computeSynthesisSidecarRuntimeIdentities | 函数 | 256–296 | 基于归一化输入计算各目标三元组的 runtime 身份。 |
| readSynthesisSidecarRuntimeBuildRecipe | 函数 | 52–110 | 读取并校验构建配方，产出目标三元组与编译选项等受治理构建输入。 |
| synthesisSidecarRuntimeAddonBundleRoot | 函数 | 22–27 | 返回 addon 目录下 sidecar runtime bundle 的根路径。 |
| synthesisSidecarRuntimeIdentityInputs | 函数 | 193–254 | 收集并归一化构成 runtime 身份的全部输入，是指纹计算的唯一上游。 |
| [verifySynthesisSidecarRuntimeBundleDirectory](../../../symbols/scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts/verifySynthesisSidecarRuntimeBundleDirectory.md) | 函数 | 416–487 | 完整校验 bundle 目录：清单、指针、可执行位、布局与指纹全部一致才算通过。 |
