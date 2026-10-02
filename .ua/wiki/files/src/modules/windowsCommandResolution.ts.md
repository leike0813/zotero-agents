
# src/modules/windowsCommandResolution.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/windowsCommandResolution.ts -->

Windows 上外部命令解析模块：定位 npx/node/python 等可执行文件，识别 shim（.cmd/.ps1）与 App Execution Alias，并为 subprocess 调用生成可运行的命令行。
源码：[src/modules/windowsCommandResolution.ts](../../../../../src/modules/windowsCommandResolution.ts)

## 符号（10）
<!-- node: function:src/modules/windowsCommandResolution.ts:getWindowsExecutableCandidates -->
<!-- node: function:src/modules/windowsCommandResolution.ts:getWindowsPowerShellAbsoluteCandidates -->
<!-- node: function:src/modules/windowsCommandResolution.ts:getWindowsShellCommandCandidates -->
<!-- node: function:src/modules/windowsCommandResolution.ts:isAbsoluteCommandPath -->
<!-- node: function:src/modules/windowsCommandResolution.ts:isTrustedResolvedCommandPath -->
<!-- node: function:src/modules/windowsCommandResolution.ts:resolveTrustedPathSearchResult -->
<!-- node: function:src/modules/windowsCommandResolution.ts:resolveWindowsCommandFromGlobalNpmRoot -->
<!-- node: function:src/modules/windowsCommandResolution.ts:resolveWindowsCommandFromNodeInstallRoot -->
<!-- node: function:src/modules/windowsCommandResolution.ts:resolveWindowsCommandFromPowerShell -->
<!-- node: function:src/modules/windowsCommandResolution.ts:resolveWindowsCommandFromUserLocalBin -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getWindowsExecutableCandidates | 函数 | 179–216 | 中等 | windows、候选生成、命令解析 | 0 | 枚举某可执行名的 Windows 变体候选（.exe/.cmd/.bat/.ps1），按优先级返回。 |
| getWindowsPowerShellAbsoluteCandidates | 函数 | 143–177 | 中等 | windows、powershell、候选生成 | 0 | 枚举 PowerShell.exe 的绝对路径候选（System32 与 SysWOW64），供 Windows 兜底启动使用。 |
| getWindowsShellCommandCandidates | 函数 | 218–254 | 中等 | windows、shell、候选生成 | 0 | 枚举可用于包装命令的 shell 候选（cmd.exe、PowerShell），保证非交互执行。 |
| isAbsoluteCommandPath | 函数 | 62–72 | 简单 | windows、路径判断、命令解析 | 0 | 判断命令字符串是否为绝对路径，避免对路径误走 PATH 搜索。 |
| isTrustedResolvedCommandPath | 函数 | 109–121 | 简单 | windows、信任边界、安全 | 0 | 判定解析出的可执行路径是否位于可信根（用户目录、Program Files、Node 安装目录等）。 |
| resolveTrustedPathSearchResult | 函数 | 123–141 | 简单 | windows、PATH 搜索、信任边界 | 0 | 对 PATH 搜索结果逐个做信任校验，返回第一个可信命中。 |
| resolveWindowsCommandFromGlobalNpmRoot | 函数 | 366–391 | 中等 | windows、npm、命令解析 | 0 | 从全局 npm root 及其 bin 目录解析 npx/node 等命令。 |
| resolveWindowsCommandFromNodeInstallRoot | 函数 | 393–418 | 中等 | windows、node、命令解析 | 0 | 从 Node 安装根目录逐级上溯定位可执行文件，覆盖多版本共存的安装布局。 |
| resolveWindowsCommandFromPowerShell | 函数 | 420–479 | 中等 | windows、powershell、兜底解析、诊断 | 0 | 最终兜底：借助 PowerShell 的 Get-Command 解析命令路径，并把诊断信息带回调用方。 |
| resolveWindowsCommandFromUserLocalBin | 函数 | 339–364 | 中等 | windows、命令解析、用户目录 | 0 | 在用户级 bin 目录（如 %LOCALAPPDATA%\...）中定位命令，命中即视为高可信。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [subprocess.ts](../platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [command.ts](../platform/command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [env.ts](../platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [healthGate.ts](../../scripts/system-e2e/healthGate.ts.md) | scripts/system-e2e/healthGate.ts | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |
| [hostBridgeCliInstaller.ts](hostBridge/cli/hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getWindowsExecutableCandidates | 函数 | 179–216 | 枚举某可执行名的 Windows 变体候选（.exe/.cmd/.bat/.ps1），按优先级返回。 |
| getWindowsPowerShellAbsoluteCandidates | 函数 | 143–177 | 枚举 PowerShell.exe 的绝对路径候选（System32 与 SysWOW64），供 Windows 兜底启动使用。 |
| getWindowsShellCommandCandidates | 函数 | 218–254 | 枚举可用于包装命令的 shell 候选（cmd.exe、PowerShell），保证非交互执行。 |
| isAbsoluteCommandPath | 函数 | 62–72 | 判断命令字符串是否为绝对路径，避免对路径误走 PATH 搜索。 |
| isTrustedResolvedCommandPath | 函数 | 109–121 | 判定解析出的可执行路径是否位于可信根（用户目录、Program Files、Node 安装目录等）。 |
| resolveTrustedPathSearchResult | 函数 | 123–141 | 对 PATH 搜索结果逐个做信任校验，返回第一个可信命中。 |
| resolveWindowsCommandFromGlobalNpmRoot | 函数 | 366–391 | 从全局 npm root 及其 bin 目录解析 npx/node 等命令。 |
| resolveWindowsCommandFromNodeInstallRoot | 函数 | 393–418 | 从 Node 安装根目录逐级上溯定位可执行文件，覆盖多版本共存的安装布局。 |
| resolveWindowsCommandFromPowerShell | 函数 | 420–479 | 最终兜底：借助 PowerShell 的 Get-Command 解析命令路径，并把诊断信息带回调用方。 |
| resolveWindowsCommandFromUserLocalBin | 函数 | 339–364 | 在用户级 bin 目录（如 %LOCALAPPDATA%\...）中定位命令，命中即视为高可信。 |
