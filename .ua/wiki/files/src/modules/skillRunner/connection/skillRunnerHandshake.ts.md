
# src/modules/skillRunner/connection/skillRunnerHandshake.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/connection](../../../../../modules/src/modules/skillRunner/connection.md)
<!-- node: file:src/modules/skillRunner/connection/skillRunnerHandshake.ts -->

SkillRunner 协议握手层：向后端查询其支持的能力与协议集合并做带 TTL 的缓存，同时提供执行前断言所需协议的校验函数。
源码：[src/modules/skillRunner/connection/skillRunnerHandshake.ts](../../../../../../../src/modules/skillRunner/connection/skillRunnerHandshake.ts)

## 符号（3）
<!-- node: function:src/modules/skillRunner/connection/skillRunnerHandshake.ts:assertSkillRunnerBackendSupportsProtocol -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerHandshake.ts:resolveCapabilitiesUncached -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerHandshake.ts:resolveSkillRunnerBackendCapabilities -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertSkillRunnerBackendSupportsProtocol | 函数 | 95–117 | 简单 | validation、handshake、compatibility | 1 | 断言后端支持执行所需的协议，缺失时抛出明确错误，避免把不兼容请求发给旧版后端。 |
| resolveCapabilitiesUncached | 函数 | 36–56 | 简单 | handshake、network、capability-negotiation | 1 | 绕过缓存直接向后端发起握手请求并解析其响应，得到规范化的能力集合。 |
| resolveSkillRunnerBackendCapabilities | 函数 | 58–79 | 中等 | handshake、cache、skillrunner | 1 | 带缓存地解析后端能力：命中未过期缓存直接返回，否则调用未缓存路径并写入缓存。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [errors.ts](../../../providers/skillrunner/errors.ts.md) | src/providers/skillrunner/errors.ts | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [managementClient.ts](../../../providers/skillrunner/managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [skillRunnerHandshakeProtocol.ts](skillRunnerHandshakeProtocol.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts | 握手协议的契约层：定义请求/响应 schema id、已支持的协议常量集合，以及旧版后端的兼容能力合成与交互文件能力协商逻辑。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [provider.ts](../../../providers/skillrunner/provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertSkillRunnerBackendSupportsProtocol | 函数 | 95–117 | 断言后端支持执行所需的协议，缺失时抛出明确错误，避免把不兼容请求发给旧版后端。 |
| resolveCapabilitiesUncached | 函数 | 36–56 | 绕过缓存直接向后端发起握手请求并解析其响应，得到规范化的能力集合。 |
| resolveSkillRunnerBackendCapabilities | 函数 | 58–79 | 带缓存地解析后端能力：命中未过期缓存直接返回，否则调用未缓存路径并写入缓存。 |
