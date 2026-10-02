
# src/modules/acp/transport/acpWebSocketBridgeService.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpWebSocketBridgeService.ts -->

ACP WebSocket Bridge sidecar 服务：定位预编译桥接二进制并在本地拉起 WebSocket 端点，为浏览器侧后端提供替代进程内 NDJSON 的连接路径。
源码：[src/modules/acp/transport/acpWebSocketBridgeService.ts](../../../../../../../src/modules/acp/transport/acpWebSocketBridgeService.ts)

## 符号（5）
<!-- node: function:src/modules/acp/transport/acpWebSocketBridgeService.ts:ensureAcpWebSocketBridgeService -->
<!-- node: function:src/modules/acp/transport/acpWebSocketBridgeService.ts:getAcpWebSocketConstructor -->
<!-- node: function:src/modules/acp/transport/acpWebSocketBridgeService.ts:getRuntimeRootPath -->
<!-- node: function:src/modules/acp/transport/acpWebSocketBridgeService.ts:resolveBridgeBinary -->
<!-- node: function:src/modules/acp/transport/acpWebSocketBridgeService.ts:startBridgeService -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ensureAcpWebSocketBridgeService | 函数 | 341–351 | 简单 | sidecar、lifecycle、singleton、websocket | 1 | 幂等地确保 bridge sidecar 已就绪：未运行时启动并返回共享句柄，供 transport 复用。 |
| getAcpWebSocketConstructor | 函数 | 405–451 | 中等 | websocket、runtime、compat、acp | 0 | 在 Zotero 沙箱中取出可用的 WebSocket 构造器，兼容全局与运行时注入两种来源。 |
| getRuntimeRootPath | 函数 | 127–155 | 简单 | path-resolution、runtime、sidecar、cross-platform | 0 | 按平台解析 bridge 的运行时根目录，作为二进制与状态文件的落盘基准。 |
| resolveBridgeBinary | 函数 | 214–252 | 中等 | packaged-asset、checksum、websocket、resolution | 1 | 定位并校验 bridge 预编译二进制，用打包资产中的 SHA 校验文件确保版本一致。 |
| startBridgeService | 函数 | 266–339 | 复杂 | sidecar、subprocess、websocket、lifecycle | 0 | 拉起 ACP WebSocket bridge 进程：解析二进制、生成实例标识、等待 ready 文件并记录 stdout 尾部用于诊断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [env.ts](../../../platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [packagedAssetResolver.ts](../../packagedAssetResolver.ts.md) | src/modules/packagedAssetResolver.ts | 打包资产解析器：把插件内相对路径映射为 Zotero 插件目录下的真实文件路径，并校验资产是否存在，是 CLI/sidecar 等二进制定位的统一入口。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [runtimePlatform.ts](../../../platform/runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [subprocess.ts](../../../platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpTransport.ts](acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ensureAcpWebSocketBridgeService | 函数 | 341–351 | 幂等地确保 bridge sidecar 已就绪：未运行时启动并返回共享句柄，供 transport 复用。 |
| getAcpWebSocketConstructor | 函数 | 405–451 | 在 Zotero 沙箱中取出可用的 WebSocket 构造器，兼容全局与运行时注入两种来源。 |
