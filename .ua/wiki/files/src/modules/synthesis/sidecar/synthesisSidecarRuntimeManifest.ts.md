
# src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/sidecar](../../../../../modules/src/modules/synthesis/sidecar.md)
<!-- node: file:src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts -->

sidecar 运行时 manifest 加载层：从插件打包资源中读取目标平台的 bundle，计算文件摘要并按契约重建 manifest，只接受通过校验的运行时。
源码：[src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts](../../../../../../../src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hash.ts](../../../platform/hash.ts.md) | src/platform/hash.ts | 平台无关的 SHA-256 摘要工具：优先使用 WebCrypto subtle.digest，回退到 Mozilla 的 nsICryptoHash，保证在 Zotero 沙箱与工具链环境中都能得到一致摘要。 |
| [packagedAssetResolver.ts](../../packagedAssetResolver.ts.md) | src/modules/packagedAssetResolver.ts | 打包资产解析器：把插件内相对路径映射为 Zotero 插件目录下的真实文件路径，并校验资产是否存在，是 CLI/sidecar 等二进制定位的统一入口。 |
| [sidecarRuntimeBundle.ts](../../../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisSidecarRuntimeInstaller.ts](synthesisSidecarRuntimeInstaller.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts | sidecar 运行时安装器：按当前平台目标把打包的 sidecar 二进制从 staging 目录原子落位到运行时目录，逐文件校验 SHA-256 摘要并设置可执行权限，同时负责过期 manifest 的清理与诊断快照。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [loadPackagedSynthesisSidecarRuntimeBundle](../../../../../symbols/globals.md) | 函数 | 35–82 | 读取打包 bundle 的所有文件并逐个计算摘要，重建为契约 manifest；摘要不匹配或 manifest 过期时返回 null。 |
| [synthesisSidecarRuntimeAssetRoot](../../../../../symbols/globals.md) | 函数 | 24–28 | 按平台目标三元组解析出打包资源中 sidecar bundle 所在的根目录。 |
