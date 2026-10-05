
# src/modules/packagedAssetResolver.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/packagedAssetResolver.ts -->

打包资产解析器：把插件内相对路径映射为 Zotero 插件目录下的真实文件路径，并校验资产是否存在，是 CLI/sidecar 等二进制定位的统一入口。
源码：[src/modules/packagedAssetResolver.ts](../../../../../src/modules/packagedAssetResolver.ts)

## 符号（4）
<!-- node: function:src/modules/packagedAssetResolver.ts:buildPackagedAssetCandidates -->
<!-- node: function:src/modules/packagedAssetResolver.ts:copyPackagedBinaryAsset -->
<!-- node: function:src/modules/packagedAssetResolver.ts:readPackagedBinaryAsset -->
<!-- node: function:src/modules/packagedAssetResolver.ts:readUriBinaryWithXhr -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildPackagedAssetCandidates | 函数 | 164–190 | 中等 | packaged-asset、path-resolution、bootstrap、candidates | 0 | 为相对资产路径构造候选根目录列表，覆盖开发态、已安装插件与 profile 目录等来源。 |
| copyPackagedBinaryAsset | 函数 | 332–349 | 简单 | packaged-asset、file-io、installer、binary | 0 | 把打包二进制资产复制到运行时目录，读取失败时保留完整诊断链。 |
| [readPackagedBinaryAsset](../../../symbols/src/modules/packagedAssetResolver.ts/readPackagedBinaryAsset.md) | 函数 | 287–330 | 复杂 | packaged-asset、file-io、binary、fallback | 3 | 读取打包二进制资产：依次尝试 fetch 与 XHR 回退路径，并附上每次失败的原因用于诊断。 |
| readUriBinaryWithXhr | 函数 | 237–270 | 中等 | packaged-asset、xhr、binary、fallback | 0 | 用 XHR 读取 jar/chrome 协议下的二进制 URI，是 fetch 不可用时的回退实现。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpWebSocketBridgeService.ts](acp/transport/acpWebSocketBridgeService.ts.md) | src/modules/acp/transport/acpWebSocketBridgeService.ts | ACP WebSocket Bridge sidecar 服务：定位预编译桥接二进制并在本地拉起 WebSocket 端点，为浏览器侧后端提供替代进程内 NDJSON 的连接路径。 |
| [hostBridgeCliInstaller.ts](hostBridge/cli/hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |
| [hostBridgeCliInstallPrompt.ts](hostBridge/cli/hostBridgeCliInstallPrompt.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts | Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。 |
| [hostBridgePluginSkillBundle.ts](hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts | 构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。 |
| [synthesisSidecarRuntimeManifest.ts](synthesis/sidecar/synthesisSidecarRuntimeManifest.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts | sidecar 运行时 manifest 加载层：从插件打包资源中读取目标平台的 bundle，计算文件摘要并按契约重建 manifest，只接受通过校验的运行时。 |
| [synthesisWorkbenchTab.ts](synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildPackagedAssetCandidates | 函数 | 164–190 | 为相对资产路径构造候选根目录列表，覆盖开发态、已安装插件与 profile 目录等来源。 |
| copyPackagedBinaryAsset | 函数 | 332–349 | 把打包二进制资产复制到运行时目录，读取失败时保留完整诊断链。 |
| [readPackagedBinaryAsset](../../../symbols/src/modules/packagedAssetResolver.ts/readPackagedBinaryAsset.md) | 函数 | 287–330 | 读取打包二进制资产：依次尝试 fetch 与 XHR 回退路径，并附上每次失败的原因用于诊断。 |
