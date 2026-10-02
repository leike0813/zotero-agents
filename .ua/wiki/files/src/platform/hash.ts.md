
# src/platform/hash.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/platform](../../../modules/src/platform.md)
<!-- node: file:src/platform/hash.ts -->

平台无关的 SHA-256 摘要工具：优先使用 WebCrypto subtle.digest，回退到 Mozilla 的 nsICryptoHash，保证在 Zotero 沙箱与工具链环境中都能得到一致摘要。
源码：[src/platform/hash.ts](../../../../../src/platform/hash.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisProductionOwner.ts](../modules/synthesis/production/synthesisProductionOwner.ts.md) | src/modules/synthesis/production/synthesisProductionOwner.ts | 生产运行时 owner：把 sidecar 运行时安装、supervisor 生命周期、反向宿主端点与 RPC 客户端组合成一个可启动/恢复/停止的合成生产运行时，并把 locator 原子发布为 discovery。 |
| [synthesisSidecarRuntimeInstaller.ts](../modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts | sidecar 运行时安装器：按当前平台目标把打包的 sidecar 二进制从 staging 目录原子落位到运行时目录，逐文件校验 SHA-256 摘要并设置可执行权限，同时负责过期 manifest 的清理与诊断快照。 |
| [synthesisSidecarRuntimeManifest.ts](../modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts | sidecar 运行时 manifest 加载层：从插件打包资源中读取目标平台的 bundle，计算文件摘要并按契约重建 manifest，只接受通过校验的运行时。 |
| [synthesisSidecarRuntimeSupervisor.ts](../modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [sha256Hex](../../../symbols/globals.md) | 函数 | 23–40 | 计算字节数组的 SHA-256 十六进制摘要，按 WebCrypto → Mozilla 顺序回退。 |
