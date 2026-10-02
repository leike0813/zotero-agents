
# src/providers/skillrunner/provider.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/skillrunner](../../../../modules/src/providers/skillrunner.md)
<!-- node: file:src/providers/skillrunner/provider.ts -->

SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。

规模：683 行
源码：[src/providers/skillrunner/provider.ts](../../../../../../src/providers/skillrunner/provider.ts)

## 符号（3）
<!-- node: function:src/providers/skillrunner/provider.ts:normalizeBooleanOption -->
<!-- node: class:src/providers/skillrunner/provider.ts:SkillRunnerProvider -->
<!-- node: function:src/providers/skillrunner/provider.ts:toBackendCatalogScope -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| normalizeBooleanOption | 函数 | 66–83 | 简单 | normalization、options、utility | 0 | 归一布尔型运行时选项，支持字符串 "true"/"false" 等常见后端写法。 |
| [SkillRunnerProvider](../../../../symbols/src/providers/skillrunner/provider.ts/SkillRunnerProvider.md) | 类 | 109–683 | 复杂 | provider、skillrunner、backend-adapter、orchestration | 1 | SkillRunner Provider 实现：校验后端协议兼容性、解析管理认证、按请求种类分派到 client，并声明模型、effort、缓存与超时等运行时选项 schema。 |
| toBackendCatalogScope | 函数 | 45–54 | 简单 | skillrunner、resolution、utility | 0 | 把模型目录查询范围映射到当前后端能力作用域，避免跨后端读取模型列表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [contracts.ts](../contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [managementAuth.ts](../../backends/managementAuth.ts.md) | src/backends/managementAuth.ts | 后端管理认证模块：读写 backends 配置中的管理凭据，生成 Basic Auth 头，保证管理面请求不被明文散落。 |
| [managementClient.ts](managementClient.ts.md) | src/providers/skillrunner/managementClient.ts | SkillRunner 管理面 HTTP 客户端：封装鉴权、超时、abort、错误映射与 SSE 流式读取，并通过连接 governor 串行化握手，向上提供后端能力、模型与交互请求等管理接口。 |
| [modelCatalog.ts](modelCatalog.ts.md) | src/providers/skillrunner/modelCatalog.ts | SkillRunner 模型目录：解析静态 manifest 与远端快照，展开 engine/provider/model 层级并把模型规格归一为 UI 与运行时可用形态。 |
| [runtimeLogManager.ts](../../modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [skillRunnerHandshake.ts](../../modules/skillRunner/connection/skillRunnerHandshake.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshake.ts | SkillRunner 协议握手层：向后端查询其支持的能力与协议集合并做带 TTL 的缓存，同时提供执行前断言所需协议的校验函数。 |
| [skillRunnerHandshakeProtocol.ts](../../modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts.md) | src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts | 握手协议的契约层：定义请求/响应 schema id、已支持的协议常量集合，以及旧版后端的兼容能力合成与交互文件能力协商逻辑。 |
| [skillRunnerInteractiveAutoReply.ts](../../modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts.md) | src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts | 交互式自动回复开关模块：解析用户偏好并判定某个 run 是否应启用自动回复，同时构造对应的请求载荷。 |
| [skillRunnerLocalRuntimeManager.ts](../../modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [e2e-single-markdown-live.ts](../../../scripts/e2e-single-markdown-live.ts.md) | scripts/e2e-single-markdown-live.ts | 端到端演练脚本：加载 single-markdown 工作流包，用 SkillRunner provider 真实提交一次请求并落盘产物，用于验证工作流运行时到后端的完整链路。 |
| [inspect-single-markdown-request.ts](../../../scripts/inspect-single-markdown-request.ts.md) | scripts/inspect-single-markdown-request.ts | 调研脚本：重建 single-markdown 工作流请求的完整报文，包括 job queue 记录与 SkillRunner provider 的上传字段。 |
| [registry.ts](../registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [SkillRunnerProvider](../../../../symbols/src/providers/skillrunner/provider.ts/SkillRunnerProvider.md) | 类 | 109–683 | SkillRunner Provider 实现：校验后端协议兼容性、解析管理认证、按请求种类分派到 client，并声明模型、effort、缓存与超时等运行时选项 schema。 |
