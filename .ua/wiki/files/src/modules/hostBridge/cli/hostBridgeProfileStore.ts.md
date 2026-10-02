
# src/modules/hostBridge/cli/hostBridgeProfileStore.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/cli](../../../../../modules/src/modules/hostBridge/cli.md)
<!-- node: file:src/modules/hostBridge/cli/hostBridgeProfileStore.ts -->

Host Bridge CLI 的 well-known profile 存储：按平台解析 profile 根目录，并把连接所需的 token、端口与主机信息写成 Agent 可发现的 profile 文件。
源码：[src/modules/hostBridge/cli/hostBridgeProfileStore.ts](../../../../../../../src/modules/hostBridge/cli/hostBridgeProfileStore.ts)

## 符号（5）
<!-- node: function:src/modules/hostBridge/cli/hostBridgeProfileStore.ts:readEnv -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeProfileStore.ts:resolveHostBridgeWellKnownProfilePath -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeProfileStore.ts:resolvePlatform -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeProfileStore.ts:resolveWellKnownProfileRoot -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeProfileStore.ts:writeHostBridgeWellKnownProfile -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| readEnv | 函数 | 26–40 | 简单 | 环境变量、工具函数、host-bridge | 0 | 读取指定环境变量并去除首尾空白，未设置时返回 undefined。 |
| resolveHostBridgeWellKnownProfilePath | 函数 | 89–91 | 简单 | 路径解析、profile、host-bridge | 0 | 返回 Host Bridge well-known profile 文件的绝对路径。 |
| resolvePlatform | 函数 | 42–57 | 简单 | 平台探测、profile、host-bridge | 0 | 根据运行时环境推断目标平台，用于选择平台专属的 well-known profile 路径。 |
| resolveWellKnownProfileRoot | 函数 | 73–87 | 简单 | 路径解析、profile、host-bridge | 0 | 按平台优先级解析 well-known profile 根目录，优先取显式配置再退回平台默认位置。 |
| writeHostBridgeWellKnownProfile | 函数 | 106–150 | 中等 | 写入、profile、凭据 | 0 | 写出 well-known profile 文件，必要时创建父目录，profile 缺失关键连接信息时拒绝写入。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeProtocol.ts](../server/hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeServer.ts](../server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveHostBridgeWellKnownProfilePath | 函数 | 89–91 | 返回 Host Bridge well-known profile 文件的绝对路径。 |
| writeHostBridgeWellKnownProfile | 函数 | 106–150 | 写出 well-known profile 文件，必要时创建父目录，profile 缺失关键连接信息时拒绝写入。 |
