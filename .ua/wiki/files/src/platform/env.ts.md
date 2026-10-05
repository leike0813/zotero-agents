
# src/platform/env.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/platform](../../../modules/src/platform.md)
<!-- node: file:src/platform/env.ts -->

运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。
源码：[src/platform/env.ts](../../../../../src/platform/env.ts)

## 符号（9）
<!-- node: function:src/platform/env.ts:buildSnapshotFromSources -->
<!-- node: function:src/platform/env.ts:buildSubprocessEnvironment -->
<!-- node: function:src/platform/env.ts:getRuntimeEnvironmentSnapshot -->
<!-- node: function:src/platform/env.ts:mergePathEntries -->
<!-- node: function:src/platform/env.ts:preflightRuntimeEnvironmentOnStartup -->
<!-- node: function:src/platform/env.ts:readRuntimeEnv -->
<!-- node: function:src/platform/env.ts:readWindowsLoginEnvironment -->
<!-- node: function:src/platform/env.ts:splitPathEntries -->
<!-- node: function:src/platform/env.ts:summarizeSubprocessEnvironment -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSnapshotFromSources | 函数 | 333–388 | 中等 | 环境快照、合成、windows | 0 | 从多个环境来源合成运行期环境快照，补齐 Windows login shell 才可见的变量。 |
| buildSubprocessEnvironment | 函数 | 830–853 | 中等 | subprocess、环境变量、白名单 | 0 | 为子进程构造环境变量集合：注入合成 PATH、白名单变量与运行时必需的最小集。 |
| getRuntimeEnvironmentSnapshot | 函数 | 826–828 | 简单 | 环境快照、查询、惰性初始化 | 0 | 返回当前环境快照；未建立时立即惰性构建。 |
| mergePathEntries | 函数 | 242–259 | 简单 | 环境变量、PATH、合并 | 0 | 按优先级合并多组 PATH 条目并去重，保证高优先级目录在前。 |
| preflightRuntimeEnvironmentOnStartup | 函数 | 762–797 | 中等 | 启动预检、环境快照、性能 | 1 | 启动期建立环境快照缓存，避免首个子进程启动阻塞。 |
| readRuntimeEnv | 函数 | 192–206 | 简单 | 环境变量、运行时、归一化 | 0 | 读取 Zotero 运行时可见的环境变量并归一为小写键的记录，供环境快照使用。 |
| readWindowsLoginEnvironment | 函数 | 625–760 | 复杂 | windows、环境探测、powershell、脱敏 | 0 | 在 Windows 上通过一次性 PowerShell 进程读取登录 shell 的真实环境变量，并做脱敏与诊断。 |
| splitPathEntries | 函数 | 232–240 | 简单 | 环境变量、PATH、工具函数 | 0 | 按宿主分隔符拆分 PATH 值为条目序列，Windows 大小写不敏感差异在此收敛。 |
| summarizeSubprocessEnvironment | 函数 | 855–885 | 中等 | 诊断、脱敏、环境变量 | 0 | 生成可写入诊断日志的环境摘要，对敏感变量做掩码。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](path.ts.md) | src/platform/path.ts | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [runtimePersistence.ts](../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePlatform.ts](runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [subprocess.ts](subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |
| [windowsCommandResolution.ts](../modules/windowsCommandResolution.ts.md) | src/modules/windowsCommandResolution.ts | Windows 上外部命令解析模块：定位 npx/node/python 等可执行文件，识别 shim（.cmd/.ps1）与 App Execution Alias，并为 subprocess 调用生成可运行的命令行。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](../modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpRuntimeDependencyWrapper.ts](../modules/acp/skillRun/acpRuntimeDependencyWrapper.ts.md) | src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts | Agent 运行时依赖包装器：按 agent family 探测并准备命令依赖（Node/Python 等），通过平台 subprocess 抽象执行版本与存在性检查。 |
| [acpTransport.ts](../modules/acp/transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [acpWebSocketBridgeService.ts](../modules/acp/transport/acpWebSocketBridgeService.ts.md) | src/modules/acp/transport/acpWebSocketBridgeService.ts | ACP WebSocket Bridge sidecar 服务：定位预编译桥接二进制并在本地拉起 WebSocket 端点，为浏览器侧后端提供替代进程内 NDJSON 的连接路径。 |
| [command.ts](command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeCliInjection.ts](../modules/hostBridge/cli/hostBridgeCliInjection.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInjection.ts | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [hostBridgeCliInstaller.ts](../modules/hostBridge/cli/hostBridgeCliInstaller.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstaller.ts | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |
| [hostBridgeCliInstallPrompt.ts](../modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts | Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。 |
| [hostBridgeCliResolver.ts](../modules/hostBridge/cli/hostBridgeCliResolver.ts.md) | src/modules/hostBridge/cli/hostBridgeCliResolver.ts | 解析 Host Bridge CLI 的最终可执行路径，优先使用环境变量覆盖与已安装版本，回退到默认平台安装位置。 |
| [synthesisSidecarRuntimeSupervisor.ts](../modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSubprocessEnvironment | 函数 | 830–853 | 为子进程构造环境变量集合：注入合成 PATH、白名单变量与运行时必需的最小集。 |
| getRuntimeEnvironmentSnapshot | 函数 | 826–828 | 返回当前环境快照；未建立时立即惰性构建。 |
| mergePathEntries | 函数 | 242–259 | 按优先级合并多组 PATH 条目并去重，保证高优先级目录在前。 |
| preflightRuntimeEnvironmentOnStartup | 函数 | 762–797 | 启动期建立环境快照缓存，避免首个子进程启动阻塞。 |
| readRuntimeEnv | 函数 | 192–206 | 读取 Zotero 运行时可见的环境变量并归一为小写键的记录，供环境快照使用。 |
| splitPathEntries | 函数 | 232–240 | 按宿主分隔符拆分 PATH 值为条目序列，Windows 大小写不敏感差异在此收敛。 |
| summarizeSubprocessEnvironment | 函数 | 855–885 | 生成可写入诊断日志的环境摘要，对敏感变量做掩码。 |
