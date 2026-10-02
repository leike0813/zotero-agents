
# src/modules/acp/transport/acpTransport.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpTransport.ts -->

ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。
源码：[src/modules/acp/transport/acpTransport.ts](../../../../../../../src/modules/acp/transport/acpTransport.ts)

## 符号（7）
<!-- node: function:src/modules/acp/transport/acpTransport.ts:createControlledAcpTransport -->
<!-- node: function:src/modules/acp/transport/acpTransport.ts:createPumpedReadableStreamFromMozillaPipe -->
<!-- node: function:src/modules/acp/transport/acpTransport.ts:decodeBinaryMessage -->
<!-- node: function:src/modules/acp/transport/acpTransport.ts:launchAcpTransport -->
<!-- node: function:src/modules/acp/transport/acpTransport.ts:launchMozillaAcpTransport -->
<!-- node: function:src/modules/acp/transport/acpTransport.ts:launchNodeAcpTransport -->
<!-- node: function:src/modules/acp/transport/acpTransport.ts:launchWebSocketBridgeAcpTransport -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [createControlledAcpTransport](../../../../../symbols/src/modules/acp/transport/acpTransport.ts/createControlledAcpTransport.md) | 函数 | 2438–2597 | 复杂 | acp、transport、lifecycle、cancellation | 1 | 把底层 stdio/WebSocket 传输包装成受控 transport：统一注册取消信号、进程组清理与超时收敛。 |
| createPumpedReadableStreamFromMozillaPipe | 函数 | 796–892 | 复杂 | stream、mozilla、backpressure、acp | 0 | 把 Mozilla 进程输出管道泵入 Web ReadableStream，处理背压、UTF-8 解码与流取消时的进程清理。 |
| decodeBinaryMessage | 函数 | 659–714 | 复杂 | acp、decoding、protocol、binary | 0 | 解码 ACP 的二进制帧：区分 JSON 与 base64 载荷，失败时返回可诊断的错误而非静默丢弃。 |
| launchAcpTransport | 函数 | 2599–2620 | 中等 | acp、transport、entry-point、dispatch | 0 | ACP transport 的统一启动入口：按运行时能力选择 Node 管道、浏览器子进程或 WebSocket bridge 三种传输路径。 |
| launchMozillaAcpTransport | 函数 | 1241–1454 | 复杂 | acp、transport、mozilla、subprocess | 0 | 在 Zotero 沙箱（仅 Mozilla 子进程能力）中启动 ACP 后端，把 nsIProcess 输出泵成 ReadableStream。 |
| launchNodeAcpTransport | 函数 | 1468–1853 | 复杂 | acp、transport、subprocess、ndjson | 0 | 在具备 Node 能力的运行时中启动 ACP 后端子进程，用管道读写 NDJSON 并处理进程组终止与残留清理。 |
| [launchWebSocketBridgeAcpTransport](../../../../../symbols/src/modules/acp/transport/acpTransport.ts/launchWebSocketBridgeAcpTransport.md) | 函数 | 1949–2436 | 复杂 | acp、websocket、sidecar、transport | 1 | 通过本地 WebSocket bridge sidecar 建立 ACP 会话：等待 ready、连接 WebSocket、把 stdout/stdin 转成可读可写流。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpRuntimePerformanceProfiler.ts](../diagnostics/acpRuntimePerformanceProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts | ACP 运行时性能 profiler：管理 profile 生命周期、计时器与指标序列，记录 publication ack 时序并提供快照导出。 |
| [acpWebSocketBridgeService.ts](acpWebSocketBridgeService.ts.md) | src/modules/acp/transport/acpWebSocketBridgeService.ts | ACP WebSocket Bridge sidecar 服务：定位预编译桥接二进制并在本地拉起 WebSocket 端点，为浏览器侧后端提供替代进程内 NDJSON 的连接路径。 |
| [command.ts](../../../platform/command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [env.ts](../../../platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [path.ts](../../../platform/path.ts.md) | src/platform/path.ts | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [processControl.ts](../../../platform/processControl.ts.md) | src/platform/processControl.ts | 子进程控制：启动、信号投递与终止回收策略，把 platform/command 的执行结果转成可取消、可等待的进程句柄。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePlatform.ts](../../../platform/runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [subprocess.ts](../../../platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](../diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpConnectionAdapter.ts](acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpMessageStream.ts](acpMessageStream.ts.md) | src/modules/acp/transport/acpMessageStream.ts | ACP NDJSON 消息流：把子进程 stdout/stderr 按行切分并解析为 JSON-RPC 消息，向上提供异步迭代接口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| launchAcpTransport | 函数 | 2599–2620 | ACP transport 的统一启动入口：按运行时能力选择 Node 管道、浏览器子进程或 WebSocket bridge 三种传输路径。 |
