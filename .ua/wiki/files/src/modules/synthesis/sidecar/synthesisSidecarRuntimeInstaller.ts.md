
# src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts
所属分层：[Synthesis 领域与侧车](../../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis/sidecar](../../../../../modules/src/modules/synthesis/sidecar.md)
<!-- node: file:src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts -->

sidecar 运行时安装器：按当前平台目标把打包的 sidecar 二进制从 staging 目录原子落位到运行时目录，逐文件校验 SHA-256 摘要并设置可执行权限，同时负责过期 manifest 的清理与诊断快照。
源码：[src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts](../../../../../../../src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hash.ts](../../../platform/hash.ts.md) | src/platform/hash.ts | 平台无关的 SHA-256 摘要工具：优先使用 WebCrypto subtle.digest，回退到 Mozilla 的 nsICryptoHash，保证在 Zotero 沙箱与工具链环境中都能得到一致摘要。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePlatform.ts](../../../platform/runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [sidecarRuntimeBundle.ts](../../../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [synthesisSidecarRuntimeManifest.ts](synthesisSidecarRuntimeManifest.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts | sidecar 运行时 manifest 加载层：从插件打包资源中读取目标平台的 bundle，计算文件摘要并按契约重建 manifest，只接受通过校验的运行时。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisProductionOwner.ts](../production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisSidecarRuntimeSupervisor.ts](synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createSynthesisSidecarRuntimeInstaller](../../../../../symbols/globals.md) | 函数 | 200–309 | 创建安装器工厂：检测平台目标、加载已验证 bundle、在需要时执行安装/升级，并暴露 inspect/repair 等运维入口。 |
| [getSynthesisSidecarRuntimeInstallPaths](../../../../../symbols/globals.md) | 函数 | 84–88 | 返回 sidecar 运行时的安装目录、pointer 文件与可执行文件路径集合。 |
