
# src/providers/skillrunner/managementClient.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/skillrunner](../../../../modules/src/providers/skillrunner.md)
<!-- node: file:src/providers/skillrunner/managementClient.ts -->

SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。
源码：[src/providers/skillrunner/managementClient.ts](../../../../../../src/providers/skillrunner/managementClient.ts)

## 符号（8）
<!-- node: function:src/providers/skillrunner/managementClient.ts:createAbortError -->
<!-- node: function:src/providers/skillrunner/managementClient.ts:decodeBase64ToBytes -->
<!-- node: function:src/providers/skillrunner/managementClient.ts:findSseFrameBoundary -->
<!-- node: function:src/providers/skillrunner/managementClient.ts:formatHttpError -->
<!-- node: function:src/providers/skillrunner/managementClient.ts:parseBasicCredentials -->
<!-- node: function:src/providers/skillrunner/managementClient.ts:readJsonBody -->
<!-- node: class:src/providers/skillrunner/managementClient.ts:SkillRunnerManagementClient -->
<!-- node: function:src/providers/skillrunner/managementClient.ts:streamSseResponse -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createAbortError | 函数 | 270–283 | 简单 | abort、error-type、compat | 0 | 构造与宿主兼容的 AbortError 对象，使超时能被上层 abort 判定识别。 |
| decodeBase64ToBytes | 函数 | 299–322 | 简单 | base64、polyfill、compat | 0 | 在缺少 atob 的宿主中把 base64 载荷解码为字节数组，供文件上传与图标使用。 |
| findSseFrameBoundary | 函数 | 324–333 | 简单 | sse、parsing、streaming | 0 | 扫描 SSE 缓冲区定位下一个完整事件帧边界，是流式解析的核心。 |
| formatHttpError | 函数 | 228–245 | 简单 | error-handling、http、skillrunner | 0 | 把非 2xx 响应转换为带状态与响应体的 SkillRunnerHttpError。 |
| parseBasicCredentials | 函数 | 247–257 | 简单 | authentication、parsing、skillrunner | 0 | 解析管理面 Basic 凭据，容忍缺失用户名或密码的半配置状态。 |
| readJsonBody | 函数 | 198–210 | 简单 | parsing、defensive、http | 0 | 安全读取并解析 JSON 响应体，失败时回退到文本摘要而不抛出原始解析错误。 |
| SkillRunnerManagementClient | 类 | 467–1102 | 复杂 | http-client、skillrunner、sse、transport、exported | 0 | SkillRunner 管理面客户端：持有 baseUrl 与鉴权配置，串行化握手连接，并暴露能力查询、模型列举、事件流与交互请求等管理接口。 |
| streamSseResponse | 函数 | 335–465 | 复杂 | sse、streaming、events | 0 | 按帧解析 SSE 流并逐条回调，兼顾中途取消与连接错误传播。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantInteractionContract.ts](../../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |
| [errors.ts](errors.ts.md) | src/providers/skillrunner/errors.ts | SkillRunner 错误类型与分类判定：定义带 HTTP 语义的 SkillRunnerHttpError 与终态运行错误，并提供认证/配置类、可恢复后端类、终态客户端错误等判定与文案格式化。 |
| [managementAuth.ts](../../backends/managementAuth.ts.md) | src/backends/managementAuth.ts | 后端管理认证模块：读写 backends 配置中的管理凭据，生成 Basic Auth 头，保证管理面请求不被明文散落。 |
| [runtimeBridge.ts](../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [skillRunnerBackendHealthRegistry.ts](../../modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerConnectionGovernor.ts](../../modules/skillRunner/connection/skillRunnerConnectionGovernor.ts.md) | src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts | SkillRunner 出站连接的唯一治理点：把提交、前台流、前台查询、结算、对账等连接请求分配到不同泳道并排队调度，施加并发上限、前台流池与物理连接债务记账，统一处理超时、abort 与迟到结算。 |
| [skillRunnerHandshakeProtocol.ts](../../modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts | 握手协议的契约层：定义请求/响应 schema id、已支持的协议常量集合，以及旧版后端的兼容能力合成与交互文件能力协商逻辑。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [provider.ts](provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [skillRunnerBackendReachabilityCoordinator.ts](../../modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts | 后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。 |
| [skillRunnerHandshake.ts](../../modules/skillRunner/connection/skillRunnerHandshake.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshake.ts | SkillRunner 协议握手层：向后端查询其支持的能力与协议集合并做带 TTL 的缓存，同时提供执行前断言所需协议的校验函数。 |
| [skillRunnerManagementClientFactory.ts](../../modules/skillRunner/connection/skillRunnerManagementClientFactory.ts.md) | src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts | SkillRunner 管理客户端的构造工厂，把后端实例的 baseUrl 与管理鉴权的读取/持久化回调注入客户端，并统一本地化错误提示。 |
| [skillRunnerRunDialog.ts](../../modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantInteractionContract.ts](../../shared/assistantInteractionContract.ts.md) | src/shared/assistantInteractionContract.ts | Assistant 待用户交互（permission / choice / 文件上传）的跨边界合约：定义选项数、文件数与字节上限，以及归一化、投影、解析与确定性响应文案生成的唯一实现。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| SkillRunnerManagementClient | 类 | 467–1102 | SkillRunner 管理面客户端：持有 baseUrl 与鉴权配置，串行化握手连接，并暴露能力查询、模型列举、事件流与交互请求等管理接口。 |
