
# src/modules/hostBridge/cli/hostBridgeCliResolver.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/cli](../../../../../modules/src/modules/hostBridge/cli.md)
<!-- node: file:src/modules/hostBridge/cli/hostBridgeCliResolver.ts -->

解析 Host Bridge CLI 的最终可执行路径，优先使用环境变量覆盖与已安装版本，回退到默认平台安装位置。
源码：[src/modules/hostBridge/cli/hostBridgeCliResolver.ts](../../../../../../../src/modules/hostBridge/cli/hostBridgeCliResolver.ts)

## 符号（2）
<!-- node: function:src/modules/hostBridge/cli/hostBridgeCliResolver.ts:resolveHostBridgeCliBinary -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeCliResolver.ts:resolveHostBridgeCliPlatform -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [resolveHostBridgeCliBinary](../../../../../symbols/src/modules/hostBridge/cli/hostBridgeCliResolver.ts/resolveHostBridgeCliBinary.md) | 函数 | 147–205 | 复杂 | host-bridge、path-resolution、cli、resolution | 2 | 按候选根目录顺序探测已安装的 CLI 二进制，返回可执行路径、来源与版本诊断。 |
| resolveHostBridgeCliPlatform | 函数 | 60–87 | 简单 | host-bridge、cross-platform、resolution、runtime | 0 | 解析当前宿主对应的 CLI 平台标识，映射到预编译二进制的目录名。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [env.ts](../../../platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePlatform.ts](../../../platform/runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCliInjection.ts](hostBridgeCliInjection.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInjection.ts | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [hostBridgeCliInstaller.ts](hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |
| [hostBridgeCliInstallPrompt.ts](hostBridgeCliInstallPrompt.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts | Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [resolveHostBridgeCliBinary](../../../../../symbols/src/modules/hostBridge/cli/hostBridgeCliResolver.ts/resolveHostBridgeCliBinary.md) | 函数 | 147–205 | 按候选根目录顺序探测已安装的 CLI 二进制，返回可执行路径、来源与版本诊断。 |
| resolveHostBridgeCliPlatform | 函数 | 60–87 | 解析当前宿主对应的 CLI 平台标识，映射到预编译二进制的目录名。 |
