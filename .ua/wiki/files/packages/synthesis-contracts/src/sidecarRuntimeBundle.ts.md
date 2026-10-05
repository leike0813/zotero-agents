
# packages/synthesis-contracts/src/sidecarRuntimeBundle.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts -->

定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。
源码：[packages/synthesis-contracts/src/sidecarRuntimeBundle.ts](../../../../../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts)

## 符号（13）
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:isExpiredSynthesisSidecarRuntimeManifest -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:isProductionSynthesisSidecarRuntimeSignature -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:rebuildCapabilities -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:rebuildFile -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:rebuildRelativeFilePath -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:rebuildSynthesisSidecarRuntimeBundleManifest -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:rebuildSynthesisSidecarRuntimePlatformSignature -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:rebuildSynthesisSidecarRuntimePointer -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:rebuildTarget -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:strictRecord -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:strictString -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:synthesisSidecarRuntimePlatformIdentity -->
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:synthesisSidecarRuntimeTargetBundlePath -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isExpiredSynthesisSidecarRuntimeManifest | 函数 | 305–310 | 简单 | predicate、contract、sidecar | 0 | 按当前时间判断 bundle manifest 是否已过期。 |
| isProductionSynthesisSidecarRuntimeSignature | 函数 | 297–303 | 简单 | predicate、contract、sidecar | 0 | 判断平台签名是否属于正式生产构建。 |
| rebuildCapabilities | 函数 | 235–249 | 简单 | validation、contract、sidecar | 0 | 校验 bundle 声明的 sidecar 能力集合与已知能力定义一致。 |
| rebuildFile | 函数 | 210–233 | 简单 | validation、contract、sidecar | 0 | 校验 bundle 文件条目：相对路径、字节数与 sha256 摘要。 |
| rebuildRelativeFilePath | 函数 | 170–196 | 简单 | validation、security、path | 0 | 校验并归一化 bundle 内相对文件路径，拒绝绝对路径与目录穿越。 |
| rebuildSynthesisSidecarRuntimeBundleManifest | 函数 | 312–444 | 中等 | contract、validation、sidecar | 0 | 重建并全面校验 sidecar 运行时 bundle manifest，返回新的只读对象。 |
| [rebuildSynthesisSidecarRuntimePlatformSignature](../../../../symbols/packages/synthesis-contracts/src/sidecarRuntimeBundle.ts/rebuildSynthesisSidecarRuntimePlatformSignature.md) | 函数 | 251–295 | 简单 | contract、validation、sidecar | 5 | 重建平台签名并校验其与 target、平台身份的对应关系。 |
| rebuildSynthesisSidecarRuntimePointer | 函数 | 446–457 | 简单 | contract、validation、sidecar | 0 | 重建运行时指针，绑定 bundle id、目标平台与到期时间。 |
| rebuildTarget | 函数 | 198–208 | 简单 | validation、contract、sidecar | 0 | 校验单条 target 条目的结构与取值范围。 |
| strictRecord | 函数 | 119–145 | 简单 | validation、utility、contract | 0 | 严格对象校验辅助：要求输入为普通对象且只含给定的 key 集合。 |
| strictString | 函数 | 147–156 | 简单 | validation、utility、contract | 0 | 严格字符串校验辅助，可附加正则约束与错误码。 |
| synthesisSidecarRuntimePlatformIdentity | 函数 | 60–78 | 简单 | contract、platform、sidecar | 0 | 由 target 三元组推导出平台、架构与操作系统身份。 |
| synthesisSidecarRuntimeTargetBundlePath | 函数 | 27–31 | 简单 | utility、path、sidecar | 1 | 解析某运行时 target 在 addon 资产根下的 bundle 目录相对路径。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [sidecarSystem.ts](sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acceptance.ts](../../../scripts/system-e2e/acceptance.ts.md) | scripts/system-e2e/acceptance.ts | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [check-synthesis-native-runtime-contract-parity.ts](../../../scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts.md) | scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts | 原生运行时契约一致性检查：比对 Rust 侧运行时 bundle 指针、launch config 与 discovery schema 是否与 TS 契约对齐。 |
| [check-synthesis-sidecar-runtime-xpi.ts](../../../scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts.md) | scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts | 校验已构建的 XPI 内是否携带与目标平台匹配的 Synthesis sidecar 运行时 bundle，并按构建指纹判定其新鲜度。 |
| [dispatch-synthesis-sidecar-prebuild.ts](../../../scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts | Synthesis sidecar 预构建的 CI 分发入口：解析命令行参数、校验工作区无未提交改动后，通过 GitHub workflow dispatch 触发 prebuild 分支构建并拉取产物。 |
| [download-synthesis-sidecar-runtime-cache.ts](../../../scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts.md) | scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts | 从 GitHub Actions artifact 下载 Synthesis sidecar runtime 压缩包并解包到本地 tar.gz 缓存，同时校验目标三元组与摘要。 |
| [package-synthesis-sidecar-runtime-symbols.ts](../../../scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts.md) | scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts | 为已构建的 Synthesis sidecar runtime 生成符号清单（symbol manifest）并打包，支撑崩溃栈符号化与发布证据链。 |
| [package-synthesis-sidecar-runtime.ts](../../../scripts/synthesis/package-synthesis-sidecar-runtime.ts.md) | scripts/synthesis/package-synthesis-sidecar-runtime.ts | Synthesis sidecar runtime 的打包 CLI：按平台目标收集 Rust 构建产物、清单与指针文件，组装成可分发的 bundle 目录。 |
| [publish-synthesis-sidecar-runtime-prebuild.ts](../../../scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts.md) | scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts | 把预构建产物发布到不可变远端 store：以 copy-or-verify 方式幂等上传，校验目标证据后回写 prebuild 集合。 |
| [resolve-synthesis-sidecar-runtime-cache.ts](../../../scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts.md) | scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts | 解析并复用最近可用的 sidecar runtime 缓存：列举 workflow runs 与 artifact，按目标三元组和摘要选定可下载的缓存命中。 |
| [runtimePlatform.ts](../../../src/platform/runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [sidecarLifecycle.ts](sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts | sidecar 启动与发现契约：launch config 与 discovery 的 JSON Schema 及严格重建，确保发现记录可被插件安全消费。 |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |
| [sidecarRuntimeRelease.ts](sidecarRuntimeRelease.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeRelease.ts | 定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。 |
| [sidecarSystem.ts](sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [stage-synthesis-sidecar-runtime-prebuilds.ts](../../../scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts.md) | scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts | 把预构建归档按目标三元组暂存到本地 store 目录，先断言目标目录集合精确匹配再落盘，避免目录漂移。 |
| [sync-synthesis-sidecar-runtime-prebuilds.ts](../../../scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts.md) | scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts | 从远端预构建分支同步 sidecar runtime 归档到本地 store，按目标三元组增量复制并保持集合与远端一致。 |
| [synthesis-sidecar-runtime-release-governance.ts](../../../scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |
| [synthesisSidecarRuntimeInstaller.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts | sidecar 运行时安装器：按当前平台目标把打包的 sidecar 二进制从 staging 目录原子落位到运行时目录，逐文件校验 SHA-256 摘要并设置可执行权限，同时负责过期 manifest 的清理与诊断快照。 |
| [synthesisSidecarRuntimeManifest.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts | sidecar 运行时 manifest 加载层：从插件打包资源中读取目标平台的 bundle，计算文件摘要并按契约重建 manifest，只接受通过校验的运行时。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isExpiredSynthesisSidecarRuntimeManifest | 函数 | 305–310 | 按当前时间判断 bundle manifest 是否已过期。 |
| isProductionSynthesisSidecarRuntimeSignature | 函数 | 297–303 | 判断平台签名是否属于正式生产构建。 |
| rebuildSynthesisSidecarRuntimeBundleManifest | 函数 | 312–444 | 重建并全面校验 sidecar 运行时 bundle manifest，返回新的只读对象。 |
| [rebuildSynthesisSidecarRuntimePlatformSignature](../../../../symbols/packages/synthesis-contracts/src/sidecarRuntimeBundle.ts/rebuildSynthesisSidecarRuntimePlatformSignature.md) | 函数 | 251–295 | 重建平台签名并校验其与 target、平台身份的对应关系。 |
| rebuildSynthesisSidecarRuntimePointer | 函数 | 446–457 | 重建运行时指针，绑定 bundle id、目标平台与到期时间。 |
| synthesisSidecarRuntimePlatformIdentity | 函数 | 60–78 | 由 target 三元组推导出平台、架构与操作系统身份。 |
| synthesisSidecarRuntimeTargetBundlePath | 函数 | 27–31 | 解析某运行时 target 在 addon 资产根下的 bundle 目录相对路径。 |
