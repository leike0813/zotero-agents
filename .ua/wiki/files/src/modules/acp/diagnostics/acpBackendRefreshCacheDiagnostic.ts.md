
# src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/diagnostics](../../../../../modules/src/modules/acp/diagnostics.md)
<!-- node: file:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts -->

ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。
源码：[src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts](../../../../../../../src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts)

## 符号（17）
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:buildPowerShellFileCaptureScript -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:compactBackendDiagnosticResult -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:parseResolvedExeLaunchFromShim -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:registerAcpBackendRefreshCacheDiagnosticMenu -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:requestInitializeOverWebSocket -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runAcpBackendRefreshCacheDiagnostic -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runAlternativeSubprocessProbe -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runNodeBridgeSpikeProbe -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runNsIProcessProbe -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runPowerShellFileCaptureProbe -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runRawAcpTransportProbe -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runResolvedExeSpikeProbe -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runSingleBackendDiagnostic -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runStdinCapabilityMatrixProbe -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:runWebSocketBridgeSpikeProbe -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:serializeError -->
<!-- node: function:src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts:summarizeBackendCommandResolution -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildPowerShellFileCaptureScript | 函数 | 1059–1298 | 复杂 | diagnostics、powershell、codegen | 0 | 生成用于文件捕获的 PowerShell 脚本，Base64 编码内嵌以规避 Zotero 沙箱命令行转义问题。 |
| [compactBackendDiagnosticResult](../../../../../symbols/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts/compactBackendDiagnosticResult.md) | 函数 | 863–914 | 复杂 | diagnostics、serialization、summary | 1 | 把冗长的诊断结果压缩为适合展示与剪贴板复制的结构，裁剪大段原始输出。 |
| parseResolvedExeLaunchFromShim | 函数 | 1445–1530 | 复杂 | diagnostics、parsing、windows | 0 | 从 shim 命令行解析出真实可执行文件路径与启动参数，用于定位后端命令解析问题。 |
| registerAcpBackendRefreshCacheDiagnosticMenu | 函数 | 4111–4169 | 中等 | diagnostics、menu、registration | 0 | 把诊断命令注册到 Zotero 插件菜单，供用户手动触发。 |
| requestInitializeOverWebSocket | 函数 | 1668–1785 | 复杂 | diagnostics、acp、websocket、probe | 0 | 在诊断用 WebSocket 通道上发起 ACP initialize 请求，采集握手阶段的协议证据。 |
| runAcpBackendRefreshCacheDiagnostic | 函数 | 4041–4109 | 复杂 | diagnostics、acp、entry-point、backend | 0 | ACP 后端刷新与缓存诊断入口：遍历后端、逐个诊断并汇总为可复制的报告。 |
| runAlternativeSubprocessProbe | 函数 | 3460–3512 | 中等 | diagnostics、probe、subprocess | 0 | 汇总并运行各替代子进程实现探针，给出可行性排序。 |
| [runNodeBridgeSpikeProbe](../../../../../symbols/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts/runNodeBridgeSpikeProbe.md) | 函数 | 2086–2284 | 复杂 | diagnostics、probe、node | 1 | 运行 Node bridge spike 探针，验证经由 Node 侧桥接启动 Agent 的可行性。 |
| runNsIProcessProbe | 函数 | 3300–3428 | 复杂 | diagnostics、probe、nsiprocess | 0 | 探测 nsIProcess 工厂的可用性，评估替代子进程实现路径。 |
| runPowerShellFileCaptureProbe | 函数 | 1300–1415 | 复杂 | diagnostics、probe、powershell | 0 | 执行 PowerShell 文件捕获探针，解析 pipe 输出判断文件写入路径能力。 |
| [runRawAcpTransportProbe](../../../../../symbols/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts/runRawAcpTransportProbe.md) | 函数 | 3514–3694 | 复杂 | diagnostics、acp、transport、probe | 1 | 对原始 ACP 传输层发起直连探针，定位握手与帧处理失败点。 |
| [runResolvedExeSpikeProbe](../../../../../symbols/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts/runResolvedExeSpikeProbe.md) | 函数 | 1787–1989 | 复杂 | diagnostics、probe、acp | 1 | 针对解析出的可执行文件运行 spike 探针，验证直接启动路径是否可行。 |
| [runSingleBackendDiagnostic](../../../../../symbols/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts/runSingleBackendDiagnostic.md) | 函数 | 3696–4039 | 复杂 | diagnostics、acp、backend、entry-point | 1 | 对单个后端执行完整诊断链：命令解析、连接探测、各 spike 与传输探针，产出压缩后的诊断结果。 |
| [runStdinCapabilityMatrixProbe](../../../../../symbols/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts/runStdinCapabilityMatrixProbe.md) | 函数 | 2948–3188 | 复杂 | diagnostics、probe、subprocess | 1 | 运行 stdin 能力矩阵探针，逐项确认子进程 stdin 在 Zotero 沙箱中的读写与关闭语义。 |
| [runWebSocketBridgeSpikeProbe](../../../../../symbols/src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts/runWebSocketBridgeSpikeProbe.md) | 函数 | 2525–2709 | 复杂 | diagnostics、probe、websocket | 1 | 运行 WebSocket bridge spike 探针，验证桥接通道上的 ACP 会话建立。 |
| serializeError | 函数 | 263–310 | 中等 | diagnostics、error、serialization | 0 | 把任意错误序列化为可 JSON 化的结构，处理循环引用与非枚举属性。 |
| summarizeBackendCommandResolution | 函数 | 819–861 | 中等 | diagnostics、backend、command-resolution | 1 | 汇总后端命令解析链的候选与命中结果，说明为何选中当前可执行文件。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendProbe.ts](../transport/acpBackendProbe.ts.md) | src/modules/acp/transport/acpBackendProbe.ts | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [acpConnectionAdapter.ts](../transport/acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpSkillRunAuditTrail.ts](../skillRun/acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpTransport.ts](../transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [command.ts](../../../platform/command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [env.ts](../../../platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [identity.ts](../../../backends/identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [locale.ts](../../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [package.json](../../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeCompatibility.ts](../../../utils/runtimeCompatibility.ts.md) | src/utils/runtimeCompatibility.ts | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [subprocess.ts](../../../platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [ztoolkit.ts](../../../utils/ztoolkit.ts.md) | src/utils/ztoolkit.ts | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| registerAcpBackendRefreshCacheDiagnosticMenu | 函数 | 4111–4169 | 把诊断命令注册到 Zotero 插件菜单，供用户手动触发。 |
| runAcpBackendRefreshCacheDiagnostic | 函数 | 4041–4109 | ACP 后端刷新与缓存诊断入口：遍历后端、逐个诊断并汇总为可复制的报告。 |
