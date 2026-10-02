
# src/platform/command.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/platform](../../../modules/src/platform.md)
<!-- node: file:src/platform/command.ts -->

跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。
源码：[src/platform/command.ts](../../../../../src/platform/command.ts)

## 符号（9）
<!-- node: function:src/platform/command.ts:buildNonInteractiveCommandCandidates -->
<!-- node: function:src/platform/command.ts:buildPathCommandCandidates -->
<!-- node: function:src/platform/command.ts:buildRuntimeCommandLaunchPlan -->
<!-- node: function:src/platform/command.ts:buildRuntimeCommandLaunchSpec -->
<!-- node: function:src/platform/command.ts:getPrimaryPythonCommand -->
<!-- node: function:src/platform/command.ts:normalizeWindowsResolvedCommandPath -->
<!-- node: function:src/platform/command.ts:preflightRuntimeCommandsOnStartup -->
<!-- node: function:src/platform/command.ts:resolveRuntimeCommand -->
<!-- node: function:src/platform/command.ts:resolveWindowsShimExecutable -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildNonInteractiveCommandCandidates | 函数 | 575–593 | 简单 | 命令执行、非交互、候选生成 | 0 | 构造非交互场景下的命令候选序列，强制携带禁止挂起/提示的参数。 |
| buildPathCommandCandidates | 函数 | 119–143 | 中等 | 命令解析、候选生成、windows shim | 0 | 当命令本身长得像路径时生成带平台扩展名与 shim 变体的候选可执行路径列表。 |
| buildRuntimeCommandLaunchPlan | 函数 | 462–537 | 复杂 | 命令执行、回退策略、启动计划 | 0 | 生成完整启动计划：先直连可执行，失败时回退 PowerShell 等 shell 包装，并保留诊断信息。 |
| buildRuntimeCommandLaunchSpec | 函数 | 422–460 | 中等 | 命令执行、launch spec、平台抽象 | 0 | 把已解析命令与其参数装配为可执行 launch spec，明确 executable、args 与 shell 需求。 |
| getPrimaryPythonCommand | 函数 | 934–944 | 简单 | 命令解析、python、工具函数 | 0 | 返回当前环境首选的 Python 命令，供需要 Python 的工作流与 Bridge 复用。 |
| normalizeWindowsResolvedCommandPath | 函数 | 281–341 | 中等 | windows、路径信任、命令解析 | 0 | 归一化 Windows 上解析出的命令路径，剔除 App Execution Alias 与不可信位置。 |
| preflightRuntimeCommandsOnStartup | 函数 | 844–882 | 中等 | 启动预检、命令解析、性能 | 1 | 插件启动期预解析常用命令（node、npx、python 等），减少首次调用延迟并暴露缺失项。 |
| resolveRuntimeCommand | 函数 | 638–826 | 复杂 | 命令解析、PATH 搜索、注册表缓存、核心 | 0 | 运行时命令解析核心：按 PATH、已知安装根、PowerShell 查询逐层定位可执行文件并写入注册表缓存。 |
| resolveWindowsShimExecutable | 函数 | 248–279 | 中等 | windows、shim、命令解析 | 0 | 解析 Windows .cmd/.ps1 shim 指向的真实可执行文件，绕过 cmd 包装层。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [env.ts](env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
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
| [backendManager.ts](../modules/workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [processControl.ts](processControl.ts.md) | src/platform/processControl.ts | 子进程控制：启动、信号投递与终止回收策略，把 platform/command 的执行结果转成可取消、可等待的进程句柄。 |
| [skillRunnerCtlBridge.ts](../modules/skillRunner/runtime/skillRunnerCtlBridge.ts.md) | src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts | SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。 |
| [skillRunnerLocalRuntimeManager.ts](../modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildNonInteractiveCommandCandidates | 函数 | 575–593 | 构造非交互场景下的命令候选序列，强制携带禁止挂起/提示的参数。 |
| buildPathCommandCandidates | 函数 | 119–143 | 当命令本身长得像路径时生成带平台扩展名与 shim 变体的候选可执行路径列表。 |
| buildRuntimeCommandLaunchPlan | 函数 | 462–537 | 生成完整启动计划：先直连可执行，失败时回退 PowerShell 等 shell 包装，并保留诊断信息。 |
| buildRuntimeCommandLaunchSpec | 函数 | 422–460 | 把已解析命令与其参数装配为可执行 launch spec，明确 executable、args 与 shell 需求。 |
| getPrimaryPythonCommand | 函数 | 934–944 | 返回当前环境首选的 Python 命令，供需要 Python 的工作流与 Bridge 复用。 |
| preflightRuntimeCommandsOnStartup | 函数 | 844–882 | 插件启动期预解析常用命令（node、npx、python 等），减少首次调用延迟并暴露缺失项。 |
| resolveRuntimeCommand | 函数 | 638–826 | 运行时命令解析核心：按 PATH、已知安装根、PowerShell 查询逐层定位可执行文件并写入注册表缓存。 |
