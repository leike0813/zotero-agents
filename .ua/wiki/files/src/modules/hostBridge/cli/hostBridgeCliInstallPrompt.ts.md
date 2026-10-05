
# src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/cli](../../../../../modules/src/modules/hostBridge/cli.md)
<!-- node: file:src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts -->

Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。
源码：[src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts](../../../../../../../src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts)

## 符号（3）
<!-- node: function:src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts:promptHostBridgeCliInstallOnStartup -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts:resolveHostBridgeCliInstallPromptState -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts:shouldRunHostBridgeCliStartupPrompt -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| promptHostBridgeCliInstallOnStartup | 函数 | 346–398 | 中等 | host-bridge、user-interaction、startup、installer | 1 | 在插件启动流程中触发 CLI 安装提示：去重、限时等待用户选择，并把结果回报给调用方。 |
| [resolveHostBridgeCliInstallPromptState](../../../../../symbols/src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts/resolveHostBridgeCliInstallPromptState.md) | 函数 | 243–321 | 复杂 | host-bridge、installer、detection、version | 1 | 探测当前 CLI 安装状态与内置版本差异，决定是否需要向用户提示安装或升级。 |
| shouldRunHostBridgeCliStartupPrompt | 函数 | 115–134 | 简单 | host-bridge、policy、startup、guard | 1 | 判断本次启动是否需要展示安装提示，屏蔽无人值守与已确认过的场景。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [env.ts](../../../platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [hostBridgeCliInstaller.ts](hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |
| [hostBridgeCliResolver.ts](hostBridgeCliResolver.ts.md) | src/modules/hostBridge/cli/hostBridgeCliResolver.ts | 解析 Host Bridge CLI 的最终可执行路径，优先使用环境变量覆盖与已安装版本，回退到默认平台安装位置。 |
| [packagedAssetResolver.ts](../../packagedAssetResolver.ts.md) | src/modules/packagedAssetResolver.ts | 打包资产解析器：把插件内相对路径映射为 Zotero 插件目录下的真实文件路径，并校验资产是否存在，是 CLI/sidecar 等二进制定位的统一入口。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePlatform.ts](../../../platform/runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [subprocess.ts](../../../platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| promptHostBridgeCliInstallOnStartup | 函数 | 346–398 | 在插件启动流程中触发 CLI 安装提示：去重、限时等待用户选择，并把结果回报给调用方。 |
| [resolveHostBridgeCliInstallPromptState](../../../../../symbols/src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts/resolveHostBridgeCliInstallPromptState.md) | 函数 | 243–321 | 探测当前 CLI 安装状态与内置版本差异，决定是否需要向用户提示安装或升级。 |
| shouldRunHostBridgeCliStartupPrompt | 函数 | 115–134 | 判断本次启动是否需要展示安装提示，屏蔽无人值守与已确认过的场景。 |
