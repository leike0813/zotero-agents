
# src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/connection](../../../../../modules/src/modules/skillRunner/connection.md)
<!-- node: file:src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts -->

握手协议的契约层：定义请求/响应 schema id、已支持的协议常量集合，以及旧版后端的兼容能力合成与交互文件能力协商逻辑。
源码：[src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts](../../../../../../../src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts)

## 符号（5）
<!-- node: function:src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts:buildSkillRunnerHandshakeRequest -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts:createLegacySkillRunnerCapabilities -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts:isSkillRunnerProtocolSupported -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts:normalizeSkillRunnerHandshakeResponse -->
<!-- node: function:src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts:resolveSkillRunnerInteractionFileCapability -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSkillRunnerHandshakeRequest | 函数 | 79–102 | 简单 | protocol、serialization、handshake | 0 | 构造握手请求体，携带 schema id、插件版本与插件支持的协议清单。 |
| createLegacySkillRunnerCapabilities | 函数 | 150–168 | 简单 | compatibility、fallback、protocol | 0 | 为不实现握手端点的旧版后端合成最小能力集，仅声明基础 job 协议。 |
| isSkillRunnerProtocolSupported | 函数 | 211–220 | 简单 | protocol、validation、predicate | 0 | 判断后端是否声明支持某个协议标识，是执行前断言的基础谓词。 |
| normalizeSkillRunnerHandshakeResponse | 函数 | 104–148 | 中等 | protocol、validation、parsing | 0 | 校验并规范化握手响应，提取后端标识、版本与支持的协议，对缺字段的旧响应做保守降级。 |
| resolveSkillRunnerInteractionFileCapability | 函数 | 170–200 | 中等 | protocol、capability-negotiation、validation | 0 | 从握手能力中解析交互文件相关的限额配置（单文件与总量上限、待处理数量），缺失时使用契约默认值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantInteractionContract.ts](../../../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [package.json](../../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [managementClient.ts](../../../providers/skillrunner/managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [provider.ts](../../../providers/skillrunner/provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [skillRunnerHandshake.ts](skillRunnerHandshake.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshake.ts | SkillRunner 协议握手层：向后端查询其支持的能力与协议集合并做带 TTL 的缓存，同时提供执行前断言所需协议的校验函数。 |
| [skillRunnerRunDialog.ts](../surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSkillRunnerHandshakeRequest | 函数 | 79–102 | 构造握手请求体，携带 schema id、插件版本与插件支持的协议清单。 |
| createLegacySkillRunnerCapabilities | 函数 | 150–168 | 为不实现握手端点的旧版后端合成最小能力集，仅声明基础 job 协议。 |
| isSkillRunnerProtocolSupported | 函数 | 211–220 | 判断后端是否声明支持某个协议标识，是执行前断言的基础谓词。 |
| normalizeSkillRunnerHandshakeResponse | 函数 | 104–148 | 校验并规范化握手响应，提取后端标识、版本与支持的协议，对缺字段的旧响应做保守降级。 |
| resolveSkillRunnerInteractionFileCapability | 函数 | 170–200 | 从握手能力中解析交互文件相关的限额配置（单文件与总量上限、待处理数量），缺失时使用契约默认值。 |
