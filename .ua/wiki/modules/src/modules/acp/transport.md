
# src/modules/acp/transport
> 目录聚合页：12 个文件、52 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/acp/transport/acpBackendProbe.ts](../../../../files/src/modules/acp/transport/acpBackendProbe.ts.md) | 文件 | 9 | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [src/modules/acp/transport/acpClientConnection.ts](../../../../files/src/modules/acp/transport/acpClientConnection.ts.md) | 文件 | 1 | ACP 客户端连接：基于 NDJSON 传输实现 JSON-RPC 请求/响应/通知的收发、请求 ID 配对、写入排队与关闭语义。 |
| [src/modules/acp/transport/acpConnectionAdapter.ts](../../../../files/src/modules/acp/transport/acpConnectionAdapter.ts.md) | 文件 | 10 | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [src/modules/acp/transport/acpExecutionProgress.ts](../../../../files/src/modules/acp/transport/acpExecutionProgress.ts.md) | 文件 | 5 | ACP 执行进度累计器：按会话统计执行阶段与消息计数，供 UI 显示「正在执行/已完成」进度并在恢复时还原。 |
| [src/modules/acp/transport/acpMessageStream.ts](../../../../files/src/modules/acp/transport/acpMessageStream.ts.md) | 文件 | 2 | ACP NDJSON 消息流：把子进程 stdout/stderr 按行切分并解析为 JSON-RPC 消息，向上提供异步迭代接口。 |
| [src/modules/acp/transport/acpNpxLaunchCache.ts](../../../../files/src/modules/acp/transport/acpNpxLaunchCache.ts.md) | 文件 | 4 | 缓存 npx 启动 ACP 代理时解析出的可执行入口与版本信息，避免每次连接重复探测磁盘与 PATH，并通过有界等待处理启动竞态。 |
| [src/modules/acp/transport/acpPermissionOptions.ts](../../../../files/src/modules/acp/transport/acpPermissionOptions.ts.md) | 文件 | 3 | ACP 权限选项语义：定义允许/拒绝等选项种类，并解析「自动批准」应对应哪个选项 ID。 |
| [src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts](../../../../files/src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts.md) | 文件 | 1 | 静默终态 assistant 文本收集器：在不产生可见 transcript 的场景下收集终局 assistant 文本，供结果校验使用。 |
| [src/modules/acp/transport/acpSyntheticConnectionAdapter.ts](../../../../files/src/modules/acp/transport/acpSyntheticConnectionAdapter.ts.md) | 文件 | 2 | 合成 ACP 连接适配器：用固定回放的 session update 序列替代真实后端进程，供回放诊断与测试驱动完整 UI 链路。 |
| [src/modules/acp/transport/acpTranscriptBoundary.ts](../../../../files/src/modules/acp/transport/acpTranscriptBoundary.ts.md) | 文件 | 3 | ACP transcript 边界判定：按协议语义把 session update 分类为消息边界更新、语义更新与硬边界更新，供 Chat 与 Skills 两条路径共用。 |
| [src/modules/acp/transport/acpTransport.ts](../../../../files/src/modules/acp/transport/acpTransport.ts.md) | 文件 | 7 | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [src/modules/acp/transport/acpWebSocketBridgeService.ts](../../../../files/src/modules/acp/transport/acpWebSocketBridgeService.ts.md) | 文件 | 5 | ACP WebSocket Bridge sidecar 服务：定位预编译桥接二进制并在本地拉起 WebSocket 端点，为浏览器侧后端提供替代进程内 NDJSON 的连接路径。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 15 |
| [src/platform](../../platform.md) | 9 |
| [src/modules/acp/diagnostics](diagnostics.md) | 8 |
| [src/utils](../../utils.md) | 6 |
| [src/backends](../../backends.md) | 4 |
| [src/modules/acp/chat](chat.md) | 2 |
| [src/modules/hostBridge/mcp](../hostBridge/mcp.md) | 2 |
| [src/config](../../config.md) | 1 |
| [src/modules/acp/skillRun](skillRun.md) | 1 |
| [src/modules/assistant/publication](../assistant/publication.md) | 1 |
| [src/modules/hostBridge/server](../hostBridge/server.md) | 1 |
